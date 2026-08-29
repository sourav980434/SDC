@echo off
cmd /c taskkill /F /IM node.exe >nul 2>&1
cmd /c taskkill /F /IM php.exe >nul 2>&1
exit /b 0
