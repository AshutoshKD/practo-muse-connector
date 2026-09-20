const express = require('express');
const router = express.Router();
const { practoClient, MOCK_DOCTORS, isSandbox } = require('../utils/practoClient');

/**
 * GET /search/doctors
 * Search for doctors by city, speciality, locality
 *
 * Query params:
 *   city        (required) — e.g. "bangalore", "mumbai", "delhi"
 *   speciality  (required) — e.g. "dermatologist", "cardiologist", "general physician"
 *   locality    (optional) — e.g. "Koramangala", "Indiranagar"
 *   date        (optional) — e.g. "2026-09-21" (filter by availability)
 *   near        (optional) — "lat,lng" e.g. "12.9352,77.6245"
 *   offset      (optional) — pagination offset, default 0
 *
 * Example:
 *   GET /search/doctors?city=bangalore&speciality=dermatologist&locality=Koramangala
 *
 * Muse would call this when user says:
 *   "Find a dermatologist near Koramangala tomorrow"
 */
router.get('/doctors', async (req, res) => {
  const { city, speciality, locality, date, near, offset = 0 } = req.query;

  if (!city || !speciality) {
    return res.status(400).json({
      success: false,
      error: 'city and speciality are required query parameters',
    });
  }

  // ── SANDBOX MODE: return mock data while awaiting Practo API approval ──
  if (isSandbox()) {
    const filtered = MOCK_DOCTORS.filter((d) => {
      const matchCity = d.city.toLowerCase().includes(city.toLowerCase());
      const matchSpec = d.speciality.toLowerCase().includes(speciality.toLowerCase());
      const matchLocality = locality
        ? d.locality.toLowerCase().includes(locality.toLowerCase())
        : true;
      return matchCity && matchSpec && matchLocality;
    });

    return res.json({
      success: true,
      mode: 'sandbox',
      total: filtered.length,
      doctors: filtered,
    });
  }

  // ── PRODUCTION MODE: real Practo API call ──
  try {
    const response = await practoClient.get('/doctors/search', {
      params: {
        city,
        speciality,
        locality: locality || undefined,
        available_on: date || undefined,
        near: near || undefined,
        offset,
        searchfor: 'specialization',
        // Confirm exact param names from your Practo API documentation
      },
    });

    const doctors = response.data?.results || response.data?.doctors || [];

    return res.json({
      success: true,
      total: doctors.length,
      doctors: doctors.map((d) => ({
        id: d.id || d.doctor_id,
        name: d.name || d.full_name,
        speciality: d.speciality || d.specialization,
        clinic: d.clinic_name || d.practice_name,
        locality: d.locality,
        city: d.city,
        fee: d.consultation_fee || d.fee,
        rating: d.rating,
        experience_years: d.experience,
        next_available: d.next_available_slot,
        languages: d.languages || [],
      })),
    });
  } catch (err) {
    console.error('[Search Error]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to search doctors',
      details: err.response?.data || err.message,
    });
  }
});

/**
 * GET /search/specialities
 * Get list of all available specialities
 *
 * Muse would call this when user says:
 *   "What kind of doctors can I book through you?"
 */
router.get('/specialities', async (req, res) => {
  const specialities = [
    'General Physician', 'Dermatologist', 'Cardiologist',
    'Gynaecologist', 'Paediatrician', 'Orthopaedic',
    'Neurologist', 'Psychiatrist', 'Ophthalmologist',
    'ENT Specialist', 'Dentist', 'Diabetologist',
    'Gastroenterologist', 'Urologist', 'Nephrologist',
  ];

  return res.json({ success: true, specialities });
});

module.exports = router;
