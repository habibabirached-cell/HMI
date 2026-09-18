# Ideum single touch display — launch Chrome app without multi-monitor layout logic.
param(
    [string] $Url = 'http://localhost:3003'
)

$ErrorActionPreference = 'Stop'

$candidates = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LocalAppData}\Google\Chrome\Application\chrome.exe"
)

$chrome = $null
foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
        $chrome = $candidate
        break
    }
}
if (-not $chrome) {
    throw 'Google Chrome not found. Install Chrome on the Ideum PC.'
}

# --app = no tabs/address bar; --start-maximized = full touch screen (single monitor).
$args = @(
    '--new-window',
    '--start-maximized',
    "--app=$Url"
)

Start-Process -FilePath $chrome -ArgumentList $args
Write-Host "Chrome app opened: $Url"
