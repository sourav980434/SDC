@echo off
title Santoshpur Diagnostic Centre - Update Code from Git
color 0B

echo ======================================================================
echo           SANTOSHPUR DIAGNOSTIC CENTRE ^& POLYCLINIC
echo                     Updating Code from Git...
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

if exist "%ROOT_DIR%.git" goto :DO_PULL

echo [INFO] Git repository not initialized in this folder.
echo [INFO] Setting up Git remote repository automatically...
git init
git remote add origin https://github.com/sourav980434/SDC.git
git fetch origin
git reset --hard origin/main
git branch -M main
echo.

:DO_PULL
echo Fetching and pulling latest changes from GitHub...
git pull origin main

echo.
if %errorlevel% equ 0 goto :PULL_SUCCESS

echo ======================================================================
echo  [ERROR] Git pull failed. Please check internet connection or Git setup.
echo ======================================================================
pause
exit /b 1

:PULL_SUCCESS
echo ======================================================================
echo  [SUCCESS] Code updated to latest version from GitHub!
echo ======================================================================
pause
exit /b 0
