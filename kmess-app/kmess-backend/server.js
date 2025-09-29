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
const friendsRoutes = require('./src/routes/friendsRoutes');
const messagesRoutes = require('./src/routes/messagesRoutes');

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
        'http://192.168.1.7:8081', // IP address for device testing
        'exp://172.20.10.3:8081', // Current network
        'http://172.20.10.3:8081' // Current network HTTP
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
        message: 'KMess API Server đã sẵn sàng! 🚀',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            posts: '/api/posts',
            games: '/api/games',
            friends: '/api/friends',
            messages: '/api/messages'
        }
    });
});

// Health check endpoint for network discovery
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Real API routes with database
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);

// Socket.io for real-time features
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User authentication for socket
    socket.on('authenticate', (data) => {
        socket.userId = data.userId;
        socket.join(`user_${data.userId}`);
        console.log(`User ${data.userId} authenticated with socket ${socket.id}`);

        // Update user status to online
        updateUserStatus(data.userId, 'online');
    });

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

    // Chat/Messaging events
    socket.on('join-conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`User ${socket.userId} joined conversation: ${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`User ${socket.userId} left conversation: ${conversationId}`);
    });

    socket.on('send-message', (messageData) => {
        // Broadcast message to all users in the conversation
        socket.to(`conversation_${messageData.conversationId}`).emit('new-message', messageData);
    });

    socket.on('typing-start', (data) => {
        socket.to(`conversation_${data.conversationId}`).emit('user-typing', {
            userId: socket.userId,
            conversationId: data.conversationId
        });
    });

    socket.on('typing-stop', (data) => {
        socket.to(`conversation_${data.conversationId}`).emit('user-stop-typing', {
            userId: socket.userId,
            conversationId: data.conversationId
        });
    });

    // Friend request notifications
    socket.on('friend-request-sent', (data) => {
        socket.to(`user_${data.toUserId}`).emit('friend-request-received', {
            from: data.from,
            friendshipId: data.friendshipId
        });
    });

    socket.on('friend-request-accepted', (data) => {
        socket.to(`user_${data.toUserId}`).emit('friend-request-accepted', {
            from: data.from,
            friendshipId: data.friendshipId
        });
    });

    // Online status
    socket.on('update-status', (status) => {
        if (socket.userId) {
            updateUserStatus(socket.userId, status);
            // Broadcast status update to friends
            broadcastStatusToFriends(socket.userId, status);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.userId) {
            updateUserStatus(socket.userId, 'offline');
            broadcastStatusToFriends(socket.userId, 'offline');
        }
    });
});

// Helper functions for Socket.io
async function updateUserStatus(userId, status) {
    try {
        const { promisePool } = require('./src/config/database');
        await promisePool.execute(
            'INSERT INTO user_status (user_id, status, last_seen) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE status = ?, last_seen = NOW()', [userId, status, status]
        );
    } catch (error) {
        console.error('Error updating user status:', error);
    }
}

async function broadcastStatusToFriends(userId, status) {
    try {
        const { promisePool } = require('./src/config/database');
        const [friends] = await promisePool.execute(
            'SELECT friend_id FROM user_friends WHERE user_id = ?', [userId]
        );

        friends.forEach(friend => {
            io.to(`user_${friend.friend_id}`).emit('friend-status-update', {
                userId,
                status
            });
        });
    } catch (error) {
        console.error('Error broadcasting status to friends:', error);
    }
}

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
            console.log(`🚀 KMess Server is running on http://172.20.10.3:${PORT}`);
            console.log(`🌐 Server listening on all network interfaces`);
            console.log(`📱 Health check: http://172.20.10.3:${PORT}`);
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