#!/bin/bash
set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WORK_DIR/gomoku-game"

echo "Installing dependencies..."
npm install

echo "Building project..."
npm run build

echo "Build completed successfully!"