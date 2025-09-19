const express = require('express');
const router = express.Router();
const {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  getUserNotices,
  markNoticeAsRead
} = require('../controllers/noticeController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { scrapeNotices, upsertNotice } = require('../services/noticeScraper');
const { upload } = require('../middlewares/upload');

// Public routes
router.get('/', getAllNotices);
router.get('/:id', getNoticeById);

// Protected routes
router.use(authenticateToken);

// Mark notice as read
router.post('/:id/read', markNoticeAsRead);

// Get user's read notices
router.get('/user/read-notices', getUserNotices);

// Admin only routes
router.use(requireAdmin);

// Create notice with attachments
router.post('/', upload.array('attachments', 3), createNotice);

// Update and delete notices
router.put('/:id', upload.array('attachments', 3), updateNotice);
router.delete('/:id', deleteNotice);

// Manual scrape trigger (admin)
router.post('/scrape', async (req, res) => {
  try {
    const cfg = {
      url: process.env.NOTICES_SOURCE_URL,
      listSelector: process.env.NOTICES_LIST_SELECTOR,
      titleSelector: process.env.NOTICES_TITLE_SELECTOR,
      linkSelector: process.env.NOTICES_LINK_SELECTOR,
      contentSelector: process.env.NOTICES_CONTENT_SELECTOR,
      dateSelector: process.env.NOTICES_DATE_SELECTOR,
      maxPages: Number(req.body?.maxPages || process.env.NOTICES_MAX_PAGES || 3)
    };
    if (!cfg.url) {
      return res.status(400).json({ success:false, message:'Scraper config missing: NOTICES_SOURCE_URL is required.' });
    }
    const list = await scrapeNotices(cfg);
    let upserted = 0;
    for (const n of list) { await upsertNotice(n); upserted++; }
    res.json({ success:true, count: upserted, sample: list.slice(0,3) });
  } catch (e) { res.status(500).json({ success:false, message:e.message }); }
});

module.exports = router;
