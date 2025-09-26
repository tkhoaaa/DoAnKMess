const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Private
router.get('/', authController.protect, postController.getPosts);

// @route   GET /api/posts/:id
// @desc    Get single post
// @access  Private
router.get('/:id', authController.protect, postController.getPost);

// @route   POST /api/posts
// @desc    Create new post
// @access  Private
router.post('/', authController.protect, upload.single('image'), postController.createPost);

// @route   PUT /api/posts/:id
// @desc    Update post
// @access  Private
router.put('/:id', authController.protect, postController.updatePost);

// @route   DELETE /api/posts/:id
// @desc    Delete post
// @access  Private
router.delete('/:id', authController.protect, postController.deletePost);

// @route   POST /api/posts/:id/like
// @desc    Like/Unlike post
// @access  Private
router.post('/:id/like', authController.protect, postController.toggleLike);

// @route   POST /api/posts/:id/comment
// @desc    Add comment to post
// @access  Private
router.post('/:id/comment', authController.protect, postController.addComment);

// @route   DELETE /api/posts/:id/comment/:commentId
// @desc    Delete comment
// @access  Private
router.delete('/:id/comment/:commentId', authController.protect, postController.deleteComment);

// @route   GET /api/posts/user/:userId
// @desc    Get posts by user
// @access  Private
router.get('/user/:userId', authController.protect, postController.getUserPosts);

module.exports = router;