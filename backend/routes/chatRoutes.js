const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

// Create or get chat for secondhand item
router.post('/create-or-get', chatController.createOrGetChat);

// Send message
router.post('/:chatId/messages', chatController.sendMessage);

// Get messages
router.get('/:chatId/messages', chatController.getMessages);

// List user's chats
router.get('/', chatController.listChats);

module.exports = router;
