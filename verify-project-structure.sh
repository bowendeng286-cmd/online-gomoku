#!/bin/bash
echo "=== 项目结构验证 ==="
echo ""

echo "1. 检查根目录文件："
for file in package.json next.config.ts tsconfig.json; do
  if [ -f "$file" ]; then
    echo "  ✓ $file 存在"
  else
    echo "  ✗ $file 缺失"
  fi
done

echo ""
echo "2. 检查src目录："
if [ -d "src" ]; then
  echo "  ✓ src/ 目录存在"
  if [ -d "src/app" ]; then
    echo "  ✓ src/app/ 目录存在"
    if [ -f "src/app/page.tsx" ]; then
      echo "  ✓ src/app/page.tsx 存在"
    fi
    if [ -d "src/app/api" ]; then
      echo "  ✓ src/app/api/ 目录存在"
      echo "    API路由: $(ls src/app/api | wc -l) 个"
    fi
  fi
else
  echo "  ✗ src/ 目录缺失"
fi

echo ""
echo "3. 检查public目录："
if [ -d "public" ]; then
  echo "  ✓ public/ 目录存在"
  echo "    文件: $(ls public | wc -l) 个"
else
  echo "  ✗ public/ 目录缺失"
fi

echo ""
echo "4. 检查构建产物："
if [ -d ".next" ]; then
  echo "  ✓ .next/ 目录存在"
else
  echo "  ✗ .next/ 目录缺失（需要运行 npm run build）"
fi

echo ""
echo "=== 验证完成 ==="
