# Before daily demo BAT scripts: ensure Docker is up; if it was already running, stop prior demo.
param(
    [Parameter(Mandatory = $true)]
    [string] $RepoRoot,

    [int] $ColdStartSleepSeconds = 3,
    [int] $EngineTimeoutSeconds = 300
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-DockerEngine {
    $null = & docker info 2>&1
    return $LASTEXITCODE -eq 0
}

function Start-DockerDesktopIfNeeded {
    $desktopCandidates = @(
        "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )

    foreach ($exe in $desktopCandidates) {
        if (Test-Path -LiteralPath $exe) {
            Write-Host "Starting Docker Desktop: $exe"
            Start-Process -FilePath $exe
            return $true
        }
    }

    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Error 'Docker CLI not in PATH and Docker Desktop.exe was not found. Install Docker Desktop.'
    }

    Write-Host 'Docker Desktop.exe not found; waiting in case the engine starts another way...'
    return $false
}

if (Test-DockerEngine) {
    Write-Host 'Docker engine is already running — stopping any previous demo before restart...'
    & (Join-Path $ScriptDir 'stop-demo-stack.ps1') -RepoRoot $RepoRoot
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'stop-demo-stack.ps1 returned a non-zero exit code; continuing startup anyway.'
    }
    exit 0
}

Write-Host 'Docker engine is not running — starting Docker Desktop...'
Start-DockerDesktopIfNeeded | Out-Null

Write-Host "Waiting ${ColdStartSleepSeconds}s after launch..."
Start-Sleep -Seconds $ColdStartSleepSeconds

$deadline = (Get-Date).AddSeconds($EngineTimeoutSeconds)
Write-Host "Waiting for Docker engine (timeout ${EngineTimeoutSeconds}s)..."

while ((Get-Date) -lt $deadline) {
    if (Test-DockerEngine) {
        Write-Host 'Docker engine is ready.'
        exit 0
    }
    Start-Sleep -Seconds 3
}

Write-Error 'Timed out waiting for Docker. Open Docker Desktop manually once, then retry.'
exit 1
