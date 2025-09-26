# 🗄️ KMess Database Setup Guide

Complete MySQL database for **KMess Social Gaming App** with all tables, relationships, and sample data.

## 🚀 Quick Setup

### Prerequisites
- MySQL 8.0+ installed
- MySQL command line or MySQL Workbench
- Root access or user with CREATE DATABASE privileges

### 1. One-Click Setup
```bash
# Run complete setup (recommended)
mysql -u root -p < setup.sql
```

### 2. Step-by-Step Setup
```bash
# Step 1: Create schema
mysql -u root -p < schema.sql

# Step 2: Add sample data
mysql -u root -p < sample_data.sql
```

### 3. Verify Installation
```sql
mysql -u root -p
USE kmess_db;
SHOW TABLES;
SELECT COUNT(*) FROM users;
```

## 📊 Database Overview

### 🏗️ **Schema Structure**

#### **Core Tables (Social Features)**
- **`users`** - User accounts và profiles (7 sample users)
- **`posts`** - Social media posts với images (10 sample posts) 
- **`comments`** - Post comments (25+ sample comments)
- **`likes`** - Post likes (100+ sample likes)
- **`follows`** - User following relationships (30+ connections)

#### **Gaming Tables**
- **`games`** - Available mini-games (6 games ready)
- **`game_sessions`** - Active/completed game sessions
- **`game_participants`** - Players in game sessions
- **`game_results`** - Game outcomes và scores
- **`achievements`** - User badges và accomplishments
- **`leaderboards`** - Rankings by game và period

#### **Additional Features**
- **`stories`** - Instagram-style stories (24h expiry)
- **`story_views`** - Story view tracking
- **`notifications`** - User notifications system
- **`saved_posts`** - Bookmarked posts
- **`hashtags`** - Hashtag system
- **`user_sessions`** - JWT session management

### 🎮 **Sample Games Included**

| Game | Type | Players | Difficulty | Description |
|------|------|---------|------------|-------------|
| **Speed Tap** | Multiplayer | 2-10 | Easy | Fast tapping game |
| **Caro** | Multiplayer | 2 | Medium | 15x15 Tic-Tac-Toe |
| **Truth or Dare** | Multiplayer | 3-8 | Easy | Classic party game |
| **Battle of Words** | Multiplayer | 2-4 | Medium | Word creation game |
| **Word Connect** | Single | 1 | Medium | Letter connection puzzle |
| **Quick Draw** | Multiplayer | 3-6 | Hard | Drawing guessing game |

### 👥 **Sample Users** (Password: `password123`)

| Username | Display Name | Role | Total Score |
|----------|--------------|------|-------------|
| **gamer_pro** | Mike Gaming | Pro Player | 1,250 |
| **sarah_food** | Sarah Chen | Food Blogger | 890 |
| **travel_lover** | Alex Turner | Travel Enthusiast | 750 |
| **coffee_daily** | Maya Coffee | Coffee Expert | 650 |
| **style_maven** | Emma Style | Fashion Designer | 580 |
| **nature_girl** | Lily Green | Nature Photographer | 520 |
| **kmess_demo** | KMess Demo | Demo Account | 100 |

## 🔧 **Technical Features**

### **Performance Optimizations**
- ✅ **Indexes**: Optimized for common queries
- ✅ **Foreign Keys**: Data integrity ensured  
- ✅ **Triggers**: Auto-update counters
- ✅ **Views**: Complex queries simplified
- ✅ **Stored Procedures**: Common operations

### **Data Types**
- ✅ **UTF8MB4**: Full emoji support 😀🎮💖
- ✅ **JSON**: Flexible game data storage
- ✅ **ENUM**: Controlled values
- ✅ **TIMESTAMP**: Proper timezone handling

### **Security Features**
- ✅ **Password Hashing**: bcrypt với salt
- ✅ **Session Management**: JWT token tracking
- ✅ **Soft Deletes**: Data preservation
- ✅ **Validation**: Constraints và triggers

## 🔗 **Backend Connection**

### **Environment Variables**
Update your `.env` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=16012005@
DB_NAME=kmess_db
```

### **Test Connection**
```javascript
// Test in your backend
const { testConnection } = require('./src/config/database');
testConnection();
```

## 📝 **Common Queries**

### **Get User Feed**
```sql
CALL GetUserFeed(1, 10, 0);
```

### **Get Game Leaderboard**
```sql
CALL GetGameLeaderboard(1, 'all_time', 10);
```

### **Get Popular Posts**
```sql
SELECT * FROM popular_posts LIMIT 10;
```

### **Get Game Statistics**
```sql
SELECT * FROM game_stats;
```

## 🚨 **Troubleshooting**

### **Connection Issues**
- Check MySQL service is running
- Verify credentials in `.env`
- Ensure port 3306 is open

### **Permission Issues**  
```sql
GRANT ALL PRIVILEGES ON kmess_db.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

### **Charset Issues**
```sql
ALTER DATABASE kmess_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 📈 **Database Size**
- **Tables**: 15 core tables
- **Views**: 3 optimized views  
- **Procedures**: 2 stored procedures
- **Triggers**: 6 auto-update triggers
- **Sample Data**: 200+ records ready for testing

## 🎯 **Production Ready**

This database schema is **production-ready** with:
- ✅ Proper indexing
- ✅ Data integrity constraints
- ✅ Performance optimization
- ✅ Security considerations
- ✅ Scalability design

**Perfect for KMess social gaming app! 🏆**
