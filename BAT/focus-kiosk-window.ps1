<#
.SYNOPSIS
    Bring the Maingear DCS or Vernova fullscreen Chrome window to the front.

.EXAMPLE
    .\focus-kiosk-window.bat Dcs
    .\focus-kiosk-window.bat Vernova
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("Dcs", "Vernova")]
    [string] $Target
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. "$PSScriptRoot\kiosk-windows.ps1"
Focus-KioskWindow -Target $Target
