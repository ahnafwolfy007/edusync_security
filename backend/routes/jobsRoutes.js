const express = require('express');
const router = express.Router();
const {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getUserJobs,
  applyForJob,
  getJobApplications,
  searchJobs
} = require('../controllers/jobsController');
const { authenticateToken } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

// Public routes
router.get('/', getAllJobs);
router.get('/search', searchJobs);
router.get('/:id', getJobById);

// Protected routes
router.use(authenticateToken);

// Create job
router.post('/', createJob);

// Get user's jobs
router.get('/user/my-jobs', getUserJobs);

// Apply for job with resume
router.post('/:id/apply', upload.single('resume'), applyForJob);

// Get job applications (for job poster)
router.get('/:id/applications', getJobApplications);

// Update and delete jobs
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

module.exports = router;
