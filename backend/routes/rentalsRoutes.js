const express = require('express');
const router = express.Router();
const {
  getAllRentals,
  getRentalById,
  createRental,
  updateRental,
  deleteRental,
  getUserRentals,
  searchRentals
} = require('../controllers/rentalsController');
const { authenticateToken } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

// Public routes
router.get('/', getAllRentals);
router.get('/search', searchRentals);
router.get('/:id', getRentalById);

// Protected routes
router.use(authenticateToken);

// Create rental with images
router.post('/', upload.array('images', 5), createRental);

// Get user's rentals
router.get('/user/my-rentals', getUserRentals);

// Update and delete rentals
router.put('/:id', upload.array('images', 5), updateRental);
router.delete('/:id', deleteRental);

module.exports = router;
