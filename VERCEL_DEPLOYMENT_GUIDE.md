# Vercel 部署配置指南

## 问题诊断

如果 Vercel 部署后访问 `https://online-gomoku.vercel.app/` 出现 404 NOT_FOUND 错误，是因为 Root Directory 配置不正确。

## 解决方案

### 步骤 1：进入 Vercel 项目设置

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 找到 `online-gomoku` 项目
3. 点击项目进入详情页

### 步骤 2：配置 Root Directory（关键步骤）

1. 点击顶部导航的 **Settings** 标签
2. 选择左侧菜单中的 **General**
3. 找到 **Root Directory** 字段
4. 将值从默认的 `/` 修改为 `gomoku-game`
5. 滚动到底部点击 **Save** 保存

**为什么需要这个配置？**
- Next.js 项目代码位于 `gomoku-game` 子目录
- Vercel 默认在根目录查找 `package.json` 和 `next.config.ts`
- 如果不设置 Root Directory，Vercel 无法找到正确的项目入口

### 步骤 3：验证环境变量

1. 在 **Settings** 标签页中，选择左侧 **Environment Variables**
2. 确保配置了以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接 | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | JWT 签名密钥 | 使用强随机字符串 |

3. 点击 **Save** 保存

### 步骤 4：触发重新部署

1. 点击顶部导航的 **Deployments** 标签
2. 找到最新的部署记录
3. 点击右侧的 **...** 菜单（三个点）
4. 选择 **Redeploy**
5. 在弹出窗口中确认重新部署

### 步骤 5：验证部署

等待部署完成后，访问：
- 主页：https://online-gomoku.vercel.app/
- 应该能看到五子棋游戏的登录界面

## 其他配置选项

### 构建和输出目录（自动配置）

项目包含 `vercel.json` 配置文件，会自动设置：
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

通常不需要手动修改这些设置。

### 自定义域名（可选）

如果需要使用自定义域名：

1. 在 **Settings** > **Domains** 中添加域名
2. 按照 Vercel 的指引配置 DNS 记录
3. 等待 SSL 证书自动颁发

## 常见问题

### Q1: 修改 Root Directory 后仍然 404

**A:** 确保已点击 "Redeploy" 重新部署，Vercel 不会自动重新部署已有部署。

### Q2: 部署成功但数据库连接失败

**A:** 检查以下事项：
1. 环境变量 `DATABASE_URL` 是否正确设置
2. 数据库服务器是否允许 Vercel 的 IP 地址访问
3. 确认数据库用户权限

### Q3: 如何查看部署日志？

**A:**
1. 进入 **Deployments** 标签
2. 点击任意部署记录
3. 在 **Build Logs** 中查看构建日志
4. 在 **Function Logs** 中查看运行时日志

### Q4: 如何回滚到之前的版本？

**A:**
1. 在 **Deployments** 列表中找到之前的版本
2. 点击版本右侧的 **...** 菜单
3. 选择 **Promote to Production** 或 **Redeploy**

## 联系支持

如果按照以上步骤操作后仍有问题，请提供：
1. Vercel 部署日志
2. Root Directory 设置截图
3. 环境变量配置截图（隐藏敏感信息）
