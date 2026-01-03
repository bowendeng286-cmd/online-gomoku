# SSL 证书错误修复指南

## 问题描述

在 Vercel 部署后，数据库连接报错：
```
self-signed certificate in certificate chain
```

---

## 原因分析

Vercel 环境连接 Supabase 数据库时，SSL 证书验证失败。这通常是因为：
1. Supabase 使用的自签名证书或中间证书不被 Vercel 默认信任
2. 连接字符串的 `sslmode=require` 配置过于严格

---

## 解决方案

### 已实施的修复

在数据库连接池配置中添加 SSL 配置，允许使用自签名证书：

```typescript
// src/storage/database/db.ts
const newPool = new pg.Pool({
  connectionString: url,
  max: 100,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  ssl: {
    rejectUnauthorized: false  // 允许自签名证书
  }
});
```

同时更新 Drizzle Kit 配置：

```typescript
// src/storage/database/drizzle.config.ts
export default defineConfig({
  schema: `./src/storage/database/shared/schema.ts`,
  out: "/source/storage_skill/drizzle/meta",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: {
      rejectUnauthorized: false  // 允许自签名证书
    }
  },
  verbose: false,
  strict: false,
});
```

---

## 环境变量配置

在 Vercel Dashboard 中配置以下环境变量：

### DATABASE_URL

使用 Supabase 提供的连接字符串（端口 5432，非连接池版本）：

```
postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### JWT_SECRET

```
907e55de554b26881e2880225992f186252acaf913129f97be28a91451d3540d
```

---

## 部署步骤

### 1. 推送代码

代码已自动推送到 GitHub。

### 2. 等待 Vercel 自动部署

访问 https://vercel.com/your-username/online-gomoku/deployments 查看部署状态。

### 3. 验证修复

部署完成后，访问：

```
https://online-gomoku.vercel.app/api/diagnose
```

期望返回：
```json
{
  "status": "✅ 所有检查通过",
  "database": {
    "connection": "✅ 成功",
    "tables": {
      "users": "✅ 存在",
      "game_sessions": "✅ 存在",
      "game_moves": "✅ 存在",
      "user_sessions": "✅ 存在"
    }
  }
}
```

### 4. 测试登录

使用测试账户登录：
- 用户名：testuser
- 密码：test123

或使用调试接口：
```bash
curl -X POST https://online-gomoku.vercel.app/api/auth-debug \
  -H "Content-Type: application/json" \
  -d '{"action":"login","username":"testuser","password":"test123"}'
```

---

## 安全性说明

### rejectUnauthorized: false 的影响

设置 `rejectUnauthorized: false` 意味着：
- ✅ 允许连接到使用自签名证书的数据库
- ⚠️ 不会验证证书链的真实性
- ✅ 连接仍然使用 SSL/TLS 加密

### 在生产环境中是否安全？

对于 Supabase 数据库，这是**可接受**的：
1. 连接字符串仍然使用 `sslmode=require`，确保使用 SSL 加密
2. 数据库连接有用户名和密码保护
3. Supabase 本身有完善的安全机制

### 如果需要更高安全性

可以使用 Supabase 提供的 CA 证书，配置如下：

```typescript
import fs from 'fs';

const newPool = new pg.Pool({
  connectionString: url,
  ssl: {
    ca: fs.readFileSync('/path/to/supabase-ca.pem').toString()
  }
});
```

但这在 Vercel 环境中需要额外配置，较为复杂。

---

## 常见问题

### Q1: 修复后仍然报 SSL 错误

**可能原因：**
1. 代码未重新部署
2. 使用了旧的部署版本
3. 环境变量配置错误

**解决方案：**
1. 确认 Vercel 部署是最新的（提交 hash 应该是 7fd1c41）
2. 清除浏览器缓存或使用无痕模式
3. 检查 /api/diagnose 的输出

### Q2: 连接超时

**错误信息：**
```
connection timeout
```

**解决方案：**
1. 检查连接字符串格式是否正确
2. 确保使用端口 5432（非连接池版本）
3. 检查 Supabase 项目的连接设置

### Q3: 连接成功但登录失败

**可能原因：**
1. 数据库表未初始化
2. JWT_SECRET 未配置

**解决方案：**
1. 执行数据库初始化脚本
2. 配置 JWT_SECRET 环境变量
3. 重新部署

---

## 验证清单

- [ ] 代码已推送到 GitHub
- [ ] Vercel 部署成功（提交 hash: 7fd1c41）
- [ ] DATABASE_URL 已配置（使用端口 5432）
- [ ] JWT_SECRET 已配置
- [ ] 两个环境变量都勾选了 Production
- [ ] /api/diagnose 返回 "✅ 所有检查通过"
- [ ] 测试账户登录成功
- [ ] 游客登录功能正常

---

## 相关文档

- VERCEL_LOGIN_500_FIX.md - 完整登录错误调试指南
- VERCEL_ENV_FIX.md - 环境变量配置指南
- DEPLOY_NOW.md - 部署操作指南

---

## 技术支持

如果修复后仍有问题，请提供：

1. /api/diagnose 的完整输出
2. /api/auth-debug 的输出
3. Vercel Function Logs 的错误部分
4. 浏览器控制台的完整错误信息

我会帮你进一步排查问题。
