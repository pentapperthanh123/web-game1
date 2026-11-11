@echo off
set PATH=%APPDATA%\npm;%PATH%
echo ===================================================
echo 🛠️ Building All Monorepo Projects (PNPM)
echo ===================================================
call npx pnpm --recursive run build
pause
