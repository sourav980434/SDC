@echo off
title Santoshpur Git Code Updater
color 0B

echo ======================================================================
echo                 Pulling Latest Code Updates...
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0..\"
cd /d "%ROOT_DIR%"

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git command was not found! Please install Git for Windows.
    pause
    exit /b 1
)

if not exist "%ROOT_DIR%.git" (
    echo [INFO] Initializing Git repository...
    call git init
    call git remote add origin https://github.com/sourav980434/SDC.git
)

echo Fetching latest code from GitHub repository...
call git fetch origin main
call git reset --hard origin/main

echo.
echo ======================================================================
echo  [DONE] Code update complete! All latest files downloaded.
echo ======================================================================
echo.
pause
