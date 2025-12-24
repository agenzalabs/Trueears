@echo off
REM Clean script for Scribe - removes all caches and build artifacts (Windows)

echo 🧹 Cleaning Scribe project...

REM Frontend caches
echo Removing frontend caches...
if exist frontend\dist rmdir /s /q frontend\dist
if exist frontend\node_modules rmdir /s /q frontend\node_modules
if exist frontend\.vite rmdir /s /q frontend\.vite
if exist frontend\package-lock.json del /q frontend\package-lock.json

REM Backend caches
echo Removing backend caches...
cd backend
cargo clean
cd ..

REM Root level caches
echo Removing root level caches...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json

REM Tauri cache
echo Removing Tauri cache...
if exist backend\target rmdir /s /q backend\target

echo ✅ Clean complete!
echo.
echo To rebuild:
echo   1. npm install
echo   2. npm run dev





