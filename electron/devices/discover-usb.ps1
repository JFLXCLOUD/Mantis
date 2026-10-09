$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$metadata = @{}
$warnings = [System.Collections.Generic.List[string]]::new()
try {
  Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPDeviceID -like 'USB\*' } | ForEach-Object {
    $metadata[$_.PNPDeviceID] = $_.Manufacturer
  }
} catch { $warnings.Add('Manufacturer information was unavailable; identification may be incomplete.') }
$ports = @{}
try {
  Get-CimInstance Win32_SerialPort | ForEach-Object { $ports[$_.PNPDeviceID] = $_.DeviceID }
} catch { $warnings.Add('Serial port information was unavailable.') }
$devices = @(Get-PnpDevice -PresentOnly | Where-Object {
  $_.InstanceId -like 'USB\*' -and (
    $_.InstanceId -match 'VID_20D3&' -or
    $_.FriendlyName -match 'Cricut|Provo.?Craft' -or
    $metadata[$_.InstanceId] -match 'Cricut|Provo.?Craft'
  )
} | ForEach-Object {
  $container = $null
  try {
    $container = (Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName 'DEVPKEY_Device_ContainerId' -ErrorAction Stop).Data.ToString()
  } catch { <# Keep the individual interface if grouping metadata is unavailable. #> }
  [PSCustomObject]@{
    instanceId = $_.InstanceId
    name = $_.FriendlyName
    manufacturer = $metadata[$_.InstanceId]
    status = $_.Status.ToString()
    containerId = $container
    port = $ports[$_.InstanceId]
  }
})
[PSCustomObject]@{ devices = $devices; warnings = @($warnings.ToArray()) } | ConvertTo-Json -Depth 4 -Compress
