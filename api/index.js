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

// Primary payout route
const processPayout = async (req, res) => {
  const { sessionId, amount, upiId } = req.body;

  console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ${amount} | UPI: ${upiId}`);

  try {
    const transferId = `TXN_${Date.now()}`;

    // Cashfree Direct Transfer Payload
    const payload = {
      transferId: transferId,
      amount: parseFloat(amount),
      transferMode: "upi",
      vpa: upiId,
      name: "RVM User",
      email: "user@example.com",
      phone: "9999999999",
      remarks: `Payout for session ${sessionId}`
    };

    const response = await axios.post(
      'https://sandbox.cashfree.com/payout/v1.2/directTransfer',
      payload,
      {
        headers: {
          'X-Client-Id': process.env.CASHFREE_CLIENT_ID,
          'X-Client-Secret': process.env.CASHFREE_CLIENT_SECRET,
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
