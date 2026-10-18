# Windows equivalent of repo-root docker-dev-stop.sh, plus demo host processes
# (kiosk mouse/focus, Vernova dev, OLED keepalive).
param(
    [Parameter(Mandatory = $true)]
    [string] $RepoRoot
)

$ErrorActionPreference = 'Continue'

function Stop-ProcessesMatchingCommandLine {
    param([string[]] $Patterns)

    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $cmd = $_.CommandLine
            if (-not $cmd) { return $false }
            foreach ($pat in $Patterns) {
                if ($cmd -like $pat) { return $true }
            }
            return $false
        } |
        ForEach-Object {
            Write-Host "Stopping PID $($_.ProcessId): $($_.Name)"
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
}

function Stop-ListenersOnPort {
    param([int] $Port)

    $pids = @()
    try {
        $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        # Get-NetTCPConnection may be unavailable on some SKUs; skip.
    }

    foreach ($pid in $pids) {
        if ($pid -le 0) { continue }
        Write-Host "Stopping listener on port ${Port} (PID $pid)"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

$composeFile = Join-Path $RepoRoot 'docker-compose-dev.yml'
$envFile = Join-Path $RepoRoot '.env'

if (Test-Path -LiteralPath $composeFile) {
    Write-Host 'Stopping Docker compose stack (docker-compose-dev.yml)...'
    Push-Location $RepoRoot
    try {
        if (Test-Path -LiteralPath $envFile) {
            & docker compose --env-file $envFile -f $composeFile down
        } else {
            & docker compose -f $composeFile down
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "WARN: Compose file not found: $composeFile"
}

Write-Host 'Stopping demo host services...'
Stop-ProcessesMatchingCommandLine @(
    '*kiosk_mouse_bridge*'
    '*kiosk-focus-server.ps1*'
    '*start-kiosk-mouse-server.ps1*'
    '*mouse_keepalive.py*'
    '*winScreenSaver*mouse_keepalive*'
)

# Vernova Vite dev server (Maingear / Malta).
Stop-ProcessesMatchingCommandLine @(
    '*vernova-spark-engine*'
)

Stop-ListenersOnPort -Port 8766
Stop-ListenersOnPort -Port 8767
Stop-ListenersOnPort -Port 5173

# Minimized cmd windows launched with these titles from BAT/start-*.bat.
foreach ($title in @('KioskMouseServer', 'KioskFocusServer', 'Vernova dev', 'winScreenSaver keepalive')) {
    & taskkill.exe /FI "WINDOWTITLE eq $title*" /F 2>$null | Out-Null
}

Write-Host 'Demo stack stop finished.'
exit 0
