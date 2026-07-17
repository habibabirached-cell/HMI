<#
.SYNOPSIS
    Snap four monitors to a perfect 2x2 abutting grid using Windows display APIs.

.DESCRIPTION
    Reads the current layout, computes exact ortho grid coordinates, and applies them
    through the DisplayConfig PowerShell module (QueryDisplayConfig / SetDisplayConfig).

    Install once (elevated PowerShell may not be required):
      Install-Module DisplayConfig -Scope CurrentUser

.PARAMETER ListOnly
    Show planned changes only; do not apply.

.EXAMPLE
    .\align-display-grid.bat -ListOnly

.EXAMPLE
    .\align-display-grid.bat
#>
[CmdletBinding()]
param(
    [switch] $ListOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$script:PreviewOnly = [bool]$ListOnly

function Ensure-DisplayConfigModule {
    if (Get-Module -ListAvailable -Name DisplayConfig) {
        Import-Module DisplayConfig -ErrorAction Stop
        return
    }

    Write-Host "DisplayConfig module is required (wraps Windows SetDisplayConfig API)." -ForegroundColor Yellow
    Write-Host "Install it once, then re-run this script:"
    Write-Host "  Install-Module DisplayConfig -Scope CurrentUser"
    throw "DisplayConfig module not installed."
}

function Get-MonitorLayout {
    Add-Type -AssemblyName System.Windows.Forms
    $screens = [System.Windows.Forms.Screen]::AllScreens
    $monitors = foreach ($screen in $screens) {
        $b = $screen.Bounds
        [PSCustomObject]@{
            Device  = $screen.DeviceName
            Left    = $b.Left
            Top     = $b.Top
            Width   = $b.Width
            Height  = $b.Height
            Primary = $screen.Primary
            CenterX = ($b.Left + $b.Right) / 2.0
            CenterY = ($b.Top + $b.Bottom) / 2.0
        }
    }

    if ($monitors.Count -eq 0) {
        throw "No monitors detected."
    }

    $vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
    return [PSCustomObject]@{
        Monitors      = $monitors
        VirtualLeft   = $vs.Left
        VirtualTop    = $vs.Top
        VirtualWidth  = $vs.Width
        VirtualHeight = $vs.Height
    }
}

function Get-NormalizedGridLayout {
    param($Layout)

    $monitors = @($Layout.Monitors)
    if ($monitors.Count -ne 4) {
        throw "Expected exactly 4 monitors; found $($monitors.Count). This script is for a 2x2 grid only."
    }

    $widths = @($monitors | ForEach-Object { [int]$_.Width } | Sort-Object)
    $heights = @($monitors | ForEach-Object { [int]$_.Height } | Sort-Object)
    $cellW = [int][Math]::Round(($widths[1] + $widths[2]) / 2.0)
    $cellH = [int][Math]::Round(($heights[1] + $heights[2]) / 2.0)

    $midX = ($monitors | Measure-Object -Property CenterX -Average).Average
    $midY = ($monitors | Measure-Object -Property CenterY -Average).Average

    $normalized = foreach ($m in $monitors) {
        $col = if ($m.CenterX -lt $midX) { 0 } else { 1 }
        $row = if ($m.CenterY -lt $midY) { 0 } else { 1 }
        $snapLeft = if ($col -eq 0) { -$cellW } else { 0 }
        $snapTop = if ($row -eq 0) { -$cellH } else { 0 }

        if ($m.Primary) {
            $role = "primary"
        } elseif ($col -eq 0 -and $row -eq 0) {
            $role = "top-left"
        } elseif ($col -eq 1 -and $row -eq 0) {
            $role = "top-right"
        } elseif ($col -eq 0 -and $row -eq 1) {
            $role = "bottom-left"
        } else {
            $role = "bottom-right"
        }

        [PSCustomObject]@{
            Device  = $m.Device
            Role    = $role
            Left    = $snapLeft
            Top     = $snapTop
            Width   = $cellW
            Height  = $cellH
            Primary = $m.Primary
            RawLeft = [int]$m.Left
            RawTop  = [int]$m.Top
        }
    }

    return [PSCustomObject]@{
        Monitors      = $normalized
        VirtualLeft   = -$cellW
        VirtualTop    = -$cellH
        VirtualWidth  = 2 * $cellW
        VirtualHeight = 2 * $cellH
        CellWidth     = $cellW
        CellHeight    = $cellH
    }
}

function Get-DisplayConfigRows {
    $config = Get-DisplayConfig
    $rows = @()
    foreach ($display in $config.Displays) {
        $rows += [PSCustomObject]@{
            DisplayId = [uint32]$display.DisplayId
            Name      = $display.DisplayName
            X         = [int]$display.Position.X
            Y         = [int]$display.Position.Y
            Width     = [int]$display.Resolution.Width
            Height    = [int]$display.Resolution.Height
            Primary   = [bool]$display.IsPrimary
        }
    }
    return ,$rows
}

function Map-DisplayIdsToGrid {
    param(
        $DisplayRows,
        $GridMonitors
    )

    $mapped = @()
    foreach ($target in $GridMonitors) {
        $match = $DisplayRows | Where-Object {
            $_.X -eq $target.RawLeft -and $_.Y -eq $target.RawTop
        } | Select-Object -First 1

        if (-not $match) {
            $match = $DisplayRows | Where-Object {
                $_.Primary -eq $target.Primary
            } | Select-Object -First 1
        }

        if (-not $match) {
            $match = $DisplayRows | Where-Object {
                $_.Width -eq $target.Width -and $_.Height -eq $target.Height -and
                [Math]::Abs($_.X - $target.RawLeft) -le 16 -and
                [Math]::Abs($_.Y - $target.RawTop) -le 16
            } | Select-Object -First 1
        }

        if (-not $match) {
            throw "Could not map Windows display id for $($target.Device) at ($($target.RawLeft), $($target.RawTop))."
        }

        $mapped += [PSCustomObject]@{
            DisplayId = $match.DisplayId
            Device    = $target.Device
            Role      = $target.Role
            RawLeft   = $target.RawLeft
            RawTop    = $target.RawTop
            TargetX   = $target.Left
            TargetY   = $target.Top
        }
    }
    return $mapped
}

Ensure-DisplayConfigModule

$layout = Get-MonitorLayout
$grid = Get-NormalizedGridLayout -Layout $layout
$displayRows = Get-DisplayConfigRows
$mapped = Map-DisplayIdsToGrid -DisplayRows $displayRows -GridMonitors $grid.Monitors

Write-Host "Current virtual desktop: ($($layout.VirtualLeft), $($layout.VirtualTop)) $($layout.VirtualWidth)x$($layout.VirtualHeight)"
Write-Host "Target 2x2 grid:         ($($grid.VirtualLeft), $($grid.VirtualTop)) $($grid.VirtualWidth)x$($grid.VirtualHeight)  (cell $($grid.CellWidth)x$($grid.CellHeight))"
Write-Host ""

$changes = @()
foreach ($m in ($mapped | Sort-Object TargetY, TargetX)) {
    $deltaX = $m.TargetX - $m.RawLeft
    $deltaY = $m.TargetY - $m.RawTop
    $needsChange = ($deltaX -ne 0) -or ($deltaY -ne 0)
    $status = if ($needsChange) { "ADJUST" } else { "OK" }
    Write-Host ("[{0}] DisplayId={1} {2} role={3}" -f $status, $m.DisplayId, $m.Device, $m.Role)
    Write-Host ("       current=({0}, {1})  target=({2}, {3})  delta=({4}, {5})" -f $m.RawLeft, $m.RawTop, $m.TargetX, $m.TargetY, $deltaX, $deltaY)
    if ($needsChange) { $changes += $m }
}

if ($changes.Count -eq 0) {
    Write-Host ""
    Write-Host "Monitors are already on a perfect 2x2 grid. No changes needed."
    exit 0
}

if ($script:PreviewOnly) {
    Write-Host ""
    Write-Host "ListOnly: no Windows display changes were applied."
    exit 0
}

Write-Host ""
Write-Host "Applying display positions through DisplayConfig..."
$config = Get-DisplayConfig
foreach ($m in $changes) {
    $config = $config | Set-DisplayPosition -DisplayId $m.DisplayId -XPosition $m.TargetX -YPosition $m.TargetY
}
$config | Use-DisplayConfig -AllowChanges | Out-Null

Start-Sleep -Milliseconds 500
$verify = Get-MonitorLayout
Write-Host ""
Write-Host "After apply, virtual desktop: ($($verify.VirtualLeft), $($verify.VirtualTop)) $($verify.VirtualWidth)x$($verify.VirtualHeight)"
Write-Host "Done. Run: .\open-chrome-window.bat -ListDisplays"
