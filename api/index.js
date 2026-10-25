const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Set to keep track of already claimed session IDs (Note: temporary for testing)
const usedSessions = new Set();

// Cashfree Sandbox Credentials
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || "CF11306171DBDRJ44BLOMS73CHTI00";
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET || "cfsk_ma_test_9f4ed2b8bd0622ad627269ffb068a6f1_f6b703ca";

// Payout processing endpoint
app.post('/api/claim-payout', async (req, res) => {
    const { sessionId, amount, upiId } = req.body;

    console.log(`[PAYOUT REQUEST] Session: ${sessionId} | Amount: ₹${amount} | UPI: ${upiId}`);

    if (!sessionId || !amount || !upiId) {
        return res.status(400).json({
            success: false,
            error: "Missing required payout parameters."
        });
    }

    // Check if session has already been claimed
    if (usedSessions.has(sessionId)) {
        return res.status(400).json({
            success: false,
            error: "This QR code reward has already been claimed!"
        });
    }

    try {
        // Prepare request payload for Cashfree Sandbox Direct Transfer
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

        // Call Cashfree Sandbox Payout Endpoint
        const response = await axios.post(
            'https://sandbox.cashfree.com/payout/transfers',
            payload,
            {
                headers: {
                    'X-Client-Id': CASHFREE_CLIENT_ID,
                    'X-Client-Secret': CASHFREE_CLIENT_SECRET,
                    'x-api-version': '2024-01-01',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Mark the session as used upon success
        usedSessions.add(sessionId);

        // Return transfer reference
        res.json({
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

// Health check route
app.get('/', (req, res) => {
    res.send("RVM Payout Server is Running!");
});

module.exports = app;

// Listen only when executed locally (not inside Vercel serverless environment)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Payout server running on port ${PORT}`);
    });
}
