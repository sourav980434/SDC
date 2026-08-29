@echo off
title Santoshpur - Automatic SQL Server Driver Setup for XAMPP
color 0B

echo ======================================================================
echo        SANTOSHPUR - Microsoft SQL Server (pdo_sqlsrv) Setup
echo ======================================================================
echo.

if not exist "C:\xampp\php\php.exe" goto :NO_PHP

echo [1/3] Detecting XAMPP PHP Version...
for /f "tokens=*" %%v in ('C:\xampp\php\php.exe -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;"') do set "PHP_VER=%%v"
echo [INFO] Detected XAMPP PHP Version: %PHP_VER%

echo.
echo [2/3] Checking php.ini configuration...
findstr /c:"php_pdo_sqlsrv" "C:\xampp\php\php.ini" >nul 2>&1
if %errorlevel% equ 0 goto :CHECK_DRIVER

echo.>> "C:\xampp\php\php.ini"
echo extension=php_pdo_sqlsrv_%PHP_VER%_ts_x64.dll>> "C:\xampp\php\php.ini"
echo extension=php_sqlsrv_%PHP_VER%_ts_x64.dll>> "C:\xampp\php\php.ini"
echo extension=php_pdo_sqlsrv.dll>> "C:\xampp\php\php.ini"
echo extension=php_sqlsrv.dll>> "C:\xampp\php\php.ini"
echo [SUCCESS] Added extension directives to C:\xampp\php\php.ini

:CHECK_DRIVER
echo.
echo [3/3] Testing SQL Server Driver loading in PHP...
C:\xampp\php\php.exe -r "exit(extension_loaded('pdo_sqlsrv') ? 0 : 1);" >nul 2>&1
if %errorlevel% equ 0 goto :DRIVER_ACTIVE

echo.
echo ======================================================================
echo  [ACTION REQUIRED] Driver DLL files missing from C:\xampp\php\ext\
echo.
echo  Your XAMPP PHP version is: %PHP_VER% (64-bit Thread Safe)
echo.
echo  Please follow these 2 quick steps:
echo  1. Download Microsoft Drivers for PHP for SQL Server:
echo     https://learn.microsoft.com/en-us/sql/connect/php/download-drivers-php-sql-server
echo  2. Unzip and copy these 2 files into C:\xampp\php\ext\
echo     - php_pdo_sqlsrv_82_ts_x64.dll (or rename to php_pdo_sqlsrv.dll)
echo     - php_sqlsrv_82_ts_x64.dll     (or rename to php_sqlsrv.dll)
echo ======================================================================
echo.
pause
exit /b 0

:DRIVER_ACTIVE
echo.
echo ======================================================================
echo  [SUCCESS] SQL Server (pdo_sqlsrv) driver is INSTALLED and ACTIVE!
echo ======================================================================
echo.
pause
exit /b 0

:NO_PHP
echo [ERROR] XAMPP PHP was not found in C:\xampp\php!
echo Please install XAMPP in C:\xampp or update system PATH.
echo.
pause
exit /b 1
