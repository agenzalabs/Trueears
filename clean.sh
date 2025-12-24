#!/bin/bash

# Clean script for Scribe - removes all caches and build artifacts

echo "🧹 Cleaning Scribe project..."

# Frontend caches
echo "Removing frontend caches..."
rm -rf frontend/dist
rm -rf frontend/node_modules
rm -rf frontend/.vite
rm -f frontend/package-lock.json

# Backend caches
echo "Removing backend caches..."
cd backend
cargo clean
cd ..

# Root level caches
echo "Removing root level caches..."
rm -rf node_modules
rm -f package-lock.json

# Tauri cache (if exists)
echo "Removing Tauri cache..."
rm -rf backend/target

echo "✅ Clean complete!"
echo ""
echo "To rebuild:"
echo "  1. npm install"
echo "  2. npm run dev"





