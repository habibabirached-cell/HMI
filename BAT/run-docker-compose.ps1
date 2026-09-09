param(
    [Parameter(Mandatory = $true)]
    [string] $RepoRoot,

    [Parameter(Mandatory = $true)]
    [string] $EnvFile,

    [Parameter(Mandatory = $true)]
    [string] $ComposeFile,

    [Parameter(Mandatory = $true)]
    [string] $DockerLog,

    [Parameter(Mandatory = $true)]
    [string] $DebugLog
)

function Write-TeeLine {
    param([string] $Message)
    Write-Host $Message
    Add-Content -LiteralPath $DockerLog -Value $Message -ErrorAction SilentlyContinue
    Add-Content -LiteralPath $DebugLog -Value $Message -ErrorAction SilentlyContinue
}

Set-Content -LiteralPath $DockerLog -Value "=== docker compose log ===" -Encoding UTF8
Add-Content -LiteralPath $DebugLog -Value "" -ErrorAction SilentlyContinue
Add-Content -LiteralPath $DebugLog -Value "----- docker compose -----" -ErrorAction SilentlyContinue

Push-Location $RepoRoot
try {
    & docker compose --env-file $EnvFile -f $ComposeFile up -d 2>&1 | ForEach-Object {
        Write-TeeLine $_.ToString()
    }
    $exitCode = $LASTEXITCODE

    Write-TeeLine ""
    Write-TeeLine "--- docker compose ps ---"
    & docker compose --env-file $EnvFile -f $ComposeFile ps 2>&1 | ForEach-Object {
        Write-TeeLine $_.ToString()
    }
    if ($LASTEXITCODE -ne 0 -and $exitCode -eq 0) {
        $exitCode = $LASTEXITCODE
    }

    exit $exitCode
} finally {
    Pop-Location
}
