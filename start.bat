@echo off
set PATH=%APPDATA%\npm;%PATH%
echo ===================================================
echo 🎮 LoL CKTG TikTok Live Game - Starting Services
echo ===================================================
echo [1/3] Server: http://localhost:4000
echo [2/3] Game OBS: http://localhost:8000
echo [3/3] Admin Portal: http://localhost:8001
echo ===================================================
call npx pnpm --parallel run dev
pause
