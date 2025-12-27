#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Starting build process for Gomoku Game..."

cd "$WORK_DIR/gomoku-game"

# Clean previous build
echo "Cleaning previous build..."
rm -rf .next

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

echo "Build completed successfully!"