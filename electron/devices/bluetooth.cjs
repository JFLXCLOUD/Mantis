const { execFile } = require("node:child_process");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { modelHint } = require('./models.cjs');
const encoded = Buffer.from(
  readFileSync(join(__dirname, "discover-bluetooth.ps1"), "utf8"),
  "utf16le",
).toString("base64");

function normalizeBluetooth(records) {
  if (!Array.isArray(records)) throw Error("Invalid devices");
  const devices = new Map();
  for (const r of records.slice(0, 256)) {
    if (
      !r ||
      typeof r !== "object" ||
      typeof r.id !== "string" ||
      !/^[a-f0-9]{12}$/i.test(r.id)
    )
      continue;
    const name =
      typeof r.name === "string"
        ? r.name.replace(/[\u0000-\u001f]/g, "").slice(0, 160)
        : "";
    if (!/Cricut|\b(?:Maker|Explore(?:[ _-]*(?:Air|One))?|Joy(?:[ _-]*Xtra)?|Venture)(?=$|[ _-]|[0-9])/i.test(name)) continue;
    const id = createHash("sha256")
      .update(r.id.toUpperCase())
      .digest("hex")
      .slice(0, 24);
    devices.set(id, {
      id,
      name,
      modelHint: modelHint(name),
      transport: "bluetooth",
      protocol: "classic",
      paired: r.paired === true,
      remembered: r.remembered === true,
      windowsConnected: r.connected === true,
      connection: "detected-only",
      canSend: false,
    });
  }
  return [...devices.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function createBluetoothScanner({
  platform = process.platform,
  run = execFile,
  now = Date.now,
  systemRoot = process.env.SystemRoot || "C:\\Windows",
} = {}) {
  let pending,
    recent,
    finished = 0;
  return function scanBluetooth() {
    if (platform !== "win32")
      return Promise.resolve({
        status: "unavailable",
        radio: "unknown",
        devices: [],
        warnings: [],
        message: "Bluetooth discovery is available in Mantis Studio for Windows.",
      });
    if (pending) return pending;
    if (recent && now() - finished < 1500) return Promise.resolve(recent);
    pending = new Promise((resolve) => {
      const done = (result) => {
        finished = now();
        recent = { ...result, scannedAt: new Date(finished).toISOString() };
        resolve(recent);
      };
      run(
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
        {
          windowsHide: true,
          timeout: 25000,
          maxBuffer: 512 * 1024,
          encoding: "utf8",
        },
        (error, stdout) => {
          const fail = (message) =>
            done({
              status: "error",
              radio: "unknown",
              devices: [],
              warnings: [],
              message,
            });
          if (error)
            return fail(
              error.killed
                ? "Bluetooth scan timed out. Check Windows Bluetooth settings and try again."
                : "Windows Bluetooth scan failed. Check your Bluetooth adapter and try again.",
            );
          try {
            const raw = JSON.parse(stdout.replace(/^\uFEFF/, "").trim());
            if (
              !["on", "off", "disabled", "absent", "unknown"].includes(
                raw.radio,
              ) ||
              !Array.isArray(raw.warnings)
            )
              throw Error("Invalid radio");
            const devices = normalizeBluetooth(raw.devices);
            const messages = {
              off: "Bluetooth is turned off. Turn it on in Windows settings, then scan again.",
              disabled:
                "The Bluetooth radio is disabled. Check your adapter in Windows settings.",
              absent:
                "No Bluetooth adapter was found. Connect an adapter or use USB.",
              unknown:
                "Windows could not determine the Bluetooth radio state. Check Windows settings.",
            };
            done({
              status: raw.radio === "on" ? "ok" : "unavailable",
              radio: raw.radio,
              devices: raw.radio === "on" ? devices : [],
              warnings: [],
              message: messages[raw.radio],
            });
          } catch {
            fail(
              "Windows returned an unreadable Bluetooth scan. Try scanning again.",
            );
          }
        },
      );
    }).finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
module.exports = { normalizeBluetooth, createBluetoothScanner };
