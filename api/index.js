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
    // ==========================================
    // STEP 1: CREATE BENEFICIARY FIRST
    // ==========================================
    try {
      await axios.post(
        'https://sandbox.cashfree.com/payout/beneficiaries',
        {
          beneficiary_id: beneId,
          beneficiary_name: "RVM User",
          beneficiary_instrument_details: {
            vpa: upiId
          },
          beneficiary_contact_details: {
            beneficiary_email: "user@example.com",
            beneficiary_phone: "9999999999"
          }
        },
        { headers }
      );
      console.log(`[BENE SUCCESS] Created Beneficiary: ${beneId}`);
    } catch (beneError) {
      // If creating the beneficiary fails, stop immediately and send the exact error back
      const errData = beneError.response ? beneError.response.data : beneError.message;
      console.error('[BENE CREATION FAILED]:', errData);
      return res.status(400).json({
        success: false,
        message: 'Failed to register UPI ID with Cashfree',
        error: typeof errData === 'object' ? (errData.message || JSON.stringify(errData)) : errData
      });
    }

    // ==========================================
    // STEP 2: EXECUTE TRANSFER
    // ==========================================
    const transferResponse = await axios.post(
      'https://sandbox.cashfree.com/payout/transfers',
      {
        transfer_id: transferId,
        transfer_amount: parseFloat(amount),
        transfer_currency: "INR",
        transfer_mode: "upi",
        beneficiary_details: {
          beneficiary_id: beneId
        },
        transfer_remarks: `RVM Session ${sessionId}`
      },
      { headers }
    );

    console.log('[TRANSFER SUCCESS]:', transferResponse.data);

    return res.status(200).json({ 
      success: true, 
      payoutId: transferId,
      data: transferResponse.data 
    });

  } catch (transferError) {
    const errData = transferError.response ? transferError.response.data : transferError.message;
    console.error('[TRANSFER FAILED]:', errData);
    return res.status(500).json({
      success: false,
      message: 'Transfer failed',
      error: typeof errData === 'object' ? (errData.message || JSON.stringify(errData)) : errData
    });
  }
};

app.post('/claim-payout', processPayout);
app.post('/api/claim-payout', processPayout);

module.exports = app;
