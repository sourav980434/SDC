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

:: Check and append XAMPP PHP path if available
if exist "C:\xampp\php\php.exe" set "PATH=C:\xampp\php;%PATH%"
if exist "C:\php\php.exe" set "PATH=C:\php;%PATH%"

:: Verify PHP availability
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PHP command was not found in PATH!
    echo Please ensure XAMPP is installed in C:\xampp or add C:\xampp\php to System PATH.
    echo.
    pause
    exit /b 1
)

:: Verify Node.js availability
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js command was not found in PATH!
    echo Please install Node.js (LTS version) from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Auto install frontend dependencies if missing
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo [INFO] Frontend packages (node_modules) missing.
    echo Running 'npm install' in frontend folder... Please wait.
    echo.
    cd /d "%ROOT_DIR%frontend"
    call npm install
    cd /d "%ROOT_DIR%"
)

echo [1/3] Starting Laravel API Backend (Port 8000)...
cd /d "%ROOT_DIR%backend"
call php artisan config:clear >nul 2>&1
start "Santoshpur_LIMS_Backend_8000" cmd /k "if exist C:\xampp\php\php.exe set PATH=C:\xampp\php;%%PATH%% && cd /d %ROOT_DIR%backend && color 0B && echo Starting Laravel Backend... && php artisan serve --host=0.0.0.0 --port=8000"

echo [2/3] Starting Next.js Frontend (Port 3000)...
cd /d "%ROOT_DIR%frontend"
start "Santoshpur_LIMS_Frontend_3000" cmd /k "cd /d %ROOT_DIR%frontend && color 0A && echo Starting Next.js Frontend... && npm run dev"

echo [3/3] Opening Web Application in Browser...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo.
echo ======================================================================
echo  [DONE] Application services launched!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000
echo ======================================================================
echo.
pause
