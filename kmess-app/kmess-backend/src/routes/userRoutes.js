const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

// @route   GET /api/users
// @desc    Get all users (for search)
// @access  Private
router.get('/', authController.protect, userController.getUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authController.protect, userController.getUser);

// @route   PUT /api/users/avatar
// @desc    Update user avatar
// @access  Private
router.put('/avatar', authController.protect, upload.single('avatar'), userController.updateAvatar);

// @route   POST /api/users/:id/follow
// @desc    Follow/Unfollow user
// @access  Private
router.post('/:id/follow', authController.protect, userController.toggleFollow);

// @route   GET /api/users/:id/followers
// @desc    Get user followers
// @access  Private
router.get('/:id/followers', authController.protect, userController.getFollowers);

// @route   GET /api/users/:id/following
// @desc    Get users that this user is following
// @access  Private
router.get('/:id/following', authController.protect, userController.getFollowing);

// @route   GET /api/users/search/:term
// @desc    Search users
// @access  Private
router.get('/search/:term', authController.protect, userController.searchUsers);

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Private
router.get('/:id/stats', authController.protect, userController.getUserStats);

module.exports = router;