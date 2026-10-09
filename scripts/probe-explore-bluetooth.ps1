param([Parameter(Mandatory=$true)][string]$TargetName, [switch]$Connect)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Devices.Bluetooth.BluetoothDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceService,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.Rfcomm.RfcommServiceId,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceServicesResult,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
[Windows.Networking.Sockets.StreamSocket,Windows.Networking.Sockets,ContentType=WindowsRuntime] | Out-Null
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Await-Result($operation, [Type]$resultType) {
  $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
  if (-not $task.Wait(12000)) { throw 'Bluetooth query timed out.' }
  return ,$task.Result
}
$device = $null; $socket = $null; $services = $null
try {
  $entry = @(Get-PnpDevice -Class Bluetooth | Where-Object { $_.FriendlyName -eq $TargetName -and $_.InstanceId -match '^BTHENUM\\DEV_([0-9A-F]{12})\\' })
  if ($entry.Count -ne 1) { throw 'Expected exactly one paired Bluetooth device with that name.' }
  [void]($entry[0].InstanceId -match '^BTHENUM\\DEV_([0-9A-F]{12})\\')
  $address = [Convert]::ToUInt64($Matches[1], 16)
  $device = Await-Result ([Windows.Devices.Bluetooth.BluetoothDevice]::FromBluetoothAddressAsync($address)) ([Windows.Devices.Bluetooth.BluetoothDevice])
  if ($null -eq $device) { throw 'Windows could not open the paired Bluetooth device.' }
  $services = Await-Result ($device.GetRfcommServicesAsync([Windows.Devices.Bluetooth.BluetoothCacheMode]::Uncached)) ([Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceServicesResult])
  $report = [ordered]@{ name = $device.Name; paired = $device.DeviceInformation.Pairing.IsPaired; windowsConnection = $device.ConnectionStatus.ToString(); serviceError = $services.Error.ToString(); services = @($services.Services | ForEach-Object { @{ uuid = $_.ServiceId.Uuid.ToString(); protection = $_.ProtectionLevel.ToString() } }); transportOpened = $false; bytesSent = 0 }
  if ($Connect) {
    $spp = @($services.Services | Where-Object { $_.ServiceId.Uuid -eq [Windows.Devices.Bluetooth.Rfcomm.RfcommServiceId]::SerialPort.Uuid })
    if ($spp.Count -ne 1) { throw 'Expected exactly one advertised Serial Port service.' }
    $socket = [Windows.Networking.Sockets.StreamSocket]::new()
    $action = $socket.ConnectAsync($spp[0].ConnectionHostName, $spp[0].ConnectionServiceName, $spp[0].ProtectionLevel)
    $asActionTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
    $task = $asActionTask.Invoke($null, @($action))
    if (-not $task.Wait(12000)) { throw 'Bluetooth transport connection timed out.' }
    $report.transportOpened = $true
    $report.windowsConnection = $device.ConnectionStatus.ToString()
  }
  $report | ConvertTo-Json -Depth 5
} finally {
  if ($null -ne $socket) { $socket.Dispose() }
  if ($null -ne $services) { foreach ($service in $services.Services) { $service.Dispose() } }
  if ($null -ne $device) { $device.Dispose() }
}
