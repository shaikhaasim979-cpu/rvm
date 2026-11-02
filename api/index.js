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

app.get('/', (req, res) => {
  res.status(200).send('RVM RazorpayX Backend Running');
});

const processPayout = async (req, res) => {
  const { sessionId, amount, upiId } = req.body;

  // Build Basic Auth header inside the handler to safely load env variables
  const keyId = process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_ID : 'rzp_test_TvQOZTcCmjmYxU' : 'rzp_test_TvQOZTcCmjmYxU';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'KTz5uw49CKktloo8sn9HDIRP';
  const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER || '78787800800811';

  const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const razorpayClient = axios.create({
    baseURL: 'https://api.razorpay.com/v1',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    // 1. Create Contact
    const contactRes = await razorpayClient.post('/contacts', {
      name: "RVM User",
      email: "user@example.com",
      contact: "9999999999",
      type: "customer",
      reference_id: `REF_${Date.now()}`
    });

    // 2. Create Fund Account
    const fundAccountRes = await razorpayClient.post('/fund_accounts', {
      contact_id: contactRes.data.id,
      account_type: "vpa",
      vpa: { address: upiId }
    });

    // 3. Create Payout
    const payoutRes = await razorpayClient.post('/payouts', {
      account_number: accountNumber,
      fund_account_id: fundAccountRes.data.id,
      amount: Math.round(parseFloat(amount) * 100),
      currency: "INR",
      mode: "UPI",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: `RVM_${sessionId}_${Date.now()}`
    });

    return res.status(200).json({ success: true, payoutId: payoutRes.data.id });

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error('RazorpayX Error:', errorDetails);
    
    return res.status(500).json({
      success: false,
      message: errorDetails.error ? errorDetails.error.description : 'Authentication failed'
    });
  }
};

app.post('/claim-payout', processPayout);
app.post('/api/claim-payout', processPayout);

module.exports = app;
