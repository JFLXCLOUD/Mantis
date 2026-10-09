# Fixed RFCOMM transport helper. No output-stream writes or machine commands.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$device = $null; $socket = $null; $services = $null; $stage = 'device'; $received = 0
function Emit($status, $message, $code = $null) {
  @{ status = $status; message = $message; errorCode = $code; bytesSent = 0; bytesReceived = $received } | ConvertTo-Json -Compress | ForEach-Object { [Console]::WriteLine($_) }
}
try {
  $request = [Console]::ReadLine() | ConvertFrom-Json
  if ($request.deviceId -notmatch '^[a-f0-9]{24}$') { throw 'Invalid device ID.' }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $matchesDevice = @(Get-PnpDevice -Class Bluetooth | Where-Object { $_.FriendlyName -match '\bExplore[ _-]*3(?=$|[ _-])' -and $_.InstanceId -match '^BTHENUM\\DEV_([0-9A-F]{12})\\' } | ForEach-Object {
      [void]($_.InstanceId -match '^BTHENUM\\DEV_([0-9A-F]{12})\\')
      $addressText = $Matches[1].ToUpperInvariant()
      $hash = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($addressText))).Replace('-', '').ToLowerInvariant().Substring(0,24)
      if ($hash -eq $request.deviceId) { [Convert]::ToUInt64($addressText, 16) }
    })
  } finally { $sha.Dispose() }
  if ($matchesDevice.Count -ne 1) { throw 'Paired Explore 3 was not found.' }
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  [Windows.Devices.Bluetooth.BluetoothDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
  [Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceServicesResult,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
  [Windows.Devices.Bluetooth.Rfcomm.RfcommServiceId,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
  [Windows.Networking.Sockets.StreamSocket,Windows.Networking.Sockets,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.Buffer,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.IBuffer,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.IInputStream,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  } | Select-Object -First 1
  $asActionTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
  $asReadTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 2 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperationWithProgress`2' } | Select-Object -First 1
  function Await-Result($operation, [Type]$resultType) {
    $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
    if (-not $task.Wait(12000)) { throw 'Bluetooth operation timed out.' }
    return ,$task.Result
  }
  $device = Await-Result ([Windows.Devices.Bluetooth.BluetoothDevice]::FromBluetoothAddressAsync($matchesDevice[0])) ([Windows.Devices.Bluetooth.BluetoothDevice])
  if ($null -eq $device -or -not $device.DeviceInformation.Pairing.IsPaired) { throw 'Device is not paired.' }
  $stage = 'services'
  $services = Await-Result ($device.GetRfcommServicesAsync([Windows.Devices.Bluetooth.BluetoothCacheMode]::Uncached)) ([Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceServicesResult])
  if ($services.Error.ToString() -ne 'Success') { throw 'Service discovery failed.' }
  $spp = @($services.Services | Where-Object { $_.ServiceId.Uuid -eq [Windows.Devices.Bluetooth.Rfcomm.RfcommServiceId]::SerialPort.Uuid })
  if ($spp.Count -ne 1) { throw 'Expected one Serial Port service.' }
  $stage = 'connect'
  $socket = [Windows.Networking.Sockets.StreamSocket]::new()
  $task = $asActionTask.Invoke($null, @($socket.ConnectAsync($spp[0].ConnectionHostName, $spp[0].ConnectionServiceName, $spp[0].ProtectionLevel)))
  if (-not $task.Wait(12000)) { throw 'Transport connection timed out.' }
  $stage = 'monitor'
  # Console.In is a synchronized reader on Windows PowerShell; its ReadLineAsync
  # can block the calling thread. Read on a separate .NET worker instead.
  Add-Type -TypeDefinition @'
using System;
using System.Threading.Tasks;
public static class MantisConnectionInput {
  public static Task<string> ReadCommand() { return Task.Run(() => Console.ReadLine()); }
}
'@
  Emit 'connected' 'Bluetooth data link connected. Machine protocol and cutting are not available yet.'
  $lineTask = [MantisConnectionInput]::ReadCommand()
  $readTask = $null
  while ($true) {
    if ($lineTask.Wait(750)) {
      # The only command after startup is disconnect (EOF also closes the socket).
      break
    }
    if ($device.ConnectionStatus.ToString() -ne 'Connected') { throw 'Bluetooth link lost.' }
    if ($null -eq $readTask) {
      $buffer = [Windows.Storage.Streams.Buffer]::new(1024)
      $operation = ([Windows.Storage.Streams.IInputStream]).GetMethod('ReadAsync').Invoke($socket.InputStream, @($buffer, [uint32]1024, [Windows.Storage.Streams.InputStreamOptions]::Partial))
      $readTask = $asReadTask.MakeGenericMethod([Windows.Storage.Streams.IBuffer], [uint32]).Invoke($null, @($operation))
    }
    if ($readTask.IsCompleted) {
      if ($readTask.IsFaulted -or $readTask.IsCanceled) { throw 'Bluetooth socket closed.' }
      $length = ([Windows.Storage.Streams.IBuffer]).GetProperty('Length').GetValue($readTask.Result, $null)
      if ($length -eq 0) { throw 'Bluetooth socket closed.' }
      $received += $length
      $readTask = $null
      # Unsolicited bytes are counted and discarded, never parsed or logged.
    }
    Emit 'connected' 'Bluetooth data link connected. Machine protocol and cutting are not available yet.'
  }
  Emit 'disconnected' 'Bluetooth data link disconnected.'
} catch {
  if ($env:MANTIS_BLUETOOTH_DIAGNOSTIC -eq '1') {
    [Console]::Error.WriteLine(($_.Exception.ToString() -replace '[A-Fa-f0-9]{2}(:[A-Fa-f0-9]{2}){5}', '[address]'))
  }
  $messages = @{
    device = 'The paired Explore 3 is unavailable. Pair it in Windows, then scan again.'
    services = 'The Explore 3 did not provide its serial service. Check power and close any other app using the cutter.'
    connect = 'Bluetooth could not open the data link. Check power and close Design Space or another app using the cutter, then retry.'
    monitor = 'The Bluetooth data link was lost. Check the machine and reconnect when ready.'
  }
  Emit 'error' $messages[$stage] ('0x{0:X8}' -f $_.Exception.HResult)
} finally {
  if ($null -ne $socket) { $socket.Dispose() }
  if ($null -ne $services) { foreach ($service in $services.Services) { $service.Dispose() } }
  if ($null -ne $device) { $device.Dispose() }
}
