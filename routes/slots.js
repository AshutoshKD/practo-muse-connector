const express = require('express');
const router = express.Router();
const { practoClient, MOCK_SLOTS, isSandbox } = require('../utils/practoClient');

/**
 * GET /slots
 * Get available appointment slots for a specific doctor on a date
 *
 * Query params:
 *   doctor_id   (required) — doctor's ID from search results
 *   date        (required) — e.g. "2026-09-21"
 *
 * Example:
 *   GET /slots?doctor_id=mock_doc_001&date=2026-09-21
 *
 * Muse would call this when user says:
 *   "What times is Dr. Priya available tomorrow?"
 */
router.get('/', async (req, res) => {
  const { doctor_id, date } = req.query;

  if (!doctor_id || !date) {
    return res.status(400).json({
      success: false,
      error: 'doctor_id and date are required',
    });
  }

  // ── SANDBOX MODE ──
  if (isSandbox()) {
    const slots = MOCK_SLOTS.filter((s) => s.doctor_id === doctor_id && s.available);
    return res.json({
      success: true,
      mode: 'sandbox',
      doctor_id,
      date,
      available_slots: slots,
    });
  }

  // ── PRODUCTION MODE ──
  try {
    const response = await practoClient.get(`/doctors/${doctor_id}/slots`, {
      params: {
        date,
        // Confirm exact param names from your Practo API documentation
      },
    });

    const slots = response.data?.slots || response.data?.available_slots || [];

    return res.json({
      success: true,
      doctor_id,
      date,
      available_slots: slots
        .filter((s) => s.available !== false)
        .map((s) => ({
          id: s.id || s.slot_id,
          time: s.time || s.start_time,
          available: s.available ?? true,
          doctor_id,
        })),
    });
  } catch (err) {
    console.error('[Slots Error]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch slots',
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
