const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.getOrCreateConversation);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/messages', chatController.sendMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);
router.post('/typing', chatController.notifyTyping);
router.put('/conversations/:conversationId/read', chatController.markAsRead);
router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;
