set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WORK_DIR/gomoku-game"

echo "Installing dependencies and building project..."

# Install dependencies
npm install

# Build the project
npm run build

echo "Build completed successfully!"