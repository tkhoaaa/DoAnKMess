const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId },
        process.env.JWT_SECRET || 'kmess_super_secret_key', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async(req, res, next) => {
    try {
        const { username, email, password, displayName } = req.body;

        // Check if user already exists
        const [existingUsers] = await promisePool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?', [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email or username'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const [result] = await promisePool.execute(
            `INSERT INTO users (username, email, password_hash, display_name, created_at) 
       VALUES (?, ?, ?, ?, NOW())`, [username, email, hashedPassword, displayName]
        );

        const userId = result.insertId;

        // Generate token
        const token = generateToken(userId);

        // Get created user (without password)
        const [newUser] = await promisePool.execute(
            `SELECT id, username, email, display_name, avatar_url, bio, total_score, created_at 
       FROM users WHERE id = ?`, [userId]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: newUser[0]
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async(req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const [users] = await promisePool.execute(
            'SELECT id, username, email, password_hash, display_name, avatar_url, bio, total_score FROM users WHERE email = ?', [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user.id);

        // Remove password from response
        delete user.password_hash;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async(req, res, next) => {
    try {
        const userId = req.user.id;

        const [users] = await promisePool.execute(
            `SELECT id, username, email, display_name, avatar_url, bio, total_score, created_at 
       FROM users WHERE id = ?`, [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        next(error);
    }
};

// Authentication middleware moved to ../middleware/auth.js

// Placeholder functions for future implementation
const updateProfile = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const updatePassword = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const forgotPassword = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const resetPassword = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    updatePassword,
    forgotPassword,
    resetPassword
};