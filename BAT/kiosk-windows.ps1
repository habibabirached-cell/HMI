# Shared Maingear kiosk window registry + focus helpers (DCS :3003 / Vernova :5173).
# Lives in BAT/ — dot-sourced by focus-kiosk-window.ps1 and repo-root open-chrome-window.ps1.

Set-StrictMode -Version Latest

$script:KioskRegistryPath = Join-Path $PSScriptRoot "kiosk-windows.json"

function Write-WaitMsg {
    param([string] $Message)
    Write-Host $Message
    foreach ($path in @($global:GenesisTeeLogs)) {
        if ($path) {
            Add-Content -LiteralPath $path -Value $Message -ErrorAction SilentlyContinue
        }
    }
}

if (-not ("KioskWindowApi" -as [type])) {
    Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public static class KioskWindowApi {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static string GetWindowTitle(IntPtr hWnd) {
        var sb = new StringBuilder(512);
        GetWindowText(hWnd, sb, sb.Capacity);
        return sb.ToString();
    }

    public static List<IntPtr> FindVisibleChromeWindows() {
        var handles = new List<IntPtr>();
        EnumWindows((hWnd, _) => {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            try {
                var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                if (!string.Equals(proc.ProcessName, "chrome", StringComparison.OrdinalIgnoreCase)) {
                    return true;
                }
            } catch {
                return true;
            }
            var title = GetWindowTitle(hWnd);
            if (title != null && title.Length > 0) {
                handles.Add(hWnd);
            }
            return true;
        }, IntPtr.Zero);
        return handles;
    }
}
"@
}

function Get-KioskRegistryPath {
    return $script:KioskRegistryPath
}

function Get-KioskChromeProfileDir {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("Dcs", "Vernova")]
        [string] $Target
    )

    $name = $Target.ToLowerInvariant()
    return Join-Path $env:LOCALAPPDATA "DataCenterSmartPower\chrome-kiosk-$name"
}

function Read-KioskWindowRegistry {
    $path = Get-KioskRegistryPath
    if (-not (Test-Path -LiteralPath $path)) {
        return [PSCustomObject]@{}
    }

    try {
        return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    } catch {
        Write-Warning "Could not read kiosk registry at $path"
        return [PSCustomObject]@{}
    }
}

function Write-KioskWindowRegistryEntry {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("Dcs", "Vernova")]
        [string] $Target,

        [Parameter(Mandatory = $true)]
        [IntPtr] $Handle,

        [Parameter(Mandatory = $true)]
        [string] $Url
    )

    $path = Get-KioskRegistryPath
    $key = $Target.ToLowerInvariant()
    $existing = @{}
    if (Test-Path -LiteralPath $path) {
        try {
            $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
            foreach ($prop in $raw.PSObject.Properties) {
                $existing[$prop.Name] = $prop.Value
            }
        } catch {
            $existing = @{}
        }
    }

    $existing[$key] = [ordered]@{
        hwnd      = $Handle.ToInt64()
        url       = $Url
        profile   = (Get-KioskChromeProfileDir -Target $Target)
        updatedAt = (Get-Date).ToString("o")
    }

    $payload = [ordered]@{}
    foreach ($entryKey in @("dcs", "vernova")) {
        if ($existing.ContainsKey($entryKey)) {
            $payload[$entryKey] = $existing[$entryKey]
        }
    }

    ($payload | ConvertTo-Json -Depth 4) | Set-Content -LiteralPath $path -Encoding UTF8
    Write-Host "Saved kiosk window '$Target' (hwnd=$Handle) -> $path"
}

function Test-KioskWindowHandle {
    param([IntPtr] $Handle)
    return ($Handle -ne [IntPtr]::Zero) -and [KioskWindowApi]::IsWindow($Handle)
}

function Get-KioskWindowArea {
    param([IntPtr] $Handle)

    $rect = New-Object KioskWindowApi+RECT
    if (-not [KioskWindowApi]::GetWindowRect($Handle, [ref]$rect)) {
        return 0
    }
    return [Math]::Max(0, $rect.Right - $rect.Left) * [Math]::Max(0, $rect.Bottom - $rect.Top)
}

