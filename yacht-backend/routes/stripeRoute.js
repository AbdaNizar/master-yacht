const express = require('express');
require('dotenv').config();
const router = express.Router();


const stripe = require('stripe')(process.env.STRIPE_KEY); // Replace with your Secret Key

router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({ error: 'Missing required parameters: amount, currency' });
        }
        const paymentIntent = await stripe.paymentIntents.create({
            amount, // Amount in cents
            currency,
            payment_method_types: ['card'],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('❌ Error creating PaymentIntent:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
