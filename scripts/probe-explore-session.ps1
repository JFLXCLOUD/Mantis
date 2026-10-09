param(
  [Parameter(Mandatory=$true)][ValidatePattern('^Explore3-[A-Za-z0-9]+$')][string]$TargetName,
  [string]$BootstrapKeyFile,
  [switch]$RunSessionStatusProbe
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$OutputEncoding=[Text.UTF8Encoding]::new($false)
# Standalone experimental diagnostic, excluded from the desktop package.
# Only Bluetooth startup, AES session setup and one machine-status query.
# No job, tool, mat-load, abort, firmware-write, retries or arbitrary-byte input.
if (-not $RunSessionStatusProbe) {
  @{result='dry-run';bytesSubmitted=0;operations=@('Bluetooth startup','New command session','One status query');canSendJob=$false} | ConvertTo-Json
  exit 0
}
$report=[ordered]@{format='mantis-explore-session-probe-v1';startedUtc=[DateTime]::UtcNow.ToString('o');result='not-started';bytesSubmitted=0;bytesStored=0;sessionRoundTripVerified=$false;machineReady=$false;canSendJob=$false}
$device=$null; $services=$null; $socket=$null; $writer=$null
$stage='validate-local-input'
$helper=Join-Path $PSScriptRoot 'explore-status-probe.mjs'
function Invoke-Codec([string]$Action,$InputData) {
  $json=if ($null -eq $InputData) { '{}' } else { $InputData | ConvertTo-Json -Compress }
  $output=$json | & node $helper $Action $BootstrapKeyFile
  if ($LASTEXITCODE -ne 0) { throw 'Offline probe codec rejected the exchange.' }
  return ($output | ConvertFrom-Json)
}
function From-Hex([string]$Hex) {
  if ($Hex -notmatch '^(?:[0-9a-fA-F]{2})+$' -or $Hex.Length -gt 1028) { throw 'Invalid fixed probe frame.' }
  $bytes=New-Object byte[] ($Hex.Length/2)
  for ($i=0;$i -lt $bytes.Length;$i++) { $bytes[$i]=[Convert]::ToByte($Hex.Substring($i*2,2),16) }
  return ,$bytes
}
function Write-Fixed([string]$Hex) {
  $bytes=From-Hex $Hex
  $writer.WriteBytes($bytes)
  $report.bytesSubmitted+=$bytes.Length
  $stored=Await-Result ($writer.StoreAsync()) ([uint32])
  $report.bytesStored+=$stored
  if ($stored -ne $bytes.Length) { throw 'Incomplete write; no retry will be made.' }
}
function Exchange([string]$Hex,[int]$ExpectedPayload,[bool]$Flagged) {
  Write-Fixed $Hex
  $received=[Collections.Generic.List[byte]]::new()
  $deadline=[DateTime]::UtcNow.AddSeconds(6)
  $total=$ExpectedPayload+2
  while ($received.Count -lt $total) {
    $remaining=[int]($deadline-[DateTime]::UtcNow).TotalMilliseconds
    if ($remaining -le 0) { throw 'Response timed out; no retry will be made.' }
    $count=if ($received.Count -lt 2) { 2-$received.Count } else { $total-$received.Count }
    $buffer=[Windows.Storage.Streams.Buffer]::new($count)
    $operation=([Windows.Storage.Streams.IInputStream]).GetMethod('ReadAsync').Invoke($socket.InputStream,@($buffer,[uint32]$count,[Windows.Storage.Streams.InputStreamOptions]::Partial))
    $read=$asRead.MakeGenericMethod([Windows.Storage.Streams.IBuffer],[uint32]).Invoke($null,@($operation))
    if (-not $read.Wait($remaining)) { throw 'Response timed out; connection will close.' }
    $length=([Windows.Storage.Streams.IBuffer]).GetProperty('Length').GetValue($read.Result,$null)
    if ($length -eq 0) { throw 'Machine closed the connection.' }
    $reader=[Windows.Storage.Streams.DataReader]::FromBuffer($read.Result)
    try { $chunk=New-Object byte[] $length; $reader.ReadBytes($chunk); $received.AddRange([byte[]]$chunk) } finally { $reader.Dispose() }
    if ($received.Count -ge 2) {
      $header=([int]$received[0] -shl 8) -bor [int]$received[1]
      $expectedHeader=$ExpectedPayload
      if ($Flagged) { $expectedHeader=$expectedHeader -bor 0x8000 }
      if ($header -ne $expectedHeader) { throw 'Unexpected response header; probe stopped.' }
    }
  }
  return [BitConverter]::ToString($received.ToArray()).Replace('-','').ToLowerInvariant()
}
try {
  if (-not $BootstrapKeyFile.EndsWith('.private.json') -or -not (Test-Path -LiteralPath $BootstrapKeyFile -PathType Leaf)) { throw 'A local .private.json bootstrap key file is required.' }
  if ((Get-Item -LiteralPath $BootstrapKeyFile).Length -gt 4096) { throw 'Local research key file is too large.' }
  $keyConfig=Get-Content -LiteralPath $BootstrapKeyFile -Raw | ConvertFrom-Json
  if ($keyConfig.key -notmatch '^[0-9a-fA-F]{64}$') { throw 'Invalid local research key format.' }
  $keyConfig=$null
  $plan=Invoke-Codec 'plan' $null
  $stage='device'
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
  $writer=([Windows.Storage.Streams.DataWriter]).GetConstructor([Type[]]@([Windows.Storage.Streams.IOutputStream])).Invoke(@($socket.OutputStream))
  $stage='startup-padding'
  Write-Fixed $plan.padding
  $stage='bluetooth-alert'
  $alertReply=Exchange $plan.alert 62 $false
  if (-not $alertReply.StartsWith('003ee5')) { throw 'Unexpected Bluetooth startup reply.' }
  $stage='session-reset'
  # The observed reset reply is opaque; its size is not proof of acceptance.
  $null=Exchange $plan.reset 16 $false
  $stage='new-session'
  $sessionReply=Exchange $plan.session 48 $false
  $stage='encode-status'
  $statusRequest=Invoke-Codec 'request' @{sessionReplyHex=$sessionReply}
  $stage='encrypted-status'
  $statusReply=Exchange $statusRequest.requestHex 16 $true
  $stage='verify-status'
  $verified=Invoke-Codec 'verify' @{sessionReplyHex=$sessionReply;statusReplyHex=$statusReply}
  if (-not $verified.sessionRoundTripVerified) { throw 'Session/status verification failed.' }
  $report.sessionRoundTripVerified=$true
  $report.statusReplyBytes=$verified.statusReplyBytes
  $report.result='session-status-verified'
} catch {
  $report.result='error'
  $report.stage=$stage
  # Avoid exception strings that could include private paths or input contents.
  $report.error='The fixed diagnostic did not complete at the reported stage. No commands were retried.'
  $report.errorType=$_.Exception.GetType().Name
  $report.hresult=$_.Exception.HResult
} finally {
  if ($writer) { try { [void]$writer.DetachStream(); $writer.Dispose() } catch {} }
  if ($socket) { $socket.Dispose() }
  if ($services) { foreach ($service in $services.Services) { $service.Dispose() } }
  if ($device) { $device.Dispose() }
  $report.finishedUtc=[DateTime]::UtcNow.ToString('o')
}
$report | ConvertTo-Json -Depth 4
if ($report.result -ne 'session-status-verified') { exit 1 }
