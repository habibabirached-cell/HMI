param(
    [Parameter(Mandatory = $true)]
    [string] $LogPath,

    [Parameter(Mandatory = $true)]
    [string] $DebugLog,

    [Parameter(Mandatory = $true)]
    [string] $CommandPath,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $CommandArgs
)

function Write-TeeLine {
    param([string] $Message)
    Write-Host $Message
    Add-Content -LiteralPath $LogPath -Value $Message -ErrorAction SilentlyContinue
    Add-Content -LiteralPath $DebugLog -Value $Message -ErrorAction SilentlyContinue
}

if ($CommandPath -like "*.ps1") {
    & $CommandPath @CommandArgs 2>&1 | ForEach-Object { Write-TeeLine $_.ToString() }
    exit $LASTEXITCODE
}

$cmdArgs = @('/c', $CommandPath) + @($CommandArgs)
& cmd.exe $cmdArgs 2>&1 | ForEach-Object { Write-TeeLine $_.ToString() }
exit $LASTEXITCODE
