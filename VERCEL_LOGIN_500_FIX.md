# Vercel 登录 500 错误完整调试指南

## 问题描述
访问网站后，登录功能报错：
```
POST https://online-gomoku.vercel.app/api/auth 500 (Internal Server Error)
```

---

## 第一步：使用调试接口诊断

### 1. 测试调试接口

**测试登录：**
```bash
curl -X POST https://online-gomoku.vercel.app/api/auth-debug \
  -H "Content-Type: application/json" \
  -d '{"action":"login","username":"testuser","password":"test123"}'
```

**测试游客登录：**
```bash
curl -X POST https://online-gomoku.vercel.app/api/auth-debug \
  -H "Content-Type: application/json" \
  -d '{"action":"guest"}'
```

### 2. 预期输出格式

成功的输出示例：
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser",
    "userType": "regular"
  },
  "logs": [
    { "time": "2025-12-27T...", "message": "请求开始" },
    { "time": "2025-12-27T...", "message": "检查环境变量", "data": {...} },
    { "time": "2025-12-27T...", "message": "数据库连接成功" },
    { "time": "2025-12-27T...", "message": "JWT 测试成功" },
    { "time": "2025-12-27T...", "message": "登录成功" }
  ]
}
```

失败的输出会包含详细错误信息：
```json
{
  "error": "Database connection failed",
  "dbError": "connection refused",
  "logs": [...]
}
```

---

## 第二步：查看 Vercel 函数日志

### 1. 进入 Vercel Dashboard

1. 打开 https://vercel.com
2. 选择你的项目 `online-gomoku`
3. 进入 **Deployments** 标签
4. 点击最新的部署（最新的日期）
5. 向下滚动找到 **Functions** 部分
6. 找到 `/api/auth` 函数
7. 点击展开查看日志

### 2. 日志解读

**正常日志：**
```
[GET] /api/auth 200 OK
Using environment variables from process.env
Database connection established
```

**错误日志示例 1 - 环境变量缺失：**
```
Error: DATABASE_URL or PGDATABASE_URL is not set
```
→ 需要配置环境变量

**错误日志示例 2 - 数据库连接失败：**
```
Error: connect ECONNREFUSED 5432
```
→ 数据库连接字符串不正确或端口不对

**错误日志示例 3 - JWT 配置错误：**
```
JsonWebTokenError: secret or public key must be provided
```
→ JWT_SECRET 环境变量未设置

**错误日志示例 4 - 表不存在：**
```
Error: relation "users" does not exist
```
→ 数据库表未初始化

---

## 第三步：验证环境变量配置

### 1. 在 Vercel Dashboard 检查

进入 **Settings** → **Environment Variables**

确认以下变量已配置：

#### DATABASE_URL
- **必须勾选**：Production ✅、Preview ✅、Development ✅
- **格式**：`postgres://user:pass@host:5432/dbname?sslmode=require`
- **示例**：
  ```
  postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
  ```
- **重要**：使用端口 **5432**（非连接池），不是 6543

#### JWT_SECRET
- **必须勾选**：Production ✅、Preview ✅、Development ✅
- **格式**：至少 32 个字符的随机字符串
- **生成方法**：
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **示例**：
  ```
  907e55de554b26881e2880225992f186252acaf913129f97be28a91451d3540d
  ```

### 2. 常见配置错误

❌ **错误 1**：忘记勾选 Production 环境
✅ **解决**：重新编辑环境变量，确保所有三个环境都勾选

❌ **错误 2**：使用了连接池版本（端口 6543）
✅ **解决**：使用 `POSTGRES_URL_NON_POOLING`，端口 5432

❌ **错误 3**：JWT_SECRET 太短
✅ **解决**：使用 32 字符以上的随机密钥

❌ **错误 4**：变量名拼写错误
✅ **解决**：确保是 `DATABASE_URL`（大写），不是 `DATABASEURL` 或 `database_url`

---

## 第四步：测试数据库连接

### 方法 1：使用诊断接口

访问：
```
https://online-gomoku.vercel.app/api/diagnose
```

### 方法 2：本地测试相同配置

