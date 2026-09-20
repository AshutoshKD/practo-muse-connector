const express = require('express');
const router = express.Router();
require('dotenv').config();

// ── Payment Provider Setup ────────────────────────────────────────
const PROVIDER = process.env.PAYMENT_PROVIDER || 'razorpay';

// Lazy-initialize payment clients only when real keys exist
let razorpay = null;
let stripe = null;

const getRazorpay = () => {
  if (!razorpay && process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_ID !== 'rzp_test_your_key_id_here') {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key_here') {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

const isSandbox = () => {
  if (PROVIDER === 'razorpay') {
    return !process.env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id_here';
  }
  return !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY === 'sk_test_your_stripe_secret_key_here';
};

// Keep old name for backward compat
const isSandboxStripe = isSandbox;

/**
 * POST /payments/create-intent
 * Create a Stripe Payment Intent for an appointment booking
 *
 * Body:
 *   amount          (required) — consultation fee in rupees e.g. 500
 *   appointment_id  (required) — from /appointments/book response
 *   doctor_name     (required) — for payment description
 *   patient_name    (required) — for payment description
 *   patient_email   (optional) — to send receipt
 *
 * Muse calls this when user confirms:
 *   "Yes, book the ₹500 appointment with Dr. Priya"
 *
 * Returns: client_secret → used by Stripe Link to complete payment
 */
router.post('/create-intent', async (req, res) => {
  const { amount, appointment_id, doctor_name, patient_name, patient_email } = req.body;

  if (!amount || !appointment_id || !doctor_name || !patient_name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: amount, appointment_id, doctor_name, patient_name',
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'amount must be a positive number (in rupees)',
    });
  }

  // ── SANDBOX MODE ──
  if (isSandbox()) {
    return res.json({
      success: true,
      mode: 'sandbox',
      provider: PROVIDER,
      message: `${PROVIDER} sandbox — no real charge made`,
      order_id: `order_mock_${Date.now()}`,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount_inr: amount,
      appointment_id,
    });
  }

  // ── PRODUCTION: RAZORPAY (default for India) ──
  if (PROVIDER === 'razorpay') {
    try {
      const order = await getRazorpay().orders.create({
        amount: amount * 100,           // Razorpay uses paise (₹1 = 100 paise)
        currency: process.env.RAZORPAY_CURRENCY || 'INR',
        receipt: `appt_${appointment_id}`,
        notes: {
          appointment_id,
          doctor_name,
          patient_name,
          platform: 'muse_connector',
        },
      });

      return res.json({
        success: true,
        provider: 'razorpay',
        order_id: order.id,
        key_id: process.env.RAZORPAY_KEY_ID,  // safe to send to frontend
        amount_inr: amount,
        currency: order.currency,
        appointment_id,
      });
    } catch (err) {
      console.error('[Razorpay Error]', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to create Razorpay order',
        details: err.message,
      });
    }
  }

  // ── PRODUCTION: STRIPE (optional) ──
  if (PROVIDER === 'stripe' && getStripe()) {
    try {
      const paymentIntent = await getStripe().paymentIntents.create({
        amount: amount * 100,
        currency: process.env.STRIPE_CURRENCY || 'inr',
        payment_method_types: ['card', 'link'],
        description: `Doctor appointment with ${doctor_name} — booked via Muse`,
        metadata: { appointment_id, doctor_name, patient_name, platform: 'muse_connector' },
        receipt_email: patient_email || undefined,
      });

      return res.json({
        success: true,
        provider: 'stripe',
        client_secret: paymentIntent.client_secret,
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
        amount_inr: amount,
        payment_intent_id: paymentIntent.id,
        appointment_id,
      });
    } catch (err) {
      console.error('[Stripe Error]', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to create Stripe payment intent',
        details: err.message,
      });
    }
  }
});

/**
 * POST /payments/webhook
 * Stripe calls this URL when payment status changes
 * Set this URL in: https://dashboard.stripe.com/webhooks
 *
 * Events handled:
 *   payment_intent.succeeded  → payment went through ✅
 *   payment_intent.failed     → payment failed ❌
 */
router.post(
  '/webhook',
  // Raw body needed for Stripe signature verification
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!process.env.STRIPE_WEBHOOK_SECRET ||
        process.env.STRIPE_WEBHOOK_SECRET === 'whsec_your_webhook_secret_here') {
      console.log('[Webhook] Sandbox mode — skipping signature verification');
      return res.json({ received: true });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[Webhook Signature Error]', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle payment events
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        console.log(`✅ Payment succeeded: ${intent.id}`);
        console.log(`   Appointment: ${intent.metadata.appointment_id}`);
        console.log(`   Patient: ${intent.metadata.patient_name}`);
        console.log(`   Amount: ₹${intent.amount / 100}`);
        // TODO: update appointment status in your DB to "paid"
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        console.error(`❌ Payment failed: ${intent.id}`);
        console.error(`   Reason: ${intent.last_payment_error?.message}`);
        // TODO: notify user, cancel appointment if needed
        break;
      }
      default:
        console.log(`[Webhook] Unhandled event: ${event.type}`);
    }

    res.json({ received: true });
  }
);

/**
 * GET /payments/status/:payment_intent_id
 * Check the status of a payment
 *
 * Muse calls this to confirm:
 *   "Was my payment for the appointment successful?"
 */
router.get('/status/:payment_intent_id', async (req, res) => {
  const { payment_intent_id } = req.params;

  if (isSandboxStripe()) {
    return res.json({
      success: true,
      mode: 'sandbox',
      payment_intent_id,
      status: 'succeeded',
      message: 'Sandbox: payment simulated as successful',
    });
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
    return res.json({
      success: true,
      payment_intent_id,
      status: intent.status, // 'succeeded' | 'processing' | 'requires_payment_method'
      amount_inr: intent.amount / 100,
      appointment_id: intent.metadata.appointment_id,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment status',
    });
  }
});

module.exports = router;
