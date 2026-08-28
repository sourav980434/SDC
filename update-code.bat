@echo off
title Santoshpur Diagnostic Centre - Update Code from Git
color 0B

echo ======================================================================
echo           SANTOSHPUR DIAGNOSTIC CENTRE & POLYCLINIC
echo                     Updating Code from Git...
echo ======================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo Fetching and pulling latest changes from GitHub...
git pull origin main

echo.
if %errorlevel% equ 0 (
    echo ======================================================================
    echo  [SUCCESS] Code updated to latest version from GitHub!
    echo ======================================================================
) else (
    echo ======================================================================
    echo  [ERROR] Git pull failed. Please check internet connection or Git setup.
    echo ======================================================================
)
pause
