# 立即部署到 Vercel

由于沙箱环境的安全限制，无法直接推送代码到 GitHub。请按以下步骤完成部署：

## 方式一：使用命令行推送（推荐）

在你的本地电脑终端中运行：

```bash
# 进入项目目录
cd /path/to/online-gomoku

# 拉取最新的更改（如果其他地方有提交）
git pull github main

# 推送到 GitHub
git push github main
```

Vercel 会自动检测到新的提交并开始部署。

---

## 方式二：使用 GitHub Desktop

1. 打开 GitHub Desktop
2. 选择 `online-gomoku` 仓库
3. 查看待推送的提交（应该有 10 个新提交）
4. 点击 "Push" 按钮

---

## 方式三：使用 VS Code

1. 打开 VS Code
2. 打开 `online-gomoku` 项目
3. 打开 "源代码管理" 面板（左侧 git 图标）
4. 点击 "推送" 按钮（或使用快捷键 Ctrl+Shift+P → "Git: Push"）

---

## 方式四：直接在 GitHub 网页操作

1. 访问 https://github.com/bowendeng286-cmd/online-gomoku
2. 确认本地代码是最新的
3. 如果需要，可以使用 GitHub Desktop 或命令行推送

---

## 推送后的操作

### 1. 检查 Vercel 部署

推送后，Vercel 会自动触发部署。访问：

https://vercel.com/your-username/online-gomoku/deployments

查看部署状态。

### 2. 配置环境变量（如果还没配置）

在 Vercel Dashboard 中配置：

**Settings** → **Environment Variables**

添加以下变量（全部勾选 Production/Preview/Development）：

```
DATABASE_URL=postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

```
JWT_SECRET=907e55de554b26881e2880225992f186252acaf913129f97be28a91451d3540d
```

### 3. 重新部署（如果环境变量是新添加的）

如果刚刚添加了环境变量，需要重新部署：

- 进入 **Deployments** 标签
- 找到最新部署
- 点击 **...** → **Redeploy**

---

## 本次推送的内容

共 10 个提交，包含：

1. ✅ 调试接口 `/api/auth-debug`（详细错误日志）
2. ✅ 诊断接口 `/api/diagnose`（环境和数据库检查）
3. ✅ 数据库初始化完成
4. ✅ 测试账户：testuser/test123
5. ✅ 完整调试指南：VERCEL_LOGIN_500_FIX.md
6. ✅ 增强错误日志输出
7. ✅ 环境变量配置说明

---

## 验证部署

部署成功后，运行以下命令测试：

```bash
# 测试环境诊断
curl https://online-gomoku.vercel.app/api/diagnose

# 测试登录
curl -X POST https://online-gomoku.vercel.app/api/auth-debug \
  -H "Content-Type: application/json" \
  -d '{"action":"login","username":"testuser","password":"test123"}'
```

---

## 如果推送失败

### 问题 1：凭证错误

**错误信息：**
```
fatal: Authentication failed
```

**解决方案：**
- 确保你的 GitHub 账户有推送权限
- 使用 Personal Access Token 代替密码：
  1. 访问 https://github.com/settings/tokens
  2. 生成新 token，勾选 `repo` 权限
  3. 使用 token 作为密码

### 问题 2：推送被拒绝

**错误信息：**
```
! [rejected] main -> main (non-fast-forward)
```

**解决方案：**
```bash
git pull github main --rebase
git push github main
```

---

## 完成后的检查清单

- [ ] 代码已推送到 GitHub
- [ ] Vercel 部署成功
- [ ] DATABASE_URL 已配置
- [ ] JWT_SECRET 已配置
- [ ] 两个环境变量都勾选了 Production
- [ ] 已重新部署（如果环境变量是新添加的）
- [ ] 测试登录功能正常

---

## 需要帮助？

如果遇到问题，请提供：

1. Git 推送的完整错误信息
2. Vercel 部署日志
3. `/api/diagnose` 的输出结果

我会帮你进一步排查问题。
