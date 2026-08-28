@echo off
title Santoshpur App Launcher
color 0A

echo ======================================================================
echo           SANTOSHPUR DIAGNOSTIC CENTRE ^& POLYCLINIC
echo                      Starting Services...
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Check PHP in PATH or fallback to XAMPP
if exist "C:\xampp\php\php.exe" set "PATH=C:\xampp\php;%PATH%"
if exist "C:\php\php.exe" set "PATH=C:\php;%PATH%"

:: Verify PHP availability
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PHP command was not found!
    echo Please install PHP or XAMPP on this system.
    pause
    exit /b 1
)

:: Verify Node.js availability
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js command was not found!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Auto install frontend dependencies if node_modules missing
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo.
    echo [INFO] Frontend packages (node_modules) missing.
    echo Running 'npm install' in frontend folder... Please wait.
    echo.
    cd /d "%ROOT_DIR%frontend"
    call npm install
    cd /d "%ROOT_DIR%"
)

:: Auto install backend dependencies if vendor missing
if not exist "%ROOT_DIR%backend\vendor" (
    echo.
    echo [INFO] Backend dependencies (vendor) missing.
    echo Checking Composer...
    where composer >nul 2>&1
    if %errorlevel% equ 0 (
        echo Running 'composer install' in backend folder... Please wait.
        cd /d "%ROOT_DIR%backend"
        call composer install
        cd /d "%ROOT_DIR%"
    ) else (
        echo [WARNING] Composer is not installed in PATH.
        echo If backend fails, please run 'composer install' in backend folder.
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
