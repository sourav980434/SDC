@echo off
title Santoshpur Diagnostic Centre - App Launcher
color 0A

echo ======================================================================
echo           SANTOSHPUR DIAGNOSTIC CENTRE ^& POLYCLINIC
echo                      Starting Services...
echo ======================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/3] Starting Laravel API Backend (Port 8000)...
cd /d "%ROOT_DIR%backend"
call php artisan config:clear >nul 2>&1
start "Santoshpur_LIMS_Backend_8000" cmd /k "color 0B && echo Starting Laravel Backend... && php artisan serve --host=0.0.0.0 --port=8000"

echo [2/3] Starting Next.js Frontend (Port 3000)...
cd /d "%ROOT_DIR%frontend"
start "Santoshpur_LIMS_Frontend_3000" cmd /k "color 0A && echo Starting Next.js Frontend... && npm run dev"

echo [3/3] Opening Web Application in Browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ======================================================================
echo  [DONE] Application is running!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000
echo ======================================================================
timeout /t 5 >nul
exit
