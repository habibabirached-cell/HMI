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
    Use a preset for one of the four monitors (1=primary top-right, 2=top-left,
    3=bottom-right, 4=bottom-left). Each is 1536x864.

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

    [string] $Url = "about:blank",

    [switch] $App,

    [string] $ChromePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

$DisplayPresets = @{
    1 = @{ X = 0;     Y = 0;   Width = 1536; Height = 864 }  # primary, top-right
    2 = @{ X = -1536; Y = 0;   Width = 1536; Height = 864 }  # top-left
    3 = @{ X = 0;     Y = 864; Width = 1536; Height = 864 }  # bottom-right
    4 = @{ X = -1536; Y = 864; Width = 1536; Height = 864 }  # bottom-left
}

if ($PSCmdlet.ParameterSetName -eq "Display") {
    $preset = $DisplayPresets[$Display]
    $X = $preset.X
    $Y = $preset.Y
    $Width = $preset.Width
    $Height = $preset.Height
}

$chrome = Resolve-ChromePath
$launchUrl = if ($App) { "--app=$Url" } else { $Url }
$args = @(
    "--new-window",
    "--window-position=$X,$Y",
    "--window-size=$Width,$Height",
    $launchUrl
)

$existingWindows = Get-ChromeWindowHandles
$null = Start-Process -FilePath $chrome -ArgumentList $args -PassThru
$hwnd = Wait-ForNewChromeWindow -ExistingHandles $existingWindows

$finalRect = Set-ChromeWindowBounds -Handle $hwnd -X $X -Y $Y -Width $Width -Height $Height

if ($PSCmdlet.ParameterSetName -eq "Display") {
    Write-Host "Chrome opened on display $Display at ($X, $Y) size ${Width}x${Height}"
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
