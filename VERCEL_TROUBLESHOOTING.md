# Vercel 404问题解决指南

## 当前问题

项目结构已调整为根目录，但Vercel仍显示404错误。

## 解决方案

### 方法1：在Vercel中重新配置项目（推荐）

1. **访问Vercel Dashboard**
   - 登录 https://vercel.com/dashboard
   - 进入 `online-gomoku` 项目

2. **检查并修改Root Directory**
   - 点击 **Settings** 标签
   - 点击左侧菜单 **General**
   - 找到 **Root Directory** 字段
   - 如果当前值是 `gomoku-game`，将其修改为 `.`（表示根目录）
   - 如果为空，保持为空
   - 点击 **Save**

3. **清空构建缓存**
   - 点击 **Deployments** 标签
   - 找到最新的部署
   - 点击右侧的 **...** 菜单
   - 选择 **Redeploy**
   - 在弹出的对话框中，勾选 **"Clear build cache"**（如果有的话）
   - 点击 **Redeploy**

4. **等待部署完成**
   - 部署完成后，刷新页面查看是否正常

### 方法2：删除并重建Vercel项目

如果方法1无效，完全重建Vercel项目：

1. **删除现有Vercel项目**
   - 在Vercel Dashboard中找到 `online-gomoku` 项目
   - 点击项目进入详情
   - 点击 **Settings** 标签
   - 滚动到最底部
   - 点击 **Delete Project**
   - 确认删除

2. **创建新的Vercel项目**
   - 点击 **Add New** > **Project**
   - 在GitHub仓库列表中找到 `bowendeng286-cmd/online-gomoku`
   - 点击 **Import**
   - 确认配置：
     - Framework Preset: Next.js
     - Root Directory: 留空（默认）
     - Build Command: `npm run build`
     - Output Directory: `.next`
   - 点击 **Deploy**

3. **配置环境变量**
   - 部署完成后，点击 **Continue to Dashboard**
   - 点击 **Settings** > **Environment Variables**
   - 添加以下变量：
     - `DATABASE_URL`: 你的PostgreSQL数据库连接字符串
     - `JWT_SECRET`: 随机生成的密钥
   - 点击 **Save**

4. **重新部署**
   - 进入 **Deployments** 标签
   - 点击最新部署的 **Redeploy**

### 方法3：检查部署日志

1. **查看构建日志**
   - 进入 **Deployments** 标签
   - 点击最新的部署记录
   - 查看 **Build Logs**
   - 检查是否有错误信息

2. **查看函数日志**
   - 在部署详情页，查看 **Function Logs**
   - 检查运行时错误

### 常见问题和解决方案

#### Q1: 构建成功但部署后404

**可能原因**：
- Root Directory配置错误
- 路由配置问题
- 页面文件缺失

**解决方案**：
1. 确认Root Directory设置为 `.` 或留空
2. 检查 `src/app/page.tsx` 是否存在
3. 查看部署日志中的路由信息

#### Q2: 构建失败

**检查项目**：
1. 确认 `package.json` 在根目录
2. 确认 `next.config.ts` 在根目录
3. 确认 `src/` 目录在根目录

#### Q3: 数据库连接错误

**解决方案**：
1. 检查环境变量 `DATABASE_URL` 是否正确
2. 确认数据库允许Vercel的IP访问
3. 使用Vercel Postgres（推荐）

## 验证清单

部署完成后，检查以下内容：

- [ ] Root Directory设置为 `.` 或留空
- [ ] `DATABASE_URL` 环境变量已配置
- [ ] `JWT_SECRET` 环境变量已配置
- [ ] 构建日志显示成功
- [ ] 访问 https://online-gomoku.vercel.app/ 能看到登录界面

## 当前项目结构

```
.
├── package.json          ✓ Next.js配置
├── next.config.ts        ✓ Next.js配置
├── src/                  ✓ 源代码目录
│   ├── app/             ✓ Next.js App Router
│   │   ├── page.tsx     ✓ 首页
│   │   └── api/         ✓ API路由
│   ├── components/      ✓ React组件
│   └── lib/             ✓ 工具库
├── public/              ✓ 静态资源
└── vercel.json          ✓ Vercel配置
```

## 技术支持

如果以上方法都无效，请提供：
1. Vercel部署日志的截图
2. Settings页面的配置截图
3. 错误页面的截图
4. GitHub仓库的最新提交ID
