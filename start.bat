@echo off
set PATH=%APPDATA%\npm;%PATH%
echo ================================================================
echo 🎮 TIKTOK LIVE INTERACTIVE GAMES - MONOREPO LAUNCHER
echo ================================================================
echo Danh sach game va cong truy cap:
echo  [0] Server Core:       http://localhost:4000
echo  [1] LoL CKTG Live:     Game: http://localhost:8000  ^| Admin: http://localhost:8001
echo  [2] Lop Hoc Live:      Game: http://localhost:8010  ^| Admin: http://localhost:8011
echo  [3] Hoa Si 3D:         Game: http://localhost:8020  ^| Admin: http://localhost:8021
echo  [4] Team Clash:        Game: http://localhost:8030  ^| Admin: http://localhost:8031
echo  [5] Prank Target:      Game: http://localhost:8040  ^| Admin: http://localhost:8041
echo  [6] Quan Net Cyber:    Game: http://localhost:8050  ^| Admin: http://localhost:8051
echo  [7] Salon Studio:      Game: http://localhost:8060  ^| Admin: http://localhost:8061
echo  [8] Quan Pha Che Drink:Game: http://localhost:8070  ^| Admin: http://localhost:8071
echo ================================================================
echo 🧹 Kiem tra va giai phong cac cong 4000, 8000-8071...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4000, 8000, 8001, 8010, 8011, 8020, 8021, 8030, 8031, 8040, 8041, 8050, 8051, 8060, 8061, 8070, 8071 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo Dang khoi dong toan bo he thong...
call npx pnpm --parallel run dev
pause
