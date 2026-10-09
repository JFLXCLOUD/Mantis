$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Devices.Bluetooth.BluetoothAdapter,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] | Out-Null
[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Await-WinRt($operation, [Type]$resultType) {
  $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
  if (-not $task.Wait(5000)) { throw 'Bluetooth radio query timed out.' }
  return ,$task.Result
}
$adapter = Await-WinRt ([Windows.Devices.Bluetooth.BluetoothAdapter]::GetDefaultAsync()) ([Windows.Devices.Bluetooth.BluetoothAdapter])
if ($null -eq $adapter) {
  @{ radio = 'absent'; devices = @(); warnings = @() } | ConvertTo-Json -Compress
  exit 0
}
$radio = Await-WinRt ($adapter.GetRadioAsync()) ([Windows.Devices.Radios.Radio])
$state = if ($null -eq $radio) { 'unknown' } else { $radio.State.ToString().ToLowerInvariant() }
if ($state -ne 'on') {
  @{ radio = $state; devices = @(); warnings = @() } | ConvertTo-Json -Compress
  exit 0
}
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class HopperBluetoothInquiry {
  [StructLayout(LayoutKind.Sequential)]
  public struct Search {
    public uint size;
    [MarshalAs(UnmanagedType.Bool)] public bool authenticated;
    [MarshalAs(UnmanagedType.Bool)] public bool remembered;
    [MarshalAs(UnmanagedType.Bool)] public bool unknown;
    [MarshalAs(UnmanagedType.Bool)] public bool connected;
    [MarshalAs(UnmanagedType.Bool)] public bool inquiry;
    public byte timeoutMultiplier;
    public IntPtr radio;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct SystemTime {
    public ushort year, month, dayOfWeek, day, hour, minute, second, milliseconds;
  }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct Device {
    public uint size;
    public ulong address;
    public uint deviceClass;
    [MarshalAs(UnmanagedType.Bool)] public bool connected;
    [MarshalAs(UnmanagedType.Bool)] public bool remembered;
    [MarshalAs(UnmanagedType.Bool)] public bool authenticated;
    public SystemTime lastSeen, lastUsed;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 248)] public string name;
  }
  [DllImport("BluetoothAPIs.dll", SetLastError = true)]
  static extern IntPtr BluetoothFindFirstDevice(ref Search search, ref Device device);
  [DllImport("BluetoothAPIs.dll", SetLastError = true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  static extern bool BluetoothFindNextDevice(IntPtr handle, ref Device device);
  [DllImport("BluetoothAPIs.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  static extern bool BluetoothFindDeviceClose(IntPtr handle);

  public static Device[] Discover() {
    var query = new Search { size = (uint)Marshal.SizeOf(typeof(Search)), authenticated = true, remembered = true,
      unknown = true, connected = true, inquiry = true, timeoutMultiplier = 4, radio = IntPtr.Zero };
    var device = new Device { size = (uint)Marshal.SizeOf(typeof(Device)) };
    IntPtr handle = BluetoothFindFirstDevice(ref query, ref device);
    if (handle == IntPtr.Zero) {
      int error = Marshal.GetLastWin32Error();
      if (error == 259) return new Device[0];
      throw new Win32Exception(error);
    }
    var devices = new List<Device>();
    try {
      do {
        devices.Add(device);
        device = new Device { size = (uint)Marshal.SizeOf(typeof(Device)) };
      } while (BluetoothFindNextDevice(handle, ref device));
      int error = Marshal.GetLastWin32Error();
      if (error != 259) throw new Win32Exception(error);
      return devices.ToArray();
    } finally { BluetoothFindDeviceClose(handle); }
  }
}
'@
$devices = @([HopperBluetoothInquiry]::Discover() | Where-Object { $_.name -match 'Cricut|\b(?:Maker|Explore(?:[ _-]*(?:Air|One))?|Joy(?:[ _-]*Xtra)?|Venture)(?=$|[ _-]|[0-9])' } | ForEach-Object {
  [PSCustomObject]@{
    id = $_.address.ToString('X12')
    name = $_.name
    paired = $_.authenticated
    remembered = $_.remembered
    connected = $_.connected
    protocol = 'classic'
  }
})
@{ radio = 'on'; devices = $devices; warnings = @() } | ConvertTo-Json -Depth 4 -Compress
