const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Withdrawal = require('../models/Withdrawal');
const PaystackService = require('../services/paystackService');
const { auth, authorize } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

const router = express.Router();

// ✅ GET BANKS LIST FROM PAYSTACK
router.get('/banks', auth, authorize('doctor', 'intern'), async (req, res) => {
    try {
        const bankResult = await PaystackService.getBanks();
        
        res.json({
            success: bankResult.success,
            banks: bankResult.banks
        });
    } catch (error) {
        console.error('Get banks error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching banks'
        });
    }
});

// ✅ VERIFY BANK ACCOUNT WITH PAYSTACK
router.post('/verify-bank-account', auth, authorize('doctor', 'intern'), async (req, res) => {
    try {
        const { accountNumber, bankCode } = req.body;
        
        if (!accountNumber || !bankCode) {
            return res.status(400).json({
                success: false,
                message: 'Account number and bank code required'
            });
        }
        
        const verification = await PaystackService.verifyAccount(accountNumber, bankCode);
        
        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message: verification.message
            });
        }
        
        res.json({
            success: true,
            accountName: verification.accountName,
            accountNumber: verification.accountNumber
        });
    } catch (error) {
        console.error('Verify bank error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying account'
        });
    }
});

// ✅ UPDATE BANK DETAILS WITH PAYSTACK RECIPIENT
router.post('/bank-details', auth, authorize('doctor', 'intern'), async (req, res) => {
    try {
        const { accountNumber, accountName, bankName, bankCode } = req.body;
        const userId = req.user.id;

        if (!accountNumber || !accountName || !bankName || !bankCode) {
            return res.status(400).json({
                success: false,
                message: 'All bank details required'
            });
        }

        // Verify with Paystack
        const verification = await PaystackService.verifyAccount(accountNumber, bankCode);
        
        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message: verification.message
            });
        }

        // Create Paystack recipient
        const recipientResult = await PaystackService.createTransferRecipient({
            accountNumber,
            accountName: verification.accountName,
            bankCode
        });

        if (!recipientResult.success) {
            return res.status(400).json({
                success: false,
                message: recipientResult.message
            });
        }

        // Update user
        await User.findByIdAndUpdate(userId, {
            bankDetails: {
                accountNumber,
                accountName: verification.accountName,
                bankName,
                bankCode,
                paystackRecipientCode: recipientResult.recipientCode,
                verified: true,
                verifiedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Bank details saved successfully',
            accountName: verification.accountName
        });
    } catch (error) {
        console.error('Update bank error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating bank details'
        });
    }
});

