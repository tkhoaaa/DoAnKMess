const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/users
// @desc    Get all users (for search)
// @access  Private
router.get('/', authenticateToken, userController.getUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticateToken, userController.getUser);

// @route   PUT /api/users/avatar
// @desc    Update user avatar
// @access  Private
router.put('/avatar', authenticateToken, upload.single('avatar'), userController.updateAvatar);

// @route   POST /api/users/:id/follow
// @desc    Follow/Unfollow user
// @access  Private
router.post('/:id/follow', authenticateToken, userController.toggleFollow);

// @route   GET /api/users/:id/followers
// @desc    Get user followers
// @access  Private
router.get('/:id/followers', authenticateToken, userController.getFollowers);

// @route   GET /api/users/:id/following
// @desc    Get users that this user is following
// @access  Private
router.get('/:id/following', authenticateToken, userController.getFollowing);

// @route   GET /api/users/search/:term
// @desc    Search users
// @access  Private
router.get('/search/:term', authenticateToken, userController.searchUsers);

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Private
router.get('/:id/stats', authenticateToken, userController.getUserStats);

module.exports = router;