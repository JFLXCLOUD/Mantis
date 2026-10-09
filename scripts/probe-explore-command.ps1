param(
  [Parameter(Mandatory=$true)][ValidatePattern('^Explore3-[A-Za-z0-9]+$')][string]$TargetName,
  [switch]$RunCapturedStartupQuery
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
# Independent research probe, excluded from the desktop package.
# Exactly one observed connect-stage request; no reset, authentication, retries,
# job bytes, motion opcodes, arbitrary payload input or firmware commands.
if (-not $RunCapturedStartupQuery) {
  @{ result='dry-run'; requestHex='000412000000'; bytesSubmitted=0; semantics='Unverified Explore 3 startup request; not a cut or motion test.' } | ConvertTo-Json
  exit 0
}
$report = [ordered]@{
  format='mantis-explore-startup-probe-v1'
  startedUtc=[DateTime]::UtcNow.ToString('o')
  result='not-started'
  semantics='Unverified Explore 3 startup request'
  requestHex='000412000000'
  bytesSubmitted=0
  bytesStored=$null
  responseHex=$null
  machineReady=$false
  canSendJob=$false
}
$device=$null; $services=$null; $socket=$null; $writer=$null
$stage='device'
try {
  $entry = @(Get-PnpDevice -Class Bluetooth | Where-Object { $_.FriendlyName -eq $TargetName -and $_.InstanceId -match '^BTHENUM\\DEV_([0-9A-F]{12})\\' })
  if ($entry.Count -ne 1) { throw 'Expected one paired device with the exact target name.' }
  [void]($entry[0].InstanceId -match '^BTHENUM\\DEV_([0-9A-F]{12})\\')
  $address=[Convert]::ToUInt64($Matches[1],16)
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  [Windows.Devices.Bluetooth.BluetoothDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
  [Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceServicesResult,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
  [Windows.Devices.Bluetooth.Rfcomm.RfcommServiceId,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
  [Windows.Networking.Sockets.StreamSocket,Windows.Networking.Sockets,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.Buffer,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.IBuffer,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.IInputStream,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.IOutputStream,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.DataWriter,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
  $asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
  $asAction=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
  $asRead=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 2 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperationWithProgress`2' } | Select-Object -First 1
  function Await-Result($operation,[Type]$type) {
    $task=$asTask.MakeGenericMethod($type).Invoke($null,@($operation))
    if (-not $task.Wait(12000)) { throw 'Windows operation timed out.' }
    return ,$task.Result
  }
  $device=Await-Result ([Windows.Devices.Bluetooth.BluetoothDevice]::FromBluetoothAddressAsync($address)) ([Windows.Devices.Bluetooth.BluetoothDevice])
  if (-not $device -or -not $device.DeviceInformation.Pairing.IsPaired) { throw 'Device is not paired.' }
  $stage='services'
  $services=Await-Result ($device.GetRfcommServicesAsync([Windows.Devices.Bluetooth.BluetoothCacheMode]::Uncached)) ([Windows.Devices.Bluetooth.Rfcomm.RfcommDeviceServicesResult])
  if ($services.Error.ToString() -ne 'Success') { throw 'Service discovery failed.' }
  $serial=@($services.Services | Where-Object { $_.ServiceId.Uuid -eq [Windows.Devices.Bluetooth.Rfcomm.RfcommServiceId]::SerialPort.Uuid })
  if ($serial.Count -ne 1) { throw 'Expected one advertised serial service.' }
  $stage='connect'
  $socket=[Windows.Networking.Sockets.StreamSocket]::new()
  $connect=$asAction.Invoke($null,@($socket.ConnectAsync($serial[0].ConnectionHostName,$serial[0].ConnectionServiceName,$serial[0].ProtectionLevel)))
  if (-not $connect.Wait(12000)) { throw 'Connection timed out.' }
  $stage='write-once'
  # StreamSocket exposes a COM proxy rather than a strongly typed output stream
  # in Windows PowerShell. Invoke the interface constructor explicitly.
  $writer=([Windows.Storage.Streams.DataWriter]).GetConstructor([Type[]]@([Windows.Storage.Streams.IOutputStream])).Invoke(@($socket.OutputStream))
  $writer.WriteBytes([byte[]]@(0x00,0x04,0x12,0x00,0x00,0x00))
  $report.bytesSubmitted=6
  $report.bytesStored=Await-Result ($writer.StoreAsync()) ([uint32])
  if ($report.bytesStored -ne 6) { throw 'Incomplete write; request will not be retried.' }
  $stage='receive'
  $received=[Collections.Generic.List[byte]]::new()
  $deadline=[DateTime]::UtcNow.AddSeconds(5)
  while ([DateTime]::UtcNow -lt $deadline) {
    $buffer=[Windows.Storage.Streams.Buffer]::new(64)
    $operation=([Windows.Storage.Streams.IInputStream]).GetMethod('ReadAsync').Invoke($socket.InputStream,@($buffer,[uint32]64,[Windows.Storage.Streams.InputStreamOptions]::Partial))
    $read=$asRead.MakeGenericMethod([Windows.Storage.Streams.IBuffer],[uint32]).Invoke($null,@($operation))
    $remaining=[Math]::Max(1,[int]($deadline-[DateTime]::UtcNow).TotalMilliseconds)
    if (-not $read.Wait($remaining)) { break }
    $length=([Windows.Storage.Streams.IBuffer]).GetProperty('Length').GetValue($read.Result,$null)
    if ($length -eq 0) { throw 'Socket closed before a full response.' }
    $reader=[Windows.Storage.Streams.DataReader]::FromBuffer($read.Result)
    try { $chunk=New-Object byte[] $length; $reader.ReadBytes($chunk); $received.AddRange([byte[]]$chunk) } finally { $reader.Dispose() }
    if ($received.Count -gt 64) { throw 'Response exceeded the diagnostic limit.' }
    if ($received.Count -ge 2) {
      $payloadLength=([int]$received[0] -shl 8) -bor [int]$received[1]
      if ($payloadLength -ne 8) { $report.result='unexpected-response-header'; break }
      if ($received.Count -ge 10) {
        $report.result=if ($received.Count -eq 10) { 'response-observed' } else { 'unexpected-trailing-data' }
        break
      }
    }
  }
  $report.responseHex=[BitConverter]::ToString($received.ToArray()).Replace('-','').ToLowerInvariant()
  if ($report.result -eq 'not-started') { $report.result='response-timeout' }
} catch {
  $report.result='error'
  $report.stage=$stage
  $report.error=$_.Exception.Message -replace '[A-Fa-f0-9]{2}(:[A-Fa-f0-9]{2}){5}', '[address]'
} finally {
  if ($writer) { try { [void]$writer.DetachStream(); $writer.Dispose() } catch {} }
  if ($socket) { $socket.Dispose() }
  if ($services) { foreach ($service in $services.Services) { $service.Dispose() } }
  if ($device) { $device.Dispose() }
  $report.finishedUtc=[DateTime]::UtcNow.ToString('o')
}
$report | ConvertTo-Json -Depth 4
if ($report.result -ne 'response-observed') { exit 1 }
