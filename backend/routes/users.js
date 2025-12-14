// routes/users.js - FRESH & CLEAN
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Test endpoint - NEWLY ADDED
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: '✅ Future Health Users API is LIVE!',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api/users/profile',
            'PUT /api/users/profile', 
            'GET /api/users/test'
        ]
    });
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        // For now, just return success
        res.json({
            success: true,
            message: 'Profile endpoint working',
            user: { name: 'Test User', email: 'test@futurehealth.com' }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
});

// Update user profile - SIMPLE VERSION
router.put('/profile', async (req, res) => {
    try {
        console.log('Profile update received');

        // SIMPLE RESPONSE - NO AUTH, NO CLOUDINARY
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: { name: 'Updated User', updatedAt: new Date().toISOString() }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
});

module.exports = router;