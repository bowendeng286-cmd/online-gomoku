# Vercel 部署修复指南

## 问题诊断

如果您的网站在 Vercel 部署后登录报 "Internal server error"，请按以下步骤排查：

## 步骤 1: 运行诊断

访问以下 URL 查看环境和数据库配置状态：
```
https://your-domain.vercel.app/api/diagnose
```

**期望结果：**
```json
{
  "status": "✅ 所有检查通过",
  "environment": {
    "hasDatabaseUrl": true,
    "databaseUrlLength": 100,
    "hasJwtSecret": true,
    "jwtSecretLength": 64,
    "isVercel": true
  },
  "database": {
    "connection": "✅ 成功",
    "tables": {
      "users": "✅ 存在",
      "game_sessions": "✅ 存在",
      "game_moves": "✅ 存在",
      "user_sessions": "✅ 存在"
    },
    "userCount": 1
  },
  "errors": []
}
```

如果看到错误，请检查以下配置。

## 步骤 2: 测试登录流程

访问以下 URL 测试登录：
```
POST https://your-domain.vercel.app/api/test-login
```

可以使用 curl 或 Postman：
```bash
curl -X POST https://your-domain.vercel.app/api/test-login
```

## 步骤 3: 配置 Vercel 环境变量

### 必需的环境变量

在 Vercel Dashboard 中配置以下环境变量：

#### 1. DATABASE_URL
从 Supabase 项目设置中复制连接字符串，使用非连接池版本：

```
postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**注意：** 使用 `POSTGRES_URL_NON_POOLING`（端口 5432），不要使用 `POSTGRES_URL`（端口 6543 的连接池版本）。

#### 2. JWT_SECRET
生成一个随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

示例：
```
907e55de554b26881e2880225992f186252acaf913129f97be28a91451d3540d
```

### 配置步骤

1. 进入 Vercel Dashboard
2. 选择您的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：
   - Name: `DATABASE_URL`
   - Value: 上面复制的 PostgreSQL 连接字符串
   - Environment: 选择 **Production**, **Preview**, **Development**（全部勾选）
5. 点击 **Add**
6. 重复步骤 4-5 添加 `JWT_SECRET`
7. 点击 **Save**

## 步骤 4: 重新部署

环境变量添加后，需要重新部署：

1. 进入 **Deployments** 标签
2. 找到最新的部署
3. 点击右侧的 **...** 按钮
4. 选择 **Redeploy**

或者推送一个新的 commit 到 GitHub，会自动触发部署。

## 步骤 5: 验证部署

等待部署完成后：

1. 访问 `https://your-domain.vercel.app/`
2. 尝试登录或注册
3. 如果仍然失败，检查 Vercel 部署日志：
   - 进入 **Deployments** 标签
   - 点击最新的部署
   - 查看 **Build Log** 和 **Function Logs**

## 常见问题

### Q1: "DATABASE_URL is not set"
**原因：** 环境变量未配置或名称错误

**解决方案：**
- 确保环境变量名称是 `DATABASE_URL`（大写）
- 确保环境变量已添加到 **Production** 环境

### Q2: "connection refused" 或 "connection timeout"
**原因：** 数据库连接字符串格式错误或防火墙阻止

**解决方案：**
- 检查连接字符串格式是否正确
- 确保使用 Supabase 提供的非连接池版本（端口 5432）
- 确保 Supabase 项目的连接设置允许 Vercel IP 访问

### Q3: "relation "users" does not exist"
**原因：** 数据库表未初始化

**解决方案：**
1. 登录 Supabase Dashboard
2. 进入 **SQL Editor**
3. 执行 `init-database.sql` 中的 SQL 语句
4. 确保所有表创建成功

### Q4: JWT_SECRET 相关错误
**原因：** JWT_SECRET 未配置或太短

**解决方案：**
- 确保 JWT_SECRET 至少 32 个字符
- 使用上面提供的命令生成随机密钥

## 调试技巧

### 查看 Vercel 函数日志

1. 进入 Vercel Dashboard
2. 选择项目 → **Deployments**
3. 点击最新的部署
4. 向下滚动到 **Functions** 部分
5. 找到 `/api/auth` 函数，点击查看日志

### 本地测试相同配置

```bash
# 1. 设置环境变量
export DATABASE_URL="你的连接字符串"
export JWT_SECRET="你的密钥"

# 2. 运行诊断
npx tsx diagnose-db.ts

# 3. 启动开发服务器
npm run dev

# 4. 测试登录
curl -X POST http://localhost:5000/api/test-login
```

## 获取帮助

如果以上步骤都无法解决问题，请提供：

1. `/api/diagnose` 的输出
2. `/api/test-login` 的输出
3. Vercel 部署日志的错误部分
4. 具体的错误信息或截图
