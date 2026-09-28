@echo off
setlocal EnableDelayedExpansion
title PHP 8.x SQLSRV Driver Setup
color 0A

echo ============================================================
echo  Santoshpur App - PHP + SQLSRV Auto-Setup Script
echo  Fixes: pdo_sqlsrv driver missing for PHP 8.4 / 8.5
echo ============================================================
echo.

:: ---------------------------------------------------------------
:: STEP 1: Find PHP 8.4 or 8.5 installation
:: ---------------------------------------------------------------
echo [STEP 1] Looking for PHP 8.4+ installation...
set "PHP_BIN="

for %%P in (
    C:\php84  D:\php84  E:\php84
    C:\php85  D:\php85  E:\php85
    C:\php    D:\php    E:\php
) do (
    if exist "%%P\php.exe" (
        if not defined PHP_BIN (
            "%%P\php.exe" -r "exit(PHP_VERSION_ID >= 80401 ? 0 : 1);" >nul 2>&1
            if !errorlevel! == 0 (
                set "PHP_BIN=%%P"
                echo    Found: %%P
            )
        )
    )
)

if not defined PHP_BIN (
    echo [ERROR] PHP 8.4+ not found on this system.
    echo         Please install PHP 8.4+ to C:\php84 or D:\php84
    pause
    exit /b 1
)
echo.

:: ---------------------------------------------------------------
:: STEP 2: Create php.ini if missing
:: ---------------------------------------------------------------
echo [STEP 2] Checking php.ini...

if not exist "%PHP_BIN%\php.ini" (
    echo    php.ini not found. Creating from php.ini-development...
    if exist "%PHP_BIN%\php.ini-development" (
        copy "%PHP_BIN%\php.ini-development" "%PHP_BIN%\php.ini" >nul
        echo    Created: %PHP_BIN%\php.ini
    ) else (
        echo [ERROR] php.ini-development not found in %PHP_BIN%
        pause
        exit /b 1
    )
) else (
    echo    php.ini exists. OK
)
echo.

:: ---------------------------------------------------------------
:: STEP 3+4: Configure php.ini via PowerShell helper script
:: Sets extension_dir, enables extensions, adds sqlsrv entries
:: ---------------------------------------------------------------
echo [STEP 3+4] Configuring php.ini via helper script...
set "SCRIPTS_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%configure_phpini.ps1" -PhpBin "%PHP_BIN%"
if %errorlevel% neq 0 (
    echo [ERROR] php.ini configuration failed.
    pause
    exit /b 1
)
echo.

:: Verify core extensions loaded
echo [STEP 4 CHECK] Verifying extensions loaded...
for %%E in (openssl curl mbstring fileinfo) do (
    "%PHP_BIN%\php.exe" -m 2>nul | findstr /r /i "^%%E$" >nul
    if !errorlevel! == 0 (
        echo    [OK] %%E
    ) else (
        echo    [WARN] %%E not loading - check php.ini manually
    )
)
echo.

:: ---------------------------------------------------------------
:: STEP 5: Get PHP build details for DLL selection
:: ---------------------------------------------------------------
echo [STEP 5] Detecting PHP build details...

set "PHP_INFO_SCRIPT=%TEMP%\php_info_check.php"
> "%PHP_INFO_SCRIPT%" echo ^<?php echo PHP_MAJOR_VERSION.PHP_MINOR_VERSION.PHP_EOL; echo (ZEND_THREAD_SAFE?'ts':'nts').PHP_EOL; echo (PHP_INT_SIZE==8?'x64':'x86').PHP_EOL;

set "PHP_VER="
set "PHP_TS="
set "PHP_ARCH="
for /f "usebackq tokens=* delims=" %%L in (`"%PHP_BIN%\php.exe" "%PHP_INFO_SCRIPT%" 2^>nul`) do (
    if not defined PHP_VER  set "PHP_VER=%%L"
    if not defined PHP_TS   if defined PHP_VER set "PHP_TS=%%L"
    if not defined PHP_ARCH if defined PHP_TS  set "PHP_ARCH=%%L"
)
del /q "%PHP_INFO_SCRIPT%" >nul 2>&1

:: Strip trailing whitespace/CR
for /f "tokens=*" %%A in ("%PHP_VER%")  do set "PHP_VER=%%A"
for /f "tokens=*" %%A in ("%PHP_TS%")   do set "PHP_TS=%%A"
for /f "tokens=*" %%A in ("%PHP_ARCH%") do set "PHP_ARCH=%%A"

if not defined PHP_VER  set "PHP_VER=85"
if not defined PHP_TS   set "PHP_TS=nts"
if not defined PHP_ARCH set "PHP_ARCH=x64"

echo    PHP: %PHP_VER% ^| %PHP_TS% ^| %PHP_ARCH%
echo.

:: ---------------------------------------------------------------
:: STEP 6: Check if SQLSRV already loaded
:: ---------------------------------------------------------------
echo [STEP 6] Checking SQLSRV driver...
"%PHP_BIN%\php.exe" -m 2>nul | findstr /i "pdo_sqlsrv" >nul
if %errorlevel% == 0 (
    echo    pdo_sqlsrv already loaded. Skipping download.
    goto :COMPOSER_CHECK
)

echo    pdo_sqlsrv NOT loaded. Downloading driver v5.13.3...
echo.

:: ---------------------------------------------------------------
:: STEP 7: Download SQLSRV driver from GitHub
:: ---------------------------------------------------------------
echo [STEP 7] Downloading SQLSRV Windows package...

