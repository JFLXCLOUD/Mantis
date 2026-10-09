const { createScanner } = require("./discovery.cjs");
const { createBluetoothScanner } = require("./bluetooth.cjs");
const { createBluetoothConnection } = require("./connection.cjs");
function trustedSender(event, window, expectedUrl) {
  return (
    !window.isDestroyed() &&
    event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame?.url === expectedUrl
  );
}
function registerMachineIpc(
  ipcMain,
  window,
  expectedUrl,
  {
    scanUsb = createScanner(),
    scanBluetooth = createBluetoothScanner(),
    bluetoothConnection = createBluetoothConnection({ scanBluetooth }),
    openExternal = (url) => require("electron").shell.openExternal(url),
    platform = process.platform,
  } = {},
) {
  const handlers = {
    "hopper:scan-usb": scanUsb,
    "hopper:scan-bluetooth": scanBluetooth,
    "hopper:bluetooth-status": () => bluetoothConnection.status(),
    "hopper:connect-bluetooth": (deviceId) =>
      bluetoothConnection.connect(deviceId),
    "hopper:disconnect-bluetooth": () => bluetoothConnection.disconnect(),
    "hopper:open-bluetooth-settings": async () => {
      if (platform !== "win32")
        return {
          opened: false,
          message: "Open Bluetooth settings on your Windows PC.",
        };
      try {
        await openExternal("ms-settings:bluetooth");
        return {
          opened: true,
          message:
            "Pair your cutter in Windows, then return here and scan again.",
        };
      } catch {
        return {
          opened: false,
          message:
            "Could not open settings. Open Windows Settings > Bluetooth & devices manually.",
        };
      }
    },
  };
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (event, argument) => {
      if (!trustedSender(event, window, expectedUrl))
        throw Error("Untrusted machine request.");
      return handler(argument);
    });
  }
  window.on("closed", () => {
    bluetoothConnection.disconnect();
    for (const channel of Object.keys(handlers)) ipcMain.removeHandler(channel);
  });
  window.webContents.on?.("render-process-gone", () =>
    bluetoothConnection.disconnect(),
  );
  window.webContents.on?.("will-navigate", () =>
    bluetoothConnection.disconnect(),
  );
}
module.exports = { trustedSender, registerMachineIpc };
