<#
.SYNOPSIS
    Open Google Chrome at a specific screen position and size.

.DESCRIPTION
    Launches Chrome in a new window at the given (x, y) coordinates with the
    specified width and height. Uses Chrome's --window-position/--window-size
    flags, then re-applies placement via Win32 for reliability.

.PARAMETER X
    Left edge of the window in pixels.

.PARAMETER Y
    Top edge of the window in pixels.

.PARAMETER Width
    Window width in pixels.

.PARAMETER Height
    Window height in pixels.

.PARAMETER Url
    Optional URL to open. Defaults to a blank new tab.

.PARAMETER Display
    Use a preset for one of the four monitors (1=primary, 2=top-left,
    3=top-right, 4=bottom-left). Sizes/positions follow the current Windows
    display arrangement (re-detect with -ListDisplays).

.PARAMETER SpanAllDisplays
    Span the full Windows virtual desktop (all monitors). Positions are read
    at launch time so this survives display reordering in Settings.

.PARAMETER ListDisplays
    Print the current monitor layout and preset mapping, then exit.

.PARAMETER App
    Open in Chrome app mode (no tabs/address bar). Use this for edge-to-edge
    spans; Windows cannot extend a normal Chrome window to the bottom when Y
    is above the virtual desktop (e.g. Y=-120 to hide the toolbar).

.PARAMETER ChromePath
    Path to chrome.exe. Auto-detected if omitted.

.EXAMPLE
    .\open-chrome-window.bat -X 100 -Y 50 -Width 1280 -Height 720

.EXAMPLE
    .\open-chrome-window.bat -Display 3 -Url "http://localhost:3000"

.EXAMPLE
    .\open-chrome-window.bat -SpanAllDisplays -App -Url "http://localhost:3003"

.EXAMPLE
    .\open-chrome-window.bat -ListDisplays

.EXAMPLE
    .\open-chrome-window.bat -X -1536 -Y 0 -Width 3072 -Height 1728 -App -Url "http://localhost:3003"

.NOTES
    If running the .ps1 directly fails with an execution policy error, use
    open-chrome-window.bat instead (it bypasses the policy for this script only).
#>
[CmdletBinding(DefaultParameterSetName = "Position")]
param(
    [Parameter(Mandatory = $true, ParameterSetName = "Position")]
    [int] $X,

    [Parameter(Mandatory = $true, ParameterSetName = "Position")]
    [int] $Y,

    [Parameter(Mandatory = $true, ParameterSetName = "Position")]
    [int] $Width,

    [Parameter(Mandatory = $true, ParameterSetName = "Position")]
    [int] $Height,

    [Parameter(Mandatory = $true, ParameterSetName = "Display")]
    [ValidateRange(1, 4)]
    [int] $Display,

    [Parameter(Mandatory = $true, ParameterSetName = "SpanAll")]
    [switch] $SpanAllDisplays,

    [Parameter(Mandatory = $true, ParameterSetName = "List")]
    [switch] $ListDisplays,

    [string] $Url = "about:blank",

    [switch] $App,

    [string] $ChromePath,

    [ValidateSet("", "Dcs", "Vernova")]
    [string] $SaveKioskTarget = "",

    [switch] $NoActivate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($SaveKioskTarget -or $NoActivate) {
    $kioskScript = Join-Path $PSScriptRoot "BAT\kiosk-windows.ps1"
    if (-not (Test-Path -LiteralPath $kioskScript)) {
        throw "Kiosk helpers not found at $kioskScript (expected BAT\kiosk-windows.ps1)."
    }
    . $kioskScript
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public static class WindowPlacement {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static List<IntPtr> FindWindowsForProcess(uint processId) {
        var handles = new List<IntPtr>();
        EnumWindows((hWnd, _) => {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == processId) handles.Add(hWnd);
            return true;
        }, IntPtr.Zero);
        return handles;
    }

    public static string GetWindowTitle(IntPtr hWnd) {
        var sb = new StringBuilder(512);
        GetWindowText(hWnd, sb, sb.Capacity);
        return sb.ToString();
    }
}
"@

function Resolve-ChromePath {
    if ($ChromePath -and (Test-Path -LiteralPath $ChromePath)) {
        return $ChromePath
    }

    $candidates = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:LocalAppData}\Google\Chrome\Application\chrome.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    throw "Chrome not found. Install Chrome or pass -ChromePath."
}

