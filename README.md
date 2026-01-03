# 五子棋联机对战游戏

一个基于 Next.js 开发的五子棋联机对战游戏，支持实时多人对战、快速匹配、用户认证和战绩管理等功能。

## 功能特性

- ✅ **实时联机对战**：支持在线玩家实时对战
- ✅ **快速匹配系统**：智能匹配对手，秒级响应
- ✅ **多种登录方式**：
  - 用户名/密码注册登录
  - 游客一键登录（自动生成临时账号）
- ✅ **用户认证系统**：JWT 令牌认证，确保安全性
- ✅ **战绩管理**：记录玩家胜率、对战历史
- ✅ **等级分系统**：基于 Elo 算法的玩家实力评估
- ✅ **房间聊天**：对战双方可实时交流
- ✅ **精美界面**：
  - 简洁现代的 UI 设计
  - 图片背景棋盘
  - 棋子精准落在交叉点
  - 大屏下棋盘尺寸自适应

## 技术栈

- **前端框架**：Next.js 16 (App Router)
- **编程语言**：TypeScript 5
- **样式框架**：Tailwind CSS 4
- **数据库**：PostgreSQL
- **ORM**：Drizzle ORM
- **认证**：JWT + bcryptjs
- **通信方式**：HTTP 轮询

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 数据库
- pnpm 包管理器

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
DATABASE_URL=postgresql://username:password@localhost:5432/gomoku
JWT_SECRET=your-secret-key
```

### 初始化数据库

```bash
pnpm drizzle-kit push
```

### 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5000` 即可开始游戏。

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── auth/          # 认证相关接口
│   │   ├── game/          # 游戏接口
│   │   └── user/          # 用户接口
│   ├── game/              # 游戏页面
│   ├── login/             # 登录页面
│   ├── globals.css        # 全局样式
│   └── layout.tsx         # 根布局
├── components/            # React 组件
│   ├── Board.tsx          # 棋盘组件
│   ├── Login.tsx          # 登录组件
│   └── ...
├── lib/                   # 工具库
│   ├── simpleGameClient.ts # 游戏客户端
│   └── db.ts              # 数据库配置
└── types/                 # TypeScript 类型定义
```

## 开发说明

### 游戏客户端

使用 `SimpleGameClient` 类与后端通信：

```typescript
const client = new SimpleGameClient('http://localhost:5000');

// 登录
await client.login(username, password);

// 快速匹配
await client.quickMatch();

// 下棋
await client.makeMove(row, col);

// 获取游戏状态
const state = await client.getGameState();
```

### 数据库模型

- **users**：用户信息
- **games**：游戏记录
- **game_moves**：棋步记录
- **chat_messages**：聊天消息

## 部署

### Vercel 部署

#### 快速部署

1. 连接 GitHub 仓库到 Vercel
2. **重要：配置数据库**
   - 创建 Vercel Postgres 数据库（推荐）
   - 详见 [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md)
3. 在 **Environment Variables** 中添加以下环境变量：
   - `DATABASE_URL`: PostgreSQL 数据库连接字符串（从 Vercel Postgres 复制）
   - `JWT_SECRET`: 用于 JWT 签名的密钥（生成方法见下文）
4. 执行数据库初始化脚本：[init-database.sql](./init-database.sql)
5. 部署项目

#### 生成 JWT_SECRET

在终端中运行：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

详细配置说明请查看：
- [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) - 数据库配置指南
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Vercel 部署指南
- [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md) - 故障排除指南

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务

```bash
pnpm start
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
