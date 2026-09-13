@echo off
title Santoshpur App Launcher
color 0A

set "ROOT_DIR=%~dp0..\"
cd /d "%ROOT_DIR%"

:: Check PHP in PATH or add known PHP paths (later lines take priority)
if exist "E:\xampp\php\php.exe" set "PATH=E:\xampp\php;%PATH%"
if exist "C:\xampp\php\php.exe" set "PATH=C:\xampp\php;%PATH%"
if exist "C:\php\php.exe" set "PATH=C:\php;%PATH%"
if exist "C:\php84\php.exe" set "PATH=C:\php84;%PATH%"
if exist "D:\php84\php.exe" set "PATH=D:\php84;%PATH%"
if defined PHP_BIN if exist "%PHP_BIN%\php.exe" set "PATH=%PHP_BIN%;%PATH%"

:: Verify PHP availability
where php >nul 2>&1
if %errorlevel% neq 0 goto :NO_PHP

:: Verify PHP version (backend vendor packages require PHP 8.4+)
php -r "exit(PHP_VERSION_ID >= 80400 ? 0 : 1);" >nul 2>&1
if %errorlevel% neq 0 goto :OLD_PHP

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

:: Launch Backend & Frontend in 100% hidden background (zero CMD windows)
wscript.exe "%~dp0start-hidden.vbs" "%ROOT_DIR%"

:: Open browser on IP address and exit launcher window immediately
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

:OLD_PHP
echo [ERROR] PHP 8.4 or newer is required. Found:
php -v
echo.
echo Install PHP 8.4 to D:\php84 or C:\php84, or set PHP_BIN to its folder.
pause
exit /b 1

:NO_NODE
echo [ERROR] Node.js command was not found!
echo Please install Node.js from https://nodejs.org
pause
exit /b 1
