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

:: Check PHP in PATH or add XAMPP PHP path if available
if exist "C:\xampp\php\php.exe" set "PATH=C:\xampp\php;%PATH%"
if exist "C:\php\php.exe" set "PATH=C:\php;%PATH%"

:: Verify PHP availability
where php >nul 2>&1
if %errorlevel% neq 0 goto :NO_PHP

:: Verify Node.js availability
where node >nul 2>&1
if %errorlevel% neq 0 goto :NO_NODE

:: Check frontend dependencies
if not exist "%ROOT_DIR%frontend\node_modules" goto :INSTALL_FRONTEND

:START_SERVERS
echo [1/2] Starting Laravel API Backend (Port 8000)...
start "Santoshpur_Backend_8000" /d "%ROOT_DIR%backend" cmd /k "color 0B && echo Starting Laravel Backend... && php artisan serve --host=0.0.0.0 --port=8000"

echo [2/2] Starting Next.js Frontend (Port 3000)...
start "Santoshpur_Frontend_3000" /d "%ROOT_DIR%frontend" cmd /k "color 0A && echo Starting Next.js Frontend... && npm run dev"

echo.
echo ======================================================================
echo  [DONE] Application services launched!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000
echo ======================================================================
echo.
pause
exit /b 0

:INSTALL_FRONTEND
echo [INFO] Frontend packages (node_modules) missing.
echo Running 'npm install' in frontend folder... Please wait.
echo.
cd /d "%ROOT_DIR%frontend"
call npm install
cd /d "%ROOT_DIR%"
goto :START_SERVERS

:NO_PHP
echo.
echo [ERROR] PHP command was not found!
echo Please install PHP or XAMPP on this system.
echo.
pause
exit /b 1

:NO_NODE
echo.
echo [ERROR] Node.js command was not found!
echo Please install Node.js from https://nodejs.org
echo.
pause
exit /b 1
