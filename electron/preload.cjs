const { contextBridge, ipcRenderer } = require("electron");
// Fixed discovery and transport methods only; no raw IPC or device writes.
contextBridge.exposeInMainWorld(
  "hopperMachine",
  Object.freeze({
    scanUsb: () => ipcRenderer.invoke("hopper:scan-usb"),
    scanBluetooth: () => ipcRenderer.invoke("hopper:scan-bluetooth"),
    bluetoothStatus: () => ipcRenderer.invoke("hopper:bluetooth-status"),
    connectBluetooth: (deviceId) =>
      ipcRenderer.invoke("hopper:connect-bluetooth", deviceId),
    disconnectBluetooth: () =>
      ipcRenderer.invoke("hopper:disconnect-bluetooth"),
    openBluetoothSettings: () =>
      ipcRenderer.invoke("hopper:open-bluetooth-settings"),
  }),
);
