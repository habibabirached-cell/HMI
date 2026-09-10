# Local HTTP helper on Maingear host — focuses DCS/Vernova Chrome kiosk windows.
# Docker backend calls http://host.docker.internal:8766/kiosk/focus/{Dcs|Vernova}
# Started by z_genesis.start.bat (or start-kiosk-focus-server.bat).

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Port = 8766

. (Join-Path $PSScriptRoot "kiosk-windows.ps1")

function Start-KioskFocusListener {
    param([string[]] $PrefixList)

    $instance = [System.Net.HttpListener]::new()
    foreach ($prefix in $PrefixList) {
        $instance.Prefixes.Add($prefix)
    }
    $instance.Start()
    return $instance
}

$listener = $null
$activePrefixes = @()
try {
    $listener = Start-KioskFocusListener @(
        "http://127.0.0.1:$Port/",
        "http://192.168.50.1:$Port/"
    )
    $activePrefixes = @(
        "http://127.0.0.1:$Port/",
        "http://192.168.50.1:$Port/"
    )
} catch {
    Write-Host "Could not bind 127.0.0.1 + 192.168.50.1 ($($_.Exception.Message))"
    Write-Host "Retrying 127.0.0.1 only ..."
    try {
        $listener = Start-KioskFocusListener @("http://127.0.0.1:$Port/")
        $activePrefixes = @("http://127.0.0.1:$Port/")
    } catch {
        Write-Host ""
        Write-Host "Kiosk focus server FAILED on port $Port."
        Write-Host $_.Exception.Message
        Write-Host ""
        Write-Host "If one is already running, ignore this and test:"
        Write-Host "  curl -X POST http://127.0.0.1:$Port/kiosk/focus/Vernova -H \"Content-Type: application/json\" -d \"{}\""
        Write-Host ""
        pause
        exit 1
    }
}

Write-Host "Kiosk focus server listening on:"
foreach ($prefix in $activePrefixes) {
    Write-Host "  $prefix"
}
Write-Host "(Leave this window open. Ideum Grid Connected -> showVernova uses port $Port.)"
Write-Host ""

function Add-CorsHeaders {
    param([System.Net.HttpListenerResponse] $Response)

    $Response.Headers.Add("Access-Control-Allow-Origin", "*")
    $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
}

function Write-JsonResponse {
    param(
        [System.Net.HttpListenerResponse] $Response,
        [int] $StatusCode,
        [object] $Body
    )
    $json = ($Body | ConvertTo-Json -Compress)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    Add-CorsHeaders -Response $Response
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

        if ($request.HttpMethod -eq 'OPTIONS') {
            Add-CorsHeaders -Response $response
            $response.StatusCode = 204
            $response.ContentLength64 = 0
            continue
        }

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
                    ok     = $false
                    error  = $_.Exception.Message
                    target = $target
                    hint   = "Run BAT\z_genesis.start.bat so kiosk-windows.json has valid Chrome hwnd values."
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
