const db = require('../config/database').connection;

class FriendsController {
    // Get user's friends list
    async getFriends(req, res) {
        try {
            const userId = req.user.id;

            const query = `
                SELECT 
                    uf.friend_id,
                    uf.friend_username,
                    uf.friend_display_name,
                    uf.friend_avatar_url,
                    uf.friends_since,
                    uf.online_status,
                    uf.last_seen
                FROM user_friends uf 
                WHERE uf.user_id = ?
                ORDER BY uf.friend_display_name ASC
            `;

            const [friends] = await db.execute(query, [userId]);

            res.json({
                success: true,
                data: {
                    friends,
                    count: friends.length
                }
            });
        } catch (error) {
            console.error('Get friends error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách bạn bè'
            });
        }
    }

    // Get friend requests received by user
    async getFriendRequests(req, res) {
        try {
            const userId = req.user.id;

            const query = `
                SELECT 
                    f.id as request_id,
                    f.requester_id as from_user_id,
                    u.username as from_username,
                    u.display_name as from_display_name,
                    u.avatar_url as from_avatar_url,
                    f.created_at as requested_at
                FROM friendships f
                JOIN users u ON f.requester_id = u.id
                WHERE f.addressee_id = ? AND f.status = 'pending'
                ORDER BY f.created_at DESC
            `;

            const [requests] = await db.execute(query, [userId]);

            res.json({
                success: true,
                data: {
                    requests,
                    count: requests.length
                }
            });
        } catch (error) {
            console.error('Get friend requests error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy lời mời kết bạn'
            });
        }
    }

    // Get friend requests sent by user
    async getSentRequests(req, res) {
        try {
            const userId = req.user.id;

            const query = `
                SELECT 
                    f.id as request_id,
                    f.addressee_id as to_user_id,
                    u.username as to_username,
                    u.display_name as to_display_name,
                    u.avatar_url as to_avatar_url,
                    f.status,
                    f.created_at as requested_at
                FROM friendships f
                JOIN users u ON f.addressee_id = u.id
                WHERE f.requester_id = ? AND f.status IN ('pending', 'rejected')
                ORDER BY f.created_at DESC
            `;

            const [requests] = await db.execute(query, [userId]);

            res.json({
                success: true,
                data: {
                    requests,
                    count: requests.length
                }
            });
        } catch (error) {
            console.error('Get sent requests error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy lời mời đã gửi'
            });
        }
    }

    // Search users to add as friends
    async searchUsers(req, res) {
        try {
            const userId = req.user.id;
            const { q: searchTerm, limit = 20 } = req.query;

            if (!searchTerm || searchTerm.trim().length < 2) {
                return res.json({
                    success: true,
                    data: { users: [] }
                });
            }

            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    CASE 
                        WHEN f.status = 'accepted' THEN 'friends'
                        WHEN f.status = 'pending' AND f.requester_id = ? THEN 'request_sent'
                        WHEN f.status = 'pending' AND f.addressee_id = ? THEN 'request_received'
                        WHEN f.status = 'blocked' THEN 'blocked'
                        ELSE 'none'
                    END as friendship_status
                FROM users u
                LEFT JOIN friendships f ON (
                    (f.requester_id = ? AND f.addressee_id = u.id) OR 
                    (f.addressee_id = ? AND f.requester_id = u.id)
                )
                WHERE u.id != ? 
                AND (
                    u.username LIKE ? OR 
                    u.display_name LIKE ? OR
                    u.email LIKE ?
                )
                ORDER BY 
                    CASE WHEN u.username LIKE ? THEN 1 ELSE 2 END,
                    u.display_name ASC
                LIMIT ?
            `;

            const searchPattern = `%${searchTerm}%`;
            const exactPattern = `${searchTerm}%`;

            const [users] = await db.execute(query, [
                userId, userId, userId, userId, userId,
                searchPattern, searchPattern, searchPattern,
                exactPattern,
                parseInt(limit)
            ]);

            res.json({
                success: true,
                data: { users }
            });
        } catch (error) {
            console.error('Search users error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tìm kiếm người dùng'
            });
        }
    }

    // Send friend request
    async sendFriendRequest(req, res) {
        try {
            const userId = req.user.id;
            const { userId: targetUserId } = req.body;

            if (!targetUserId || targetUserId == userId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID người dùng không hợp lệ'
                });
            }

            // Check if target user exists
            const [targetUser] = await db.execute(
                'SELECT id, username, display_name FROM users WHERE id = ?', [targetUserId]
            );

            if (targetUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            // Check if friendship already exists
            const [existingFriendship] = await db.execute(
                `SELECT id, status FROM friendships 
                 WHERE (requester_id = ? AND addressee_id = ?) OR 
                       (requester_id = ? AND addressee_id = ?)`, [userId, targetUserId, targetUserId, userId]
            );

            if (existingFriendship.length > 0) {
                const status = existingFriendship[0].status;
                let message = 'Đã có mối quan hệ với người dùng này';

                switch (status) {
                    case 'accepted':
                        message = 'Bạn đã là bạn bè rồi';
                        break;
                    case 'pending':
                        message = 'Lời mời kết bạn đã được gửi';
                        break;
                    case 'blocked':
                        message = 'Không thể gửi lời mời kết bạn';
                        break;
                }

                return res.status(400).json({
                    success: false,
                    message
                });
            }

            // Create friend request
            const [result] = await db.execute(
                'INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, "pending")', [userId, targetUserId]
            );

            // Create notification for target user
            await db.execute(
                `INSERT INTO notifications (user_id, type, title, content, data) 
                 VALUES (?, 'friend_request', 'Lời mời kết bạn', ?, ?)`, [
                    targetUserId,
                    `${req.user.display_name} muốn kết bạn với bạn`,
                    JSON.stringify({ from_user_id: userId, friendship_id: result.insertId })
                ]
            );

            res.json({
                success: true,
                message: 'Đã gửi lời mời kết bạn',
                data: {
                    friendship_id: result.insertId,
                    to_user: targetUser[0]
                }
            });
        } catch (error) {
            console.error('Send friend request error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể gửi lời mời kết bạn'
            });
        }
    }

    // Accept friend request
    async acceptFriendRequest(req, res) {
        try {
            const userId = req.user.id;
            const { requestId } = req.params;

            // Find and validate friend request
            const [friendRequest] = await db.execute(
                `SELECT f.*, u.username, u.display_name 
                 FROM friendships f
                 JOIN users u ON f.requester_id = u.id
                 WHERE f.id = ? AND f.addressee_id = ? AND f.status = 'pending'`, [requestId, userId]
            );

            if (friendRequest.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy lời mời kết bạn'
                });
            }

            const request = friendRequest[0];

            // Update friendship status
            await db.execute(
                'UPDATE friendships SET status = "accepted", updated_at = NOW() WHERE id = ?', [requestId]
            );

            // Create notification for requester
            await db.execute(
                `INSERT INTO notifications (user_id, type, title, content, data) 
                 VALUES (?, 'friend_accepted', 'Kết bạn thành công', ?, ?)`, [
                    request.requester_id,
                    `${req.user.display_name} đã chấp nhận lời mời kết bạn`,
                    JSON.stringify({ from_user_id: userId, friendship_id: requestId })
                ]
            );

            res.json({
                success: true,
                message: 'Đã chấp nhận lời mời kết bạn',
                data: {
                    friendship_id: requestId,
                    friend: {
                        id: request.requester_id,
                        username: request.username,
                        display_name: request.display_name
                    }
                }
            });
        } catch (error) {
            console.error('Accept friend request error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể chấp nhận lời mời kết bạn'
            });
        }
    }

    // Reject friend request
    async rejectFriendRequest(req, res) {
        try {
            const userId = req.user.id;
            const { requestId } = req.params;

            // Find and validate friend request
            const [friendRequest] = await db.execute(
                'SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = "pending"', [requestId, userId]
            );

            if (friendRequest.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy lời mời kết bạn'
                });
            }

            // Update friendship status to rejected
            await db.execute(
                'UPDATE friendships SET status = "rejected", updated_at = NOW() WHERE id = ?', [requestId]
            );

            res.json({
                success: true,
                message: 'Đã từ chối lời mời kết bạn'
            });
        } catch (error) {
            console.error('Reject friend request error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể từ chối lời mời kết bạn'
            });
        }
    }

    // Remove friend
    async removeFriend(req, res) {
        try {
            const userId = req.user.id;
            const { friendId } = req.params;

            // Find friendship
            const [friendship] = await db.execute(
                `SELECT * FROM friendships 
                 WHERE ((requester_id = ? AND addressee_id = ?) OR 
                        (requester_id = ? AND addressee_id = ?)) 
                 AND status = 'accepted'`, [userId, friendId, friendId, userId]
            );

            if (friendship.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy mối quan hệ bạn bè'
                });
            }

            // Remove friendship
            await db.execute('DELETE FROM friendships WHERE id = ?', [friendship[0].id]);

            res.json({
                success: true,
                message: 'Đã hủy kết bạn'
            });
        } catch (error) {
            console.error('Remove friend error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể hủy kết bạn'
            });
        }
    }

    // Block user
    async blockUser(req, res) {
        try {
            const userId = req.user.id;
            const { userId: targetUserId } = req.params;

            if (targetUserId == userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể chặn chính mình'
                });
            }

            // Remove existing friendship if any
            await db.execute(
                `DELETE FROM friendships 
                 WHERE (requester_id = ? AND addressee_id = ?) OR 
                       (requester_id = ? AND addressee_id = ?)`, [userId, targetUserId, targetUserId, userId]
            );

            // Create block relationship
            await db.execute(
                'INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, "blocked")', [userId, targetUserId]
            );

            res.json({
                success: true,
                message: 'Đã chặn người dùng'
            });
        } catch (error) {
            console.error('Block user error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể chặn người dùng'
            });
        }
    }

    // Unblock user
    async unblockUser(req, res) {
        try {
            const userId = req.user.id;
            const { userId: targetUserId } = req.params;

            // Remove block
            await db.execute(
                'DELETE FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = "blocked"', [userId, targetUserId]
            );

            res.json({
                success: true,
                message: 'Đã bỏ chặn người dùng'
            });
        } catch (error) {
            console.error('Unblock user error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể bỏ chặn người dùng'
            });
        }
    }

    // Get blocked users
    async getBlockedUsers(req, res) {
        try {
            const userId = req.user.id;

            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    f.created_at as blocked_at
                FROM friendships f
                JOIN users u ON f.addressee_id = u.id
                WHERE f.requester_id = ? AND f.status = 'blocked'
                ORDER BY f.created_at DESC
            `;

            const [blockedUsers] = await db.execute(query, [userId]);

            res.json({
                success: true,
                data: {
                    blocked_users: blockedUsers,
                    count: blockedUsers.length
                }
            });
        } catch (error) {
            console.error('Get blocked users error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách người dùng bị chặn'
            });
        }
    }

    // Get mutual friends
    async getMutualFriends(req, res) {
        try {
            const userId = req.user.id;
            const { userId: targetUserId } = req.params;

            const query = `
                SELECT DISTINCT
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar_url
                FROM user_friends uf1
                JOIN user_friends uf2 ON uf1.friend_id = uf2.friend_id
                JOIN users u ON uf1.friend_id = u.id
                WHERE uf1.user_id = ? AND uf2.user_id = ?
                ORDER BY u.display_name ASC
            `;

            const [mutualFriends] = await db.execute(query, [userId, targetUserId]);

            res.json({
                success: true,
                data: {
                    mutual_friends: mutualFriends,
                    count: mutualFriends.length
                }
            });
        } catch (error) {
            console.error('Get mutual friends error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách bạn chung'
            });
        }
    }

    // Get friendship status
    async getFriendshipStatus(req, res) {
        try {
            const userId = req.user.id;
            const { userId: targetUserId } = req.params;

            if (targetUserId == userId) {
                return res.json({
                    success: true,
                    data: { status: 'self' }
                });
            }

            const [friendship] = await db.execute(
                `SELECT status, requester_id FROM friendships 
                 WHERE (requester_id = ? AND addressee_id = ?) OR 
                       (requester_id = ? AND addressee_id = ?)`, [userId, targetUserId, targetUserId, userId]
            );

            let status = 'none';
            if (friendship.length > 0) {
                const f = friendship[0];
                if (f.status === 'accepted') {
                    status = 'friends';
                } else if (f.status === 'pending') {
                    status = f.requester_id == userId ? 'request_sent' : 'request_received';
                } else if (f.status === 'blocked') {
                    status = 'blocked';
                }
            }

            res.json({
                success: true,
                data: { status }
            });
        } catch (error) {
            console.error('Get friendship status error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể kiểm tra trạng thái kết bạn'
            });
        }
    }
}

module.exports = new FriendsController();