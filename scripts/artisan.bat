@echo off
setlocal

:: Runs "php artisan ..." for the backend with PHP 8.4 (the backend vendor packages need 8.4.1+).
:: Usage:  artisan test-formats:import --dry
::         artisan report-templates:check

set "ROOT_DIR=%~dp0..\"

:: Same PHP lookup as start-app.bat (later lines take priority)
if exist "E:\xampp\php\php.exe" set "PATH=E:\xampp\php;%PATH%"
if exist "C:\xampp\php\php.exe" set "PATH=C:\xampp\php;%PATH%"
if exist "C:\php\php.exe" set "PATH=C:\php;%PATH%"
if exist "C:\php84\php.exe" set "PATH=C:\php84;%PATH%"
if exist "D:\php84\php.exe" set "PATH=D:\php84;%PATH%"
if defined PHP_BIN if exist "%PHP_BIN%\php.exe" set "PATH=%PHP_BIN%;%PATH%"

where php >nul 2>&1
if %errorlevel% neq 0 (
    echo PHP not found. Install PHP 8.4 to D:\php84 or C:\php84, or set PHP_BIN to its folder.
    exit /b 1
)

php -r "exit(PHP_VERSION_ID >= 80401 ? 0 : 1);" >nul 2>&1
if %errorlevel% neq 0 (
    echo PHP 8.4.1 or newer is needed. Found:
    php -v
    echo Install PHP 8.4 to D:\php84 or C:\php84, or set PHP_BIN to its folder.
    exit /b 1
)

cd /d "%ROOT_DIR%backend"
php artisan %*
exit /b %errorlevel%
