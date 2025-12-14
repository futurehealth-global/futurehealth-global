const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const PlatformEarnings = require('../models/PlatformEarnings');
const auth = require('../middleware/auth');

// Update bank details
router.post('/bank-details', auth, async (req, res) => {
    try {
        const { accountNumber, accountName, bankName, bankCode } = req.body;
        const userId = req.user.userId;
        
        // Validate required fields
        if (!accountNumber || !accountName || !bankName) {
            return res.status(400).json({
                success: false,
                message: 'Account number, account name, and bank name are required'
            });
        }
        
        // Update user bank details
        await User.findByIdAndUpdate(userId, {
            bankDetails: {
                accountNumber,
                accountName,
                bankName,
                bankCode: bankCode || '',
                verified: true // In production, verify with Paystack first
            }
        });
        
        res.json({
            success: true,
            message: 'Bank details updated successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Request withdrawal
router.post('/withdraw', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.userId;
        
        // Get doctor
        const doctor = await User.findById(userId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if doctor has bank details
        if (!doctor.bankDetails || !doctor.bankDetails.accountNumber) {
            return res.status(400).json({
                success: false,
                message: 'Please add your bank details first'
            });
        }
        
        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid withdrawal amount required'
            });
        }
        
        // Check minimum withdrawal (₦1,000)
        if (amount < 1000) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal amount is ₦1,000'
            });
        }
        
        // Check sufficient balance
        if (doctor.wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available: ₦${doctor.wallet.balance}`
            });
        }
        
        // Create withdrawal request
        const withdrawal = new Withdrawal({
            doctor: userId,
            amount,
            bankDetails: doctor.bankDetails,
            status: 'pending'
        });
        
        // Deduct from balance
        doctor.wallet.balance -= amount;
        doctor.wallet.transactions.push({
            amount: -amount,
            type: 'debit',
            description: `Withdrawal request #${withdrawal._id}`,
            status: 'pending'
        });
        
        // Save both
        await Promise.all([withdrawal.save(), doctor.save()]);
        
        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            withdrawal,
            newBalance: doctor.wallet.balance
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get withdrawal history
router.get('/withdrawals', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const withdrawals = await Withdrawal.find({ doctor: userId })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json({
            success: true,
            withdrawals
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get transaction history
router.get('/transactions', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const user = await User.findById(userId)
            .select('wallet.transactions');
        
        // Sort transactions by date (newest first)
        const transactions = user.wallet.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50); // Last 50 transactions
        
        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;