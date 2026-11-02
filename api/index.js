const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.sendStatus(200);
});

// Root Health Check
app.get('/', (req, res) => {
  res.status(200).send('RVM RazorpayX Payout Backend is running.');
});

// Basic Auth setup for RazorpayX
const authHeader = Buffer.from(
  `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
).toString('base64');

const razorpayClient = axios.create({
  baseURL: 'https://api.razorpay.com/v1',
  headers: {
    'Authorization': `Basic ${authHeader}`,
    'Content-Type': 'application/json'
  }
});

const processPayout = async (req, res) => {
  const { sessionId, amount, upiId } = req.body;

  console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ${amount} | UPI: ${upiId}`);

  try {
    // STEP 1: Create Contact
    const contactRes = await razorpayClient.post('/contacts', {
      name: "RVM Recycling User",
      email: "user@example.com",
      contact: "9999999999",
      type: "customer",
      reference_id: `REF_${Date.now()}`
    });

    const contactId = contactRes.data.id;

    // STEP 2: Create Fund Account (VPA / UPI)
    const fundAccountRes = await razorpayClient.post('/fund_accounts', {
      contact_id: contactId,
      account_type: "vpa",
      vpa: {
        address: upiId
      }
    });

    const fundAccountId = fundAccountRes.data.id;

    // STEP 3: Create Payout
    const payoutRes = await razorpayClient.post('/payouts', {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: Math.round(parseFloat(amount) * 100), // Razorpay accepts amounts in paise (10 INR = 1000)
      currency: "INR",
      mode: "UPI",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: `RVM_${sessionId}_${Date.now()}`,
      notes: {
        session_id: sessionId
      }
    });

    console.log('[RAZORPAYX SUCCESS]:', payoutRes.data);

    return res.status(200).json({
      success: true,
      payoutId: payoutRes.data.id,
      data: payoutRes.data
    });

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error('[RAZORPAYX ERROR]:', errorDetails);

    return res.status(500).json({
      success: false,
      message: 'Payout failed',
      error: typeof errorDetails === 'object' ? (errorDetails.error ? errorDetails.error.description : JSON.stringify(errorDetails)) : errorDetails
    });
  }
};

app.post('/claim-payout', processPayout);
app.post('/api/claim-payout', processPayout);

module.exports = app;
