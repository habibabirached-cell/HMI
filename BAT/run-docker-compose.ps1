param(
    [Parameter(Mandatory = $true)]
    [string] $RepoRoot,

    [Parameter(Mandatory = $true)]
    [string] $EnvFile,

    [Parameter(Mandatory = $true)]
    [string] $ComposeFile
)

Push-Location $RepoRoot
try {
    & docker compose --env-file $EnvFile -f $ComposeFile up -d
    $exitCode = $LASTEXITCODE

    Write-Host ""
    Write-Host "--- docker compose ps ---"
    & docker compose --env-file $EnvFile -f $ComposeFile ps
    if ($LASTEXITCODE -ne 0 -and $exitCode -eq 0) {
        $exitCode = $LASTEXITCODE
    }

    exit $exitCode
} finally {
    Pop-Location
}
