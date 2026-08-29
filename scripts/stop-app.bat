@echo off
title Santoshpur App Stopper
color 0C

echo ======================================================================
echo                      Stopping All Services...
echo ======================================================================
echo.

cmd /c taskkill /F /IM node.exe >nul 2>&1
cmd /c taskkill /F /IM php.exe >nul 2>&1

echo.
echo [DONE] All application services stopped cleanly.
echo.
pause
