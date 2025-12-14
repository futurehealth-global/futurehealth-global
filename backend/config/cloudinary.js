const cloudinary = require('cloudinary').v2;

// Configuration from environment variables
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Future Health specific upload function
const uploadImage = async (imagePath, options = {}) => {
    try {
        const uploadResult = await cloudinary.uploader.upload(imagePath, {
            folder: 'future-health',
            public_id: options.public_id,
            ...options
        });
        
        console.log('✅ Image uploaded successfully:', uploadResult.secure_url);
        return uploadResult;
    } catch (error) {
        console.error('❌ Upload failed:', error);
        throw error;
    }
};

// Future Health specific optimization URL generator
const generateOptimizedUrl = (publicId, options = {}) => {
    return cloudinary.url(publicId, {
        fetch_format: 'auto',
        quality: 'auto',
        ...options
    });
};

// Future Health specific transform URL generator (for profile pics)
const generateProfilePicUrl = (publicId, width = 500, height = 500) => {
    return cloudinary.url(publicId, {
        crop: 'auto',
        gravity: 'auto',
        width: width,
        height: height,
        fetch_format: 'auto',
        quality: 'auto'
    });
};

module.exports = {
    cloudinary,
    uploadImage,
    generateOptimizedUrl,
    generateProfilePicUrl
};