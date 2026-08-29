@echo off
title Santoshpur App Launcher
color 0A

set "ROOT_DIR=%~dp0..\"
cd /d "%ROOT_DIR%"

:: Check PHP in PATH or add XAMPP PHP path if available
if exist "E:\xampp\php\php.exe" set "PATH=E:\xampp\php;%PATH%"
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
:: Dynamically detect IPv4 address
set "LOCAL_IP=127.0.0.1"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do set "LOCAL_IP=%%b"
)

echo [1/2] Launching Laravel API Backend (Port 8000)...
start /min "Santoshpur_Backend_8000" /d "%ROOT_DIR%backend" cmd /k "color 0B && echo Starting Laravel Backend... && php artisan serve --host=0.0.0.0 --port=8000"

echo [2/2] Launching Next.js Frontend (Port 3000)...
start /min "Santoshpur_Frontend_3000" /d "%ROOT_DIR%frontend" cmd /k "color 0A && echo Starting Next.js Frontend... && npm run dev"

echo.
echo ======================================================================
echo  [DONE] Application services launched in taskbar!
echo  Opening browser at: http://%LOCAL_IP%:3000
echo ======================================================================
echo.
ping 127.0.0.1 -n 3 >nul
start http://%LOCAL_IP%:3000
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
echo [ERROR] PHP command was not found!
echo Please install PHP or XAMPP on this system.
pause
exit /b 1

:NO_NODE
echo [ERROR] Node.js command was not found!
echo Please install Node.js from https://nodejs.org
pause
exit /b 1
