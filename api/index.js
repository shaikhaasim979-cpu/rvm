const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Handle explicit preflight requests
app.options('*', cors());

// Root Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).send('RVM Cashfree Payout Backend is running.');
});

// Payout Endpoint
app.post('/api/claim-payout', async (req, res) => {
  const { sessionId, amount, upiId } = req.body;

  console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ${amount} | UPI: ${upiId}`);

  try {
    const transferId = `TXN_${Date.now()}`;

    const payload = {
      transfer_id: transferId,
      transfer_amount: parseFloat(amount),
      transfer_mode: "upi",
      beneficiary_details: {
        beneficiary_id: `BENE_${Date.now()}`,
        beneficiary_name: "RVM User",
        beneficiary_vpa: upiId
      }
    };

    const response = await axios.post(
      'https://sandbox.cashfree.com/payout/transfers',
      payload,
      {
        headers: {
          'X-Client-Id': process.env.CASHFREE_CLIENT_ID,
          'X-Client-Secret': process.env.CASHFREE_CLIENT_SECRET,
          'x-api-version': '2024-01-01',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[CASHFREE SUCCESS]:', response.data);
    return res.status(200).json({ success: true, data: response.data });

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error('[CASHFREE ERROR]:', errorDetails);

    return res.status(500).json({
      success: false,
      message: 'Payout failed',
      error: errorDetails
    });
  }
});

module.exports = app;
