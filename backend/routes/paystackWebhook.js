const express = require('express');
const crypto = require('crypto');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

const router = express.Router();

// Paystack webhook handler
router.post('/webhook', async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac('sha512', secret)
            .update(JSON.stringify(req.body))
            .digest('hex');
        
        if (hash !== req.headers['x-paystack-signature']) {
            console.error('Invalid Paystack signature');
            return res.sendStatus(400);
        }
        
        const event = req.body;
        console.log('Paystack webhook:', event.event);
        
        // Handle transfer success
        if (event.event === 'transfer.success') {
            const withdrawal = await Withdrawal.findOne({
                paystackReference: event.data.reference
            });
            
            if (withdrawal) {
                withdrawal.status = 'completed';
                withdrawal.completedAt = new Date();
                await withdrawal.save();
                
                // Update doctor's transaction
                const doctor = await User.findById(withdrawal.doctor);
                if (doctor) {
                    const transaction = doctor.wallet.transactions.find(
                        t => t.description && t.description.includes(`Withdrawal #${withdrawal._id}`)
                    );
                    if (transaction) {
                        transaction.status = 'completed';
                    }
                    await doctor.save();
                }
                
                console.log(`Withdrawal ${withdrawal._id} completed via webhook`);
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

module.exports = router;