-- ===============================================
-- KMess Social Features Database Schema
-- Messaging, Friends, Notifications System
-- ===============================================

-- Friends/Relationships Table
CREATE TABLE IF NOT EXISTS friendships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'blocked', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE KEY unique_friendship (requester_id, addressee_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_requester (requester_id),
    INDEX idx_addressee (addressee_id),
    INDEX idx_status (status)
);

-- Conversations Table (for organizing messages)
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('direct', 'group') DEFAULT 'direct',
    name VARCHAR(255) NULL, -- For group chats
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_created_by (created_by)
);

-- Conversation Participants (who can see messages)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    role ENUM('admin', 'member') DEFAULT 'member',
    last_read_message_id INT NULL,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (conversation_id, user_id),
    INDEX idx_conversation (conversation_id),
    INDEX idx_user (user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'game_invite', 'system') DEFAULT 'text',
    reply_to_message_id INT NULL, -- For replies
    metadata JSON NULL, -- For storing extra data (game info, file info, etc.)
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL,
    
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_created_at (created_at),
    INDEX idx_conversation_created (conversation_id, created_at)
);

-- Message Reactions (like, heart, laugh, etc.)
CREATE TABLE IF NOT EXISTS message_reactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction_type ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_reaction (message_id, user_id, reaction_type),
    INDEX idx_message (message_id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('friend_request', 'friend_accepted', 'new_message', 'game_invite', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSON NULL, -- Extra data (user_id, conversation_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_user_unread (user_id, is_read)
);

-- User Online Status
CREATE TABLE IF NOT EXISTS user_status (
    user_id INT PRIMARY KEY,
    status ENUM('online', 'away', 'busy', 'offline') DEFAULT 'offline',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_last_seen (last_seen)
);

-- Game Invitations (for inviting friends to games)
CREATE TABLE IF NOT EXISTS game_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    game_data JSON NULL,
    status ENUM('pending', 'accepted', 'rejected', 'expired') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 10 MINUTE),
    
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_from_user (from_user_id),
    INDEX idx_to_user (to_user_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
);

-- ===============================================
-- VIEWS FOR EASY QUERYING
-- ===============================================

-- View to get all friends of a user
CREATE VIEW user_friends AS
SELECT 
    u.id as user_id,
    f.id as friendship_id,
    CASE 
        WHEN f.requester_id = u.id THEN addressee.id
        ELSE requester.id
    END as friend_id,
    CASE 
        WHEN f.requester_id = u.id THEN addressee.username
        ELSE requester.username
    END as friend_username,
    CASE 
        WHEN f.requester_id = u.id THEN addressee.display_name
        ELSE requester.display_name
    END as friend_display_name,
    CASE 
        WHEN f.requester_id = u.id THEN addressee.avatar_url
        ELSE requester.avatar_url
    END as friend_avatar_url,
    f.status,
    f.created_at as friends_since,
    us.status as online_status,
    us.last_seen
FROM users u
JOIN friendships f ON (f.requester_id = u.id OR f.addressee_id = u.id)
JOIN users requester ON f.requester_id = requester.id
JOIN users addressee ON f.addressee_id = addressee.id
LEFT JOIN user_status us ON us.user_id = CASE 
    WHEN f.requester_id = u.id THEN addressee.id
    ELSE requester.id
END
WHERE f.status = 'accepted';

-- View to get conversation summary with last message
CREATE VIEW conversation_summary AS
SELECT 
    c.id as conversation_id,
    c.type,
    c.name,
    COUNT(cp.user_id) as participant_count,
    m.content as last_message_content,
    m.message_type as last_message_type,
    sender.display_name as last_sender_name,
    m.created_at as last_message_at,
    c.updated_at
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.left_at IS NULL
LEFT JOIN messages m ON m.id = (
    SELECT id FROM messages 
    WHERE conversation_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
)
LEFT JOIN users sender ON m.sender_id = sender.id
GROUP BY c.id, c.type, c.name, m.content, m.message_type, sender.display_name, m.created_at, c.updated_at;

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Composite indexes for common queries
CREATE INDEX idx_friendship_status_users ON friendships(status, requester_id, addressee_id);
CREATE INDEX idx_messages_conversation_time ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread_time ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_conversation_participants_active ON conversation_participants(conversation_id, left_at);

-- ===============================================
-- TRIGGERS FOR AUTOMATION
-- ===============================================

-- Auto-create conversation when friendship is accepted
DELIMITER $$
CREATE TRIGGER create_conversation_on_friendship
AFTER UPDATE ON friendships
FOR EACH ROW
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        SET @conv_id = NULL;
        
        -- Check if conversation already exists
        SELECT c.id INTO @conv_id
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
        WHERE c.type = 'direct'
        AND cp1.user_id = NEW.requester_id
        AND cp2.user_id = NEW.addressee_id
        AND cp1.left_at IS NULL
        AND cp2.left_at IS NULL
        LIMIT 1;
        
        -- Create conversation if doesn't exist
        IF @conv_id IS NULL THEN
            INSERT INTO conversations (type, created_by) 
            VALUES ('direct', NEW.requester_id);
            
            SET @conv_id = LAST_INSERT_ID();
            
            -- Add both users as participants
            INSERT INTO conversation_participants (conversation_id, user_id) 
            VALUES (@conv_id, NEW.requester_id), (@conv_id, NEW.addressee_id);
        END IF;
    END IF;
END$$
DELIMITER ;

-- Auto-update conversation timestamp when message is sent
DELIMITER $$
CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE conversations 
    SET updated_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
END$$
DELIMITER ;

-- ===============================================
-- SAMPLE DATA FOR TESTING
-- ===============================================

-- Insert some sample friendships (assuming users 1,2,3 exist)
INSERT INTO friendships (requester_id, addressee_id, status) VALUES 
(1, 2, 'accepted'),
(1, 3, 'pending'),
(2, 3, 'accepted');

-- Insert user status
INSERT INTO user_status (user_id, status) VALUES 
(1, 'online'),
(2, 'away'), 
(3, 'offline');

-- Sample conversation (will be auto-created by trigger, but manual example)
INSERT INTO conversations (type, created_by) VALUES ('direct', 1);
INSERT INTO conversation_participants (conversation_id, user_id) VALUES 
(1, 1), (1, 2);

-- Sample messages
INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES 
(1, 1, 'Chào bạn! Bạn có muốn chơi game không?', 'text'),
(1, 2, 'Chào! Có chứ, chơi game gì? 🎮', 'text'),
(1, 1, 'Chơi Speed Tap nhé!', 'text');

-- Sample notifications
INSERT INTO notifications (user_id, type, title, content, data) VALUES 
(2, 'friend_request', 'Lời mời kết bạn', 'User1 muốn kết bạn với bạn', '{"from_user_id": 1}'),
(1, 'new_message', 'Tin nhắn mới', 'User2 đã gửi tin nhắn', '{"conversation_id": 1, "from_user_id": 2}');
