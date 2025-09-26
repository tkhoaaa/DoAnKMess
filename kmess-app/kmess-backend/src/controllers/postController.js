const { promisePool } = require('../config/database');

// @desc    Get all posts (feed)
// @route   GET /api/posts
// @access  Private
const getPosts = async(req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [posts] = await promisePool.execute(
            `SELECT 
        p.id, p.user_id, p.image_url, p.caption, p.likes_count, p.comments_count, p.created_at,
        u.username, u.display_name, u.avatar_url
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC 
       LIMIT ? OFFSET ?`, [limit, offset]
        );

        res.json({
            success: true,
            count: posts.length,
            data: posts
        });

    } catch (error) {
        next(error);
    }
};

// Placeholder functions
const getPost = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const createPost = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const updatePost = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const deletePost = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const toggleLike = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const addComment = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const deleteComment = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const getUserPosts = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

module.exports = {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    addComment,
    deleteComment,
    getUserPosts
};