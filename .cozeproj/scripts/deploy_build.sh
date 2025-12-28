set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WORK_DIR/gomoku-game"

echo "🔨 构建五子棋游戏项目..."

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🏗️ 构建项目..."
npm run build

echo "✅ 构建完成！"