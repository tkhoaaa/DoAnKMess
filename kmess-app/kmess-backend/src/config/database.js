const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kmess_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: true
});

// Create promise wrapper for easier async/await usage
const promisePool = pool.promise();

// Test connection
const testConnection = async() => {
    try {
        const [rows] = await promisePool.execute('SELECT 1 as test');
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Initialize database schema
const initDatabase = async() => {
    try {
        console.log('🔄 Initializing KMess database schema...');

        // Create database if not exists
        await promisePool.execute(`
      CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'kmess_db'} 
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

        console.log('✅ Database schema initialized');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        return false;
    }
};

module.exports = {
    pool,
    promisePool,
    testConnection,
    initDatabase
};