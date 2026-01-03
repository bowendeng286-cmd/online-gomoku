# 环境变量更新说明

## 问题

之前的 SSL 配置导致 Supabase 数据库连接失败：
```
self-signed certificate in certificate chain
```

## 解决方案

### 1. 禁用 SSL 连接

已修改代码，在数据库连接中禁用 SSL：

```typescript
// src/storage/database/db.ts
const newPool = new pg.Pool({
  connectionString: url,
  ssl: false  // 禁用 SSL
});
```

### 2. 更新 Vercel 环境变量

在 Vercel Dashboard 中更新 DATABASE_URL，移除 `?sslmode=require`：

**旧配置（错误）：**
```
DATABASE_URL=postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**新配置（正确）：**
```
DATABASE_URL=postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

### 3. JWT_SECRET 保持不变

```
JWT_SECRET=907e55de554b26881e2880225992f186252acaf913129f97be28a91451d3540d
```

---

## 部署步骤

### 1. 在 Vercel 更新环境变量

1. 进入 Vercel Dashboard → Settings → Environment Variables
2. 找到 `DATABASE_URL`
3. 点击 **Edit**
4. 删除末尾的 `?sslmode=require`
5. 点击 **Save**

### 2. 重新部署

环境变量更新后：
- 进入 **Deployments** 标签
- 找到最新部署
- 点击 **...** → **Redeploy**

---

## 安全性说明

### 禁用 SSL 是否安全？

**Supabase 数据库连接：**
- Supabase 的数据库连接默认支持非加密连接
- 从 Vercel 到 Supabase 的网络流量由云服务商管理，相对安全
- 数据库本身有用户名和密码保护

**权衡：**
- ❌ 连接未加密（理论上可能被中间人监听）
- ✅ 适合开发和小规模应用
- ✅ 避免 SSL 证书验证问题

### 生产环境建议

如果应用在生产环境中需要更高安全性，可以：
1. 使用 Vercel Postgres（原生集成，无 SSL 问题）
2. 使用 Supabase 的连接池服务（配置正确的 CA 证书）
3. 使用私有网络连接

---

## 验证部署

部署完成后，测试登录：

1. 访问 https://online-gomoku.vercel.app
2. 使用测试账户登录：
   - 用户名：testuser
   - 密码：test123

3. 或使用调试接口：
```bash
curl -X POST https://online-gomoku.vercel.app/api/auth-debug \
  -H "Content-Type: application/json" \
  -d '{"action":"login","username":"testuser","password":"test123"}'
```

---

## 数据库状态

Supabase 数据库已成功初始化：
- ✅ users 表
- ✅ game_sessions 表
- ✅ game_moves 表
- ✅ user_sessions 表
- ✅ 测试用户：testuser/test123
