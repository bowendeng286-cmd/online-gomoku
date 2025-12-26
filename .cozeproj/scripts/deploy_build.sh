#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="$WORK_DIR/gomoku-game"

echo "Building Gomoku Game..."

# Navigate to project directory
cd "$PROJECT_DIR"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building Next.js application..."
npm run build

echo "Build completed successfully!"