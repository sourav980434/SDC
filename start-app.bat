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

:: Check PHP in PATH or fallback to XAMPP / common paths
where php >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\xampp\php\php.exe" (
        echo [INFO] Found PHP in C:\xampp\php. Adding to PATH...
        set "PATH=C:\xampp\php;%PATH%"
    ) else if exist "C:\php\php.exe" (
        echo [INFO] Found PHP in C:\php. Adding to PATH...
        set "PATH=C:\php;%PATH%"
    ) else (
        echo.
        echo [ERROR] PHP was not found on this system!
        echo Please install PHP or XAMPP (or add C:\xampp\php to System PATH).
        echo Download XAMPP: https://www.apachefriends.org
        echo.
        pause
        exit /b 1
    )
)

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js was not found on this system!
    echo Please install Node.js (LTS version) from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Check if frontend node_modules exists, if missing run npm install automatically
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo.
    echo [INFO] Frontend packages (node_modules) missing.
    echo Running 'npm install' in frontend folder... Please wait a moment.
    echo.
    cd /d "%ROOT_DIR%frontend"
    call npm install
    cd /d "%ROOT_DIR%"
)

echo [1/3] Starting Laravel API Backend (Port 8000)...
cd /d "%ROOT_DIR%backend"
call php artisan config:clear >nul 2>&1
start "Santoshpur_LIMS_Backend_8000" cmd /k "color 0B && set PATH=%PATH% && echo Starting Laravel Backend... && php artisan serve --host=0.0.0.0 --port=8000"

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
