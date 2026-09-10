# Local HTTP helper on Maingear host — focuses DCS/Vernova Chrome kiosk windows.
# Docker backend calls http://host.docker.internal:8766/kiosk/focus/{Dcs|Vernova}
# Started by z_genesis.start.bat (or start-kiosk-focus-server.bat).

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Port = 8766
$prefixes = @(
    "http://127.0.0.1:$Port/",
    "http://192.168.50.1:$Port/"
)

. (Join-Path $PSScriptRoot "kiosk-windows.ps1")

$listener = [System.Net.HttpListener]::new()
foreach ($prefix in $prefixes) {
    $listener.Prefixes.Add($prefix)
}
try {
    $listener.Start()
} catch {
    Write-Host "Kiosk focus server already running or port $Port unavailable: $($_.Exception.Message)"
    Write-Host "If URL ACL is required, run as Administrator once:"
    Write-Host "  netsh http add urlacl url=http://192.168.50.1:$Port/ user=Everyone"
    exit 0
}

Write-Host "Kiosk focus server listening on:"
foreach ($prefix in $prefixes) {
    Write-Host "  $prefix"
}

function Write-JsonResponse {
    param(
        [System.Net.HttpListenerResponse] $Response,
        [int] $StatusCode,
        [object] $Body
    )
    $json = ($Body | ConvertTo-Json -Compress)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json; charset=utf-8"
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

while ($listener.IsListening) {
    $context = $null
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = ($request.Url.AbsolutePath.Trim('/') -replace '\\', '/')
        if ($request.HttpMethod -eq 'POST' -and $path -match '^kiosk/focus/(Dcs|Vernova)$') {
            $target = $Matches[1]
            try {
                Focus-KioskWindow -Target $target
                Write-JsonResponse -Response $response -StatusCode 200 -Body @{
                    ok     = $true
                    target = $target
                }
            } catch {
                Write-JsonResponse -Response $response -StatusCode 500 -Body @{
                    ok    = $false
                    error = $_.Exception.Message
                    target = $target
                }
            }
        } else {
            Write-JsonResponse -Response $response -StatusCode 404 -Body @{
                ok    = $false
                error = "Not found. POST /kiosk/focus/Dcs or /kiosk/focus/Vernova"
            }
        }
    } catch {
        Write-Warning "Kiosk focus server request error: $($_.Exception.Message)"
    } finally {
        if ($context) {
            try { $context.Response.Close() } catch { }
        }
    }
}
