@echo off
title Artisan Avenue - Setup
cd /d "%~dp0"
echo.
echo  Artisan Avenue - first-time setup
echo  ================================
echo.
node scripts/setup.mjs
echo.
pause
