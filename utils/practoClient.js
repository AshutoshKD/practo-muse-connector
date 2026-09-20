const axios = require('axios');
require('dotenv').config();

// Choose sandbox or production URL based on env
const BASE_URL =
  process.env.PRACTO_ENV === 'production'
    ? process.env.PRACTO_API_BASE_URL
    : process.env.PRACTO_SANDBOX_URL;

// Pre-configured Axios client for all Practo API calls
const practoClient = axios.create({
  baseURL: BASE_URL || 'https://api.practo.com',
  timeout: 10000,
  headers: {
    // Practo accepts API key as either X-API-Key or Api-Key
    // Confirm the exact header name from your Practo API documentation
    'X-API-Key': process.env.PRACTO_API_KEY,
    'Api-Key': process.env.PRACTO_API_KEY,
    'X-Partner-Id': process.env.PRACTO_CLIENT_ID,
    'X-Site-Id': process.env.PRACTO_SITE_ID,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Sandbox mock data — used when PRACTO_ENV=sandbox and no real API key yet
const MOCK_DOCTORS = [
  {
    id: 'mock_doc_001',
    name: 'Dr. Priya Sharma',
    speciality: 'Dermatologist',
    clinic: 'Skin & Care Clinic',
    locality: 'Koramangala',
    city: 'Bangalore',
    fee: 500,
    rating: 4.8,
    experience_years: 12,
    next_available: new Date(Date.now() + 86400000).toISOString(),
    languages: ['English', 'Kannada', 'Hindi'],
  },
  {
    id: 'mock_doc_002',
    name: 'Dr. Arjun Mehta',
    speciality: 'Cardiologist',
    clinic: 'Heart Care Centre',
    locality: 'Indiranagar',
    city: 'Bangalore',
    fee: 800,
    rating: 4.9,
    experience_years: 18,
    next_available: new Date(Date.now() + 172800000).toISOString(),
    languages: ['English', 'Hindi'],
  },
];

const MOCK_SLOTS = [
  { id: 'slot_001', time: '09:00', available: true, doctor_id: 'mock_doc_001' },
  { id: 'slot_002', time: '10:00', available: true, doctor_id: 'mock_doc_001' },
  { id: 'slot_003', time: '11:00', available: false, doctor_id: 'mock_doc_001' },
  { id: 'slot_004', time: '14:00', available: true, doctor_id: 'mock_doc_001' },
  { id: 'slot_005', time: '15:00', available: true, doctor_id: 'mock_doc_001' },
];

const isSandbox = () =>
  process.env.PRACTO_ENV !== 'production' ||
  !process.env.PRACTO_API_KEY ||
  process.env.PRACTO_API_KEY === 'your_practo_api_key_here';

module.exports = { practoClient, MOCK_DOCTORS, MOCK_SLOTS, isSandbox };
