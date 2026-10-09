# Cricut integration: Maker, Explore, Joy and Venture

Research and local implementation: 8 October 2026. The user has now identified their physical machine as a **Cricut Explore 3**. Explore is the first physical validation target. Maker 3/4 were the initial targets; 0.4.1 expands planning profiles to Maker, Explore, Joy and Venture. See [current device coverage](MACHINE_SUPPORT.md) for the catalog, BLE limitations, primary sources and per-model verification requirements.

## Working in 0.6.0

Select Cricut Explore 3, choose Bluetooth, select the paired device, and click **Connect Bluetooth data link**. The app opens the device-advertised standard RFCOMM Serial Port service and keeps the socket open. The connection banner stays available when the target model/transport changes; closing the setup dialog does not disconnect. Cancel stops an in-progress connection; Disconnect closes the data link. App closure, renderer failure and connection-monitor failure also release it. No automatic reconnect or job replay is performed.

A connected data link has `machineReady: false`, `canSend: false` and zero command bytes sent. It is not a verified Cricut protocol handshake. No output-stream/write API is exposed. Incoming unsolicited bytes are counted/discarded, never parsed or logged.

Original discovery behavior, retained from 0.3.1:


- **Machine** in the header, or **Machine & job setup** in Prepare, opens the setup screen.
- Windows desktop USB discovery queries the operating system's currently present devices. It does not open COM ports, send protocol bytes, change drivers, pair Bluetooth, change machine configuration, flash firmware or move hardware.
- The USB / Bluetooth selector saves the preferred transport. Existing preferences migrate to USB without losing material, model, tool or passes; drafts include `target.transport`.
- Bluetooth Classic discovery checks the default Windows adapter's radio, performs an inquiry, and lists matching Cricut/Maker names with Windows pairing/link state. Remembered devices may be offline. Radio-off, missing-adapter and scan errors are distinct from a successful empty scan. Generic names are intentionally not identified as Cricut devices.
- **Open Windows Bluetooth settings** opens the fixed Windows settings page on demand. Pair there using the identifier on the machine label, then rescan in Mantis Studio. Mantis Studio does not pair, unpair, toggle the radio or establish a cutting session itself. Maker 4 may initially appear as a generic Bluetooth device in Windows; follow the public Cricut setup guidance.
- Save Bluetooth report includes radio, model hint, pairing/link state and scan time; it omits addresses, device names and opaque identifiers. A paired device remains `canSend: false`.
- Maker 4 is the default target. Target model, material name, tool choice and planned passes are saved as local preferences. Mirror is shared with Prepare for the current session and is included in exported drafts.
- Prepare → Choose material (or Machine & job setup → Browse materials) opens the local material library. Fifteen generic starters and custom profiles support search, category filters and favorites. A selection saves descriptive metadata only; it preserves tool, passes and mirror. Editing the free-text material name detaches its profile snapshot. Review the material for each artwork group; automatic per-group material assignment is not implemented.
- A detected USB interface is shown as **Detected by Windows**, never Connected or Ready. Device-name hints are only hints, not a firmware handshake. A differing hint and selected model produce a visible mismatch message.
- Save USB report exports VID/PID, model hint, COM port names, Windows status and scan time. Device instance IDs, container IDs, raw friendly names and serial numbers are omitted.
- Save job draft exports one artwork group as a readable `.hopperjob` JSON file with embedded SVG, millimeter canvas dimensions, operation, tool/material/pass notes, mirror and preflight issues. It is a **draft, not a compiled machine job**. Pressure, speed, firmware and adapter are explicitly null. Draft import/reopening is not implemented; `.hopper` remains the editable project format.
- SVG export remains usable with the user's existing cutting workflow.

**Direct configuration, firmware/status queries, job sending, pause/cancel and cutting are not implemented.** The Send cut job button is disabled and there is no privileged write/send API to bypass. This is a real discovery and preparation milestone, not a claim of functioning machine control.

## Public research and provenance

