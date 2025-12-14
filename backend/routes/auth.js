const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Enhanced signup with intern support
router.post('/signup', async (req, res) => {
    try {
        const { 
            name, email, password, userType, phone, dateOfBirth, gender, address,
            // DOCTOR/INTERN FIELDS
            licenseNumber, specialization, experience, consultationFee, bio,
            // INTERN-SPECIFIC FIELDS
            medicalSchool, graduationYear, studyYear, interestArea, studentId
        } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'User already exists' 
            });
        }
        
        const userData = { 
            name, email, password, userType, phone 
        };

        // ADD DOCTOR/INTERN SPECIFIC DATA
        if (userType === 'doctor' || userType === 'intern') {
            userData.specialization = specialization;
            userData.bio = bio;
            userData.consultationFee = consultationFee || (userType === 'intern' ? 1500 : 5000);
            
            if (userType === 'doctor') {
                userData.licenseNumber = licenseNumber;
                userData.experience = experience;
            }
            
            if (userType === 'intern') {
                userData.medicalSchool = medicalSchool;
                userData.graduationYear = graduationYear;
                userData.studyYear = studyYear;
                userData.interestArea = interestArea;
                userData.studentId = studentId;
            }
        }
        
        // ✅ INITIALIZE WALLET FOR DOCTORS/INTERNS
        if (userType === 'doctor' || userType === 'intern') {
            userData.wallet = {
                balance: 0,
                pendingBalance: 0,
                totalEarned: 0,
                transactions: []
            };
        }
        
        const user = new User(userData);
        await user.save();
        
        // ✅ ADDED JWT_SECRET FALLBACK
        const token = jwt.sign(
            { userId: user._id, userType: user.userType },
            process.env.JWT_SECRET || 'future-health-secret-key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
        );
        
        res.status(201).json({
            success: true,
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                userType: user.userType,
                specialization: user.specialization,
                consultationFee: user.consultationFee,
                medicalSchool: user.medicalSchool,
                studyYear: user.studyYear,
                // ✅ RETURN WALLET INFO
                wallet: user.wallet ? {
                    balance: user.wallet.balance,
                    pendingBalance: user.wallet.pendingBalance,
                    totalEarned: user.wallet.totalEarned
                } : null
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Simple login (no changes needed)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || !(await user.correctPassword(password))) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }
        
        // ✅ ADDED JWT_SECRET FALLBACK
        const token = jwt.sign(
            { userId: user._id, userType: user.userType },
            process.env.JWT_SECRET || 'future-health-secret-key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
        );
        
        res.json({
            success: true,
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                userType: user.userType,
                specialization: user.specialization,
                consultationFee: user.consultationFee,
                medicalSchool: user.medicalSchool,
                studyYear: user.studyYear,
                // ✅ RETURN WALLET INFO
                wallet: user.wallet ? {
                    balance: user.wallet.balance,
                    pendingBalance: user.wallet.pendingBalance,
                    totalEarned: user.wallet.totalEarned
                } : null,
                // ✅ RETURN BANK DETAILS STATUS
                bankDetails: user.bankDetails ? {
                    hasBankDetails: true,
                    verified: user.bankDetails.verified,
                    bankName: user.bankDetails.bankName,
                    accountNumber: `****${user.bankDetails.accountNumber?.slice(-4) || ''}`
                } : { hasBankDetails: false }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Get current user profile
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // ✅ ADDED JWT_SECRET FALLBACK
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'future-health-secret-key');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                phone: user.phone,
                specialization: user.specialization,
                consultationFee: user.consultationFee,
                medicalSchool: user.medicalSchool,
                studyYear: user.studyYear,
                bio: user.bio,
                profileImage: user.profileImage,
                // ✅ RETURN WALLET
                wallet: user.wallet ? {
                    balance: user.wallet.balance,
                    pendingBalance: user.wallet.pendingBalance,
                    totalEarned: user.wallet.totalEarned
                } : null,
                // ✅ RETURN BANK DETAILS
                bankDetails: user.bankDetails ? {
                    hasBankDetails: true,
                    verified: user.bankDetails.verified,
                    bankName: user.bankDetails.bankName,
                    accountNumber: `****${user.bankDetails.accountNumber?.slice(-4) || ''}`
                } : { hasBankDetails: false },
                // ✅ ADD WALLET SUMMARY FOR FRONTEND
                walletSummary: user.wallet ? {
                    canWithdraw: user.wallet.balance >= 1000 && user.bankDetails?.verified,
                    formattedBalance: `₦${user.wallet.balance.toLocaleString()}`,
                    formattedPending: `₦${user.wallet.pendingBalance.toLocaleString()}`,
                    formattedTotal: `₦${user.wallet.totalEarned.toLocaleString()}`
                } : null
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

module.exports = router;