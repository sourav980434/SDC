param(
    [string]$PhpBin
)

$iniPath = "$PhpBin\php.ini"
$extDir  = "$PhpBin\ext"

if (-not (Test-Path $iniPath)) {
    Write-Host "[ERROR] php.ini not found at $iniPath"
    exit 1
}

$lines = [System.IO.File]::ReadAllLines($iniPath)
$out = [System.Collections.Generic.List[string]]::new()
$extDirSet = $false

foreach ($l in $lines) {
    if ($l -match '^\s*;?\s*extension_dir\s*=') {
        if (-not $extDirSet) {
            $out.Add("extension_dir = `"$extDir`"")
            $extDirSet = $true
        }
        # All other extension_dir lines (commented duplicates) are dropped
    } elseif ($l -match 'extension=php_sqlsrv|extension=php_pdo_sqlsrv') {
        # Remove old incorrectly-named sqlsrv entries (double-prefix bug)
        Write-Host "   Removed old entry: $l"
    } elseif ($l -match '^;extension=(openssl|curl|fileinfo|mbstring|zip|gd|intl|sodium|pdo_mysql)\s*$') {
        $out.Add($l.TrimStart(';'))
    } else {
        $out.Add($l)
    }
}

if (-not $extDirSet) {
    $out.Add("extension_dir = `"$extDir`"")
}

# Ensure all required extensions exist
$needed = @(
    'extension=openssl', 'extension=curl', 'extension=fileinfo',
    'extension=mbstring', 'extension=zip', 'extension=gd',
    'extension=intl', 'extension=sodium', 'extension=pdo_mysql'
)
foreach ($e in $needed) {
    if (-not ($out | Where-Object { $_ -eq $e })) {
        $out.Add($e)
        Write-Host "   Added: $e"
    }
}

# Add sqlsrv with bare names (no php_ prefix, no .dll suffix)
foreach ($e in @('extension=sqlsrv', 'extension=pdo_sqlsrv')) {
    if (-not ($out | Where-Object { $_ -match [regex]::Escape($e) })) {
        $out.Add($e)
        Write-Host "   Added: $e"
    }
}

[System.IO.File]::WriteAllLines($iniPath, $out)
Write-Host "   php.ini configured: extension_dir = $extDir"
exit 0
