const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createBluetoothConnection } = require("./connection.cjs");
const { registerMachineIpc } = require("./ipc.cjs");
const id = "a".repeat(24);
const device = {
  id,
  name: "Explore3-test",
  modelHint: "explore-3",
  paired: true,
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture(options = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = new EventEmitter();
  child.stdout.setEncoding = () => {};
  child.stdin.write = (value) => writes.push(value);
  child.stdin.end = () => {};
  child.kill = () => {};
  const writes = [];
  let launched = 0;
  const link = createBluetoothConnection({
    platform: "win32",
    scanBluetooth: async () => ({ status: "ok", devices: [device] }),
    launch: (exe, args, opts) => {
      launched++;
      assert.match(exe, /powershell.exe$/);
      assert.equal(opts.windowsHide, true);
      assert.equal(args.at(-2), "-EncodedCommand");
      return child;
    },
    ...options,
  });
  return { link, child, writes, launched: () => launched };
}
test("connects only after native success, sends no device payload, and ignores late results after disconnect", async () => {
  const f = fixture();
  assert.equal(f.link.connect(id).status, "connecting");
  await tick();
  assert.deepEqual(f.writes, [JSON.stringify({ deviceId: id }) + "\n"]);
  f.child.stdout.emit(
    "data",
    '{"status":"connected","bytesSent":0,"bytesReceived":0}\n',
  );
  assert.equal(f.link.status().status, "connected");
  assert.equal(f.link.status().machineReady, false);
  assert.equal(f.link.status().canSend, false);
  assert.throws(() => f.link.connect(id), /Disconnect/);
  assert.equal(f.link.disconnect().status, "disconnected");
  assert.equal(f.writes.at(-1), "disconnect\n");
  f.child.stdout.emit(
    "data",
    '{"status":"connected","bytesSent":0,"bytesReceived":0}\n',
  );
  assert.equal(f.link.status().status, "disconnected");
  f.child.emit("exit", 0);
});
test("rejects arbitrary identifiers, unpaired devices and unverified model families", async () => {
  for (const variant of [
    { ...device, paired: false },
    { ...device, modelHint: "maker-4" },
  ]) {
    const f = fixture({
      scanBluetooth: async () => ({ status: "ok", devices: [variant] }),
    });
    assert.throws(() => f.link.connect("COM5; arbitrary command"), /Invalid/);
    f.link.connect(id);
    await tick();
    assert.equal(f.link.status().status, "error");
    assert.equal(f.launched(), 0);
    f.link.disconnect();
  }
});
test("cancellation during discovery cannot create a late connection", async () => {
  let resolve;
  const f = fixture({ scanBluetooth: () => new Promise((r) => (resolve = r)) });
  f.link.connect(id);
  f.link.disconnect();
  resolve({ status: "ok", devices: [device] });
  await tick();
  assert.equal(f.launched(), 0);
  assert.equal(f.link.status().status, "disconnected");
});
test("malformed responses and lost native process clear connected status", async () => {
  for (const malformed of [
    "not-json\n",
    '{"status":"connected","bytesSent":1,"bytesReceived":0}\n',
  ]) {
    const f = fixture();
    f.link.connect(id);
    await tick();
    f.child.stdout.emit("data", malformed);
    assert.equal(f.link.status().status, "error");
    assert.equal(f.link.status().canSend, false);
    f.link.disconnect();
    f.child.emit("exit", 0);
  }
  const f = fixture();
  f.link.connect(id);
  await tick();
  f.child.stdout.emit(
    "data",
    '{"status":"connected","bytesSent":0,"bytesReceived":0}\n',
  );
  f.child.emit("exit", 1);
  assert.equal(f.link.status().status, "error");
  f.link.disconnect();
});
test("stale monitor and startup deadlines report an error instead of a false connection", async () => {
  const f = fixture({ heartbeatMs: 20 });
  f.link.connect(id);
  await tick();
  f.child.stdout.emit(
    "data",
    '{"status":"connected","bytesSent":0,"bytesReceived":0}\n',
  );
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(f.link.status().status, "error");
  f.link.disconnect();
  f.child.emit("exit", 0);
  const slow = fixture({
    scanBluetooth: () => new Promise(() => {}),
    startupMs: 20,
  });
  slow.link.connect(id);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(slow.link.status().status, "error");
  slow.link.disconnect();
});
test("connection IPC is scoped to the trusted frame and closes when the window closes", () => {
  const handlers = new Map(),
    events = new Map();
  let closed, received;
  const frame = { url: "file:///test" },
    contents = { mainFrame: frame, on: (name, cb) => events.set(name, cb) };
  let disconnected = 0;
  const window = {
    isDestroyed: () => false,
    webContents: contents,
    on: (name, cb) => {
      if (name === "closed") closed = cb;
    },
  };
  registerMachineIpc(
    {
      handle: (k, f) => handlers.set(k, f),
      removeHandler: (k) => handlers.delete(k),
    },
    window,
    frame.url,
    {
      scanUsb: () => {},
      scanBluetooth: () => {},
      bluetoothConnection: {
        status: () => ({ status: "disconnected" }),
        connect: (id) => {
          received = id;
          return { status: "connecting" };
        },
        disconnect: () => {
          disconnected++;
        },
      },
    },
  );
  const connect = handlers.get("hopper:connect-bluetooth");
  assert.throws(
    () => connect({ sender: {}, senderFrame: frame }, id),
    /Untrusted/,
  );
  assert.equal(
    connect({ sender: contents, senderFrame: frame }, id).status,
    "connecting",
  );
  assert.equal(received, id);
  events.get("render-process-gone")();
  assert.equal(disconnected, 1);
  closed();
  assert.equal(disconnected, 2);
  assert.equal(handlers.size, 0);
});
