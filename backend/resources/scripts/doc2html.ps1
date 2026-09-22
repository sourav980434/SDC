# Converts legacy Word report templates (.dot/.doc/.docx) to filtered HTML using MS Word.
# Called by App\Services\ReportTemplateService - one Word instance handles the whole batch.
#
# -ListFile : UTF-8 text file, one "source|destination" pair per line
# Output    : one line per file -> "OK|<src>" or "ERR|<src>|<message>"; "NOWORD|<message>" if Word is missing

param([Parameter(Mandatory = $true)][string]$ListFile)

$ErrorActionPreference = 'Stop'

try {
    $word = New-Object -ComObject Word.Application
} catch {
    Write-Output "NOWORD|$($_.Exception.Message)"
    exit 2
}

$word.Visible = $false
$word.DisplayAlerts = 0
$word.AutomationSecurity = 3   # msoAutomationSecurityForceDisable - never run template macros

try {
    foreach ($line in [System.IO.File]::ReadAllLines($ListFile)) {
        if (-not $line) { continue }
        $parts = $line.Split('|')
        $src = $parts[0]
        $dst = $parts[1]
        try {
            # FileName, ConfirmConversions, ReadOnly, AddToRecentFiles
            $doc = $word.Documents.Open($src, $false, $true, $false)
            $doc.WebOptions.Encoding = 65001   # UTF-8
            $doc.SaveAs2($dst, 10)             # wdFormatFilteredHTML
            $doc.Close(0)
            Write-Output "OK|$src"
        } catch {
            Write-Output "ERR|$src|$($_.Exception.Message)"
        }
    }
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
