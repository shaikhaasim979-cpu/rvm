const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Set to keep track of already claimed session IDs
const usedSessions = new Set();

// Payout processing endpoint
app.post('/api/claim-payout', (req, res) => {
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

    // Mark the session as used
    usedSessions.add(sessionId);

    // Generate transaction reference ID
    const payoutId = "TXN_" + Math.floor(100000 + Math.random() * 900000);

    // Return success response
    res.json({
        success: true,
        payoutId: payoutId,
        message: "Payout processed successfully."
    });
});

// Health check route
app.get('/', (req, res) => {
    res.send("RVM Payout Server is Running on Vercel!");
});

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Payout server running on port ${PORT}`);
});
