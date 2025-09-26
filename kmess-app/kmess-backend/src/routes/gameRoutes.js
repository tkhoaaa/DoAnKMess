const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authController = require('../controllers/authController');

// @route   GET /api/games
// @desc    Get all available games
// @access  Private
router.get('/', authController.protect, gameController.getGames);

// @route   POST /api/games/session
// @desc    Create new game session
// @access  Private
router.post('/session', authController.protect, gameController.createGameSession);

// @route   GET /api/games/session/:sessionId
// @desc    Get game session details
// @access  Private
router.get('/session/:sessionId', authController.protect, gameController.getGameSession);

// @route   POST /api/games/session/:sessionId/join
// @desc    Join game session
// @access  Private
router.post('/session/:sessionId/join', authController.protect, gameController.joinGameSession);

// @route   POST /api/games/session/:sessionId/leave
// @desc    Leave game session
// @access  Private
router.post('/session/:sessionId/leave', authController.protect, gameController.leaveGameSession);

// @route   POST /api/games/session/:sessionId/move
// @desc    Make game move
// @access  Private
router.post('/session/:sessionId/move', authController.protect, gameController.makeMove);

// @route   POST /api/games/session/:sessionId/finish
// @desc    Finish game session
// @access  Private
router.post('/session/:sessionId/finish', authController.protect, gameController.finishGameSession);

// @route   GET /api/games/leaderboard/:gameType
// @desc    Get game leaderboard
// @access  Private
router.get('/leaderboard/:gameType', authController.protect, gameController.getLeaderboard);

// @route   GET /api/games/history
// @desc    Get user game history
// @access  Private
router.get('/history', authController.protect, gameController.getUserGameHistory);

// @route   GET /api/games/stats/:gameType
// @desc    Get user game statistics
// @access  Private
router.get('/stats/:gameType', authController.protect, gameController.getUserGameStats);

module.exports = router;