const db = require('../config/database').connection;

class MessagesController {
    // Get user's conversations
    async getConversations(req, res) {
        try {
            const userId = req.user.id;
            const { limit = 20, offset = 0 } = req.query;

            const query = `
                SELECT 
                    c.id as conversation_id,
                    c.type,
                    c.name,
                    cs.participant_count,
                    cs.last_message_content,
                    cs.last_message_type,
                    cs.last_sender_name,
                    cs.last_message_at,
                    cp.last_read_message_id,
                    -- Count unread messages
                    (SELECT COUNT(*) FROM messages m 
                     WHERE m.conversation_id = c.id 
                     AND m.id > COALESCE(cp.last_read_message_id, 0)
                     AND m.sender_id != ?) as unread_count,
                    -- Get other participant for direct chats
                    CASE 
                        WHEN c.type = 'direct' THEN (
                            SELECT JSON_OBJECT(
                                'id', u.id,
                                'username', u.username,
                                'display_name', u.display_name,
                                'avatar_url', u.avatar_url,
                                'online_status', us.status,
                                'last_seen', us.last_seen
                            )
                            FROM conversation_participants cp2
                            JOIN users u ON cp2.user_id = u.id
                            LEFT JOIN user_status us ON u.id = us.user_id
                            WHERE cp2.conversation_id = c.id 
                            AND cp2.user_id != ? 
                            AND cp2.left_at IS NULL
                            LIMIT 1
                        )
                        ELSE NULL
                    END as other_participant
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                LEFT JOIN conversation_summary cs ON c.id = cs.conversation_id
                WHERE cp.user_id = ? AND cp.left_at IS NULL
                ORDER BY COALESCE(cs.last_message_at, c.updated_at) DESC
                LIMIT ? OFFSET ?
            `;

            const [conversations] = await db.execute(query, [
                userId, userId, userId,
                parseInt(limit), parseInt(offset)
            ]);

            // Parse JSON fields
            conversations.forEach(conv => {
                if (conv.other_participant) {
                    try {
                        conv.other_participant = JSON.parse(conv.other_participant);
                    } catch (e) {
                        conv.other_participant = null;
                    }
                }
            });

            res.json({
                success: true,
                data: {
                    conversations,
                    count: conversations.length
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
                const [existing] = await db.execute(`
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
                const [friendship] = await db.execute(`
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
            const [convResult] = await db.execute(
                'INSERT INTO conversations (type, name, created_by) VALUES (?, ?, ?)', [type, name, userId]
            );

            const conversationId = convResult.insertId;

            // Add participants
            const participants = type === 'direct' ? [userId, participantId] : [userId];

            for (const participantUserId of participants) {
                await db.execute(
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

    // Get conversation details
    async getConversation(req, res) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;

            // Check if user is participant
            const [participation] = await db.execute(
                'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL', [conversationId, userId]
            );

            if (participation.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền truy cập cuộc trò chuyện'
                });
            }

            // Get conversation details
            const [conversation] = await db.execute(`
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
            const [participants] = await db.execute(`
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

            // Check if user is participant
            const [participation] = await db.execute(
                'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL', [conversationId, userId]
            );

            if (participation.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền truy cập cuộc trò chuyện'
                });
            }

            let query = `
                SELECT 
                    m.id,
                    m.content,
                    m.message_type,
                    m.reply_to_message_id,
                    m.metadata,
                    m.is_edited,
                    m.edited_at,
                    m.created_at,
                    m.sender_id,
                    u.username as sender_username,
                    u.display_name as sender_display_name,
                    u.avatar_url as sender_avatar_url,
                    -- Reply message info
                    CASE WHEN m.reply_to_message_id IS NOT NULL THEN
                        JSON_OBJECT(
                            'id', rm.id,
                            'content', rm.content,
                            'sender_name', ru.display_name,
                            'message_type', rm.message_type
                        )
                    ELSE NULL END as reply_message,
                    -- Reactions count
                    (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'type', mr.reaction_type,
                            'count', COUNT(*),
                            'users', JSON_ARRAYAGG(
                                JSON_OBJECT('id', mr_users.id, 'display_name', mr_users.display_name)
                            )
                        )
                     ) FROM message_reactions mr
                     JOIN users mr_users ON mr.user_id = mr_users.id
                     WHERE mr.message_id = m.id
                     GROUP BY mr.reaction_type
                    ) as reactions
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                LEFT JOIN messages rm ON m.reply_to_message_id = rm.id
                LEFT JOIN users ru ON rm.sender_id = ru.id
                WHERE m.conversation_id = ?
            `;

            const queryParams = [conversationId];

            if (before_id) {
                query += ' AND m.id < ?';
                queryParams.push(before_id);
            }

            if (after_id) {
                query += ' AND m.id > ?';
                queryParams.push(after_id);
            }

            query += ' ORDER BY m.created_at DESC LIMIT ?';
            queryParams.push(parseInt(limit));

            const [messages] = await db.execute(query, queryParams);

            // Parse JSON fields
            messages.forEach(msg => {
                if (msg.metadata) {
                    try {
                        msg.metadata = JSON.parse(msg.metadata);
                    } catch (e) {
                        msg.metadata = null;
                    }
                }
                if (msg.reply_message) {
                    try {
                        msg.reply_message = JSON.parse(msg.reply_message);
                    } catch (e) {
                        msg.reply_message = null;
                    }
                }
                if (msg.reactions) {
                    try {
                        msg.reactions = JSON.parse(msg.reactions);
                    } catch (e) {
                        msg.reactions = [];
                    }
                }
            });

            // Reverse to get chronological order
            messages.reverse();

            res.json({
                success: true,
                data: {
                    messages,
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

            // Check if user is participant
            const [participation] = await db.execute(
                'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL', [conversationId, userId]
            );

            if (participation.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền gửi tin nhắn'
                });
            }

            // Insert message
            const [result] = await db.execute(`
                INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_message_id, metadata) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [conversationId, userId, content.trim(), message_type, reply_to_message_id, metadata ? JSON.stringify(metadata) : null]);

            const messageId = result.insertId;

            // Get the created message with sender info
            const [message] = await db.execute(`
                SELECT 
                    m.*,
                    u.username as sender_username,
                    u.display_name as sender_display_name,
                    u.avatar_url as sender_avatar_url
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.id = ?
            `, [messageId]);

            const messageData = message[0];
            if (messageData.metadata) {
                try {
                    messageData.metadata = JSON.parse(messageData.metadata);
                } catch (e) {
                    messageData.metadata = null;
                }
            }

            // Get conversation participants for notifications
            const [participants] = await db.execute(
                'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ? AND left_at IS NULL', [conversationId, userId]
            );

            // Create notifications for other participants
            for (const participant of participants) {
                await db.execute(
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

            // Check if user owns the message
            const [message] = await db.execute(
                'SELECT id, sender_id, content FROM messages WHERE id = ? AND sender_id = ?', [messageId, userId]
            );

            if (message.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tin nhắn hoặc không có quyền chỉnh sửa'
                });
            }

            // Update message
            await db.execute(
                'UPDATE messages SET content = ?, is_edited = TRUE, edited_at = NOW() WHERE id = ?', [content.trim(), messageId]
            );

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

            // Check if user owns the message
            const [message] = await db.execute(
                'SELECT id, sender_id FROM messages WHERE id = ? AND sender_id = ?', [messageId, userId]
            );

            if (message.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tin nhắn hoặc không có quyền xóa'
                });
            }

            // Delete message
            await db.execute('DELETE FROM messages WHERE id = ?', [messageId]);

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

            // Check if message exists and user can access it
            const [message] = await db.execute(`
                SELECT m.id FROM messages m
                JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
                WHERE m.id = ? AND cp.user_id = ? AND cp.left_at IS NULL
            `, [messageId, userId]);

            if (message.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tin nhắn'
                });
            }

            // Remove existing reaction of same type by this user
            await db.execute(
                'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND reaction_type = ?', [messageId, userId, reaction_type]
            );

            // Add new reaction
            await db.execute(
                'INSERT INTO message_reactions (message_id, user_id, reaction_type) VALUES (?, ?, ?)', [messageId, userId, reaction_type]
            );

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

            // Remove reaction
            const [result] = await db.execute(
                'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND reaction_type = ?', [messageId, userId, reactionType]
            );

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
            const [latestMessage] = await db.execute(
                'SELECT id FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1', [conversationId]
            );

            if (latestMessage.length === 0) {
                return res.json({
                    success: true,
                    message: 'Không có tin nhắn để đánh dấu đã đọc'
                });
            }

            // Update last read message
            await db.execute(
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

            const [messages] = await db.execute(query, queryParams);

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

            const [reactions] = await db.execute(`
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
            const [result] = await db.execute(
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
            const [userRole] = await db.execute(
                'SELECT role FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL', [conversationId, userId]
            );

            if (userRole.length === 0 || userRole[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền thêm thành viên'
                });
            }

            // Add new participant
            await db.execute(
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
            const [userRole] = await db.execute(
                'SELECT role FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL', [conversationId, userId]
            );

            if (userRole.length === 0 || userRole[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền xóa thành viên'
                });
            }

            // Remove participant
            await db.execute(
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