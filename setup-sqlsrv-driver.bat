@echo off
title Santoshpur - Automatic SQL Server Driver Setup for XAMPP
color 0B

echo ======================================================================
echo        SANTOSHPUR - Microsoft SQL Server (pdo_sqlsrv) Setup
echo ======================================================================
echo.

if not exist "C:\xampp\php\php.exe" (
    echo [ERROR] XAMPP PHP was not found in C:\xampp\php!
    echo Please install XAMPP in C:\xampp or update PATH.
    pause
    exit /b 1
)

echo [1/3] Detecting XAMPP PHP Version...
for /f "tokens=*" %%v in ('C:\xampp\php\php.exe -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;"') do set "PHP_VER=%%v"
echo [INFO] Detected XAMPP PHP Version: %PHP_VER%

echo.
echo [2/3] Updating C:\xampp\php\php.ini...
findstr /c:"extension=pdo_sqlsrv" "C:\xampp\php\php.ini" >nul 2>&1
if %errorlevel% neq 0 (
    echo.>> "C:\xampp\php\php.ini"
    echo extension=pdo_sqlsrv>> "C:\xampp\php\php.ini"
    echo extension=sqlsrv>> "C:\xampp\php\php.ini"
    echo [SUCCESS] Enabled extension=pdo_sqlsrv and extension=sqlsrv in php.ini!
) else (
    echo [INFO] php.ini already contains sqlsrv extensions.
)

echo.
echo [3/3] Checking SQL Server DLL Drivers...
C:\xampp\php\php.exe -m | findstr /i "sqlsrv" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo  [SUCCESS] SQL Server (pdo_sqlsrv) driver is INSTALLED and ACTIVE!
    echo ======================================================================
) else (
    echo.
    echo ======================================================================
    echo  [ACTION REQUIRED]
    echo  The sqlsrv DLL files are missing from C:\xampp\php\ext\
    echo.
    echo  1. Download Microsoft Drivers for PHP for SQL Server:
    echo     https://learn.microsoft.com/en-us/sql/connect/php/download-drivers-php-sql-server
    echo  2. Unzip and copy these 2 files into C:\xampp\php\ext\
    echo     - php_pdo_sqlsrv_%PHP_VER:_=.%_ts_x64.dll
    echo     - php_sqlsrv_%PHP_VER:_=.%_ts_x64.dll
    echo  3. Download Microsoft ODBC Driver 17 for SQL Server:
    echo     https://go.microsoft.com/fwlink/?linkid=2249004
    echo ======================================================================
)

echo.
pause
