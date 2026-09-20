require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { authenticateConnector } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Rate limiting — protect your API from abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Public Routes (no auth needed) ───────────────────────────────

// Root — basic info
app.get('/', (req, res) => {
  res.json({
    connector: 'Practo for Muse',
    description: 'Book doctor appointments with Practo via Meta Muse',
    version: '1.0.0',
    powered_by: 'Practo',
    docs: 'See GUIDE.md for full documentation',
  });
});

// Privacy policy (required by Muse submission)
app.get('/privacy', (req, res) => {
  res.send(`
    <html>
      <head><title>Privacy Policy — Practo for Muse</title></head>
      <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px;">
        <h1>Privacy Policy</h1>
        <p><strong>Last updated:</strong> September 2026</p>
        <h2>What data we collect</h2>
        <p>This connector collects patient name and phone number solely to facilitate appointment booking through Practo's platform. No data is stored on our servers beyond the duration of the API call.</p>
        <h2>How we use your data</h2>
        <p>Data is passed directly to Practo's API to search for doctors and book appointments. We do not store, sell, or share your data with any third parties other than Practo.</p>
        <h2>Practo's Privacy Policy</h2>
        <p>Appointments are processed by Practo. Please review <a href="https://www.practo.com/company/privacy">Practo's Privacy Policy</a>.</p>
        <h2>Contact</h2>
        <p>For privacy concerns: support@yourdomain.com</p>
      </body>
    </html>
  `);
});

// Terms of service (required by Muse submission)
app.get('/terms', (req, res) => {
  res.send(`
    <html>
      <head><title>Terms of Service — Practo for Muse</title></head>
      <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px;">
        <h1>Terms of Service</h1>
        <p><strong>Last updated:</strong> September 2026</p>
        <p>By using this Muse connector, you agree to use it only for legitimate appointment booking purposes through Practo's platform. Appointments booked are subject to Practo's own terms of service and cancellation policies. This connector is a technology facilitator and bears no liability for appointment confirmations or medical services.</p>
        <p>Full terms: <a href="https://www.practo.com/company/terms">Practo Terms of Service</a></p>
      </body>
    </html>
  `);
});

// Health check — NO auth (Muse pings this to check connector is alive)
app.use('/health', require('./routes/health'));

// ── Protected Routes (require x-connector-key header) ────────────
app.use('/search', authenticateConnector, require('./routes/search'));
app.use('/slots', authenticateConnector, require('./routes/slots'));
app.use('/appointments', authenticateConnector, require('./routes/appointments'));

// Stripe webhook must use raw body — register BEFORE json middleware parses it
// This route is public (Stripe calls it directly, not via Muse)
app.use('/payments/webhook', require('./routes/payments'));

// All other payment routes are protected
app.use('/payments', authenticateConnector, require('./routes/payments'));

// ── 404 Handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` });
});

// ── Error Handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Export for Vercel serverless
module.exports = app;

// Also listen locally when not on Vercel
if (process.env.NODE_ENV !== 'production' || process.env.IS_LOCAL) {
  app.listen(PORT, () => {
    const isSandbox = process.env.PRACTO_ENV !== 'production';
    console.log(`\n✅ Practo Muse Connector running on port ${PORT}`);
    console.log(`📍 Environment: ${isSandbox ? 'SANDBOX (mock data)' : 'PRODUCTION'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    if (isSandbox) console.log(`\n⚠️  Running in SANDBOX mode — using mock data\n`);
  });
}
