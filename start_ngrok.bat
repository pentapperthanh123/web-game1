@echo off
setlocal
echo ========================================================
echo   Mo Cong Ngrok cho TikTok Live Game: Admin Portal
echo ========================================================
echo.
echo Dang khoi chay 1 tunnel ngrok (tam thoi):
echo   - Admin Portal (port 8001)
echo.

set "NGROK_CMD=ngrok start admin"
if exist "%LOCALAPPDATA%\ngrok\ngrok.yml" (
  %NGROK_CMD% --config "%LOCALAPPDATA%\ngrok\ngrok.yml" --config "%~dp0ngrok.yml"
) else if exist "%USERPROFILE%\.config\ngrok\ngrok.yml" (
  %NGROK_CMD% --config "%USERPROFILE%\.config\ngrok\ngrok.yml" --config "%~dp0ngrok.yml"
) else (
  %NGROK_CMD% --config "%~dp0ngrok.yml"
)
pause
