const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for cross-origin requests from GitHub Pages
app.use(cors());

// Parse incoming JSON request bodies
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

    // Return success response to the GitHub Pages frontend
    res.json({
        success: true,
        payoutId: payoutId,
        message: "Payout processed successfully."
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Payout server listening on http://localhost:${PORT}`);
});