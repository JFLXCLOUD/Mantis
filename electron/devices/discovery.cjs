const { execFile } = require("node:child_process");
const { createHash } = require("node:crypto");
const { join } = require("node:path");
const { readFileSync } = require("node:fs");
const { modelHint: inferModel } = require('./models.cjs');
// Read through Electron's ASAR support; an external PowerShell process cannot open app.asar paths.
// This is a fixed bundled script. No renderer input is inserted into shell code.
const encodedDiscovery = Buffer.from(readFileSync(join(__dirname, "discover-usb.ps1"), "utf8"), "utf16le").toString("base64");

const clean = (s, limit = 160) =>
  typeof s === "string"
    ? s.replace(/[\u0000-\u001f]/g, "").slice(0, limit)
    : "";
function normalizeDevices(records) {
  if (!Array.isArray(records))
    throw new Error("Invalid Windows device response.");
  const groups = new Map();
  for (const r of records.slice(0, 256)) {
    if (!r || typeof r !== "object") continue;
    const instance = clean(r.instanceId, 1024);
    const usb = /^USB\\VID_([A-F0-9]{4})&PID_([A-F0-9]{4})/i.exec(instance);
    if (!usb) continue;
    const name = clean(r.name),
      manufacturer = clean(r.manufacturer);
    // Vendor-only matches identify a candidate, never a Maker model or supported protocol.
    if (
      usb[1].toUpperCase() !== "20D3" &&
      !/Cricut|Provo.?Craft/i.test(`${name} ${manufacturer}`)
    )
      continue;
    const container = clean(r.containerId);
    const validContainer =
      /^[a-f0-9-]{36}$/i.test(container) &&
      !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(container);
    const key =
      `${usb[1]}:${usb[2]}:${validContainer ? container : instance}`.toUpperCase();
    let device = groups.get(key);
    const modelHint = inferModel(name);
    if (!device) {
      device = {
        id: createHash("sha256").update(key).digest("hex").slice(0, 24),
        name: name || "Cricut USB device",
        vendorId: usb[1].toUpperCase(),
        productId: usb[2].toUpperCase(),
        modelHint,
        modelConflict: false,
        transport: "usb",
        ports: [],
        windowsStatus: clean(r.status, 32) || "Unknown",
        connection: "detected-only",
        canSend: false,
      };
      groups.set(key, device);
    } else {
      if (/Cricut|Maker/i.test(name) && !/Cricut|Maker/i.test(device.name))
        device.name = name;
      if (modelHint && device.modelHint && modelHint !== device.modelHint)
        device.modelConflict = true;
      device.modelHint ||= modelHint;
      if (r.status !== "OK")
        device.windowsStatus = clean(r.status, 32) || "Unknown";
    }
    const port = clean(r.port, 12) || /\((COM\d+)\)/i.exec(name)?.[1];
    if (
      port &&
      /^COM\d+$/i.test(port) &&
      !device.ports.includes(port.toUpperCase())
    )
      device.ports.push(port.toUpperCase());
  }
  return [...groups.values()]
    .map(({ modelConflict, ...device }) => ({
      ...device,
      modelHint: modelConflict ? null : device.modelHint,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function createScanner({
  platform = process.platform,
  run = execFile,
  systemRoot = process.env.SystemRoot || "C:\\Windows",
  now = Date.now,
} = {}) {
  let pending,
    recent,
    finished = 0;
  return function scanUsb() {
    if (platform !== "win32")
      return Promise.resolve({
        status: "unavailable",
        devices: [],
        warnings: [],
        message: "USB discovery is available in Mantis Studio for Windows.",
      });
    if (pending) return pending;
    if (recent && now() - finished < 1500) return Promise.resolve(recent);
    pending = new Promise((resolve) => {
      const done = (result) => {
        recent = { ...result, scannedAt: new Date(now()).toISOString() };
        finished = now();
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
          encodedDiscovery,
        ],
        {
          windowsHide: true,
          timeout: 15000,
          maxBuffer: 512 * 1024,
          encoding: "utf8",
        },
        (error, stdout) => {
          if (error)
            return done({
              status: "error",
              devices: [],
              warnings: [],
              message: error.killed
                ? "Windows device scan timed out. Reconnect USB and try again."
                : "Windows device scan failed. Check that PowerShell and the PnPDevice module are available.",
            });
          try {
            const raw = JSON.parse(stdout.replace(/^\uFEFF/, "").trim());
            if (!Array.isArray(raw.warnings))
              throw new Error("Invalid warnings.");
            done({
              status: "ok",
              devices: normalizeDevices(raw.devices),
              warnings: raw.warnings.map((s) => clean(s)).slice(0, 8),
            });
          } catch {
            done({
              status: "error",
              devices: [],
              warnings: [],
              message:
                "Windows returned an unreadable device scan. Try scanning again.",
            });
          }
        },
      );
    }).finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
module.exports = { normalizeDevices, createScanner };
