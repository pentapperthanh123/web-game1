@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo 🐳 LoL CKTG TikTok Live Game - Docker Deployment
echo ===================================================

:: Check if Docker is installed and running
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Khong tim thay Docker CLI tren may tinh!
    echo Vui long cai dat Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker daemon chua khoi dong!
    echo Vui long mo Docker Desktop va thu lai.
    pause
    exit /b 1
)

echo [1/2] Dang dong goi va khoi chay cac container (Docker Compose)...
docker compose up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Co loi xay ra khi khoi chay Docker Compose!
    pause
    exit /b %errorlevel%
)

echo ===================================================
echo [2/2] Khoi dong thanh cong! Cac dich vu dang hoat dong:
echo   - 🎮 Game OBS Overlay:   http://localhost:8000
echo   - ⚙️  Admin Portal:       http://localhost:8001
echo   - 🚀 Backend Server:     http://localhost:4000
echo ===================================================
echo De xem logs:    docker compose logs -f
echo De dung lai:   docker compose down (hoac chay stop-docker.bat)
echo ===================================================
pause
