@echo off
title Santoshpur - Automatic SQL Server Driver Downloader ^& Installer
color 0B

echo ======================================================================
echo       SANTOSHPUR - Automatic SQL Server (pdo_sqlsrv) Driver Setup
echo ======================================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0install_driver.ps1"

echo.
pause
