const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { uploadMiddleware, handleUploadError } = require('../middlewares/uploadMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Single file upload
router.post('/single', uploadMiddleware.single('file'), uploadController.uploadSingle);

// Multiple files upload
router.post('/multiple', uploadMiddleware.multiple('files', 10), uploadController.uploadMultiple);

// Specific upload endpoints
router.post('/profile-picture', uploadMiddleware.profilePicture, uploadController.uploadSingle);
router.post('/business-document', uploadMiddleware.businessDocument, uploadController.uploadSingle);
router.post('/product-images', uploadMiddleware.productImages, uploadController.uploadMultiple);
router.post('/secondhand-images', uploadMiddleware.secondhandImages, uploadController.uploadMultiple);
router.post('/rental-images', uploadMiddleware.rentalImages, uploadController.uploadMultiple);
router.post('/lost-found-images', uploadMiddleware.lostFoundImages, uploadController.uploadMultiple);

// File management
router.get('/files/:folder', uploadController.listFiles);
router.get('/files/:folder/:filename', uploadController.getFileInfo);
router.delete('/files/:folder/:filename', uploadController.deleteFile);

// File operations
router.post('/move-from-temp', uploadController.moveFromTemp);
router.post('/cleanup-temp', uploadController.cleanupTempFiles);

// Upload statistics
router.get('/stats', uploadController.getUploadStats);

// Error handling middleware
router.use(handleUploadError);

module.exports = router;
