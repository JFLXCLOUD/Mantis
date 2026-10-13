const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFonts, createFontLister, registerFontIpc } = require('./fonts.cjs');
test('font discovery filters malformed values, deduplicates and bounds responses', () => {
  assert.deepEqual(normalizeFonts(['Arial', 'Arial', 'Segoe UI', '', null, 'bad\0font']), ['Arial', 'Segoe UI']);
  assert.throws(() => normalizeFonts({}));
});
test('font discovery uses a fixed hidden bounded command and coalesces pending reads', async () => {
  let finish, count = 0;
  const list = createFontLister({ platform: 'win32', run: (exe, args, options, cb) => {
    count++; finish = cb; assert.match(exe, /powershell.exe$/); assert.equal(options.windowsHide, true);
    assert.equal(options.timeout, 15000); assert.equal(options.maxBuffer, 2097152);
    assert.ok(Buffer.from(args.at(-1), 'base64').toString('utf16le').includes('InstalledFontCollection'));
  } });
  const a = list(), b = list(); assert.equal(count, 1); finish(null, '["Arial"]');
  assert.deepEqual(await a, { fonts: ['Arial'] }); assert.deepEqual(await b, await a);
  assert.ok((await createFontLister({ platform: 'linux' })()).error);
  assert.ok((await createFontLister({ platform: 'win32', run: (_e,_a,_o,cb) => cb(null, 'bad') })()).error);
});
test('font IPC only accepts the trusted renderer and removes its handler on close', async () => {
  const handlers = new Map(), listeners = new Map();
  const ipc = { handle: (key, fn) => handlers.set(key, fn), removeHandler: key => handlers.delete(key) };
  const mainFrame = { url: 'file:///app/index.html' };
  const window = { isDestroyed: () => false, webContents: { mainFrame }, on: (key, fn) => listeners.set(key, fn) };
  registerFontIpc(ipc, window, mainFrame.url, async () => ({ fonts: ['Arial'] }));
  const event = { sender: window.webContents, senderFrame: mainFrame };
  assert.deepEqual(await handlers.get('mantis:list-fonts')(event), { fonts: ['Arial'] });
  assert.throws(() => handlers.get('mantis:list-fonts')({ ...event, senderFrame: { ...mainFrame } }), /Untrusted/);
  mainFrame.url = 'https://other.example'; assert.throws(() => handlers.get('mantis:list-fonts')(event), /Untrusted/);
  listeners.get('closed')(); assert.equal(handlers.size, 0);
});
