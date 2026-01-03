# Vercel 部署配置指南

**重要说明**：Next.js 项目已在根目录中，无需配置 Root Directory。

## 快速部署

### 步骤 1：连接仓库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New** > **Project**
3. 导入 GitHub 仓库：`bowendeng286-cmd/online-gomoku`

### 步骤 2：配置环境变量

在 **Environment Variables** 中添加以下变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接 | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | JWT 签名密钥 | 使用强随机字符串，如：`your-secret-key-12345` |

点击 **Deploy** 开始部署。

### 步骤 3：验证部署

等待部署完成后，访问：
- 主页：https://online-gomoku.vercel.app/
- 应该能看到五子棋游戏的登录界面

## 数据库配置建议

### 推荐的免费数据库服务

1. **Vercel Postgres**（推荐）
   - 在 Vercel 项目中创建 Postgres 数据库
   - 自动配置 DATABASE_URL 环境变量
   - 无需手动配置连接字符串

2. **Supabase**
   - 免费额度：500MB 数据库
   - 提供 PostgreSQL 连接字符串
   - 需要在项目设置中添加连接字符串

3. **Neon**
   - Serverless PostgreSQL 数据库
   - 免费额度：0.5GB 存储
   - 自动扩缩容

### JWT_SECRET 配置

可以使用以下命令生成随机密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 其他配置选项

### 自定义域名（可选）

如果需要使用自定义域名：

1. 在 **Settings** > **Domains** 中添加域名
2. 按照 Vercel 的指引配置 DNS 记录
3. 等待 SSL 证书自动颁发

### 构建配置（自动配置）

项目会自动使用以下配置：
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

通常不需要手动修改这些设置。

## 常见问题

### Q1: 部署后出现数据库连接错误

**A:** 检查以下事项：
1. 环境变量 `DATABASE_URL` 是否正确设置
2. 数据库服务器是否允许 Vercel 的 IP 地址访问
3. 确认数据库用户权限（需要 SELECT, INSERT, UPDATE, DELETE）

### Q2: 如何查看部署日志？

**A:**
1. 进入 **Deployments** 标签
2. 点击任意部署记录
3. 在 **Build Logs** 中查看构建日志
4. 在 **Function Logs** 中查看运行时日志

### Q3: 如何回滚到之前的版本？

**A:**
1. 在 **Deployments** 列表中找到之前的版本
2. 点击版本右侧的 **...** 菜单
3. 选择 **Promote to Production** 或 **Redeploy**

### Q4: 如何配置生产数据库？

**A:**
1. 推荐使用 Vercel Postgres（自动配置）
2. 或者使用其他 PostgreSQL 服务
3. 在 Vercel 项目设置中添加 `DATABASE_URL` 环境变量
4. 重新部署以应用环境变量

### Q5: 部署成功但页面空白

**A:** 可能原因：
1. 检查浏览器控制台是否有 JavaScript 错误
2. 查看部署日志中的错误信息
3. 确认所有环境变量已正确配置

## 技术支持

如果按照以上步骤操作后仍有问题，请提供：
1. Vercel 部署日志截图
2. 环境变量配置截图（隐藏敏感信息）
3. 浏览器控制台错误截图
