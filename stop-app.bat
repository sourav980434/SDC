@echo off
title Santoshpur Diagnostic Centre - Stop Services
color 0C

echo ======================================================================
echo           SANTOSHPUR DIAGNOSTIC CENTRE ^& POLYCLINIC
echo                      Stopping Services...
echo ======================================================================
echo.

echo [1/2] Terminating Node.js (Frontend) and PHP (Backend) processes...

:: Stop process listening on Port 8000 (PHP Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Stopping Backend process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Stop process listening on Port 3000 (Next.js Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Stopping Frontend process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Close named CMD windows
taskkill /FI "WINDOWTITLE eq Santoshpur_Backend_8000*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Santoshpur_Frontend_3000*" /F >nul 2>&1

echo.
echo ======================================================================
echo  [SUCCESS] All application services have been stopped successfully!
echo ======================================================================
timeout /t 3 >nul
exit
