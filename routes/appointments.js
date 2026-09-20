const express = require('express');
const router = express.Router();
const { practoClient, isSandbox } = require('../utils/practoClient');

// In-memory store for sandbox mode only (resets on server restart)
const sandboxBookings = new Map();

/**
 * POST /appointments/book
 * Book an appointment for a patient
 *
 * Body:
 *   doctor_id       (required) — from search results
 *   slot_id         (required) — from slots endpoint
 *   date            (required) — e.g. "2026-09-21"
 *   time            (required) — e.g. "10:00"
 *   patient_name    (required) — full name
 *   patient_phone   (required) — with country code e.g. "+919876543210"
 *   patient_age     (optional)
 *   patient_gender  (optional) — "male" | "female" | "other"
 *   notes           (optional) — reason for visit
 *
 * Muse calls this when user says:
 *   "Book the 10am slot with Dr. Priya tomorrow"
 */
router.post('/book', async (req, res) => {
  const {
    doctor_id,
    slot_id,
    date,
    time,
    patient_name,
    patient_phone,
    patient_age,
    patient_gender,
    notes,
  } = req.body;

  // Validate required fields
  if (!doctor_id || !slot_id || !date || !time || !patient_name || !patient_phone) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: doctor_id, slot_id, date, time, patient_name, patient_phone',
    });
  }

  // Basic phone validation
  if (!/^\+?[1-9]\d{9,14}$/.test(patient_phone.replace(/\s/g, ''))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format. Use international format: +919876543210',
    });
  }

  // ── SANDBOX MODE ──
  if (isSandbox()) {
    const appointmentId = `appt_${Date.now()}`;
    const booking = {
      appointment_id: appointmentId,
      doctor_id,
      slot_id,
      date,
      time,
      patient_name,
      patient_phone,
      status: 'confirmed',
      confirmation_code: `PRACTO${Math.floor(Math.random() * 90000) + 10000}`,
      booked_at: new Date().toISOString(),
      powered_by: 'Practo',
    };

    sandboxBookings.set(appointmentId, booking);

    return res.json({
      success: true,
      mode: 'sandbox',
      message: `✅ Appointment confirmed for ${patient_name} on ${date} at ${time}`,
      appointment: booking,
    });
  }

  // ── PRODUCTION MODE ──
  try {
    const response = await practoClient.post('/appointments/book', {
      doctor_id,
      slot_id,
      appointment_date: date,
      appointment_time: time,
      patient: {
        name: patient_name,
        phone: patient_phone,
        age: patient_age,
        gender: patient_gender,
      },
      notes,
      // Confirm exact field names from your Practo API documentation
    });

    const appt = response.data;

    return res.json({
      success: true,
      message: `✅ Appointment confirmed for ${patient_name} on ${date} at ${time}`,
      appointment: {
        appointment_id: appt.appointment_id || appt.id,
        doctor_id,
        date,
        time,
        patient_name,
        status: appt.status || 'confirmed',
        confirmation_code: appt.confirmation_code,
        booked_at: new Date().toISOString(),
        powered_by: 'Practo',
      },
    });
  } catch (err) {
    console.error('[Book Error]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to book appointment',
      details: err.response?.data || err.message,
    });
  }
});

/**
 * GET /appointments/list
 * List a patient's upcoming appointments
 *
 * Query params:
 *   patient_phone  (required) — patient's phone number
 *
 * Muse calls this when user says:
 *   "What are my upcoming doctor appointments?"
 */
router.get('/list', async (req, res) => {
  const { patient_phone } = req.query;

  if (!patient_phone) {
    return res.status(400).json({
      success: false,
      error: 'patient_phone is required',
    });
  }

  // ── SANDBOX MODE ──
  if (isSandbox()) {
    const userAppointments = [...sandboxBookings.values()].filter(
      (a) => a.patient_phone === patient_phone
    );
    return res.json({
      success: true,
      mode: 'sandbox',
      appointments: userAppointments,
    });
  }

  // ── PRODUCTION MODE ──
  try {
    const response = await practoClient.get('/appointments', {
      params: { patient_phone },
    });

    return res.json({
      success: true,
      appointments: response.data?.appointments || [],
    });
  } catch (err) {
    console.error('[List Error]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
    });
  }
});

/**
 * POST /appointments/cancel
 * Cancel an existing appointment
 *
 * Body:
 *   appointment_id  (required) — from booking response
 *   reason          (optional) — cancellation reason
 *
 * Muse calls this when user says:
 *   "Cancel my Practo appointment on Thursday"
 */
router.post('/cancel', async (req, res) => {
  const { appointment_id, reason } = req.body;

  if (!appointment_id) {
    return res.status(400).json({
      success: false,
      error: 'appointment_id is required',
    });
  }

  // ── SANDBOX MODE ──
  if (isSandbox()) {
    if (sandboxBookings.has(appointment_id)) {
      sandboxBookings.get(appointment_id).status = 'cancelled';
      return res.json({
        success: true,
        mode: 'sandbox',
        message: '✅ Appointment cancelled successfully',
        appointment_id,
        status: 'cancelled',
      });
    }
    return res.status(404).json({
      success: false,
      error: 'Appointment not found',
    });
  }

  // ── PRODUCTION MODE ──
  try {
    const response = await practoClient.post(`/appointments/${appointment_id}/cancel`, {
      reason: reason || 'Cancelled by patient via Muse',
    });

    return res.json({
      success: true,
      message: '✅ Appointment cancelled successfully',
      appointment_id,
      status: 'cancelled',
      refund_info: response.data?.refund || null,
    });
  } catch (err) {
    console.error('[Cancel Error]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel appointment',
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