set "SQLSRV_URL=https://github.com/microsoft/msphpsql/releases/download/v5.13.3/Windows_5.13.3RTW.zip"
set "SQLSRV_ZIP=%TEMP%\sqlsrv_driver.zip"
set "SQLSRV_DIR=%TEMP%\sqlsrv_extracted"

powershell -NoProfile -Command "Invoke-WebRequest -Uri '%SQLSRV_URL%' -OutFile '%SQLSRV_ZIP%' -UseBasicParsing; Write-Host ('   Downloaded: ' + [math]::Round((Get-Item ''%SQLSRV_ZIP%'').Length/1MB,2) + ' MB');"

if not exist "%SQLSRV_ZIP%" (
    echo [ERROR] Download failed. Check internet connection.
    pause
    exit /b 1
)
echo.

:: ---------------------------------------------------------------
:: STEP 8: Extract and copy correct driver DLL
:: ---------------------------------------------------------------
echo [STEP 8] Extracting driver package...
if exist "%SQLSRV_DIR%" rmdir /s /q "%SQLSRV_DIR%"
powershell -NoProfile -Command "Expand-Archive -Path '%SQLSRV_ZIP%' -DestinationPath '%SQLSRV_DIR%' -Force; Write-Host '   Extracted OK';"
echo.

echo [STEP 9] Installing SQLSRV driver for PHP %PHP_VER% %PHP_TS% %PHP_ARCH%...
set "DLL_SRC=%SQLSRV_DIR%\Windows"
set "SQLSRV_DLL=%DLL_SRC%\php_sqlsrv_%PHP_VER%_%PHP_TS%_%PHP_ARCH%.dll"
set "PDO_DLL=%DLL_SRC%\php_pdo_sqlsrv_%PHP_VER%_%PHP_TS%_%PHP_ARCH%.dll"

if not exist "%SQLSRV_DLL%" (
    echo [ERROR] Driver DLL not found: %SQLSRV_DLL%
    echo         Available PHP versions in package: 83, 84, 85
    echo         Detected: PHP_%PHP_VER%_%PHP_TS%_%PHP_ARCH%
    del /q "%SQLSRV_ZIP%" >nul 2>&1
    rmdir /s /q "%SQLSRV_DIR%" >nul 2>&1
    pause
    exit /b 1
)

copy "%SQLSRV_DLL%" "%PHP_BIN%\ext\php_sqlsrv.dll" >nul
copy "%PDO_DLL%"    "%PHP_BIN%\ext\php_pdo_sqlsrv.dll" >nul
echo    Copied: php_sqlsrv.dll
echo    Copied: php_pdo_sqlsrv.dll

:: Verify SQLSRV loads
"%PHP_BIN%\php.exe" -m 2>nul | findstr /i "pdo_sqlsrv" >nul
if %errorlevel% == 0 (
    echo    [OK] pdo_sqlsrv loaded!
) else (
    echo    [WARN] pdo_sqlsrv not loading. Check php.ini.
)
echo.

:: Cleanup
del /q "%SQLSRV_ZIP%" >nul 2>&1
rmdir /s /q "%SQLSRV_DIR%" >nul 2>&1

:: ---------------------------------------------------------------
:: STEP 10: Run composer install if vendor is broken
:: ---------------------------------------------------------------
:COMPOSER_CHECK
echo [STEP 10] Checking Composer / vendor packages...

set "ROOT_DIR=%~dp0..\"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "COMPOSER_PHAR="

for %%C in (
    "E:\xampp\htdocs\zapo_erp\composer.phar"
    "E:\xampp\htdocs\zapo_erp10\composer.phar"
    "C:\composer\composer.phar"
    "D:\composer\composer.phar"
) do (
    if exist %%C (
        if not defined COMPOSER_PHAR set "COMPOSER_PHAR=%%C"
    )
)

if exist "%BACKEND_DIR%\vendor\autoload.php" (
    echo    Vendor packages OK.
) else (
    echo    Vendor missing. Running composer install...
    if defined COMPOSER_PHAR (
        "%PHP_BIN%\php.exe" %COMPOSER_PHAR% install --no-interaction --working-dir="%BACKEND_DIR%"
        echo    Composer install complete.
    ) else (
        echo    [WARN] composer.phar not found. Please run manually:
        echo           cd "%BACKEND_DIR%"
        echo           php composer.phar install
    )
)
echo.

:: ---------------------------------------------------------------
:: STEP 11: Add PHP to system PATH
:: ---------------------------------------------------------------
echo [STEP 11] Ensuring PHP is on system PATH...
setx PATH "%PHP_BIN%;%PATH%" >nul 2>&1
echo    %PHP_BIN% added to PATH
echo    (Takes effect in new terminal windows)
echo.

:: ---------------------------------------------------------------
:: FINAL SUMMARY
:: ---------------------------------------------------------------
echo ============================================================
echo  SETUP COMPLETE!
echo ============================================================
echo  PHP Binary   : %PHP_BIN%\php.exe
echo  php.ini      : %PHP_BIN%\php.ini
echo  Extensions   : openssl, curl, mbstring, fileinfo, gd,
echo                 intl, sodium, zip, pdo_mysql,
echo                 sqlsrv, pdo_sqlsrv
echo.
echo  Next step: Double-click  start-app.bat
echo ============================================================
echo.
pause
exit /b 0
