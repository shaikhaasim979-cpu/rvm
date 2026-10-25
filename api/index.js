const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Set to keep track of already claimed session IDs
const usedSessions = new Set();

// Cashfree Sandbox Credentials
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || "CF11306171DBDRJ44BLOMS73CHTI00";
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET || "cfsk_ma_test_9f4ed2b8bd0622ad627269ffb068a6f1_f6b703ca";

// GET route for browser health check
app.get('*', (req, res) => {
    res.json({
        success: true,
        message: "RVM Cashfree Payout Server is live and operational."
    });
});

// POST route for payouts
app.post('*', async (req, res) => {
    const { sessionId, amount, upiId } = req.body;

    console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ₹${amount} | UPI: ${upiId}`);

    if (!sessionId || !amount || !upiId) {
        return res.status(400).json({
            success: false,
            error: "Missing required parameters: sessionId, amount, or upiId."
        });
    }

    if (usedSessions.has(sessionId)) {
        return res.status(400).json({
            success: false,
            error: "This QR code reward has already been claimed!"
        });
    }

    try {
        const payload = {
            transfer_id: `TXN_${sessionId}_${Date.now()}`,
            transfer_amount: parseFloat(amount),
            transfer_mode: "upi",
            beneficiary_details: {
                beneficiary_name: "RVM User",
                beneficiary_instrument_details: {
                    vpa: upiId
                }
            }
        };

        const response = await axios.post(
            'https://payout-gamma.cashfree.com/payout/v1/directTransfer',
            payload,
            {
                headers: {
                    'X-Client-Id': CASHFREE_CLIENT_ID,
                    'X-Client-Secret': CASHFREE_CLIENT_SECRET,
                    'Content-Type': 'application/json'
                }
            }
        );

        usedSessions.add(sessionId);

        return res.json({
            success: true,
            payoutId: response.data.cf_transfer_id || payload.transfer_id,
            message: "Payout processed successfully via Cashfree Sandbox."
        });

    } catch (error) {
        console.error("Cashfree API Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({
            success: false,
            error: error.response?.data?.message || "Failed to process transfer with Cashfree."
        });
    }
});

module.exports = app;
