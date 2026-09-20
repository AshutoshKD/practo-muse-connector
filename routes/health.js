const express = require('express');
const router = express.Router();
const { isSandbox } = require('../utils/practoClient');

/**
 * GET /health
 * Health check endpoint — Muse pings this to verify your connector is alive
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    connector: 'Practo for Muse',
    version: '1.0.0',
    environment: isSandbox() ? 'sandbox' : 'production',
    powered_by: 'Practo',
    capabilities: [
      'search_doctors',
      'get_available_slots',
      'book_appointment',
      'list_appointments',
      'cancel_appointment',
    ],
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
