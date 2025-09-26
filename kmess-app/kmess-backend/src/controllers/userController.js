const { promisePool } = require('../config/database');

// @desc    Get all users (for search)
// @route   GET /api/users
// @access  Private
const getUsers = async(req, res, next) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let query = `
      SELECT id, username, display_name, avatar_url, bio 
      FROM users 
      WHERE username LIKE ? OR display_name LIKE ?
      ORDER BY username 
      LIMIT ? OFFSET ?
    `;

        const searchTerm = `%${search}%`;
        const [users] = await promisePool.execute(query, [searchTerm, searchTerm, limit, offset]);

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        next(error);
    }
};

// Placeholder functions
const getUser = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const updateAvatar = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const toggleFollow = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const getFollowers = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const getFollowing = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const searchUsers = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const getUserStats = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

module.exports = {
    getUsers,
    getUser,
    updateAvatar,
    toggleFollow,
    getFollowers,
    getFollowing,
    searchUsers,
    getUserStats
};