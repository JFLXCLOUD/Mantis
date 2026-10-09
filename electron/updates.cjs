const { trustedSender } = require('./devices/ipc.cjs');
const API = 'https://api.github.com/repos/JFLXCLOUD/Mantis/releases/latest';
const RELEASES = 'https://github.com/JFLXCLOUD/Mantis/releases';

function parseVersion(value) {
  if (typeof value !== 'string' || value.length > 120) return null;
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (!match) return null;
  const numbers = match.slice(1, 4).map(Number);
  if (!numbers.every(Number.isSafeInteger)) return null;
  return { numbers, prerelease: match[4] || null };
}
function newerStable(tag, current) {
  const next = parseVersion(tag), installed = parseVersion(current);
  if (!next || next.prerelease || !installed) return false;
  for (let i = 0; i < 3; i++) {
    if (next.numbers[i] !== installed.numbers[i]) return next.numbers[i] > installed.numbers[i];
  }
  return Boolean(installed.prerelease);
}

function createUpdateChecker({ version, fetchImpl = (...args) => globalThis.fetch(...args), now = Date.now, timeoutMs = 10000 } = {}) {
  let pending, cached, cacheUntil = 0, releaseUrl = RELEASES;
  async function perform() {
    const checkedAt = new Date(now()).toISOString();
    const base = { currentVersion: version, checkedAt };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(API, {
        signal: controller.signal, redirect: 'error',
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Mantis-Studio', 'X-GitHub-Api-Version': '2026-03-10' },
      });
      if (response.status === 404) return { ...base, status: 'no-release', message: 'No public release yet. You are using a development preview.' };
      if (response.status === 403 || response.status === 429)
        return { ...base, status: 'error', message: 'GitHub is limiting update checks. Please try again later.' };
      if (!response.ok) throw Error('GitHub response');
      // Bound external data before parsing. Never render release HTML or markdown.
      const reader = response.body.getReader(); const chunks = []; let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 1024 * 1024) { await reader.cancel(); throw Error('Release too large'); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      const release = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const parsed = parseVersion(release.tag_name);
      if (!parsed || parsed.prerelease || release.draft !== false || release.prerelease !== false || !release.published_at)
        throw Error('Invalid stable release');
      // Construct a fixed-owner HTTPS URL; never open a URL supplied by the API or renderer.
      releaseUrl = `${RELEASES}/tag/${encodeURIComponent(release.tag_name)}`;
      const available = newerStable(release.tag_name, version);
      return { ...base, status: available ? 'available' : 'current', latestVersion: release.tag_name.replace(/^v/, ''),
        message: available ? `Mantis Studio ${release.tag_name.replace(/^v/, '')} is available.` : 'You are up to date with public stable releases.' };
    } catch {
      return { ...base, status: 'error', message: 'Could not check for updates. Check your internet connection and try again.' };
    } finally { clearTimeout(timer); }
  }
  return {
    check() {
      if (pending) return pending;
      if (cached && now() < cacheUntil) return Promise.resolve(cached);
      pending = perform().then((result) => {
        cached = result; cacheUntil = now() + 60000; return result;
      }).finally(() => { pending = null; });
      return pending;
    },
    releaseUrl: () => releaseUrl,
  };
}
function registerUpdateIpc(ipcMain, window, expectedUrl, { version, openExternal, checker = createUpdateChecker({ version }) }) {
  const handlers = {
    'mantis:check-updates': () => checker.check(),
    'mantis:open-releases': async () => {
      try { await openExternal(checker.releaseUrl()); return { opened: true }; }
      catch { return { opened: false }; }
    },
  };
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (event) => {
      if (!trustedSender(event, window, expectedUrl)) throw Error('Untrusted update request.');
      return handler();
    });
  }
  window.on('closed', () => {
    for (const channel of Object.keys(handlers)) ipcMain.removeHandler(channel);
  });
}
module.exports = { createUpdateChecker, newerStable, registerUpdateIpc };
