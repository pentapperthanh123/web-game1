@echo off
set PATH=%APPDATA%\npm;%PATH%
echo ===================================================
echo 🎮 LoL CKTG TikTok Live Game - Starting Services
echo ===================================================
echo 🧹 Kiem tra va giai phong cac cong 4000, 8000, 8001...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4000, 8000, 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo [1/3] Server: http://localhost:4000
echo [2/3] Game OBS: http://localhost:8000
echo [3/3] Admin Portal: http://localhost:8001
echo ===================================================
call npx pnpm --parallel run dev
pause
