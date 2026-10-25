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
  res.status(200).send('RVM Cashfree Payout Backend is running.');
});

// Primary payout handler
const processPayout = async (req, res) => {
  const { sessionId, amount, upiId } = req.body;

  console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ${amount} | UPI: ${upiId}`);

  const timestamp = Date.now();
  const beneId = `BENE_${timestamp}`;
  const transferId = `TXN_${timestamp}`;

  const headers = {
    'X-Client-Id': process.env.CASHFREE_CLIENT_ID,
    'X-Client-Secret': process.env.CASHFREE_CLIENT_SECRET,
    'x-api-version': '2024-01-01',
    'Content-Type': 'application/json'
  };

  try {
    // STEP 1: Register Beneficiary V2 on Cashfree
    const benePayload = {
      beneficiary_id: beneId,
      beneficiary_name: "RVM Recycling User",
      beneficiary_instrument_details: {
        vpa: upiId
      },
      beneficiary_contact_details: {
        beneficiary_email: "user@example.com",
        beneficiary_phone: "9999999999"
      }
    };

    try {
      await axios.post(
        'https://sandbox.cashfree.com/payout/beneficiaries',
        benePayload,
        { headers }
      );
      console.log(`[CASHFREE BENE CREATED]: ${beneId}`);
    } catch (beneErr) {
      console.log('[CASHFREE BENE NOTICE]: Existing or processed beneficiary', beneErr.response ? beneErr.response.data : beneErr.message);
    }

    // STEP 2: Initiate Transfer V2 against Created Beneficiary
    const transferPayload = {
      transfer_id: transferId,
      transfer_amount: parseFloat(amount),
      transfer_mode: "upi",
      beneficiary_details: {
        beneficiary_id: beneId
      },
      remarks: `RVM Session ${sessionId}`
    };

    const transferResponse = await axios.post(
      'https://sandbox.cashfree.com/payout/transfers',
      transferPayload,
      { headers }
    );

    console.log('[CASHFREE SUCCESS]:', transferResponse.data);

    return res.status(200).json({
      success: true,
      payoutId: transferId,
      data: transferResponse.data
    });

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error('[CASHFREE ERROR]:', errorDetails);

    return res.status(500).json({
      success: false,
      message: 'Payout failed',
      error: typeof errorDetails === 'object' ? (errorDetails.message || JSON.stringify(errorDetails)) : errorDetails
    });
  }
};

app.post('/claim-payout', processPayout);
app.post('/api/claim-payout', processPayout);

module.exports = app;
