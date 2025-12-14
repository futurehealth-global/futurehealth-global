const express = require('express');
const { uploadImage, generateProfilePicUrl } = require('../config/cloudinary'); // ✅ FIXED PATH
const { auth } = require('../middleware/auth');
const router = express.Router();

// Upload image for doctors/patients
router.post('/upload', auth, async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ success: false, message: 'No image provided' });
        }
        
        const imageFile = req.files.image;
        const result = await uploadImage(imageFile.tempFilePath, {
            folder: 'future-health/uploads'
        });

        res.json({
            success: true,
            imageUrl: result.secure_url,
            publicId: result.public_id,
            optimizedUrl: generateProfilePicUrl(result.public_id)
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Image upload failed' });
    }
});

// Get optimized image URL
router.get('/optimize/:publicId', (req, res) => {
    try {
        const { publicId } = req.params;
        const { width, height } = req.query;
        
        const optimizedUrl = generateProfilePicUrl(publicId, 
            width ? parseInt(width) : 500, 
            height ? parseInt(height) : 500
        );

        res.json({
            success: true,
            optimizedUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Optimization failed'
        });
    }
});

module.exports = router;