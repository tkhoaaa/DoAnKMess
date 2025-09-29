const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// @desc    Protect routes (authentication middleware)
// @route   Used in protected routes
// @access  Private
const authenticateToken = async(req, res, next) => {
    try {
        let token;

        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided, authorization denied'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kmess_super_secret_key');

        // Get user from database
        const [users] = await promisePool.execute(
            `SELECT id, username, email, display_name, avatar_url, bio, total_score,
                    created_at, updated_at
             FROM users WHERE id = ?`, [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Token is not valid - user not found'
            });
        }

        // Add user to request object
        req.user = users[0];
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Token is malformed'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token has expired'
            });
        }

        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error in authentication'
        });
    }
};

// Optional middleware - doesn't fail if no token provided
const optionalAuth = async(req, res, next) => {
    try {
        let token;

        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            // No token provided, but that's okay for optional auth
            req.user = null;
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kmess_super_secret_key');

        // Get user from database
        const [users] = await promisePool.execute(
            `SELECT id, username, email, display_name, avatar_url, bio, total_score,
                    created_at, updated_at
             FROM users WHERE id = ?`, [decoded.userId]
        );

        if (users.length === 0) {
            req.user = null;
        } else {
            req.user = users[0];
        }

        next();

    } catch (error) {
        // For optional auth, just set user to null on any error
        req.user = null;
        next();
    }
};

// Admin role check middleware (use after authenticateToken)
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    // Check if user has admin role (you can modify this based on your user schema)
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }

    next();
};

// Check if user owns the resource (use after authenticateToken)
const requireOwnership = (resourceUserIdField = 'user_id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Check if the resource belongs to the authenticated user
        const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];

        if (!resourceUserId) {
            return res.status(400).json({
                success: false,
                error: `${resourceUserIdField} is required`
            });
        }

        if (parseInt(resourceUserId) !== parseInt(req.user.id)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied - you can only access your own resources'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireAdmin,
    requireOwnership
};