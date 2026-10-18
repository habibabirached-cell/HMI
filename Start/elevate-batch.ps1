# Re-launch a .bat elevated (first-time Ethernet only; daily start uses -Daily and must not call this).
param(
    [Parameter(Mandatory = $true)]
    [string] $BatchPath,
    [string[]] $BatchArgs = @()
)

$ErrorActionPreference = 'Stop'

function Test-IsAdmin {
    $p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Path -LiteralPath $BatchPath)) {
    Write-Error "Batch not found: $BatchPath"
    exit 1
}

$tail = ''
if ($BatchArgs -and $BatchArgs.Count -gt 0) {
    $tail = ' ' + ($BatchArgs -join ' ')
}
$cmdLine = "call `"$BatchPath`"$tail"

if (Test-IsAdmin) {
    cmd.exe /c $cmdLine
    exit $LASTEXITCODE
}

$p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $cmdLine) -Verb RunAs -PassThru -Wait
exit $p.ExitCode
