@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo [Viet-TTS] Building and starting dangvansam/viet-tts
echo Endpoint: http://localhost:8298
echo ===================================================

docker compose up -d --build
if errorlevel 1 (
  echo [Viet-TTS] ERROR: Failed to start Docker container. Make sure Docker Desktop is running.
  exit /b 1
)

echo [Viet-TTS] Container started. Checking logs (first run downloads ~2.5GB model from HuggingFace)...
echo Run "docker logs -f viet-tts-service" to monitor model download progress.
endlocal
