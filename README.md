# 🗄️ KMess Database Schema

This directory contains the MySQL database schema and sample data for the KMess social gaming app.

## 📁 Files

- **`schema.sql`** - Complete database schema with all tables
- **`sample_data.sql`** - Sample data for testing and development
- **`README.md`** - This documentation file

## 🚀 Quick Setup

### 1. Create Database
```sql
mysql -u root -p < schema.sql
```

### 2. Insert Sample Data
```sql
mysql -u root -p < sample_data.sql
```

### 3. Verify Setup
```sql
mysql -u root -p
USE kmess_db;
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM posts;
```

## 📊 Database Schema Overview

### Core Tables
- **`users`** - User accounts and profiles
- **`posts`** - Social media posts with images
- **`comments`** - Post comments
- **`likes`** - Post likes
- **`follows`** - User following relationships

### Game Tables
- **`games`** - Available mini-games metadata
- **`game_sessions`** - Active/completed game sessions
- **`game_participants`** - Players in game sessions
- **`game_results`** - Game outcomes and scores

### Additional Tables
- **`stories`** - Instagram-style stories (24h expiry)
- **`story_views`** - Story view tracking
- **`notifications`** - User notifications

## 🎮 Sample Games Included

1. **Speed Tap** - Fast tapping multiplayer game
2. **Caro** - 15x15 Tic-Tac-Toe
3. **Truth or Dare** - Classic party game
4. **Battle of Words** - Word creation game
5. **Word Connect** - Letter connection puzzle
6. **Quick Draw** - Drawing guessing game

## 👥 Sample Users

All sample users have password: `password123`

- **sarah_food** - Food photographer
- **travel_lover** - Travel enthusiast  
- **coffee_daily** - Coffee lover
- **style_maven** - Fashion designer
- **nature_girl** - Nature photographer
- **gamer_pro** - Professional gamer
- **kmess_admin** - Official account

## 🔗 Relationships

- Users can follow other users
- Users can create posts with images
- Posts can receive likes and comments
- Users can join game sessions
- Game results are tracked for leaderboards
- Stories expire after 24 hours

## 📈 Indexes

All tables include optimized indexes for:
- Primary keys and foreign keys
- Frequently queried columns (created_at, status, etc.)
- Unique constraints for data integrity

## ⚠️ Notes

- Uses UTF8MB4 encoding for emoji support
- All timestamps in UTC
- Soft deletes via `is_active` flags
- JSON columns for flexible game data storage