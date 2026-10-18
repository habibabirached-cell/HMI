# Close Roberto's RSCAD driver (port 8008) and its console before a fresh start.
# The caller opens a new visible "RSCAD server" window afterward.
param(
    [Parameter(Mandatory = $true)]
    [string] $RepoRoot
)

$ErrorActionPreference = 'Continue'

function Stop-ProcessTree {
    param([int] $ProcessId)
    if ($ProcessId -le 0) { return }
    Write-Host "Stopping PID $ProcessId"
    & taskkill.exe /F /T /PID $ProcessId 2>$null | Out-Null
}

function Get-ListenerPids {
    param([int] $Port)
    $pids = @()
    try {
        $pids = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique)
    } catch {
        $pids = @()
    }
    return @($pids | Where-Object { $_ -gt 0 })
}

$listenerPids = @(Get-ListenerPids -Port 8008)
if ($listenerPids.Count -gt 0) {
    Write-Host 'RSCAD server is already running. Closing its window, then it will be started again...'
} else {
    Write-Host 'RSCAD server is not running. Starting a new window...'
}

# Kill the console by title (and its python child), then any leftover listener.
& taskkill.exe /F /T /FI "WINDOWTITLE eq RSCAD server*" 2>$null | Out-Null

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
        $cmd = $_.CommandLine
        if (-not $cmd) { return $false }
        return ($cmd -like '*rscad_main*') -or ($cmd -like '*run_rscad_server.bat*')
    } |
    ForEach-Object { Stop-ProcessTree -ProcessId $_.ProcessId }

foreach ($procId in @(Get-ListenerPids -Port 8008)) {
    Stop-ProcessTree -ProcessId $procId
}

if ($listenerPids.Count -gt 0) {
    Start-Sleep -Seconds 1
}

Write-Host "RSCAD restart prep finished. Repo: $RepoRoot"
exit 0
