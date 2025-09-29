const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const { authenticateToken } = require('../middleware/auth');

// ================================
// MESSAGES API ROUTES  
// ================================

// Get user's conversations list
router.get('/conversations', authenticateToken, messagesController.getConversations);

// Get or create conversation with a friend
router.post('/conversations', authenticateToken, messagesController.createConversation);

// Get or create direct conversation with friend
router.post('/conversations/direct/:friendId', authenticateToken, messagesController.getOrCreateDirectConversation);

// Get conversation details
router.get('/conversations/:conversationId', authenticateToken, messagesController.getConversation);

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, messagesController.getMessages);

// Send message
router.post('/conversations/:conversationId/messages', authenticateToken, messagesController.sendMessage);

// Edit message
router.put('/messages/:messageId', authenticateToken, messagesController.editMessage);

// Delete message
router.delete('/messages/:messageId', authenticateToken, messagesController.deleteMessage);

// React to message
router.post('/messages/:messageId/reactions', authenticateToken, messagesController.addReaction);

// Remove reaction from message
router.delete('/messages/:messageId/reactions/:reactionType', authenticateToken, messagesController.removeReaction);

// Mark conversation as read
router.post('/conversations/:conversationId/read', authenticateToken, messagesController.markAsRead);

// Search messages
router.get('/search', authenticateToken, messagesController.searchMessages);

// Get message reactions
router.get('/messages/:messageId/reactions', authenticateToken, messagesController.getReactions);

// Leave conversation (group chat)
router.post('/conversations/:conversationId/leave', authenticateToken, messagesController.leaveConversation);

// Add user to conversation (group chat)
router.post('/conversations/:conversationId/participants', authenticateToken, messagesController.addParticipant);

// Remove user from conversation (group chat)
router.delete('/conversations/:conversationId/participants/:userId', authenticateToken, messagesController.removeParticipant);

module.exports = router;