function Find-KioskChromeWindow {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("Dcs", "Vernova")]
        [string] $Target
    )

    $registry = Read-KioskWindowRegistry
    $key = $Target.ToLowerInvariant()
    $entry = $registry.$key

    $bestHandle = [IntPtr]::Zero
    $bestArea = 0
    foreach ($hwnd in [KioskWindowApi]::FindVisibleChromeWindows()) {
        $title = [KioskWindowApi]::GetWindowTitle($hwnd)
        if (-not $title) { continue }
        $area = Get-KioskWindowArea -Handle $hwnd
        if ($area -le $bestArea) { continue }

        $titleMatches = $false
        if ($Target -eq "Dcs") {
            $titleMatches = ($title -match "Data Center|ACDC|Configurator|HD_Aero|P2R|localhost:3003") -or ($title -match "3003")
        } else {
            $titleMatches = ($title -match "Spark|Vernova|VERNOVA|localhost:5173") -or ($title -match "5173")
        }

        if ($titleMatches -or $area -gt 3000000) {
            $bestHandle = $hwnd
            $bestArea = $area
        }
    }

    if ($bestHandle -ne [IntPtr]::Zero) {
        return $bestHandle
    }

    foreach ($hwnd in [KioskWindowApi]::FindVisibleChromeWindows()) {
        $area = Get-KioskWindowArea -Handle $hwnd
        if ($area -gt $bestArea) {
            $bestHandle = $hwnd
            $bestArea = $area
        }
    }

    return $bestHandle
}

function Show-KioskWindow {
    param(
        [Parameter(Mandatory = $true)]
        [IntPtr] $Handle,

        [switch] $NoActivate
    )

    if (-not (Test-KioskWindowHandle -Handle $Handle)) {
        throw "Invalid window handle $Handle"
    }

    if ($NoActivate) {
        [void][KioskWindowApi]::ShowWindow($Handle, 4)
        return
    }

    [void][KioskWindowApi]::ShowWindow($Handle, 9)
    Start-Sleep -Milliseconds 80
    [void][KioskWindowApi]::SetForegroundWindow($Handle)
}

function Focus-KioskWindow {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("Dcs", "Vernova")]
        [string] $Target
    )

    $registry = Read-KioskWindowRegistry
    $key = $Target.ToLowerInvariant()
    $entry = $registry.$key
    $handle = [IntPtr]::Zero

    if ($entry -and $entry.hwnd) {
        $candidate = [IntPtr]::new([int64]$entry.hwnd)
        if (Test-KioskWindowHandle -Handle $candidate) {
            $handle = $candidate
        }
    }

    if ($handle -eq [IntPtr]::Zero) {
        Write-Warning "Saved handle for '$Target' missing or stale; scanning Chrome windows..."
        $handle = Find-KioskChromeWindow -Target $Target
    }

    if ($handle -eq [IntPtr]::Zero) {
        throw "Could not find a Chrome kiosk window for '$Target'. Run BAT\z_genesis.start.bat first."
    }

    Show-KioskWindow -Handle $handle
    Write-KioskWindowRegistryEntry -Target $Target -Handle $handle -Url ($(if ($entry -and $entry.url) { [string]$entry.url } else { if ($Target -eq "Dcs") { "http://localhost:3003" } else { "http://localhost:5173" } }))
    Write-Host "Focused kiosk window: $Target (hwnd=$handle)"
}

function Wait-ForTcpPort {
    param(
        [Parameter(Mandatory = $true)]
        [int] $Port,

        [int] $TimeoutSeconds = 180,

        [string] $Label = "port $Port",

        [int] $ProgressIntervalSeconds = 15
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $started = Get-Date
    $lastProgressBucket = 0

    Write-WaitMsg ""
    Write-WaitMsg ('Waiting for {0} on 127.0.0.1:{1} (timeout {2}s) ...' -f $Label, $Port, $TimeoutSeconds)
    if ($Port -eq 5173) {
        Write-WaitMsg '  Vernova npm run dev can take 1-3 minutes on a cold start — please wait.'
    }

    while ((Get-Date) -lt $deadline) {
        $elapsedSeconds = [int][math]::Floor(((Get-Date) - $started).TotalSeconds)
        if ($ProgressIntervalSeconds -gt 0 -and $elapsedSeconds -ge $ProgressIntervalSeconds) {
            $bucket = [int][math]::Floor($elapsedSeconds / $ProgressIntervalSeconds) * $ProgressIntervalSeconds
            if ($bucket -gt $lastProgressBucket) {
                Write-WaitMsg ('  ... still waiting for {0} ({1}s elapsed, {2}s max)' -f $Label, $bucket, $TimeoutSeconds)
                $lastProgressBucket = $bucket
            }
        }

        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
            $ok = $async.AsyncWaitHandle.WaitOne(500)
            if ($ok -and $client.Connected) {
                $client.Close()
                Write-WaitMsg ('{0} is ready after {1}s.' -f $Label, $elapsedSeconds)
                return
            }
            $client.Close()
        } catch {
            # keep polling
        }
        Start-Sleep -Milliseconds 500
    }

    throw ('Timed out waiting for {0} on port {1} after {2}s' -f $Label, $Port, $TimeoutSeconds)
}
