const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeBluetooth,
  createBluetoothScanner,
} = require("./bluetooth.cjs");
const { registerMachineIpc } = require("./ipc.cjs");
const record = {
  id: "112233AABBCC",
  name: "Maker4-ABCD",
  paired: true,
  remembered: true,
  connected: false,
};

test("Bluetooth hides addresses and distinguishes bonding from remembered and connected state", () => {
  const result = normalizeBluetooth([
    record,
    record,
    { ...record, id: "112233AABBDD", paired: "true", connected: true },
    { ...record, id: "112233AABBEE", name: "Headphones" },
    { ...record, id: "bad" },
  ]);
  assert.equal(result.length, 2);
  assert.ok(!JSON.stringify(result).includes(record.id));
  assert.ok(
    result.every(
      (d) =>
        d.modelHint === "maker-4" &&
        !d.canSend &&
        d.connection === "detected-only",
    ),
  );
  assert.ok(
    result.some((d) => !d.paired && d.remembered && d.windowsConnected),
  );
  assert.equal(
    normalizeBluetooth([{ ...record, name: "Cricut device" }])[0].modelHint,
    null,
  );
});
test("Bluetooth uses bounded fixed commands, coalesces scans and expires its cache", async () => {
  let cb,
    calls = 0,
    clock = 10000;
  const scan = createBluetoothScanner({
    platform: "win32",
    now: () => clock,
    run: (file, args, options, callback) => {
      calls++;
      cb = callback;
      assert.ok(file.endsWith("powershell.exe"));
      assert.equal(options.windowsHide, true);
      assert.equal(options.timeout, 25000);
      assert.equal(options.shell, undefined);
      const script = Buffer.from(args.at(-1), "base64").toString("utf16le");
      assert.ok(script.includes("BluetoothFindFirstDevice"));
      assert.ok(!script.includes("BluetoothAuthenticateDevice"));
    },
  });
  const a = scan();
  assert.equal(a, scan());
  cb(null, JSON.stringify({ radio: "on", devices: [record], warnings: [] }));
  assert.equal((await a).devices.length, 1);
  await scan();
  assert.equal(calls, 1);
  clock += 2000;
  const b = scan();
  cb({ killed: true });
  assert.match((await b).message, /timed out/);
  assert.equal(calls, 2);
});
test("off, absent, malformed and unsupported scans never imply a successful empty inquiry", async () => {
  for (const radio of ["off", "absent", "disabled", "unknown"]) {
    const scan = createBluetoothScanner({
      platform: "win32",
      run: (_f, _a, _o, cb) =>
        cb(null, JSON.stringify({ radio, devices: [record], warnings: [] })),
    });
    const result = await scan();
    assert.equal(result.status, "unavailable");
    assert.deepEqual(result.devices, []);
  }
  for (const output of [
    "broken",
    '{"radio":"on","devices":null,"warnings":[]}',
  ]) {
    const scan = createBluetoothScanner({
      platform: "win32",
      run: (_f, _a, _o, cb) => cb(null, output),
    });
    assert.equal((await scan()).status, "error");
  }
  assert.equal(
    (
      await createBluetoothScanner({
        platform: "linux",
        run: () => {
          throw Error("Unexpected execution");
        },
      })()
    ).status,
    "unavailable",
  );
});
test("all machine IPC checks the sender and settings only opens the fixed Bluetooth URI", async () => {
  const handlers = new Map();
  let closed;
  const opened = [];
  const frame = { url: "file:///test" },
    contents = { mainFrame: frame };
  const window = {
    isDestroyed: () => false,
    webContents: contents,
    on: (_e, cb) => {
      closed = cb;
    },
  };
  registerMachineIpc(
    {
      handle: (key, cb) => handlers.set(key, cb),
      removeHandler: (key) => handlers.delete(key),
    },
    window,
    frame.url,
    {
      platform: "win32",
      scanUsb: () => "usb",
      scanBluetooth: () => "bluetooth",
      openExternal: async (url) => opened.push(url),
    },
  );
  for (const handler of handlers.values())
    assert.throws(
      () => handler({ sender: {}, senderFrame: frame }),
      /Untrusted/,
    );
  const event = { sender: contents, senderFrame: frame };
  assert.equal(handlers.get("hopper:scan-bluetooth")(event), "bluetooth");
  assert.equal(
    (
      await handlers.get("hopper:open-bluetooth-settings")(
        event,
        "https://untrusted.example",
      )
    ).opened,
    true,
  );
  assert.deepEqual(opened, ["ms-settings:bluetooth"]);
  closed();
  assert.equal(handlers.size, 0);
});
