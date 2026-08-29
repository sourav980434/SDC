@echo off
title Santoshpur First Time Setup
color 0A

echo ======================================================================
echo                 First-Time Project Setup ^& Install
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0..\"
cd /d "%ROOT_DIR%"

echo [1/2] Installing Frontend Dependencies...
cd /d "%ROOT_DIR%frontend"
call npm install

echo.
echo [2/2] Running Auto Driver Setup...
call "%ROOT_DIR%scripts\auto-install-sqlsrv-driver.bat"

echo.
echo ======================================================================
echo  [DONE] First-Time setup complete!
echo ======================================================================
echo.
pause
