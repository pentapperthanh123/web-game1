@echo off
set PATH=%APPDATA%\npm;%PATH%
echo ===================================================
echo LoL CKTG TikTok Live Game - LIVE mode (production overlay)
echo ===================================================
echo Overlay is built once and served as production React (much lighter than dev mode in OBS).
echo After changing client code, close this window and run it again to rebuild.
echo Freeing ports 4000, 8000, 8001...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4000, 8000, 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo [1/3] Server: http://localhost:4000
echo [2/3] Admin Portal: http://localhost:8001
start "LoL Server + Admin" cmd /k "npx pnpm --parallel --filter server --filter admin run dev"
echo [3/3] Game OBS (production build): http://localhost:8000
call npx pnpm --filter client live
pause
