const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Root Health Check
app.get('/', (req, res) => {
  res.status(200).send('RVM Cashfree Payout Backend is running.');
});

const processPayout = async (req, res) => {
  const { sessionId, amount, upiId } = req.body;

  console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ${amount} | UPI: ${upiId}`);

  try {
    const timestamp = Date.now();
    const transferId = `TXN_${timestamp}`;

    // Cashfree V2 Standard Payload (Populates All Transfers Table)
    const payload = {
      transfer_id: transferId,
      transfer_amount: parseFloat(amount),
      transfer_mode: "upi",
      beneficiary_details: {
        beneficiary_id: `BENE_${timestamp}`,
        beneficiary_name: "RVM User",
        beneficiary_vpa: upiId,
        beneficiary_phone: "9999999999"
      },
      transfer_remarks: `RVM Session ${sessionId}`
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

    return res.status(200).json({ 
      success: true, 
      payoutId: transferId,
      data: response.data 
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
