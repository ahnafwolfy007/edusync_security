const express = require('express');
const router = express.Router();
const accommodationController = require('../controllers/accommodationController');
const { authenticateToken } = require('../middlewares/auth');

// Public routes (no authentication required)
router.get('/properties', accommodationController.getAllProperties);
router.get('/properties/:id', accommodationController.getProperty);

// Protected routes (authentication required)
router.use(authenticateToken);

// Property management
router.post('/properties', accommodationController.createProperty);
router.get('/my-properties', accommodationController.getMyProperties);
router.put('/properties/:id', accommodationController.updateProperty);
router.delete('/properties/:id', accommodationController.deleteProperty);

// Inquiry management
router.post('/properties/:id/inquire', accommodationController.submitInquiry);
router.get('/properties/:id/inquiries', accommodationController.getPropertyInquiries);

module.exports = router;
