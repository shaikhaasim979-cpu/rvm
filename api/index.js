const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/claim-payout', async (req, res) => {
  const { sessionId, amount, upiId } = req.body;

  console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ${amount} | UPI: ${upiId}`);

  try {
    // Generate a unique transfer ID for Cashfree
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
    // THIS LOG WILL SHOW THE EXACT CASHFREE REJECTION REASON IN VERCEL
    console.error('[CASHFREE ERROR]:', error.response ? error.response.data : error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Payout failed',
      error: error.response ? error.response.data : error.message
    });
  }
});

module.exports = app;
