# 🛠️ KMess Database Manual Setup Guide

**Hướng dẫn setup database khi MySQL command line không available**

## 🎯 **Method 1: MySQL Workbench (Recommended)**

### **Step 1: Open MySQL Workbench**
1. Mở **MySQL Workbench**
2. Create new connection:
   - **Host**: `localhost`
   - **Port**: `3306`
   - **Username**: `root`
   - **Password**: `16012005@`

### **Step 2: Create Database**
```sql
-- Copy và paste vào MySQL Workbench Query tab:

CREATE DATABASE IF NOT EXISTS kmess_db 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE kmess_db;
```

### **Step 3: Create Tables**
Copy toàn bộ nội dung từ file `schema.sql` và execute trong Workbench.

### **Step 4: Insert Sample Data**
Copy toàn bộ nội dung từ file `sample_data.sql` và execute.

## 🎯 **Method 2: phpMyAdmin**

Nếu bạn có XAMPP/WAMP:

1. Start Apache + MySQL trong XAMPP
2. Mở `http://localhost/phpmyadmin`
3. Click **"New"** → Create database `kmess_db`
4. Import file `schema.sql`
5. Import file `sample_data.sql`

## 🎯 **Method 3: Command Line Alternative**

### **Find MySQL Installation**
```bash
# Thử các đường dẫn phổ biến:
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
"C:\xampp\mysql\bin\mysql.exe" -u root -p
"C:\wamp\bin\mysql\mysql8.0.30\bin\mysql.exe" -u root -p
```

### **Add MySQL to PATH**
1. Tìm thư mục MySQL `bin` folder
2. Add vào System PATH
3. Restart Command Prompt
4. Chạy: `mysql -u root -p`

## 🧪 **Quick Test**

### **Test Database Connection**
```sql
-- Chạy trong MySQL client:
SHOW DATABASES;
USE kmess_db;
SHOW TABLES;
SELECT COUNT(*) FROM users;
```

### **Expected Results**
```
- Database: kmess_db ✅
- Tables: 5 tables (users, posts, comments, likes, games) ✅  
- Users: 3 sample users ✅
- Games: 3 sample games ✅
```

## 🔗 **Test Backend Connection**

### **After database setup:**
```bash
cd kmess-backend
npm run dev
```

### **Expected Output:**
```
🚀 KMess Server is running on port 3001
✅ Database connection successful
🎮 Socket.io server ready
```

### **Test API:**
```bash
# Health check
curl http://localhost:3001

# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123","displayName":"Test User"}'
```

## 🚨 **Troubleshooting**

### **Issue 1: MySQL Not Found**
- Install MySQL from [official website](https://dev.mysql.com/downloads/mysql/)
- Or use XAMPP package

### **Issue 2: Access Denied**
```sql
-- Reset password if needed:
ALTER USER 'root'@'localhost' IDENTIFIED BY '16012005@';
```

### **Issue 3: Connection Refused**
- Check MySQL service is running
- Verify port 3306 is open
- Check firewall settings

## ✅ **Success Criteria**

Once setup complete, you should have:
- ✅ Database `kmess_db` created
- ✅ 5 tables with sample data
- ✅ Backend server connecting successfully
- ✅ Mobile app registration working

---

**Need help? Check the backend console for detailed error messages!**
