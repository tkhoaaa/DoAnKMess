const validator = require('validator');

// Validation middleware for user registration
const validateRegister = (req, res, next) => {
    const { username, email, password, displayName } = req.body;
    const errors = [];

    // Username validation
    if (!username) {
        errors.push('Username is required');
    } else if (username.length < 3 || username.length > 30) {
        errors.push('Username must be between 3 and 30 characters');
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    }

    // Email validation
    if (!email) {
        errors.push('Email is required');
    } else if (!validator.isEmail(email)) {
        errors.push('Please enter a valid email address');
    }

    // Password validation
    if (!password) {
        errors.push('Password is required');
    } else if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    // Display name validation
    if (!displayName) {
        errors.push('Display name is required');
    } else if (displayName.length < 2 || displayName.length > 50) {
        errors.push('Display name must be between 2 and 50 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

// Validation middleware for user login
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    // Email validation
    if (!email) {
        errors.push('Email is required');
    } else if (!validator.isEmail(email)) {
        errors.push('Please enter a valid email address');
    }

    // Password validation
    if (!password) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

// Validation middleware for post creation
const validatePost = (req, res, next) => {
    const { caption } = req.body;
    const errors = [];

    // Caption validation (optional but if provided, check length)
    if (caption && caption.length > 2000) {
        errors.push('Caption cannot exceed 2000 characters');
    }

    // Check if image is provided
    if (!req.file) {
        errors.push('Post image is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

// Validation middleware for comments
const validateComment = (req, res, next) => {
    const { content } = req.body;
    const errors = [];

    if (!content) {
        errors.push('Comment content is required');
    } else if (content.length < 1 || content.length > 500) {
        errors.push('Comment must be between 1 and 500 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

module.exports = {
    validateRegister,
    validateLogin,
    validatePost,
    validateComment
};