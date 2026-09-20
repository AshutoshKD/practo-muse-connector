# 🏥 Practo Muse Connector — Complete Build & Publish Guide

> Build a Muse connector that lets users book doctor appointments just by asking.
> "Book me a dermatologist near Koramangala tomorrow morning" → Done ✅

---

## 📁 Folder Structure

```
practo-muse-connector/
├── GUIDE.md                 ← You are here
├── server.js                ← Main Express API server
├── package.json             ← Dependencies
├── .env.example             ← All environment variables you need
├── .env                     ← Your actual secrets (never commit this!)
├── .gitignore               ← Ignore .env and node_modules
├── routes/
│   ├── search.js            ← Search doctors by city, speciality, locality
│   ├── slots.js             ← Get available appointment slots
│   ├── appointments.js      ← Book, cancel, list appointments
│   └── health.js            ← Health check endpoint for Muse
├── middleware/
│   └── auth.js              ← API key validation middleware
└── utils/
    └── practoClient.js      ← Axios client pre-configured for Practo API
```

---

## 🔑 PHASE 1 — Get Your API Keys & Credentials

### Step 1 — Apply for Practo Partner API Access

Practo does NOT have a self-serve signup. You must apply:

**Option A — Email (Fastest):**
```
To: api-support@practo.com
CC: partnerships@practo.com
Subject: Partner API Access Request — Muse Connector Integration

Body:
Hi Practo Team,

I am building a Muse (Meta AI agent) connector that will enable users 
to search and book OPD appointments via Practo using natural language 
voice commands.

Use case: Users say "Book a cardiologist near Indiranagar this Saturday" 
and Muse uses my connector (powered by Practo's API) to search, display 
slots, and confirm the booking.

I would like to request:
1. Partner API access credentials (API Key + Client ID)
2. Sandbox/test environment access for development
3. API documentation

Please let me know the onboarding process.

Thank you,
[Your Name]
[Your Phone]
[Your Website/GitHub]
```

**Option B — Practo Ray Portal:**
- Go to: https://www.practo.com/ray
- Sign up as a clinic/partner
- Request API access from the admin panel
- Contact: your assigned Practo account manager

**Option C — LinkedIn outreach:**
- Search "Practo Partnerships" or "Practo Developer" on LinkedIn
- DM them with your use case

### What Practo Will Give You (after approval):

| Credential | What It Is | Where You Use It |
|---|---|---|
| `PRACTO_API_KEY` | Your unique partner key | Every API request header |
| `PRACTO_CLIENT_ID` | Identifies your app | OAuth / partner auth |
| `PRACTO_SITE_ID` | Your registered site ID | Some endpoints require this |
| `PRACTO_API_BASE_URL` | Usually `https://api.practo.com` | Base URL for all calls |
| `PRACTO_SANDBOX_URL` | Test environment URL | Dev/testing only |

> ⏳ **Approval time:** Usually 3–10 business days. While waiting, use the mock/sandbox mode in this project to build and test everything.

---

## 🔐 PHASE 2 — Environment Setup

### Step 2 — Clone & Install

```bash
cd /path/to/meta-muse/practo-muse-connector
npm install
```

### Step 3 — Create Your `.env` File

Copy the example:
```bash
cp .env.example .env
```

Open `.env` and fill in:
```env
# ── Practo API Credentials (from Practo after approval) ──
PRACTO_API_KEY=your_api_key_here
PRACTO_CLIENT_ID=your_client_id_here
PRACTO_SITE_ID=your_site_id_here
PRACTO_API_BASE_URL=https://api.practo.com
PRACTO_SANDBOX_URL=https://sandbox.api.practo.com

# ── Set to 'sandbox' during dev, 'production' when live ──
PRACTO_ENV=sandbox

# ── Your connector's own auth key (you create this) ──
# Muse will send this key to authenticate calls to YOUR server
CONNECTOR_SECRET_KEY=create_a_random_string_here_min_32_chars

# ── Server config ──
PORT=3000
NODE_ENV=development
```

> 💡 To generate a random CONNECTOR_SECRET_KEY, run:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 🛠️ PHASE 3 — Build & Run the Connector

