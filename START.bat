@echo off
title Artisan Avenue
cd /d "%~dp0"

if not exist "server\.env" (
  echo server\.env not found. Run SETUP.bat first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules missing. Run SETUP.bat first.
  pause
  exit /b 1
)

echo Starting API + website...
echo Close this window to stop both servers.
echo.
npm run dev:all
