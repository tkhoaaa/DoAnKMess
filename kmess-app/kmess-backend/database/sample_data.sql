-- KMess Sample Data
USE kmess_db;

-- Sample users (password: password123)
INSERT INTO users (username, email, password_hash, display_name, bio) VALUES
('kmess_demo', 'demo@kmess.com', '$2a$12$rGFdWyAhR6YuSfkN8aKF2uZXJsXwMfNZSE.bJ6Gy6OqB4cPzK8TQC', 'KMess Demo', 'Demo account for testing 🧪'),
('sarah_food', 'sarah@kmess.com', '$2a$12$rGFdWyAhR6YuSfkN8aKF2uZXJsXwMfNZSE.bJ6Gy6OqB4cPzK8TQC', 'Sarah Chen', 'Food lover & photographer 📸🍕'),
('gamer_pro', 'gamer@kmess.com', '$2a$12$rGFdWyAhR6YuSfkN8aKF2uZXJsXwMfNZSE.bJ6Gy6OqB4cPzK8TQC', 'Mike Gaming', 'Professional gamer 🎮');

-- Sample games
INSERT INTO games (name, type, max_players, description) VALUES
('Speed Tap', 'multiplayer', 10, 'Fast-paced tapping game'),
('Caro', 'multiplayer', 2, 'Classic Tic-Tac-Toe'),
('Truth or Dare', 'multiplayer', 8, 'Classic party game');

-- Sample posts
INSERT INTO posts (user_id, image_url, caption, likes_count) VALUES
(1, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', 'Welcome to KMess! 🎉', 50),
(2, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', 'Perfect breakfast! 🥐', 25);

SELECT 'Sample data inserted successfully!' as status;