function Get-ChromeWindowHandles {
    $handles = New-Object 'System.Collections.Generic.HashSet[System.IntPtr]'
    foreach ($proc in @(Get-Process -Name chrome -ErrorAction SilentlyContinue)) {
        $windows = [WindowPlacement]::FindWindowsForProcess([UInt32]$proc.Id)
        if ($null -eq $windows) { continue }
        foreach ($hwnd in $windows) {
            $title = [WindowPlacement]::GetWindowTitle($hwnd)
            if ($null -ne $title -and $title.Length -gt 0) {
                [void]$handles.Add($hwnd)
            }
        }
    }
    return $handles
}

function Wait-ForNewChromeWindow {
    param(
        [System.Collections.Generic.HashSet[IntPtr]] $ExistingHandles,
        [int] $TimeoutSeconds = 15
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        foreach ($hwnd in @(Get-ChromeWindowHandles)) {
            if ($null -eq $ExistingHandles -or -not $ExistingHandles.Contains($hwnd)) {
                return $hwnd
            }
        }
        Start-Sleep -Milliseconds 100
    }

    return [IntPtr]::Zero
}

function Get-WindowRectInfo {
    param([IntPtr] $Handle)

    $rect = New-Object WindowPlacement+RECT
    $ok = [WindowPlacement]::GetWindowRect($Handle, [ref]$rect)
    if (-not $ok) {
        throw "GetWindowRect failed for handle $Handle."
    }

    return [PSCustomObject]@{
        Left   = $rect.Left
        Top    = $rect.Top
        Right  = $rect.Right
        Bottom = $rect.Bottom
        Width  = $rect.Right - $rect.Left
        Height = $rect.Bottom - $rect.Top
    }
}

