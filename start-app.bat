@echo off
title Santoshpur Diagnostic Centre - Auto Pull & Launcher
color 0A

echo ======================================================================
echo           SANTOSHPUR DIAGNOSTIC CENTRE & POLYCLINIC
echo               Auto Code Update & App Launcher
echo ======================================================================
echo.

:: Get script directory
set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/4] Pulling latest updates from Git...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Git pull failed or git is not initialized / configured on this system.
    echo Continuing with existing local codebase...
) else (
    echo [SUCCESS] Code updated to latest version from GitHub!
)
echo.

echo [2/4] Clearing cache & starting Laravel API Backend on Port 8000...
cd /d "%ROOT_DIR%backend"
call php artisan config:clear >nul 2>&1
start "Santoshpur LIMS - Laravel Backend (Port 8000)" cmd /k "color 0B && echo Starting Laravel Backend... && php artisan serve --host=0.0.0.0 --port=8000"

echo [3/4] Starting Next.js Frontend on Port 3000...
cd /d "%ROOT_DIR%frontend"
start "Santoshpur LIMS - Next.js Frontend (Port 3000)" cmd /k "color 0A && echo Starting Next.js Frontend... && npm run dev"

echo [4/4] Launching Web Application in Browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ======================================================================
echo  [DONE] Application is running!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000
echo ======================================================================
pause
