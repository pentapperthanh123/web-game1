@echo off
REM Runs the game server and restarts it automatically whenever it exits (crash, OOM, kill).
REM Use this instead of `pnpm dev:server` for unattended 24/7 lives. See scripts/ops/README.md.
setlocal
set PATH=%APPDATA%\npm;%PATH%
set RESTART_DELAY_SECONDS=3
set SERVER_DIR=%~dp0..\..\server
set LOG_FILE=%SERVER_DIR%\data\supervisor.log

cd /d "%SERVER_DIR%"
if not exist data mkdir data

echo [%date% %time%] Building server... >> "%LOG_FILE%"
call npx tsc -p .
if errorlevel 1 (
  echo Build failed. Fix TypeScript errors before running supervised.
  echo [%date% %time%] Build failed, supervisor stopped. >> "%LOG_FILE%"
  exit /b 1
)

:loop
echo [%date% %time%] Starting server. >> "%LOG_FILE%"
echo [%date% %time%] Starting server...
node dist/index.js
echo [%date% %time%] Server exited with code %errorlevel%. Restarting in %RESTART_DELAY_SECONDS%s. >> "%LOG_FILE%"
echo Server exited with code %errorlevel%. Restarting in %RESTART_DELAY_SECONDS%s... (close this window to stop)
timeout /t %RESTART_DELAY_SECONDS% /nobreak >nul
goto loop
