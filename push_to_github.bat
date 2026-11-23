@echo off
chcp 65001 >nul
echo =======================================================
echo   Dang kiem tra va day cac submodule trong apps/* truoc...
echo =======================================================

for /d %%D in (apps\*) do (
    if exist "%%D\.git" (
        echo [Submodule] Pushing %%D...
        pushd "%%D"
        git push origin main 2>nul || git push
        popd
    )
)

echo [Submodule] Fallback recursive push for all submodules...
git submodule foreach --recursive "git push origin main 2>nul || git push" 2>nul

echo.
echo =======================================================
echo   Dang day code repo cha len GitHub: core-live-game
echo =======================================================
echo.
git branch -M main
git push -u origin main
echo.
echo =======================================================
echo   Hoan tat! Nhan phim bat ky de thoat...
echo =======================================================
pause


