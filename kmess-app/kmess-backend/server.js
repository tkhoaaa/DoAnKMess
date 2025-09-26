const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import database connection
const { testConnection, initDatabase } = require('./src/config/database');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const postRoutes = require('./src/routes/postRoutes');
const gameRoutes = require('./src/routes/gameRoutes');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:8081', // Expo web
        'http://localhost:19006', // Expo dev server  
        'http://localhost:19000', // Alternative port
        'exp://localhost:8081', // Expo scheme
        'exp://192.168.1.7:8081', // Local network
        'http://192.168.1.7:8081' // IP address for device testing
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'KMess API Server is running! 🚀',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            posts: '/api/posts',
            games: '/api/games'
        }
    });
});

// Real API routes with database
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/games', gameRoutes);

// Socket.io for real-time features
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Game room handling
    socket.on('join-game-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
        console.log(`User ${socket.id} joined game room: ${roomId}`);
    });

    socket.on('leave-game-room', (roomId) => {
        socket.leave(roomId);
        socket.to(roomId).emit('user-left', socket.id);
        console.log(`User ${socket.id} left game room: ${roomId}`);
    });

    // Game events
    socket.on('game-action', (data) => {
        socket.to(data.roomId).emit('game-action', data);
    });

    // Chat messages
    socket.on('chat-message', (data) => {
        socket.to(data.roomId).emit('chat-message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Initialize database and start server
const startServer = async() => {
    try {
        // Test database connection
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('❌ Cannot start server: Database connection failed');
            console.log('💡 Please check your MySQL connection and .env file');
            process.exit(1);
        }

        // Initialize database schema if needed
        await initDatabase();

        // Start server
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 KMess Server is running on http://192.168.1.7:${PORT}`);
            console.log(`🌐 Server listening on all network interfaces`);
            console.log(`📱 Health check: http://192.168.1.7:${PORT}`);
            console.log(`🎮 Socket.io server ready for real-time games`);
            console.log(`✅ MySQL database connected successfully`);
            console.log(`📱 Real authentication enabled - users will be saved to database!`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();