The Explore 3 transport uses documented [Microsoft RFCOMM services](https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.rfcomm.rfcommdeviceservice) and [StreamSocket connection APIs](https://learn.microsoft.com/en-us/uwp/api/windows.networking.sockets.streamsocket.connectasync). The standard [Serial Port service ID](https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.rfcomm.rfcommserviceid.serialport) was verified through live uncached SDP discovery on the user's paired machine. No proprietary command framing was copied or guessed, and no firmware alteration was performed. [Cricut's public Bluetooth/USB guidance](https://help.cricut.com/hc/en-us/articles/6581830148759-Bluetooth-and-USB-Connection-Help) was consulted to distinguish pairing from app connection.

| Source | Finding used |
| --- | --- |
| [Cricut Bluetooth and USB connection help](https://help.cricut.com/hc/en-us/articles/6581830148759-Bluetooth-and-USB-Connection-Help) | Public transport/setup instructions. These describe Design Space usage, not a third-party cutting protocol. |
| [CutCutGo project README](https://github.com/virtualabs/cutcutgo) | Replacement firmware targets the original Maker Champagne. Maker 3 requires separate hardware/firmware work; this is not a stock-firmware Maker 3/4 adapter. No project code is copied or included. |
| [Stock Maker investigation, Inkcut issue 426](https://github.com/inkcut/inkcut/issues/426) | First-person investigation explicitly describes stock original-Maker support as unresolved. It does not supply a Maker 3/4 protocol. |
| [First-hand USB enumeration report](https://bradleygannon.com/blog/2026/cricut-maker-not-quite-on-linux/) | Documents an observed `VID_20D3` Cricut USB interface. Mantis Studio uses the VID only as a candidate filter, not as a model or support mapping. |
| [Microsoft Get-PnpDevice](https://learn.microsoft.com/en-us/powershell/module/pnpdevice/get-pnpdevice) | Read-only Windows enumeration with `-PresentOnly`. |
| [Microsoft Bluetooth search parameters](https://learn.microsoft.com/en-us/windows/win32/api/bluetoothapis/ns-bluetoothapis-bluetooth_device_search_params) | Classic inquiry and remembered/authenticated/connected device filters; bounded inquiry duration. |
| [Microsoft Bluetooth device information](https://learn.microsoft.com/en-us/windows/win32/api/bluetoothapis/ns-bluetoothapis-bluetooth_device_info_struct) | Authenticated (paired), remembered and connected flags have separate meanings. |
| [Microsoft Windows settings URIs](https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-settings) | Fixed `ms-settings:bluetooth` shortcut. |
| [Electron IPC documentation](https://www.electronjs.org/docs/latest/tutorial/ipc) | Narrow contextBridge methods and main-process IPC handling. |

Maker 5 was outside the original Maker 3/4 milestone. The broader 0.4.1 catalog now includes its planning profile and USB discovery route; BLE and machine commands remain unimplemented.

No usable public stock-firmware Maker 3/4 cut protocol or verified adapter was identified in the initial research. This is a bounded research result, not proof that none exists. That initial public-source investigation did not access Cricut implementation files, proprietary source, extracted assets, accounts, private endpoints, packet captures or firmware images, and wrote no devices. The subsequent user-operated Explore 3 capture and isolated startup-request probe are documented separately below.

## Implementation boundary

`electron/devices/discover-usb.ps1` contains a fixed OS metadata query. The main process reads this bundled script through Electron ASAR support and passes it as a UTF-16LE encoded command to the system PowerShell executable using `execFile`, with no shell and no renderer interpolation. The subprocess window is hidden, time is limited to 15 seconds, output to 512 KiB, concurrent requests are combined, and results are briefly cached. No global PowerShell execution-policy setting is changed.

Candidate filters match USB VID 20D3, or Cricut/Provo Craft in the OS name/manufacturer. Unknown future IDs with generic descriptors may not be found. Generic vendor matches do not identify the model. Interfaces are grouped by valid container ID plus VID/PID; unknown grouping metadata leaves interfaces separate. Raw instance/container identifiers are replaced by opaque hashes before reaching the UI. These hashes are not authentication or proof of device identity. Scan errors are distinct from an empty successful scan.

Bluetooth uses the same fixed-script/ASAR mechanism with a 25-second subprocess limit. `discover-bluetooth.ps1` queries the default radio through Windows Runtime, then calls the documented Bluetooth Classic inquiry APIs through an independently written C# P/Invoke wrapper. The inquiry multiplier is 4 (5.12 seconds). It does not enumerate BLE/GATT services or open RFCOMM streams. The default-adapter radio check means unusual multi-adapter configurations may require Windows configuration. Addresses are hashed before reaching the renderer. Name matching is a candidate filter, not authenticated model identification. No native dependency or proprietary library is bundled.

The preload exposes `hopperMachine.scanUsb()`, `scanBluetooth()`, `openBluetoothSettings()`, `bluetoothStatus()`, `connectBluetooth(deviceId)` and `disconnectBluetooth()`. The settings action accepts no URL and opens only `ms-settings:bluetooth`. Main-process handling checks the sending WebContents, main frame and exact expected local app URL for every method. Renderer Node access remains disabled, sandboxing and context isolation remain enabled, navigation/popups and device permission requests remain denied. There is no renderer-controlled executable, script, port path or arbitrary IPC channel.

`src/machine.ts` validates settings and writes the draft format. `src/MachineSetup.tsx` presents preferences and preflight; `src/DeviceDiscovery.tsx` presents discovery and pairing guidance. Switching transports remounts the discovery view so late results cannot replace the active transport. The browser build presents a desktop-only discovery explanation; production has no simulated devices. Test fixtures are confined to tests.

## Draft limitations

Preflight checks object boxes against the artwork canvas, text outlining requirements, unvalidated imported paths, missing material and tool/operation mismatch. These checks do not establish actual machine clearances or toolpath safety. Native curve extrema, knife compensation, operation scheduling, hardware limits and geometry compilation still require work. Planned passes are user notes (1–20), not a claim of model-supported pass limits. Tool labels do not configure clamps. Material names do not select pressure presets. A job draft always has `machineReady: false` and `preflight.sendAllowed: false`.

Preferences are local defaults, not per-material calibrated profiles, and are not embedded in `.hopper` project files. A selected library profile is copied into preferences and the optional `setup.materialProfile` field of `.hopperjob` drafts. Later library edits or deletion do not rewrite that snapshot; explicitly select the updated profile to apply it. Favorites and custom profiles are local to this app profile, not synchronized or embedded in `.hopper` files. Drafts do not contain a device serial or queue a future automatic cut. Connecting a machine later does not dispatch an earlier draft.

## Next hardware milestone

The follow-up [Explore 3 command investigation](research/EXPLORE3_PROTOCOL.md) records Bluetooth captures and the first successful independent startup-request probe: 6 bytes sent, matching 10-byte response received, with no observed motion. Its meaning is not yet decoded and it is not exposed in the shipping UI. Session/job commands remain unresolved. A small original pen fixture is ready; no Mantis motion command has been verified or sent.

1. Explore 3 Bluetooth transport is now physically verified. USB remains a separate discovery/transport test; no USB cable was detected in this session.
2. Establish a independently documented, redistributable stock-firmware protocol for identity/status, job framing, acknowledgements, flow control and stop behavior. Detection alone cannot supply it. Keep protocol provenance separate from UI requirements.
3. Implement an adapter with explicit capability checks and timeouts. Unknown model/firmware combinations must not inherit support.
4. Validate read-only identity/status on the confirmed Explore model. Document firmware and transport versions.
5. Validate explicit user-started bounded pen work, acknowledgements, pause/cancel, disconnect recovery and no automatic job replay before testing blades and cutting pressure.
6. Repeat the relevant matrix on Maker 3 before claiming support there.

No replacement firmware or speculative commands are part of this plan. The actual direct-cut milestone remains incomplete until protocol and physical validation are available.
