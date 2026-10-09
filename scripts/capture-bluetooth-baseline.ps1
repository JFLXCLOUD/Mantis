param(
  [ValidateRange(10,120)][int]$Seconds = 45,
  [ValidatePattern('^[a-z0-9-]{1,40}$')][string]$Label = 'connection-baseline'
)
$ErrorActionPreference = 'Stop'
# Local research tool only; not included in the desktop application.
# Captures the Windows HCI trace, never opens a cutter socket or writes commands.
$research = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\release\protocol-research'))
$parser = Join-Path $research 'btp-extracted\BTETLParse.exe'
$logman = Join-Path $env:SystemRoot 'System32\logman.exe'
$admin = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $admin.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Windows requires an administrator session for Bluetooth ETW tracing. Run this script as administrator.'
}
foreach ($tool in @($parser)) {
  if ((Get-AuthenticodeSignature -LiteralPath $tool).Status -ne 'Valid') { throw 'A diagnostic tool signature is not valid.' }
}
$logging = Get-ItemProperty -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Services\BTHPORT\Parameters'
foreach ($flag in @('EtwLogSensitiveData','SimplePairingDebugEnabled','SmpDebugEnabled')) {
  if ($logging.$flag -eq 1) { throw 'Sensitive logging or pairing debug is already enabled. Baseline capture requires normal logging.' }
}
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$session = Join-Path $research ($stamp + '-' + $Label)
New-Item -ItemType Directory -Path $session | Out-Null
$capture = Join-Path $session 'bluetooth.pcapng'
$etl = Join-Path $session 'bluetooth.etl'
$traceName = 'MantisBluetooth-' + $stamp
$manifest = [ordered]@{
  format = 'mantis-bluetooth-observation-v1'
  status = 'starting'
  startedUtc = [DateTime]::UtcNow.ToString('o')
  durationLimitSeconds = $Seconds
  label = $Label
  provider = 'Microsoft-Windows-BTH-BTHPORT'
  keyword = '0x8000000000000000'
  traceSession = $traceName
  machineCommandsSentByThisTool = 0
  fullPacketLoggingRequested = $false
  pairingDebugRequested = $false
  captureScope = 'Local Windows Bluetooth HCI; may include other local Bluetooth connections. Minimize before sharing.'
}
function Save-Manifest { $manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $session 'session.json') -Encoding UTF8 }
Save-Manifest
$traceStarted = $false; $converter = $null
try {
  # This host advertises HCIRAW with this keyword. No network listener,
  # account traffic, registry changes, re-pairing or device writes are needed.
  & $logman start $traceName -ets -p '{8A1F9517-3A8C-4A9E-A018-4F17A200F277}' 0x8000000000000000 4 -o $etl -f bincirc -max 16 -nb 16 64 -bs 64 > (Join-Path $session 'trace-start.log')
  if ($LASTEXITCODE -ne 0) { throw 'Windows could not start the Bluetooth ETW session.' }
  $traceStarted = $true
  $manifest.status = 'recording'
  Save-Manifest
  $remaining = $Seconds
  while ($remaining -gt 0) { $wait = [Math]::Min(5, $remaining); Start-Sleep -Seconds $wait; $remaining -= $wait }
  & $logman stop $traceName -ets > (Join-Path $session 'trace-stop.log')
  if ($LASTEXITCODE -ne 0) { throw 'Windows could not stop the Bluetooth ETW session.' }
  $traceStarted = $false
  $manifest.status = 'converting'
  Save-Manifest
  $converter = Start-Process -FilePath $parser -ArgumentList @('-pcapng',('"' + $capture + '"'),('"' + $etl + '"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $session 'convert.log') -RedirectStandardError (Join-Path $session 'convert-error.log')
  # Retain the native handle before waiting so Windows PowerShell can read the exit code.
  [void]$converter.Handle
  if (-not $converter.WaitForExit(15000)) { throw 'Bluetooth trace conversion timed out.' }
  if ($converter.ExitCode -ne 0) { throw 'Bluetooth trace conversion failed. Inspect the local conversion logs.' }
  $manifest.status = 'complete'
  $manifest.captureBytes = (Get-Item -LiteralPath $capture).Length
  $manifest.sha256 = (Get-FileHash -LiteralPath $capture -Algorithm SHA256).Hash
} catch {
  $manifest.status = 'error'
  $manifest.error = $_.Exception.Message
  throw
} finally {
  if ($converter -and -not $converter.HasExited) { $converter.Kill(); [void]$converter.WaitForExit(5000) }
  if ($traceStarted) {
    & $logman stop $traceName -ets > (Join-Path $session 'trace-cleanup.log')
    $manifest.cleanupExitCode = $LASTEXITCODE
  }
  $manifest.finishedUtc = [DateTime]::UtcNow.ToString('o')
  Save-Manifest
}
