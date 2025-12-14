const multer = require('multer');
const path = require('path');
const { cloudinary } = require('../config/cloudinary'); // Use your existing config

// Simple memory storage - we'll handle Cloudinary upload manually
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (file, folder = 'future-health/general') => {
  try {
    const dataURI = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      public_id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto' },
        { format: 'webp' }
      ]
    });

    return uploadResult;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Helper function for profile image uploads
const uploadProfileImage = async (file, userId) => {
  return uploadToCloudinary(file, 'future-health/profiles');
};

// Helper function for medical documents
const uploadMedicalDocument = async (file, userId) => {
  return uploadToCloudinary(file, 'future-health/documents');
};

module.exports = {
  upload,
  uploadToCloudinary,
  uploadProfileImage,
  uploadMedicalDocument
};