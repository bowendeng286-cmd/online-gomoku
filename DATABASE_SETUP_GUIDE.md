# 数据库配置指南

## 问题描述

登录提示 "Internal server error"，这是因为数据库未配置。

## 解决方案：使用 Vercel Postgres（推荐）

### 步骤 1：在 Vercel 中创建 Postgres 数据库

1. **登录 Vercel Dashboard**
   - 访问 https://vercel.com/dashboard
   - 进入 `online-gomoku` 项目

2. **创建 Postgres 数据库**
   - 点击顶部导航的 **Storage** 标签
   - 点击 **Create Database**
   - 选择 **Postgres**
   - 选择区域（推荐 Hong Kong 或 Singapore）
   - 点击 **Continue**
   - 选择项目：`online-gomoku`
   - 点击 **Create**

3. **获取连接字符串**
   - 创建完成后，点击数据库名称
   - 进入 **.env.local** 标签
   - 复制 `POSTGRES_URL` 的值（这是你的数据库连接字符串）

## 步骤 2：配置环境变量

1. **在 Vercel 项目中添加环境变量**
   - 点击 **Settings** 标签
   - 点击左侧 **Environment Variables**
   - 添加以下变量：

   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `DATABASE_URL` | 复制的 `POSTGRES_URL` | 数据库连接字符串 |
   | `JWT_SECRET` | 随机字符串 | JWT签名密钥 |

2. **生成 JWT_SECRET**
   在终端中运行：
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   复制生成的密钥作为 `JWT_SECRET` 的值

3. **保存并重新部署**
   - 点击 **Save** 保存环境变量
   - 进入 **Deployments** 标签
   - 点击最新部署的 **...** > **Redeploy**

4. **验证环境变量配置（可选）**
   
   部署完成后，可以通过以下方式验证环境变量是否正确配置：
   
   - 查看 **Deployments** > **Function Logs**
   - 搜索日志中的 `Environment variables loaded successfully` 或 `Using environment variables from process.env`
   - 确认没有 `DATABASE_URL or PGDATABASE_URL is not set` 错误
   
   或者在本地运行验证脚本：
   ```bash
   node verify-env-config.ts
   ```


### 步骤 3：初始化数据库表

数据库连接成功后，需要创建数据表。有几种方法：

#### 方法 1：通过 Vercel Dashboard（推荐）

1. **进入 Postgres 数据库管理界面**
   - 在项目页面点击 **Storage** 标签
   - 点击创建的 Postgres 数据库
   - 点击 **Query** 标签

2. **执行以下 SQL 脚本**

```sql
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type VARCHAR(10) DEFAULT 'regular' NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建游戏会话表
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(20) NOT NULL,
  black_player_id INTEGER,
  white_player_id INTEGER,
  winner VARCHAR(10),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS game_sessions_room_id_idx ON game_sessions(room_id);

-- 创建游戏步数表
CREATE TABLE IF NOT EXISTS game_moves (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  player_id INTEGER,
  move_number INTEGER NOT NULL,
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_session_token_idx ON user_sessions(session_token);
```

3. **点击执行**
   - 粘贴上面的 SQL 脚本
   - 点击 **Run Query**
   - 确认所有表都创建成功

#### 方法 2：使用 Drizzle Kit（本地环境）

如果你在本地开发环境，可以使用 Drizzle Kit：

```bash
# 安装依赖
npm install

# 配置环境变量
# 在 .env.local 文件中添加：
# DATABASE_URL=your-database-url

# 推送数据库 schema
npx drizzle-kit push:pg
```

### 步骤 4：验证配置

1. **检查环境变量**
   - 在 Vercel Dashboard > Settings > Environment Variables
   - 确认 `DATABASE_URL` 和 `JWT_SECRET` 都已配置

2. **检查部署日志**
   - 进入 Deployments 标签
   - 点击最新部署
   - 查看 Build Logs 和 Function Logs
   - 确认没有数据库连接错误

3. **测试登录功能**
   - 访问 https://online-gomoku.vercel.app/
   - 尝试使用"游客登录"
   - 应该能成功登录并进入游戏大厅

## 其他数据库选项

如果不想使用 Vercel Postgres，可以使用以下免费数据库服务：

### 1. Supabase

1. 访问 https://supabase.com/
2. 创建新项目（免费）
3. 在 Project Settings > Database 中获取连接字符串
4. 在 Vercel 环境变量中配置 `DATABASE_URL`

### 2. Neon

1. 访问 https://neon.tech/
2. 创建新项目（免费）
3. 获取连接字符串
4. 在 Vercel 环境变量中配置 `DATABASE_URL`

### 3. Railway

1. 访问 https://railway.app/
2. 新建 PostgreSQL 数据库
3. 获取连接字符串
4. 在 Vercel 环境变量中配置 `DATABASE_URL`

## 常见问题

### Q1: 连接字符串格式是什么？

Vercel Postgres 的连接字符串格式：
```
postgres://user:password@host/dbname?sslmode=require
```

### Q2: 如何验证数据库连接成功？

在 Vercel Dashboard > Storage > Postgres > Query 标签中执行：
```sql
SELECT 1;
```
如果返回结果，说明连接成功。

### Q3: JWT_SECRET 可以改吗？

可以，但建议：
- 使用强随机字符串（至少32个字符）
- 不要在代码中硬编码
- 定期更换以提高安全性

### Q4: 数据库表创建失败怎么办？

1. 检查 SQL 语法是否正确
2. 确认数据库用户有创建表的权限
3. 查看数据库连接字符串是否正确
4. 检查 Vercel Function Logs 中的错误信息

### Q5: 可以删除数据库重建吗？

可以：
1. 在 Vercel Storage 中删除数据库
2. 重新创建
3. 重新执行建表 SQL 脚本
4. 重新配置环境变量

## 数据库表结构

项目使用 4 个表：

1. **users** - 用户信息
   - 存储用户名、密码、等级分等
   - 支持普通用户和游客账号

2. **game_sessions** - 游戏会话
   - 记录每局游戏的信息
   - 包含房间号、玩家、胜负结果

3. **game_moves** - 游戏步数
   - 记录每步棋的位置
   - 支持复盘功能

4. **user_sessions** - 用户会话
   - 管理 JWT token
   - 7天自动过期

## 技术支持

如果配置后仍有问题，请提供：
1. Vercel Storage 页面截图
2. Environment Variables 配置截图（隐藏敏感信息）
3. 部署日志中的错误信息
4. 数据库 Query 标签的截图
