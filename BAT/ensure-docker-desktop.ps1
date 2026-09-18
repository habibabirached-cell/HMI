# Start Docker Desktop if the engine is not ready, then wait until "docker info" succeeds.
param(
    [int] $TimeoutSeconds = 300
)

$ErrorActionPreference = 'Stop'

function Test-DockerEngine {
    $null = & docker info 2>&1
    return $LASTEXITCODE -eq 0
}

if (Test-DockerEngine) {
    Write-Host 'Docker engine is already running.'
    exit 0
}

$desktopCandidates = @(
    "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
)

$launched = $false
foreach ($exe in $desktopCandidates) {
    if (Test-Path -LiteralPath $exe) {
        Write-Host "Starting Docker Desktop: $exe"
        Start-Process -FilePath $exe
        $launched = $true
        break
    }
}

if (-not $launched) {
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Error 'Docker CLI not in PATH and Docker Desktop.exe was not found. Install Docker Desktop.'
    }
    Write-Host 'Docker Desktop.exe not found; waiting in case the service starts another way...'
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
Write-Host "Waiting for Docker engine (timeout ${TimeoutSeconds}s)..."

while ((Get-Date) -lt $deadline) {
    if (Test-DockerEngine) {
        Write-Host 'Docker engine is ready.'
        exit 0
    }
    Start-Sleep -Seconds 3
}

Write-Error 'Timed out waiting for Docker. Open Docker Desktop manually once, then retry.'
exit 1
