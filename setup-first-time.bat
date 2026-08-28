@echo off
title Santoshpur - First Time System Setup
color 0B

echo ======================================================================
echo           SANTOSHPUR DIAGNOSTIC CENTRE ^& POLYCLINIC
echo                   First-Time System Setup
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

if exist "C:\xampp\php\php.exe" set "PATH=C:\xampp\php;%PATH%"

echo [1/2] Installing Frontend Dependencies (npm install)...
cd /d "%ROOT_DIR%frontend"
call npm install

echo.
echo [2/2] Installing Backend Dependencies (composer install)...
cd /d "%ROOT_DIR%backend"
where composer >nul 2>&1
if %errorlevel% equ 0 (
    call composer install
) else (
    echo [NOTICE] Composer not found in PATH. Skipping composer install.
)

echo.
echo ======================================================================
echo  [SUCCESS] First-time setup complete! Now run start-app.bat
echo ======================================================================
pause
