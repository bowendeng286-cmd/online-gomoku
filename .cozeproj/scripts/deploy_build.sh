#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WORK_DIR/gomoku-game"

echo "Starting build process for Gomoku game..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building Next.js project..."
npm run build

echo "Build process completed successfully!"