const { promisePool } = require('../config/database');

class MessagesController {
    // Get user's conversations
    async getConversations(req, res) {
        try {
            const userId = req.user.id;
            const { limit = 20, offset = 0 } = req.query;

            // Simple query to get user's conversations
            const query = `
                SELECT DISTINCT
                    c.id as conversation_id,
                    c.type,
                    c.name,
                    c.created_at,
                    c.updated_at
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                WHERE cp.user_id = ? AND cp.left_at IS NULL
                ORDER BY c.updated_at DESC
                LIMIT ?
            `;

            console.log('📋 Getting Conversations:', { userId, limit });

            let conversations = [];
            try {
                const [result] = await promisePool.execute(query, [userId, parseInt(limit)]);
                conversations = result;
                console.log('✅ Found conversations:', conversations.length);
            } catch (queryError) {
                console.error('Query error, returning empty:', queryError.message);
                conversations = [];
            }

            res.json({
                success: true,
                data: {
                    conversations,
                    count: conversations.length,
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset)
                    }
                }
            });
        } catch (error) {
            console.error('Get conversations error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách cuộc trò chuyện'
            });
        }
    }

    // Create or get conversation with friend
    async createConversation(req, res) {
        try {
            const userId = req.user.id;
            const { participantId, type = 'direct', name } = req.body;

            if (!participantId || participantId == userId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID người tham gia không hợp lệ'
                });
            }

            // For direct chats, check if conversation already exists
            if (type === 'direct') {
                const [existing] = await promisePool.execute(`
                    SELECT c.id as conversation_id
                    FROM conversations c
                    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
                    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
                    WHERE c.type = 'direct'
                    AND cp1.user_id = ? AND cp1.left_at IS NULL
                    AND cp2.user_id = ? AND cp2.left_at IS NULL
                `, [userId, participantId]);

                if (existing.length > 0) {
                    return res.json({
                        success: true,
                        data: {
                            conversation_id: existing[0].conversation_id,
                            created: false
                        }
                    });
                }
            }

            // Check if users are friends (for direct chat)
            if (type === 'direct') {
                const [friendship] = await promisePool.execute(`
                    SELECT id FROM friendships 
                    WHERE ((requester_id = ? AND addressee_id = ?) OR 
                           (requester_id = ? AND addressee_id = ?)) 
                    AND status = 'accepted'
                `, [userId, participantId, participantId, userId]);

                if (friendship.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'Chỉ có thể nhắn tin với bạn bè'
                    });
                }
            }

            // Create conversation
            const [convResult] = await promisePool.execute(
                'INSERT INTO conversations (type, name, created_by) VALUES (?, ?, ?)', [type, name, userId]
            );

            const conversationId = convResult.insertId;

            // Add participants
            const participants = type === 'direct' ? [userId, participantId] : [userId];

            for (const participantUserId of participants) {
                await promisePool.execute(
                    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [conversationId, participantUserId]
                );
            }

            res.json({
                success: true,
                message: 'Đã tạo cuộc trò chuyện',
                data: {
                    conversation_id: conversationId,
                    created: true
                }
            });
        } catch (error) {
            console.error('Create conversation error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tạo cuộc trò chuyện'
            });
        }
    }

    // Get or create direct conversation with friend
    async getOrCreateDirectConversation(req, res) {
        try {
            const userId = req.user.id;
            const { friendId } = req.params;

            if (!friendId || friendId == userId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bạn bè không hợp lệ'
                });
            }

            // Check if users are friends
            const [friendship] = await promisePool.execute(`
                SELECT id FROM friendships 
                WHERE ((requester_id = ? AND addressee_id = ?) OR 
                       (requester_id = ? AND addressee_id = ?)) 
                AND status = 'accepted'
            `, [userId, friendId, friendId, userId]);

            if (friendship.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Chỉ có thể nhắn tin với bạn bè'
                });
            }

            // Check if direct conversation already exists
            const [existing] = await promisePool.execute(`
                SELECT c.id as conversation_id
                FROM conversations c
                JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
                JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
                WHERE c.type = 'direct'
                AND cp1.user_id = ? AND cp1.left_at IS NULL
                AND cp2.user_id = ? AND cp2.left_at IS NULL
            `, [userId, friendId]);

            if (existing.length > 0) {
                return res.json({
                    success: true,
                    data: {
                        conversation_id: existing[0].conversation_id,
                        created: false
                    }
                });
            }

            // Create new direct conversation
            const [convResult] = await promisePool.execute(
                'INSERT INTO conversations (type, created_by) VALUES (?, ?)', ['direct', userId]
            );

            const conversationId = convResult.insertId;

            // Add both participants
            await promisePool.execute(
                'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)', [conversationId, userId, conversationId, friendId]
            );

            res.json({
                success: true,
                data: {
                    conversation_id: conversationId,
                    created: true
                }
            });
        } catch (error) {
            console.error('Get or create direct conversation error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tạo cuộc trò chuyện'
            });
        }
    }

    // Get conversation details
    async getConversation(req, res) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;

            // Check if user is participant
            const [participation] = await promisePool.execute(
                'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL', [conversationId, userId]
            );

            if (participation.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền truy cập cuộc trò chuyện'
                });
            }

            // Get conversation details
            const [conversation] = await promisePool.execute(`
                SELECT 
                    c.*,
                    (SELECT COUNT(*) FROM conversation_participants cp 
                     WHERE cp.conversation_id = c.id AND cp.left_at IS NULL) as participant_count
                FROM conversations c
                WHERE c.id = ?
            `, [conversationId]);

            if (conversation.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy cuộc trò chuyện'
                });
            }

            // Get participants
            const [participants] = await promisePool.execute(`
                SELECT 
                    cp.user_id,
                    cp.role,
                    cp.joined_at,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    us.status as online_status,
                    us.last_seen
                FROM conversation_participants cp
                JOIN users u ON cp.user_id = u.id
                LEFT JOIN user_status us ON u.id = us.user_id
                WHERE cp.conversation_id = ? AND cp.left_at IS NULL
                ORDER BY u.display_name ASC
            `, [conversationId]);

            res.json({
                success: true,
                data: {
                    conversation: conversation[0],
                    participants
                }
            });
        } catch (error) {
            console.error('Get conversation error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy thông tin cuộc trò chuyện'
            });
        }
    }

    // Get messages in conversation
    async getMessages(req, res) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            const { limit = 50, before_id, after_id } = req.query;

            console.log('📨 getMessages called:', {
                userId,
                conversationId,
                conversationIdType: typeof conversationId,
                limit,
                limitType: typeof limit
            });

            // Validate parameters
            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: 'conversationId is required'
                });
            }

            // Parse conversationId to number for MySQL2 consistency
            const parsedConversationId = parseInt(conversationId, 10);

            // Validate conversationId is a valid number
            if (isNaN(parsedConversationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid conversationId format'
                });
            }

            // Check if user is participant (using manual query to avoid prepared statement issue)  
            const participationQuery = `SELECT id FROM conversation_participants WHERE conversation_id = ${parsedConversationId} AND user_id = ${userId} AND left_at IS NULL`;
            const [participation] = await promisePool.query(participationQuery);

            if (participation.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền truy cập cuộc trò chuyện'
                });
            }

            // Get messages from database (removed edited_at - column doesn't exist)
            let query = `
                SELECT 
                    m.id,
                    m.content,
                    m.message_type,
                    m.sender_id,
                    m.conversation_id,
                    m.created_at,
                    m.is_edited,
                    u.username as sender_username,
                    u.display_name as sender_display_name,
                    u.avatar_url as sender_avatar_url
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = ?
                ORDER BY m.created_at DESC
                LIMIT ?
            `;

            // Parse limit for MySQL2 consistency (conversationId already parsed above)
            const parsedLimit = Math.max(1, Math.min(100, parseInt(limit) || 50));

            // Debug parameters - both now numbers
            const queryParams = [parsedConversationId, parsedLimit];
            console.log('🔍 SQL Query Debug:', {
                originalConversationId: conversationId,
                parsedConversationId: parsedConversationId,
                originalLimit: limit,
                parsedLimit: parsedLimit,
                queryParams: queryParams,
                paramCount: queryParams.length,
                queryParamTypes: queryParams.map(p => typeof p)
            });

            let messages;
            try {
                // WORKAROUND: Use query() instead of execute() to bypass prepared statement issue
                const manualQuery = `
                    SELECT 
                        m.id,
                        m.content,
                        m.message_type,
                        m.sender_id,
                        m.conversation_id,
                        m.created_at,
                        m.is_edited,
                        u.username as sender_username,
                        u.display_name as sender_display_name,
                        u.avatar_url as sender_avatar_url
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.conversation_id = ${parsedConversationId}
                    ORDER BY m.created_at DESC
                    LIMIT ${parsedLimit}
                `;

                console.log('🔧 Using manual query (bypass prepared statements):', {
                    conversationId: parsedConversationId,
                    limit: parsedLimit,
                    queryType: 'manual'
                });

                [messages] = await promisePool.query(manualQuery);

                console.log('📨 Real Messages Response:', {
                    conversationId,
                    limit,
                    messageCount: messages.length
                });
            } catch (sqlError) {
                console.error('❌ SQL Execute Error:', {
                    error: sqlError.message,
                    code: sqlError.code,
                    sqlState: sqlError.sqlState,
                    query: query.trim(),
                    params: queryParams
                });
                throw sqlError;
            }

            res.json({
                success: true,
                data: {
                    messages: messages.reverse(), // Reverse to show oldest first
                    count: messages.length
                }
            });
        } catch (error) {
            console.error('Get messages error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy tin nhắn'
            });
        }
    }

    // Send message
    async sendMessage(req, res) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            const { content, message_type = 'text', reply_to_message_id, metadata } = req.body;

            if (!content || content.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nội dung tin nhắn không được để trống'
                });
            }

            // Insert message into database
            const [result] = await promisePool.execute(
                'INSERT INTO messages (sender_id, conversation_id, content, message_type, reply_to_message_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [userId, conversationId, content.trim(), message_type, reply_to_message_id, metadata ? JSON.stringify(metadata) : null]
            );

            const messageId = result.insertId;

            // Get full message details with user info
            const [messageRows] = await promisePool.execute(`
                SELECT 
                    m.id,
                    m.content,
                    m.message_type,
                    m.sender_id,
                    m.conversation_id,
                    m.created_at,
                    m.is_edited,
                    m.edited_at,
                    u.username as sender_username,
                    u.display_name as sender_display_name,
                    u.avatar_url as sender_avatar_url
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.id = ?
            `, [messageId]);

            const messageData = messageRows[0];

            console.log('📤 Real Message Sent to DB:', {
                messageId,
                conversationId,
                userId,
                content: content.substring(0, 50) + '...'
            });

            // Update conversation timestamp to bring it to top
            try {
                await promisePool.execute(
                    'UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]
                );
                console.log('✅ Updated conversation timestamp');
            } catch (updateError) {
                console.log('⚠️ Could not update conversation timestamp:', updateError.message);
            }

            // Skip notifications for now - keep it simple
            const participants = [];

            // Create notifications for other participants
            for (const participant of participants) {
                await promisePool.execute(
                    `INSERT INTO notifications (user_id, type, title, content, data) 
                     VALUES (?, 'new_message', 'Tin nhắn mới', ?, ?)`, [
                        participant.user_id,
                        `${req.user.display_name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                        JSON.stringify({
                            conversation_id: conversationId,
                            message_id: messageId,
                            from_user_id: userId
                        })
                    ]
                );
            }

            res.json({
                success: true,
                message: 'Đã gửi tin nhắn',
                data: { message: messageData }
            });
        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể gửi tin nhắn'
            });
        }
    }

    // Edit message
    async editMessage(req, res) {
        try {
            const userId = req.user.id;
            const { messageId } = req.params;
            const { content } = req.body;

            if (!content || content.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nội dung tin nhắn không được để trống'
                });
            }

            // Check if user owns the message (bypass prepared statements)
            const messageCheckQuery = `SELECT id, sender_id, content FROM messages WHERE id = ${parseInt(messageId)} AND sender_id = ${userId}`;
            const [message] = await promisePool.query(messageCheckQuery);

            if (message.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tin nhắn hoặc không có quyền chỉnh sửa'
                });
            }

            // Update message (bypass prepared statements)
            const updateQuery = `UPDATE messages SET content = '${content.trim().replace(/'/g, "''")}', is_edited = TRUE, edited_at = NOW() WHERE id = ${parseInt(messageId)}`;
            await promisePool.query(updateQuery);

            res.json({
                success: true,
                message: 'Đã chỉnh sửa tin nhắn'
            });
        } catch (error) {
            console.error('Edit message error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể chỉnh sửa tin nhắn'
            });
        }
    }

    // Delete message
    async deleteMessage(req, res) {
        try {
            const userId = req.user.id;
            const { messageId } = req.params;

            // Check if user owns the message (bypass prepared statements)
            const messageCheckQuery = `SELECT id, sender_id FROM messages WHERE id = ${parseInt(messageId)} AND sender_id = ${userId}`;
            const [message] = await promisePool.query(messageCheckQuery);

            if (message.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tin nhắn hoặc không có quyền xóa'
                });
            }

            // Delete message (bypass prepared statements)
            const deleteQuery = `DELETE FROM messages WHERE id = ${parseInt(messageId)}`;
            await promisePool.query(deleteQuery);

            res.json({
                success: true,
                message: 'Đã xóa tin nhắn'
            });
        } catch (error) {
            console.error('Delete message error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể xóa tin nhắn'
            });
        }
    }

    // Add reaction to message
    async addReaction(req, res) {
        try {
            const userId = req.user.id;
            const { messageId } = req.params;
            const { reaction_type } = req.body;

            const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
            if (!validReactions.includes(reaction_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Loại reaction không hợp lệ'
                });
            }

            // Check if message exists and user can access it (bypass prepared statements)
            const messageCheckQuery = `
                SELECT m.id FROM messages m
                JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
                WHERE m.id = ${parseInt(messageId)} AND cp.user_id = ${userId} AND cp.left_at IS NULL
            `;
            const [message] = await promisePool.query(messageCheckQuery);

            if (message.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tin nhắn'
                });
            }

            // Remove existing reaction of same type by this user (bypass prepared statements)
            const deleteReactionQuery = `DELETE FROM message_reactions WHERE message_id = ${parseInt(messageId)} AND user_id = ${userId} AND reaction_type = '${reaction_type}'`;
            await promisePool.query(deleteReactionQuery);

            // Add new reaction (bypass prepared statements)
            const insertReactionQuery = `INSERT INTO message_reactions (message_id, user_id, reaction_type) VALUES (${parseInt(messageId)}, ${userId}, '${reaction_type}')`;
            await promisePool.query(insertReactionQuery);

            res.json({
                success: true,
                message: 'Đã thêm reaction'
            });
        } catch (error) {
            console.error('Add reaction error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể thêm reaction'
            });
        }
    }

    // Remove reaction from message
    async removeReaction(req, res) {
        try {
            const userId = req.user.id;
            const { messageId, reactionType } = req.params;

            // Remove reaction (bypass prepared statements)
            const removeReactionQuery = `DELETE FROM message_reactions WHERE message_id = ${parseInt(messageId)} AND user_id = ${userId} AND reaction_type = '${reactionType}'`;
            const [result] = await promisePool.query(removeReactionQuery);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy reaction'
                });
            }

            res.json({
                success: true,
                message: 'Đã xóa reaction'
            });
        } catch (error) {
            console.error('Remove reaction error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể xóa reaction'
            });
        }
    }

    // Mark conversation as read
    async markAsRead(req, res) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;

            // Get latest message ID in conversation
            const [latestMessage] = await promisePool.execute(
                'SELECT id FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1', [conversationId]
            );

            if (latestMessage.length === 0) {
                return res.json({
                    success: true,
                    message: 'Không có tin nhắn để đánh dấu đã đọc'
                });
            }

            // Update last read message
            await promisePool.execute(
                'UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?', [latestMessage[0].id, conversationId, userId]
            );

            res.json({
                success: true,
                message: 'Đã đánh dấu đã đọc'
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể đánh dấu đã đọc'
            });
        }
    }

    // Search messages
    async searchMessages(req, res) {
        try {
            const userId = req.user.id;
            const { q: searchTerm, conversation_id, limit = 20 } = req.query;

            if (!searchTerm || searchTerm.trim().length < 2) {
                return res.json({
                    success: true,
                    data: { messages: [] }
                });
            }

            let query = `
                SELECT 
                    m.id,
                    m.conversation_id,
                    m.content,
                    m.message_type,
                    m.created_at,
                    u.display_name as sender_display_name,
                    c.type as conversation_type,
                    c.name as conversation_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                JOIN conversations c ON m.conversation_id = c.id
                JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
                WHERE cp.user_id = ? AND cp.left_at IS NULL
                AND m.content LIKE ?
            `;

            const queryParams = [userId, `%${searchTerm}%`];

            if (conversation_id) {
                query += ' AND m.conversation_id = ?';
                queryParams.push(conversation_id);
            }

            query += ' ORDER BY m.created_at DESC LIMIT ?';
            queryParams.push(parseInt(limit));

            const [messages] = await promisePool.execute(query, queryParams);

            res.json({
                success: true,
                data: { messages }
            });
        } catch (error) {
            console.error('Search messages error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tìm kiếm tin nhắn'
            });
        }
    }

    // Get message reactions
    async getReactions(req, res) {
        try {
            const { messageId } = req.params;

            const [reactions] = await promisePool.execute(`
                SELECT 
                    mr.reaction_type,
                    COUNT(*) as count,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'user_id', u.id,
                            'username', u.username,
                            'display_name', u.display_name,
                            'avatar_url', u.avatar_url,
                            'created_at', mr.created_at
                        )
                    ) as users
                FROM message_reactions mr
                JOIN users u ON mr.user_id = u.id
                WHERE mr.message_id = ?
                GROUP BY mr.reaction_type
                ORDER BY COUNT(*) DESC
            `, [messageId]);

            // Parse JSON fields
            reactions.forEach(reaction => {
                if (reaction.users) {
                    try {
                        reaction.users = JSON.parse(reaction.users);
                    } catch (e) {
                        reaction.users = [];
                    }
                }
            });

            res.json({
                success: true,
                data: { reactions }
            });
        } catch (error) {
            console.error('Get reactions error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy reactions'
            });
        }
    }

    // Leave conversation
    async leaveConversation(req, res) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;

            // Update participant to mark as left
            const [result] = await promisePool.execute(
                'UPDATE conversation_participants SET left_at = NOW() WHERE conversation_id = ? AND user_id = ?', [conversationId, userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy cuộc trò chuyện'
                });
            }

            res.json({
                success: true,
                message: 'Đã rời khỏi cuộc trò chuyện'
            });
        } catch (error) {
            console.error('Leave conversation error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể rời khỏi cuộc trò chuyện'
            });
        }
    }

    // Add participant to conversation
    async addParticipant(req, res) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            const { userId: newUserId } = req.body;

            // Check if current user is admin or creator
            const [userRole] = await promisePool.execute(
                'SELECT role FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL', [conversationId, userId]
            );

            if (userRole.length === 0 || userRole[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền thêm thành viên'
                });
            }

            // Add new participant
            await promisePool.execute(
                'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [conversationId, newUserId]
            );

            res.json({
                success: true,
                message: 'Đã thêm thành viên vào cuộc trò chuyện'
            });
        } catch (error) {
            console.error('Add participant error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể thêm thành viên'
            });
        }
    }

    // Remove participant from conversation
    async removeParticipant(req, res) {
        try {
            const userId = req.user.id;
            const { conversationId, userId: targetUserId } = req.params;

            // Check if current user is admin or creator
            const [userRole] = await promisePool.execute(
                'SELECT role FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL', [conversationId, userId]
            );

            if (userRole.length === 0 || userRole[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền xóa thành viên'
                });
            }

            // Remove participant
            await promisePool.execute(
                'UPDATE conversation_participants SET left_at = NOW() WHERE conversation_id = ? AND user_id = ?', [conversationId, targetUserId]
            );

            res.json({
                success: true,
                message: 'Đã xóa thành viên khỏi cuộc trò chuyện'
            });
        } catch (error) {
            console.error('Remove participant error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể xóa thành viên'
            });
        }
    }
}

module.exports = new MessagesController();