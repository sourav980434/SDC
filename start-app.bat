@echo off
title Santoshpur App Launcher
color 0A

echo ======================================================================
echo           SANTOSHPUR DIAGNOSTIC CENTRE ^& POLYCLINIC
echo                      Starting Services...
echo ======================================================================
echo.

:: Set root directory cleanly
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Check PHP in PATH or fallback to XAMPP
where php >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\xampp\php\php.exe" (
        echo [INFO] Found PHP in C:\xampp\php. Adding to PATH...
        set "PATH=C:\xampp\php;%PATH%"
    )
)

echo [1/2] Starting Laravel API Backend (Port 8000)...
start "Santoshpur_Backend_8000" /d "%ROOT_DIR%backend" cmd /k "if exist C:\xampp\php\php.exe set PATH=C:\xampp\php;%%PATH%% && echo Starting Laravel Backend... && php artisan serve --host=0.0.0.0 --port=8000"

echo [2/2] Starting Next.js Frontend (Port 3000)...
start "Santoshpur_Frontend_3000" /d "%ROOT_DIR%frontend" cmd /k "echo Starting Next.js Frontend... && npm run dev"

echo.
echo ======================================================================
echo  [DONE] Application services launched!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000
echo ======================================================================
echo.
pause
