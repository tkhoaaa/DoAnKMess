const { promisePool } = require('../config/database');

// @desc    Get all available games
// @route   GET /api/games
// @access  Private
const getGames = async(req, res, next) => {
    try {
        const [games] = await promisePool.execute(
            `SELECT id, name, type, max_players, description, is_active 
       FROM games 
       WHERE is_active = 1 
       ORDER BY name`
        );

        res.json({
            success: true,
            count: games.length,
            data: games
        });

    } catch (error) {
        next(error);
    }
};

// Placeholder functions for game functionality
const createGameSession = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const getGameSession = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const joinGameSession = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const leaveGameSession = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const makeMove = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const finishGameSession = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const getLeaderboard = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const getUserGameHistory = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

const getUserGameStats = async(req, res, next) => {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
};

module.exports = {
    getGames,
    createGameSession,
    getGameSession,
    joinGameSession,
    leaveGameSession,
    makeMove,
    finishGameSession,
    getLeaderboard,
    getUserGameHistory,
    getUserGameStats
};