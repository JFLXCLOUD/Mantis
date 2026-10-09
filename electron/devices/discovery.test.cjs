const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDevices, createScanner } = require("./discovery.cjs");
const { trustedSender } = require("./ipc.cjs");
const record = (patch = {}) => ({
  instanceId: "USB\\VID_20D3&PID_1234\\private-serial",
  name: "Cricut Maker 4",
  status: "OK",
  containerId: "12345678-1234-1234-1234-123456789abc",
  ...patch,
});

test("USB interfaces group without treating detection as a verified connection", () => {
  const result = normalizeDevices([
    record(),
    record({
      instanceId: "USB\\VID_20D3&PID_1234&MI_01\\private-serial",
      name: "USB Serial Device (COM7)",
      port: "COM7",
    }),
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].ports, ["COM7"]);
  assert.equal(result[0].modelHint, "maker-4");
  assert.equal(result[0].canSend, false);
  assert.equal(result[0].connection, "detected-only");
  assert.ok(!JSON.stringify(result).includes("private-serial"));
  assert.ok(!JSON.stringify(result).includes("12345678-1234"));
});
test("vendor and product IDs never infer a Maker model; unrelated serial and Bluetooth devices are excluded", () => {
  const result = normalizeDevices([
    record({ name: "USB Serial Device" }),
    record({
      instanceId: "USB\\VID_1234&PID_4567\\other",
      name: "A different cutter",
    }),
    record({ instanceId: "BTHENUM\\Cricut", name: "Cricut Maker 4" }),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].modelHint, null);
});
test("separate machines stay separate and contradictory model hints are unknown", () => {
  const result = normalizeDevices([
    record(),
    record({ name: "Cricut Maker 3" }),
    record({ containerId: "12345678-1234-1234-1234-123456789abd" }),
  ]);
  assert.equal(result.length, 2);
  assert.ok(result.some((d) => d.modelHint === null));
  assert.ok(result.some((d) => d.modelHint === "maker-4"));
});
test("Windows failures remain visible and missing container IDs do not merge different devices", () => {
  const result = normalizeDevices([
    record({ containerId: null, status: "Error" }),
    record({
      containerId: null,
      instanceId: "USB\\VID_20D3&PID_1234\\different-serial",
    }),
  ]);
  assert.equal(result.length, 2);
  assert.ok(result.some((d) => d.windowsStatus === "Error"));
});
test("scanner runs only the fixed discovery script, shares concurrent scans and bounds subprocess time", async () => {
  let callback,
    calls = 0,
    clock = 10000;
  const scanner = createScanner({
    platform: "win32",
    now: () => clock,
    run: (file, args, options, cb) => {
      calls++;
      callback = cb;
      assert.ok(file.endsWith("powershell.exe"));
      assert.ok(args.includes("-NonInteractive"));
    assert.ok(args.includes("-EncodedCommand"));
    assert.ok(Buffer.from(args.at(-1), "base64").toString("utf16le").includes("Get-PnpDevice -PresentOnly"));
      assert.equal(options.windowsHide, true);
      assert.equal(options.timeout, 15000);
      assert.equal(options.shell, undefined);
    },
  });
  const a = scanner(),
    b = scanner();
  assert.equal(a, b);
  callback(null, JSON.stringify({ devices: [record()], warnings: [] }));
  assert.equal((await a).status, "ok");
  await scanner();
  assert.equal(calls, 1);
  clock += 2000;
  const next = scanner();
  callback(null, "{broken");
  assert.equal((await next).status, "error");
  assert.equal(calls, 2);
});
test("timeout, malformed output and unsupported OS do not appear as a successful empty scan", async () => {
  const timeout = createScanner({
    platform: "win32",
    run: (_f, _a, _o, cb) => cb({ killed: true }),
  });
  assert.equal((await timeout()).status, "error");
  const malformed = createScanner({
    platform: "win32",
    run: (_f, _a, _o, cb) =>
      cb(null, JSON.stringify({ devices: null, warnings: [] })),
  });
  assert.equal((await malformed()).status, "error");
  const other = createScanner({
    platform: "linux",
    run: () => {
      throw Error("Must not execute");
    },
  });
  assert.equal((await other()).status, "unavailable");
});
test("machine IPC rejects subframes, other windows, changed URLs and destroyed windows", () => {
  const url = "file:///C:/Hopper/dist/index.html";
  const frame = { url },
    contents = { mainFrame: frame };
  const window = { isDestroyed: () => false, webContents: contents };
  const event = { sender: contents, senderFrame: frame };
  assert.equal(trustedSender(event, window, url), true);
  assert.equal(trustedSender({ ...event, sender: {} }, window, url), false);
  assert.equal(
    trustedSender({ ...event, senderFrame: { url } }, window, url),
    false,
  );
  assert.equal(trustedSender(event, window, "https://example.com"), false);
  assert.equal(
    trustedSender(event, { ...window, isDestroyed: () => true }, url),
    false,
  );
});
