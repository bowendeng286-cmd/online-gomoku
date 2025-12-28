#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Starting build process for gomoku-game..."

# Navigate to project directory
cd "$WORK_DIR/gomoku-game"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building Next.js application..."
npm run build

echo "Build process completed successfully!"