### Step 4 — Start the Server

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ Practo Muse Connector running on port 3000
📍 Environment: sandbox
🔗 Health check: http://localhost:3000/health
```

### Step 5 — Test Each Endpoint Locally

#### 5a — Health Check
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{
  "status": "ok",
  "connector": "Practo for Muse",
  "version": "1.0.0",
  "environment": "sandbox"
}
```

#### 5b — Search Doctors
```bash
curl "http://localhost:3000/search/doctors?city=bangalore&speciality=dermatologist&locality=Koramangala" \
  -H "x-connector-key: your_CONNECTOR_SECRET_KEY"
```
Expected response:
```json
{
  "success": true,
  "doctors": [
    {
      "id": "doc_123",
      "name": "Dr. Priya Sharma",
      "speciality": "Dermatologist",
      "clinic": "Skin & Care Clinic",
      "locality": "Koramangala, Bangalore",
      "fee": 500,
      "rating": 4.8,
      "experience_years": 12,
      "next_available": "2026-09-21T10:00:00"
    }
  ]
}
```

#### 5c — Get Available Slots
```bash
curl "http://localhost:3000/slots?doctor_id=doc_123&date=2026-09-21" \
  -H "x-connector-key: your_CONNECTOR_SECRET_KEY"
```

#### 5d — Book Appointment
```bash
curl -X POST http://localhost:3000/appointments/book \
  -H "Content-Type: application/json" \
  -H "x-connector-key: your_CONNECTOR_SECRET_KEY" \
  -d '{
    "doctor_id": "doc_123",
    "slot_id": "slot_456",
    "patient_name": "Rahul Sharma",
    "patient_phone": "+919876543210",
    "date": "2026-09-21",
    "time": "10:00"
  }'
```

#### 5e — Cancel Appointment
```bash
curl -X POST http://localhost:3000/appointments/cancel \
  -H "Content-Type: application/json" \
  -H "x-connector-key: your_CONNECTOR_SECRET_KEY" \
  -d '{"appointment_id": "appt_789"}'
```

---

## ☁️ PHASE 4 — Deploy Online (Muse Needs a Live URL)

### Step 6 — Deploy to Railway (Free)

Railway gives you a free live URL in under 5 minutes.

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add environment variables (one by one)
railway variables set PRACTO_API_KEY=your_key
railway variables set PRACTO_CLIENT_ID=your_id
railway variables set PRACTO_SITE_ID=your_site_id
railway variables set PRACTO_API_BASE_URL=https://api.practo.com
railway variables set PRACTO_ENV=production
railway variables set CONNECTOR_SECRET_KEY=your_secret
railway variables set PORT=3000
railway variables set NODE_ENV=production

# 5. Deploy
railway up
```

Your live URL will be something like:
```
https://practo-muse-connector.up.railway.app
```

Test it immediately:
```bash
curl https://practo-muse-connector.up.railway.app/health
```

> **Alternative free hosting options:**
> - [Render.com](https://render.com) — free tier, easy GitHub deploy
> - [Fly.io](https://fly.io) — free tier, fast global deployment
> - [Vercel](https://vercel.com) — free, but use serverless functions approach

---

## 📄 PHASE 5 — Create Required Legal Pages

### Step 7 — Privacy Policy

Muse requires a live privacy policy URL. Generate one free:

1. Go to: https://privacypolicies.com/privacy-policy-generator/
2. Fill in:
   - App name: `Practo for Muse`
   - Website: your Railway URL
   - Email: your work email
   - Data collected: `name, phone number, appointment data`
3. Download and add to your server at `/privacy` route
   OR host as a Notion public page and use that URL

### Step 8 — Terms of Service

1. Go to: https://termly.io/resources/templates/terms-of-service-agreement/
2. Customize with your info
3. Host at `/terms` route on your server

### Step 9 — Connector Icon

Muse requires a **1024×1024 PNG** icon.

1. Go to [Canva.com](https://canva.com) → free account
2. Create a new design → Custom size: 1024×1024 px
3. Design ideas:
   - White background + stethoscope + calendar icon
   - Use Practo's green color: `#5CB85C`
   - Add text: "Practo" in clean font
