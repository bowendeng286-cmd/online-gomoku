#!/bin/bash

echo "======================================"
echo "Vercel 登录问题诊断脚本"
echo "======================================"
echo ""

# 获取你的 Vercel 域名
read -p "请输入你的 Vercel 域名 (例如: https://online-gomoku.vercel.app): " DOMAIN

if [ -z "$DOMAIN" ]; then
  DOMAIN="https://online-gomoku.vercel.app"
fi

echo ""
echo "测试域名: $DOMAIN"
echo ""

# 测试 1: 诊断接口
echo "======================================"
echo "测试 1: 环境诊断"
echo "======================================"
curl -s "$DOMAIN/api/diagnose" | python3 -m json.tool
echo ""
echo ""

# 测试 2: 调试登录（测试用户）
echo "======================================"
echo "测试 2: 调试登录 (testuser/test123)"
echo "======================================"
curl -s -X POST "$DOMAIN/api/auth-debug" \
  -H "Content-Type: application/json" \
  -d '{"action":"login","username":"testuser","password":"test123"}' | python3 -m json.tool
echo ""
echo ""

# 测试 3: 调试游客登录
echo "======================================"
echo "测试 3: 调试游客登录"
echo "======================================"
curl -s -X POST "$DOMAIN/api/auth-debug" \
  -H "Content-Type: application/json" \
  -d '{"action":"guest"}' | python3 -m json.tool
echo ""
echo ""

echo "======================================"
echo "诊断完成！"
echo "======================================"
echo ""
echo "如果看到错误，请查看 VERCEL_LOGIN_500_FIX.md 获取详细解决方案"
