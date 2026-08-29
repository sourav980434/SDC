$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   SANTOSHPUR - Automatic SQL Server Driver Downloader & Installer" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$phpPath = "C:\xampp\php\php.exe"
if (-not (Test-Path $phpPath)) {
    Write-Host "[ERROR] XAMPP PHP was not found at $phpPath" -ForegroundColor Red
    Write-Host "Please ensure XAMPP is installed in C:\xampp" -ForegroundColor Yellow
    exit 1
}

# Detect PHP Version
$phpVer = & $phpPath -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;"
$phpMajor = & $phpPath -r "echo PHP_MAJOR_VERSION;"
$phpMinor = & $phpPath -r "echo PHP_MINOR_VERSION;"
$verTag = "$phpMajor$phpMinor"

Write-Host "[1/4] Detected XAMPP PHP Version: $phpVer (Ver Tag: $verTag)" -ForegroundColor Green

# Choose Microsoft Driver Package
if ([int]$phpMajor -ge 8 -and [int]$phpMinor -ge 3) {
    $zipUrl = "https://github.com/microsoft/msphpsql/releases/download/v5.13.3/Windows_5.13.3RTW.zip"
} else {
    $zipUrl = "https://github.com/microsoft/msphpsql/releases/download/v5.12.0/Windows_5.12.0RTW.zip"
}

$tempZip = "$env:TEMP\sqlsrv_driver.zip"
$tempExt = "$env:TEMP\sqlsrv_driver_ext"

Write-Host "[2/4] Downloading Official Microsoft SQL Server Drivers from Web..." -ForegroundColor Yellow
Write-Host "      URL: $zipUrl" -ForegroundColor Gray

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip -UseBasicParsing

Write-Host "[3/4] Extracting and Copying DLL files to C:\xampp\php\ext\..." -ForegroundColor Yellow
if (Test-Path $tempExt) { Remove-Item -Path $tempExt -Recurse -Force }
Expand-Archive -Path $tempZip -DestinationPath $tempExt -Force

# Locate matching DLLs
$pdoDll = Get-ChildItem -Path $tempExt -Recurse -Filter "php_pdo_sqlsrv_${verTag}_ts_x64.dll" | Select-Object -First 1
$sqlDll = Get-ChildItem -Path $tempExt -Recurse -Filter "php_sqlsrv_${verTag}_ts_x64.dll" | Select-Object -First 1

if (-not $pdoDll -or -not $sqlDll) {
    $pdoDll = Get-ChildItem -Path $tempExt -Recurse -Filter "php_pdo_sqlsrv_${verTag}*.dll" | Select-Object -First 1
    $sqlDll = Get-ChildItem -Path $tempExt -Recurse -Filter "php_sqlsrv_${verTag}*.dll" | Select-Object -First 1
}

if (-not $pdoDll -or -not $sqlDll) {
    Write-Host "[ERROR] Could not find matching DLLs for PHP $phpVer in package." -ForegroundColor Red
    exit 1
}

$destExt = "C:\xampp\php\ext"
$targetPdoPath = Join-Path $destExt $pdoDll.Name
$targetSqlPath = Join-Path $destExt $sqlDll.Name

Copy-Item -Path $pdoDll.FullName -Destination $targetPdoPath -Force
Copy-Item -Path $sqlDll.FullName -Destination $targetSqlPath -Force

Write-Host "      Copied $($pdoDll.Name) to $destExt" -ForegroundColor Green
Write-Host "      Copied $($sqlDll.Name) to $destExt" -ForegroundColor Green

# Update php.ini
Write-Host "[4/4] Updating C:\xampp\php\php.ini configuration..." -ForegroundColor Yellow
$iniPath = "C:\xampp\php\php.ini"
$iniText = Get-Content $iniPath -Raw

$pdoLine = "extension=$($pdoDll.Name)"
$sqlLine = "extension=$($sqlDll.Name)"

if ($iniText -notmatch [regex]::Escape($pdoLine)) {
    Add-Content -Path $iniPath -Value "`n$pdoLine`n$sqlLine"
    Write-Host "      Enabled extensions in php.ini" -ForegroundColor Green
} else {
    Write-Host "      Extensions already present in php.ini" -ForegroundColor Gray
}

# Cleanup
Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $tempExt -Recurse -Force -ErrorAction SilentlyContinue

# Verify in PHP
Write-Host ""
$null = & $phpPath -r "exit(extension_loaded('pdo_sqlsrv') ? 0 : 1);"
if ($LASTEXITCODE -eq 0) {
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "  [SUCCESS] Microsoft SQL Server (pdo_sqlsrv) Driver Installed & Active!" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Driver DLL copied to C:\xampp\php\ext\ successfully!" -ForegroundColor Yellow
    Write-Host "If Microsoft ODBC Driver 17 is missing, please download it from:" -ForegroundColor Yellow
    Write-Host "https://go.microsoft.com/fwlink/?linkid=2249004" -ForegroundColor Cyan
}
