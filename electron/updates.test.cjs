const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createUpdateChecker, newerStable, registerUpdateIpc } = require('./updates.cjs');
const release = (tag = 'v0.8.0', overrides = {}) => new Response(JSON.stringify({ tag_name: tag, draft: false, prerelease: false, published_at: '2026-10-09T00:00:00Z', ...overrides }));

test('numeric stable version ordering handles patch/minor/major and prerelease installs', () => {
  assert.ok(newerStable('v0.10.0', '0.9.9'));
  assert.ok(newerStable('v1.0.0', '0.99.0'));
  assert.ok(newerStable('v1.0.0', '1.0.0-beta.1'));
  for (const tag of ['v0.7.0', 'v0.6.9', 'main', 'v0.8.0-beta.1', 'v01.0.0', 'v1.0.999999999999999999999'])
    assert.equal(newerStable(tag, '0.7.0'), false);
});
test('checks only the fixed GitHub endpoint, coalesces calls and bounds repeated requests', async () => {
  let calls = 0, time = 1_000_000;
  const checker = createUpdateChecker({ version: '0.7.0', now: () => time, fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://api.github.com/repos/JFLXCLOUD/Mantis/releases/latest');
    assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, undefined);
    return release('v0.8.0', { html_url: 'https://evil.example/download.exe' });
  }});
  const [first, second] = await Promise.all([checker.check(), checker.check()]);
  assert.equal(first.status, 'available'); assert.deepEqual(first, second); assert.equal(calls, 1);
  assert.equal(checker.releaseUrl(), 'https://github.com/JFLXCLOUD/Mantis/releases/tag/v0.8.0');
  await checker.check(); assert.equal(calls, 1);
  time += 61000; await checker.check(); assert.equal(calls, 2);
});
test('empty repository is not confused with up-to-date, failures and rate limits remain visible', async () => {
  const check = (fetchImpl) => createUpdateChecker({ version: '0.7.0', fetchImpl }).check();
  assert.equal((await check(async () => new Response('', { status: 404 }))).status, 'no-release');
  assert.equal((await check(async () => release('v0.7.0'))).status, 'current');
  for (const status of [403, 429, 500]) assert.equal((await check(async () => new Response('', { status }))).status, 'error');
  for (const response of [release('main'), release('v0.9.0', { draft: true }), release('v0.9.0', { prerelease: true }), new Response('invalid'), new Response('x'.repeat(1024 * 1024 + 1))])
    assert.equal((await check(async () => response)).status, 'error');
  assert.equal((await check(async () => { throw Error('private network detail'); })).status, 'error');
});
test('a stalled network check is aborted and returns a usable error', async () => {
  const checker = createUpdateChecker({ version: '0.7.0', timeoutMs: 15, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(Error('timeout')));
  }) });
  assert.equal((await checker.check()).status, 'error');
});
test('update IPC rejects foreign frames, opens only its fixed release URL and cleans up', async () => {
  const handlers = new Map(), listeners = new Map(); let opened;
  const ipc = { handle: (key, fn) => handlers.set(key, fn), removeHandler: key => handlers.delete(key) };
  const mainFrame = { url: 'file:///app/index.html' };
  const window = { isDestroyed: () => false, webContents: { mainFrame }, on: (key, fn) => listeners.set(key, fn) };
  const event = { sender: window.webContents, senderFrame: mainFrame };
  registerUpdateIpc(ipc, window, mainFrame.url, { version: '0.7.0', openExternal: async url => { opened = url; },
    checker: createUpdateChecker({ version: '0.7.0', fetchImpl: async () => release() }) });
  for (const bad of [{ ...event, sender: {} }, { ...event, senderFrame: { ...mainFrame } }])
    assert.throws(() => handlers.get('mantis:check-updates')(bad), /Untrusted/);
  await handlers.get('mantis:check-updates')(event);
  await handlers.get('mantis:open-releases')(event, 'file:///untrusted.exe');
  assert.equal(opened, 'https://github.com/JFLXCLOUD/Mantis/releases/tag/v0.8.0');
  mainFrame.url = 'https://untrusted.example';
  assert.throws(() => handlers.get('mantis:open-releases')(event), /Untrusted/);
  listeners.get('closed')(); assert.equal(handlers.size, 0);
});
