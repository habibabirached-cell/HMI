<#
.SYNOPSIS
    Set a static IPv4 address on the direct Ethernet cable adapter.

.PARAMETER IpAddress
    Static IP to assign (Maingear: 192.168.50.1, Ideum: 192.168.50.2).

.PARAMETER AdapterName
    Optional adapter alias (e.g. "Ethernet" or "Ethernet 7"). Auto-detected if omitted.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^192\.168\.50\.\d+$')]
    [string] $IpAddress,

    [string] $AdapterName
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-Admin {
    $principal = New-Object Security.Principal.WindowsPrincipal(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-DirectEthernetAdapter {
    if ($AdapterName) {
        $adapter = Get-NetAdapter -Name $AdapterName -ErrorAction SilentlyContinue
        if (-not $adapter) {
            throw "Adapter '$AdapterName' not found."
        }
        return $AdapterName
    }

    $linked = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -match '^169\.254\.' } |
        ForEach-Object {
            $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
            if ($adapter -and $adapter.Status -eq 'Up' -and $adapter.MediaType -eq '802.3') {
                $adapter.Name
            }
        } |
        Select-Object -First 1

    if ($linked) {
        return $linked
    }

    $fallback = Get-NetAdapter -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Status -eq 'Up' -and
            $_.MediaType -eq '802.3' -and
            $_.Name -notlike 'vEthernet*' -and
            $_.InterfaceDescription -notlike '*Virtual*' -and
            $_.InterfaceDescription -notlike '*Hyper-V*' -and
            $_.InterfaceDescription -notlike '*Wi-Fi*' -and
            $_.InterfaceDescription -notlike '*Wireless*'
        } |
        Select-Object -First 1

    if ($fallback) {
        return $fallback.Name
    }

    throw 'No suitable Ethernet adapter found. Pass -AdapterName explicitly.'
}

if (-not (Test-Admin)) {
    throw 'Run as Administrator (right-click the .bat file -> Run as administrator).'
}

$alias = Get-DirectEthernetAdapter
$prefix = 24
$mask = '255.255.255.0'

Write-Host "Adapter: $alias"
Write-Host "Setting static IP: $IpAddress / $mask"

Set-NetIPInterface -InterfaceAlias $alias -AddressFamily IPv4 -Dhcp Disabled -ErrorAction Stop

Get-NetIPAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    ForEach-Object {
        Remove-NetIPAddress -InterfaceAlias $alias -IPAddress $_.IPAddress -PrefixLength $_.PrefixLength -Confirm:$false -ErrorAction SilentlyContinue
    }

Get-NetRoute -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.DestinationPrefix -eq '0.0.0.0/0' } |
    ForEach-Object {
        Remove-NetRoute -InterfaceAlias $alias -DestinationPrefix $_.DestinationPrefix -Confirm:$false -ErrorAction SilentlyContinue
    }

New-NetIPAddress -InterfaceAlias $alias -IPAddress $IpAddress -PrefixLength $prefix -AddressFamily IPv4 -ErrorAction Stop | Out-Null

$peer = if ($IpAddress -eq '192.168.50.1') { '192.168.50.2' } else { '192.168.50.1' }
$role = if ($IpAddress -eq '192.168.50.1') { 'maingear' } else { 'ideum' }
$peerBackend = 'http://192.168.50.1:5000'
$clusterJson = @{
    role             = $role
    ethernetIp       = $IpAddress
    peerEthernetIp   = $peer
    peerBackendUrl   = $peerBackend
} | ConvertTo-Json
$clusterPath = Join-Path $PSScriptRoot 'dcs-backend\cluster.local.json'
$clusterJson | Set-Content -LiteralPath $clusterPath -Encoding UTF8
Write-Host "Wrote cluster config: $clusterPath (role=$role)"
Write-Host "Done. After both machines are configured, test: ping $peer"
if ($IpAddress -eq '192.168.50.1') {
    Write-Host "Next: on Ideum, run set-ideum-ethernet-ip.bat as Administrator."
}
