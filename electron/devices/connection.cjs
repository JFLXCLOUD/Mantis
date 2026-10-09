const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const encoded = Buffer.from(
  readFileSync(join(__dirname, "connect-bluetooth.ps1"), "utf8"),
  "utf16le",
).toString("base64");
const idle = () => ({
  status: "disconnected",
  deviceId: null,
  name: null,
  modelHint: null,
  transport: "bluetooth",
  protocol: "rfcomm",
  machineReady: false,
  canSend: false,
  bytesSent: 0,
  bytesReceived: 0,
  message: "No Bluetooth data link is open.",
});
function createBluetoothConnection({
  scanBluetooth,
  launch = spawn,
  platform = process.platform,
  systemRoot = process.env.SystemRoot || "C:\\Windows",
  startupMs = 60000,
  heartbeatMs = 6000,
} = {}) {
  let state = idle(),
    child = null,
    generation = 0,
    startup,
    heartbeat;
  const clearTimers = () => {
    clearTimeout(startup);
    clearTimeout(heartbeat);
  };
  function stopChild() {
    const process = child;
    child = null;
    if (!process) return;
    try {
      process.stdin.write("disconnect\n");
      process.stdin.end();
    } catch {}
    const timer = setTimeout(() => {
      try {
        process.kill();
      } catch {}
    }, 1500);
    timer.unref?.();
    process.once("exit", () => clearTimeout(timer));
  }
  function fail(message, errorCode = null) {
    generation++;
    clearTimers();
    stopChild();
    state = {
      ...state,
      status: "error",
      message,
      errorCode,
      canSend: false,
      machineReady: false,
    };
  }
  async function start(deviceId, token) {
    try {
      const scan = await scanBluetooth();
      if (token !== generation) return;
      const device = scan.devices.find((d) => d.id === deviceId);
      if (
        scan.status !== "ok" ||
        !device?.paired ||
        device.modelHint !== "explore-3"
      ) {
        fail(
          "Select a paired Cricut Explore 3 from a successful Bluetooth scan.",
        );
        return;
      }
      state = { ...state, name: device.name, modelHint: device.modelHint };
      child = launch(
        join(
          systemRoot,
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        ),
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-EncodedCommand",
          encoded,
        ],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
      const current = child;
      let buffer = "";
      current.stdout.setEncoding("utf8");
      current.stdout.on("data", (chunk) => {
        if (token !== generation) return;
        buffer += chunk;
        if (buffer.length > 32768) {
          fail("Bluetooth service returned an invalid response.");
          return;
        }
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0 && token === generation) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          let message;
          try {
            message = JSON.parse(line);
          } catch {
            fail("Bluetooth service returned an invalid response.");
            return;
          }
          if (message.status === "error") {
            fail(
              typeof message.message === "string"
                ? message.message.slice(0, 240)
                : "Bluetooth connection failed.",
              /^0x[0-9a-f]{8}$/i.test(message.errorCode)
                ? message.errorCode
                : null,
            );
            return;
          }
          if (
            message.status !== "connected" ||
            message.bytesSent !== 0 ||
            !Number.isSafeInteger(message.bytesReceived) ||
            message.bytesReceived < 0
          ) {
            fail("Bluetooth data link closed unexpectedly.");
            return;
          }
          clearTimers();
          state = {
            ...state,
            status: "connected",
            connectedAt: state.connectedAt || new Date().toISOString(),
            bytesReceived: message.bytesReceived,
            serviceUuid: "00001101-0000-1000-8000-00805f9b34fb",
            message:
              "Bluetooth data link connected. Machine protocol and cutting are not available yet.",
          };
          heartbeat = setTimeout(() => {
            if (token === generation)
              fail(
                "Bluetooth connection monitoring stopped. Reconnect when ready.",
              );
          }, heartbeatMs);
          heartbeat.unref?.();
        }
      });
      current.stderr.on("data", () => {}); // Never forward OS paths or device addresses.
      current.stdin.on("error", () => {
        if (token === generation) fail("Bluetooth service input closed.");
      });
      current.on("error", () => {
        if (token === generation)
          fail("Could not start the Windows Bluetooth connection service.");
      });
      current.on("exit", () => {
        if (token === generation)
          fail("Bluetooth connection service closed. Reconnect when ready.");
      });
      current.stdin.write(JSON.stringify({ deviceId }) + "\n");
    } catch {
      if (token === generation)
        fail(
          "Windows could not establish the Bluetooth data link. Check the machine and retry.",
        );
    }
  }
  return {
    status: () => ({ ...state }),
    connect(deviceId) {
      if (platform !== "win32")
        throw Error("Bluetooth connections require Windows.");
      if (typeof deviceId !== "string" || !/^[a-f0-9]{24}$/.test(deviceId))
        throw Error("Invalid device selection.");
      if (state.status === "connected" || state.status === "connecting")
        throw Error("Disconnect or cancel the current connection first.");
      const token = ++generation;
      state = {
        ...idle(),
        status: "connecting",
        deviceId,
        message: "Opening the paired Explore 3 Bluetooth data link…",
      };
      startup = setTimeout(() => {
        if (token === generation)
          fail(
            "Bluetooth connection timed out. Check power and pairing, then retry.",
          );
      }, startupMs);
      startup.unref?.();
      void start(deviceId, token);
      return { ...state };
    },
    disconnect() {
      generation++;
      clearTimers();
      stopChild();
      state = idle();
      return { ...state, message: "Bluetooth data link disconnected." };
    },
  };
}
module.exports = { createBluetoothConnection };