function Set-ChromeWindowBounds {
    param(
        [IntPtr] $Handle,
        [int] $X,
        [int] $Y,
        [int] $Width,
        [int] $Height
    )

    if ($Handle -eq [IntPtr]::Zero) {
        throw "No Chrome window handle available to position."
    }

    Add-Type -AssemblyName System.Windows.Forms
    $virtualTop = [System.Windows.Forms.SystemInformation]::VirtualScreen.Top
    $virtualBottom = $virtualTop + [System.Windows.Forms.SystemInformation]::VirtualScreen.Height
    $targetBottom = $Y + $Height

    # Size from Y=0 first when the window starts above the virtual desktop.
    # Windows clamps height for negative Y and leaves a gap at the bottom.
    if ($Y -lt $virtualTop) {
        $visibleHeight = $virtualBottom - $virtualTop
        $ok = [WindowPlacement]::MoveWindow($Handle, $X, $virtualTop, $Width, $visibleHeight, $true)
        if (-not $ok) {
            throw "MoveWindow failed while pre-sizing at virtual top."
        }
        Start-Sleep -Milliseconds 150
    }

    $ok = [WindowPlacement]::MoveWindow($Handle, $X, $Y, $Width, $Height, $true)
    if (-not $ok) {
        throw "MoveWindow failed for handle $Handle."
    }

    Start-Sleep -Milliseconds 150

    for ($attempt = 0; $attempt -lt 5; $attempt++) {
        $rect = Get-WindowRectInfo -Handle $Handle

        $topOk = [Math]::Abs($rect.Top - $Y) -le 2
        $widthOk = [Math]::Abs($rect.Width - $Width) -le 2
        $bottomOk = [Math]::Abs($rect.Bottom - $targetBottom) -le 2

        if ($topOk -and $widthOk -and $bottomOk) {
            return $rect
        }

        if ($Y -lt $virtualTop -and $rect.Bottom -lt ($targetBottom - 2)) {
            break
        }

        [void][WindowPlacement]::MoveWindow($Handle, $X, $Y, $Width, $Height, $true)
        Start-Sleep -Milliseconds 150
    }

    $finalRect = Get-WindowRectInfo -Handle $Handle
    if ($Y -lt $virtualTop -and $finalRect.Bottom -lt ($targetBottom - 2)) {
        $gap = $targetBottom - $finalRect.Bottom
        Write-Warning @"
Windows limits window height when Y is above the virtual desktop (Y=$Y).
Requested bottom=$targetBottom but actual bottom=$($finalRect.Bottom) (short by ${gap}px).
Use -App with Y=0 and Height=$($virtualBottom - $virtualTop) for a frameless window that reaches the bottom:
  .\open-chrome-window.bat -X $X -Y $virtualTop -Width $Width -Height $($virtualBottom - $virtualTop) -App -Url `"$Url`"
"@
    }

    return $finalRect
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

    $midX = ($monitors | Measure-Object -Property CenterX -Average).Average
    $midY = ($monitors | Measure-Object -Property CenterY -Average).Average

    foreach ($m in $monitors) {
        if ($m.Primary) {
            $role = "primary"
        } elseif ($m.CenterX -lt $midX -and $m.CenterY -lt $midY) {
            $role = "top-left"
        } elseif ($m.CenterX -ge $midX -and $m.CenterY -lt $midY) {
            $role = "top-right"
        } elseif ($m.CenterX -lt $midX -and $m.CenterY -ge $midY) {
            $role = "bottom-left"
        } else {
            $role = "bottom-right"
        }
        $m | Add-Member -NotePropertyName Role -NotePropertyValue $role -Force
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
        return [PSCustomObject]@{
            Monitors       = $monitors
            VirtualLeft    = $Layout.VirtualLeft
            VirtualTop     = $Layout.VirtualTop
            VirtualWidth   = $Layout.VirtualWidth
            VirtualHeight  = $Layout.VirtualHeight
            CellWidth      = $null
            CellHeight     = $null
            Normalized     = $false
        }
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
            Left    = $snapLeft
            Top     = $snapTop
            Width   = $cellW
            Height  = $cellH
            Primary = $m.Primary
            CenterX = $m.CenterX
            CenterY = $m.CenterY
            Role    = $role
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
        Normalized    = $true
    }
}

function Get-DisplayPresetsFromLayout {
    param($Layout)

    $roleToDisplay = @{
        "primary"     = 1
        "top-left"    = 2
        "top-right"   = 3
        "bottom-left" = 4
    }

    $presets = @{}
    foreach ($m in $Layout.Monitors) {
        $displayId = $roleToDisplay[$m.Role]
        if ($null -eq $displayId) { continue }
        if ($presets.ContainsKey($displayId)) { continue }
        $presets[$displayId] = @{
            X      = [int]$m.Left
            Y      = [int]$m.Top
            Width  = [int]$m.Width
            Height = [int]$m.Height
            Role   = $m.Role
            Device = $m.Device
        }
    }

    if (-not $presets.ContainsKey(1)) {
        $primary = $Layout.Monitors | Where-Object { $_.Primary } | Select-Object -First 1
        if ($primary) {
            $presets[1] = @{
                X = [int]$primary.Left; Y = [int]$primary.Top
                Width = [int]$primary.Width; Height = [int]$primary.Height
                Role = "primary"; Device = $primary.Device
            }
        }
    }

    return $presets
}