// ✅ REQUEST WITHDRAWAL WITH PAYSTACK AUTO-TRANSFER
router.post('/withdraw', auth, authorize('doctor', 'intern'), async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        // Get doctor
        const doctor = await User.findById(userId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Check Paystack
        if (!PaystackService.isConfigured()) {
            return res.status(400).json({
                success: false,
                message: 'Payment system unavailable'
            });
        }

        // Check bank details
        if (!doctor.bankDetails?.paystackRecipientCode) {
            return res.status(400).json({
                success: false,
                message: 'Please add bank details first'
            });
        }

        // Validate amount
        if (!amount || amount < 1000) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal: ₦1,000'
            });
        }

        if (amount > 1000000) {
            return res.status(400).json({
                success: false,
                message: 'Maximum withdrawal: ₦1,000,000'
            });
        }

        if (doctor.wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available: ₦${doctor.wallet.balance}`
            });
        }

        // Calculate fee: ₦10 + 0.5%
        const paystackFee = 10 + (amount * 0.005);
        const netAmount = amount - Math.max(paystackFee, 25);

        // Create withdrawal record
        const withdrawal = new Withdrawal({
            doctor: userId,
            doctorName: doctor.name,
            doctorEmail: doctor.email,
            doctorType: doctor.userType,
            amount: amount,
            bankDetails: doctor.bankDetails,
            paystackRecipientCode: doctor.bankDetails.paystackRecipientCode,
            paystackFee: paystackFee,
            netAmount: netAmount,
            status: 'pending'
        });

        await withdrawal.save();

        // ✅ AUTOMATIC PAYSTACK TRANSFER
        const transferResult = await PaystackService.initiateTransfer(
            doctor.bankDetails.paystackRecipientCode,
            netAmount,
            `Future Health Payout for ${doctor.name}`
        );

        if (!transferResult.success) {
            withdrawal.status = 'failed';
            withdrawal.failureReason = transferResult.message;
            withdrawal.failedAt = new Date();
            await withdrawal.save();

            return res.status(400).json({
                success: false,
                message: `Withdrawal failed: ${transferResult.message}`
            });
        }

        // Update withdrawal with Paystack reference
        withdrawal.status = 'processing';
        withdrawal.paystackTransferCode = transferResult.transferCode;
        withdrawal.paystackReference = transferResult.reference;
        withdrawal.processingStartedAt = new Date();
        await withdrawal.save();

        // Deduct from balance
        doctor.wallet.balance -= amount;
        doctor.wallet.transactions.push({
            amount: -amount,
            type: 'debit',
            description: `Withdrawal #${withdrawal._id} to ${doctor.bankDetails.bankName}`,
            status: 'processing'
        });
        
        await doctor.save();

        res.json({
            success: true,
            message: 'Withdrawal submitted. Funds will arrive within 24 hours.',
            withdrawal: {
                id: withdrawal._id,
                amount: `₦${amount.toLocaleString()}`,
                netAmount: `₦${netAmount.toLocaleString()}`,
                fee: `₦${Math.max(paystackFee, 25).toLocaleString()}`,
                status: 'processing',
                reference: transferResult.reference
            },
            newBalance: doctor.wallet.balance
        });

    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing withdrawal'
        });
    }
});

// ✅ CHECK WITHDRAWAL STATUS
router.get('/withdrawal/:id/status', auth, authorize('doctor', 'intern'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const withdrawal = await Withdrawal.findOne({
            _id: id,
            doctor: userId
        });

        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal not found'
            });
        }

        // Check Paystack status if processing
        if (withdrawal.status === 'processing' && withdrawal.paystackReference) {
            const verification = await PaystackService.verifyTransfer(withdrawal.paystackReference);
            
            if (verification.success) {
                if (verification.status === 'success') {
                    withdrawal.status = 'completed';
                    withdrawal.completedAt = new Date();
                    await withdrawal.save();
                } else if (verification.status === 'failed') {
                    withdrawal.status = 'failed';
                    withdrawal.failureReason = verification.data.reason;
                    withdrawal.failedAt = new Date();
                    
                    // Refund
                    const doctor = await User.findById(userId);
                    doctor.wallet.balance += withdrawal.amount;
                    
                    const transaction = doctor.wallet.transactions.find(
                        t => t.description && t.description.includes(`Withdrawal #${withdrawal._id}`)
                    );
                    if (transaction) {
                        transaction.status = 'failed';
                    }
                    
                    await doctor.save();
                }
            }
        }

        res.json({
            success: true,
            withdrawal: withdrawal
        });
    } catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking status'
        });
    }
});

// ✅ GET WALLET INFO WITH PAYSTACK STATUS
router.get('/wallet', auth, authorize('doctor', 'intern'), async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id)
            .select('wallet bankDetails consultationFee name userType');

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        const recentTransactions = doctor.wallet.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        const withdrawals = await Withdrawal.find({ doctor: req.user.id })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            wallet: {
                balance: doctor.wallet.balance,
                pendingBalance: doctor.wallet.pendingBalance,
                totalEarned: doctor.wallet.totalEarned
            },
            bankDetails: doctor.bankDetails,
            paystackAvailable: PaystackService.isConfigured(),
            recentTransactions,
            withdrawals,
            userType: doctor.userType
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wallet'
        });
    }
});

// Keep all your existing routes below...
// Get appointments, update profile, upload image, etc.

module.exports = router;