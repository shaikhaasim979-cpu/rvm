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

  console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ${amount} | UPI: ${upiId}`);

  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const accountNumber = (process.env.RAZORPAY_ACCOUNT_NUMBER || '78787800800811').trim();

  if (!keyId || !keySecret) {
    return res.status(500).json({
      success: false,
      message: 'RazorpayX keys are missing in backend configuration.'
    });
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

  try {
    // 1. Create Contact
    const contactRes = await axios.post(
      'https://api.razorpay.com/v1/contacts',
      {
        name: "RVM User",
        email: "user@example.com",
        contact: "9876543210",
        type: "customer",
        reference_id: `REF_${Date.now()}`
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }
    );

    const contactId = contactRes.data.id;

    // 2. Create Fund Account
    const fundAccountRes = await axios.post(
      'https://api.razorpay.com/v1/fund_accounts',
      {
        contact_id: contactId,
        account_type: "vpa",
        vpa: { address: upiId }
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }
    );

    const fundAccountId = fundAccountRes.data.id;

    // 3. Create Payout
    const payoutRes = await axios.post(
      'https://api.razorpay.com/v1/payouts',
      {
        account_number: accountNumber,
        fund_account_id: fundAccountId,
        amount: Math.round(parseFloat(amount) * 100),
        currency: "INR",
        mode: "UPI",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: `RVM_${sessionId}_${Date.now()}`
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[RAZORPAYX SUCCESS]:', payoutRes.data);
    return res.status(200).json({ success: true, payoutId: payoutRes.data.id, data: payoutRes.data });

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error('RazorpayX Error:', JSON.stringify(errorDetails));

    return res.status(500).json({
      success: false,
      message: errorDetails.error ? errorDetails.error.description : 'Payout failed',
      details: errorDetails
    });
  }
};

app.post('/claim-payout', processPayout);
app.post('/api/claim-payout', processPayout);

module.exports = app;