4. Download as PNG
5. Save as: `connector-icon.png` in your project root

---

## 🚀 PHASE 6 — Submit to Muse

### Step 10 — Fill the Submission Form

Go to: **https://muse.ai/platform** → Click **"Submit a connector"**

Fill in each field EXACTLY as below:

```
STEP 1 — OVERVIEW:
─────────────────────────────────────────────────────
Connector name:       Practo — Doctor Appointments
Company or App name:  [Your name or company name]
Product website:      https://practo-muse-connector.up.railway.app
─────────────────────────────────────────────────────
Example prompts (add all 3):
  1. "Book me a dermatologist near Koramangala tomorrow morning"
  2. "Find a cardiologist available this weekend in Bangalore"
  3. "Cancel my Practo appointment on Thursday"
─────────────────────────────────────────────────────
Connector icon:       [Upload your 1024x1024 PNG]
Keywords/Category:    Health & Wellness, Productivity
─────────────────────────────────────────────────────
Your name:            [Your full name]
Work email:           you@yourdomain.com (Google Workspace email)
─────────────────────────────────────────────────────
Source repo or URL:   https://github.com/yourusername/practo-muse-connector
Privacy policy:       https://practo-muse-connector.up.railway.app/privacy
Terms of service:     https://practo-muse-connector.up.railway.app/terms
─────────────────────────────────────────────────────
Anything else:        "This connector integrates Practo's partner API to 
                       enable natural language doctor appointment booking 
                       through Meta Muse. Users can search by specialty, 
                       location, and date, view available slots, and confirm 
                       bookings — all via conversational AI."
─────────────────────────────────────────────────────

STEP 2 — TECHNICAL SPECS:
  API endpoint:       https://practo-muse-connector.up.railway.app
  Auth method:        API Key (header: x-connector-key)
  Payments:           No (connector doesn't accept payments directly)

STEP 3 — REVIEW:
  Double-check everything → Submit ✅
```

---

## 💰 PHASE 7 — Make Money

### How You Earn from This Connector

| Revenue Method | How | Monthly Potential |
|---|---|---|
| **Practo partner commission** | Practo pays per appointment booked via your API | ₹50–200 per booking |
| **Subscription tier** | Free: 10 bookings/month, Pro: unlimited @ ₹199/mo | Depends on users |
| **Freemium upsell** | Show "Upgrade" when free limit hit → your website | Scalable |

**Contact for commission terms:**
```
Email: partnerships@practo.com
Ask: "Commission structure for API partners per completed OPD appointment"
```

---

## 📅 Full Timeline

| Day | Task |
|---|---|
| **Day 1** | Send Practo API access email + set up project locally |
| **Day 2** | Build all routes + test with mock/sandbox data |
| **Day 3** | Deploy to Railway + create privacy/terms pages |
| **Day 4** | Make icon + submit to muse.ai/platform |
| **Days 5–14** | Wait for Practo API approval + Muse review |
| **Week 3** | Go live 🚀 |

---

## ⚠️ Important Things to Remember

1. **Never commit `.env`** — add it to `.gitignore` immediately
2. **Health data is sensitive** — comply with India's DPDP Act 2023
3. **Never store patient data** in your server — pass through to Practo only
4. **Rate limits** — Practo will tell you your call quota; respect it
5. **Display "Powered by Practo"** — required by their branding guidelines
6. **Canadian VPN note** — use US VPN to test the full Muse flow end-to-end

---

## 🆘 Contacts & Resources

| Resource | Link/Contact |
|---|---|
| Practo API support | api-support@practo.com |
| Practo partnerships | partnerships@practo.com |
| Practo Ray (partner portal) | https://www.practo.com/ray |
| Muse connector submission | https://muse.ai/platform |
| Railway deployment | https://railway.app |
| Privacy policy generator | https://privacypolicies.com |
| Terms generator | https://termly.io |
| Icon maker (free) | https://canva.com |

---

*Built for the meta-muse project | Last updated: September 2026*