if ($ListDisplays) {
    $layout = Get-MonitorLayout
    $grid = Get-NormalizedGridLayout -Layout $layout
    $presets = Get-DisplayPresetsFromLayout -Layout $grid
    Write-Host "Raw virtual desktop: ($($layout.VirtualLeft), $($layout.VirtualTop)) $($layout.VirtualWidth)x$($layout.VirtualHeight)"
    if ($grid.Normalized) {
        Write-Host "Normalized 2x2 grid: ($($grid.VirtualLeft), $($grid.VirtualTop)) $($grid.VirtualWidth)x$($grid.VirtualHeight)  (cell $($grid.CellWidth)x$($grid.CellHeight))"
    }
    Write-Host ""
    Write-Host "Monitors:"
    foreach ($m in ($grid.Monitors | Sort-Object Top, Left)) {
        $primary = if ($m.Primary) { " [PRIMARY]" } else { "" }
        $raw = if ($null -ne $m.RawLeft) { "  raw=($($m.RawLeft), $($m.RawTop))" } else { "" }
        Write-Host "  $($m.Device)$primary role=$($m.Role) snap=($($m.Left), $($m.Top)) $($m.Width)x$($m.Height)$raw"
    }
    Write-Host ""
    Write-Host "Display presets (-Display N):"
    foreach ($id in @(1, 2, 3, 4)) {
        if (-not $presets.ContainsKey($id)) { continue }
        $p = $presets[$id]
        Write-Host "  $id ($($p.Role)): -X $($p.X) -Y $($p.Y) -Width $($p.Width) -Height $($p.Height)"
    }
    Write-Host ""
    Write-Host "Span all displays (2x2 abutting):"
    Write-Host "  -SpanAllDisplays -App -Url `"http://localhost:3003`""
    Write-Host "  => -X $($grid.VirtualLeft) -Y $($grid.VirtualTop) -Width $($grid.VirtualWidth) -Height $($grid.VirtualHeight)"
    exit 0
}

$layout = Get-MonitorLayout
$grid = Get-NormalizedGridLayout -Layout $layout
$DisplayPresets = Get-DisplayPresetsFromLayout -Layout $grid

if ($PSCmdlet.ParameterSetName -eq "SpanAll") {
    $X = $grid.VirtualLeft
    $Y = $grid.VirtualTop
    $Width = $grid.VirtualWidth
    $Height = $grid.VirtualHeight
}

if ($PSCmdlet.ParameterSetName -eq "Display") {
    if (-not $DisplayPresets.ContainsKey($Display)) {
        throw "Display preset $Display is not available for the current monitor layout."
    }
    $preset = $DisplayPresets[$Display]
    $X = $preset.X
    $Y = $preset.Y
    $Width = $preset.Width
    $Height = $preset.Height
    $displayRole = $preset.Role
}

$chrome = Resolve-ChromePath
$launchUrl = if ($App) { "--app=$Url" } else { $Url }
$args = @(
    "--new-window",
    "--window-position=$X,$Y",
    "--window-size=$Width,$Height",
    $launchUrl
)

if ($SaveKioskTarget) {
    $profileDir = Get-KioskChromeProfileDir -Target $SaveKioskTarget
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
    $args = @("--user-data-dir=$profileDir") + $args
}

$existingWindows = Get-ChromeWindowHandles
$null = Start-Process -FilePath $chrome -ArgumentList $args -PassThru
$hwnd = Wait-ForNewChromeWindow -ExistingHandles $existingWindows

$finalRect = Set-ChromeWindowBounds -Handle $hwnd -X $X -Y $Y -Width $Width -Height $Height

if ($NoActivate) {
    Show-KioskWindow -Handle $hwnd -NoActivate
}

if ($SaveKioskTarget) {
    Write-KioskWindowRegistryEntry -Target $SaveKioskTarget -Handle $hwnd -Url $Url
}

if ($PSCmdlet.ParameterSetName -eq "Display") {
    Write-Host "Chrome opened on display $Display ($displayRole) at ($X, $Y) size ${Width}x${Height}"
} elseif ($PSCmdlet.ParameterSetName -eq "SpanAll") {
    Write-Host "Chrome opened spanning all displays at ($X, $Y) size ${Width}x${Height}"
} else {
    Write-Host "Chrome opened at ($X, $Y) size ${Width}x${Height}"
}
Write-Host "Actual window: ($($finalRect.Left), $($finalRect.Top)) size $($finalRect.Width)x$($finalRect.Height), bottom=$($finalRect.Bottom)"
if ($App) {
    Write-Host "Mode: app (no tabs/address bar)"
}
if ($Url -ne "about:blank") {
    Write-Host "URL: $Url"
}
