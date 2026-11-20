#!/usr/bin/env bash
set -e

echo "==================================================="
echo "🐳 LoL CKTG TikTok Live Game - Docker Deployment"
echo "==================================================="

if ! command -v docker >/dev/null 2>&1; then
    echo "[ERROR] Docker is not installed or not in PATH."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker daemon is not running. Please start Docker."
    exit 1
fi

echo "[1/2] Building and launching containers..."
docker compose up -d --build

echo "==================================================="
echo "[2/2] Started successfully! Services available at:"
echo "  - 🎮 Game OBS Overlay:   http://localhost:8000"
echo "  - ⚙️  Admin Portal:       http://localhost:8001"
echo "  - 🚀 Backend Server:     http://localhost:4000"
echo "==================================================="
echo "View logs:  docker compose logs -f"
echo "Stop all:   docker compose down"
echo "==================================================="
