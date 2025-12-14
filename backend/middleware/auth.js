const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false,
                message: 'Access denied. No token provided.' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'future-health-secret-key');
        
        // Find user
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found. Please login again.' 
            });
        }
        
        // Check if doctor/intern is verified (optional for production)
        if ((user.userType === 'doctor' || user.userType === 'intern') && !user.isVerified) {
            return res.status(403).json({ 
                success: false,
                message: 'Account not verified. Please verify your account to access all features.' 
            });
        }
        
        // Attach user to request
        req.user = user;
        req.token = token;
        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token. Please login again.' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired. Please login again.' 
            });
        }
        
        // Generic error
        res.status(500).json({ 
            success: false,
            message: 'Authentication error' 
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user exists
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: 'Not authenticated' 
            });
        }
        
        // Check if user has required role
        if (!roles.includes(req.user.userType)) {
            return res.status(403).json({ 
                success: false,
                message: `Access denied. ${req.user.userType}s cannot access this resource.` 
            });
        }
        
        // ✅ Additional checks for doctors/interns accessing wallet features
        if (roles.includes('doctor') || roles.includes('intern')) {
            // Check if trying to access wallet without bank details
            const isWalletRoute = req.originalUrl.includes('/wallet') || 
                                 req.originalUrl.includes('/withdraw') || 
                                 req.originalUrl.includes('/bank-details');
            
            if (isWalletRoute && !req.user.bankDetails?.verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Please add and verify your bank details to access wallet features.'
                });
            }
        }
        
        next();
    };
};

// Admin middleware (for future use)
const admin = (req, res, next) => {
    if (req.user && req.user.userType === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Admin access required' 
        });
    }
};

// Doctor/Intern specific middleware
const doctorOrIntern = (req, res, next) => {
    if (req.user && (req.user.userType === 'doctor' || req.user.userType === 'intern')) {
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Doctor or Intern access required' 
        });
    }
};

// Wallet access middleware (checks balance)
const canWithdraw = (req, res, next) => {
    if (req.user && req.user.userType === 'doctor' || req.user.userType === 'intern') {
        // Check minimum balance for withdrawal
        if (req.method === 'POST' && req.originalUrl.includes('/withdraw')) {
            const { amount } = req.body;
            const minimumWithdrawal = 1000;
            
            if (amount && amount < minimumWithdrawal) {
                return res.status(400).json({
                    success: false,
                    message: `Minimum withdrawal amount is ₦${minimumWithdrawal.toLocaleString()}`
                });
            }
            
            if (req.user.wallet?.balance < amount) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. Available: ₦${req.user.wallet?.balance || 0}`
                });
            }
        }
        
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Wallet access requires doctor or intern account' 
        });
    }
};

module.exports = { 
    auth, 
    authorize, 
    admin, 
    doctorOrIntern,
    canWithdraw 
};