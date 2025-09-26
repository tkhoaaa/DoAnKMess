const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friendsController');
const { authenticateToken } = require('../middleware/auth');

// ================================
// FRIENDS API ROUTES
// ================================

// Get user's friends list
router.get('/', authenticateToken, friendsController.getFriends);

// Get pending friend requests (received)
router.get('/requests', authenticateToken, friendsController.getFriendRequests);

// Get sent friend requests
router.get('/requests/sent', authenticateToken, friendsController.getSentRequests);

// Search users to add as friends
router.get('/search', authenticateToken, friendsController.searchUsers);

// Send friend request
router.post('/request', authenticateToken, friendsController.sendFriendRequest);

// Accept friend request
router.post('/accept/:requestId', authenticateToken, friendsController.acceptFriendRequest);

// Reject friend request
router.post('/reject/:requestId', authenticateToken, friendsController.rejectFriendRequest);

// Remove friend (unfriend)
router.delete('/:friendId', authenticateToken, friendsController.removeFriend);

// Block user
router.post('/block/:userId', authenticateToken, friendsController.blockUser);

// Unblock user
router.post('/unblock/:userId', authenticateToken, friendsController.unblockUser);

// Get blocked users
router.get('/blocked', authenticateToken, friendsController.getBlockedUsers);

// Get mutual friends
router.get('/mutual/:userId', authenticateToken, friendsController.getMutualFriends);

// Check friendship status with another user
router.get('/status/:userId', authenticateToken, friendsController.getFriendshipStatus);

module.exports = router;