# Create a .lnk without fragile cmd.exe -Command quoting (paths with spaces/parentheses OK).
param(
    [Parameter(Mandatory = $true)]
    [string] $LinkPath,
    [Parameter(Mandatory = $true)]
    [string] $TargetPath,
    [Parameter(Mandatory = $true)]
    [string] $WorkingDirectory,
    [string] $Description = ''
)

$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($LinkPath)
$shortcut.TargetPath = $TargetPath
$shortcut.WorkingDirectory = $WorkingDirectory
if ($Description) {
    $shortcut.Description = $Description
}
$shortcut.Save()
