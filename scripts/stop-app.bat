@echo off
title Santoshpur App Stopper
color 0C

echo Stopping all Santoshpur LIMS background services...

:: Kill PHP processes
taskkill /F /IM php.exe >nul 2>&1

:: Kill Node processes
taskkill /F /IM node.exe >nul 2>&1

:: Kill any open CMD windows matching title
taskkill /F /FI "WINDOWTITLE eq Santoshpur_*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq next-server*" >nul 2>&1

echo [DONE] All background services stopped cleanly.
ping 127.0.0.1 -n 2 >nul
exit /b 0
