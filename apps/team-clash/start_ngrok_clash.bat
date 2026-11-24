@echo off
setlocal
echo ========================================================
echo   Ngrok cho Team Clash: Live Client + Host Admin
echo ========================================================
echo.
echo Chay truoc:  pnpm run dev:clash:all   (client 8030, admin 8031, server 4000)
echo (Hoac neu chi test cuc bo: pnpm run dev:clash)
echo Mo 2 tunnel:
echo   - clash-client  (port 8030)  -^> man hinh Live 9:16 / OBS
echo   - clash-admin   (port 8031)  -^> bang dieu khien Host
echo Xem URL cong khai tai: http://127.0.0.1:4040
echo.

set "NGROK_CMD=ngrok start clash-client clash-admin"
set "CLASH_CONFIG=%~dp0ngrok.clash.yml"

rem Merge the personal ngrok config (holds the authtoken) with the Team Clash tunnels.
rem Ask ngrok where its own config lives ("Valid configuration file at <path>").
set "PERSONAL_CONFIG="
for /f "tokens=4,*" %%A in ('ngrok config check 2^>nul') do if /i "%%A"=="at" set "PERSONAL_CONFIG=%%B"
if not defined PERSONAL_CONFIG if exist "%LOCALAPPDATA%\ngrok\ngrok.yml" set "PERSONAL_CONFIG=%LOCALAPPDATA%\ngrok\ngrok.yml"

if defined PERSONAL_CONFIG (
  %NGROK_CMD% --config "%PERSONAL_CONFIG%" --config "%CLASH_CONFIG%"
) else (
  echo [!] Khong tim thay ngrok.yml ca nhan ^(authtoken^). Chay: ngrok config add-authtoken ^<TOKEN^>
  %NGROK_CMD% --config "%CLASH_CONFIG%"
)
pause