```bash
# 1. 复制你的 Vercel 环境变量到本地
export DATABASE_URL="你的连接字符串"
export JWT_SECRET="你的密钥"

# 2. 运行数据库诊断
cd /workspace/projects
npx tsx diagnose-db.ts

# 3. 启动本地开发服务器测试
npm run dev

# 4. 打开 http://localhost:5000 测试登录
```

---

## 第五步：重新部署

环境变量修改后必须重新部署：

### 方法 1：使用 Vercel Dashboard
1. 进入 **Deployments** 标签
2. 找到最新部署
3. 点击右侧的 **...** 按钮
4. 选择 **Redeploy**
5. 等待部署完成（约 1-2 分钟）

### 方法 2：Git 推送
```bash
git commit --allow-empty -m "Trigger Vercel redeploy"
git push
```

---

## 常见问题与解决方案

### Q1: 错误 "DATABASE_URL or PGDATABASE_URL is not set"

**原因**：环境变量未配置或名称错误

**解决方案**：
1. 进入 Vercel Dashboard → Settings → Environment Variables
2. 添加 `DATABASE_URL`（注意大写）
3. 确保勾选 Production、Preview、Development
4. 重新部署

---

### Q2: 错误 "connection refused" 或 "connection timeout"

**原因**：数据库连接字符串格式错误

**解决方案**：
1. 检查连接字符串格式：`postgres://user:pass@host:5432/db?sslmode=require`
2. 确保使用 Supabase 的非连接池版本（端口 5432）
3. 确保 Supabase 项目的连接设置允许 Vercel IP
4. 测试连接：`npx tsx diagnose-db.ts`

---

### Q3: 错误 "relation \"users\" does not exist"

**原因**：数据库表未初始化

**解决方案**：
1. 登录 Supabase Dashboard
2. 进入你的项目
3. 打开 **SQL Editor**
4. 复制并执行 `init-database.sql` 中的 SQL 语句
5. 确认所有表创建成功

---

### Q4: JWT 相关错误

**错误信息**：
```
JsonWebTokenError: secret or public key must be provided
```

**解决方案**：
1. 检查 `JWT_SECRET` 环境变量是否已配置
2. 确保 JWT_SECRET 至少 32 个字符
3. 重新部署

---

### Q5: 部署成功但登录仍失败

**可能原因**：
1. 环境变量未生效（部署前未修改）
2. 使用了旧的部署版本
3. 浏览器缓存

**解决方案**：
1. 检查最新部署的时间戳，确认是最新的
2. 清除浏览器缓存或使用无痕模式
3. 查看最新部署的 Function Logs
4. 使用调试接口测试：`/api/auth-debug`

---

## 快速检查清单

在报告问题前，请完成以下检查：

- [ ] 环境变量 `DATABASE_URL` 已配置（大写）
- [ ] 环境变量 `JWT_SECRET` 已配置（大写）
- [ ] 两个环境变量都勾选了 Production、Preview、Development
- [ ] `DATABASE_URL` 使用的是端口 5432（非连接池）
- [ ] `JWT_SECRET` 至少 32 个字符
- [ ] 数据库表已初始化（users, game_sessions, game_moves, user_sessions）
- [ ] 已重新部署
- [ ] 查看过 Vercel Function Logs
- [ ] 已使用 `/api/diagnose` 接口测试
- [ ] 已使用 `/api/auth-debug` 接口测试

---

## 获取帮助

如果以上步骤都无法解决问题，请提供以下信息：

1. **诊断接口输出**：
   ```bash
   curl https://online-gomoku.vercel.app/api/diagnose
   ```

2. **调试接口输出**（测试登录）：
   ```bash
   curl -X POST https://online-gomoku.vercel.app/api/auth-debug \
     -H "Content-Type: application/json" \
     -d '{"action":"login","username":"testuser","password":"test123"}'
   ```

3. **Vercel Function Logs 的错误部分**
   - 在 Vercel Dashboard → Deployments → 最新部署 → Functions → /api/auth
   - 复制完整的错误日志

4. **环境变量确认**：
   - DATABASE_URL 是否已配置？(是/否)
   - JWT_SECRET 是否已配置？(是/否)
   - 是否勾选了 Production 环境？(是/否)

将以上信息发送给我，我会帮你进一步诊断和解决问题。
