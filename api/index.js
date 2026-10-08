const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for cross-origin requests from GitHub Pages
app.use(cors());

// Parse incoming JSON bodies
app.use(express.json());

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

    // Generate transaction reference ID
    const payoutId = "TXN_" + Math.floor(100000 + Math.random() * 900000);

    // Return success response to frontend
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

// Export Express app for Vercel Serverless Function engine
module.exports = app;

// Local listening fallback
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Payout server running on port ${PORT}`);
});