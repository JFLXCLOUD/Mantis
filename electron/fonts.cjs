const { execFile } = require('node:child_process');
const { join } = require('node:path');
const { trustedSender } = require('./devices/ipc.cjs');
const script = `$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing
$collection = New-Object System.Drawing.Text.InstalledFontCollection
try { $names = @($collection.Families | ForEach-Object { $_.Name } | Sort-Object -Unique); ConvertTo-Json -InputObject $names -Compress } finally { $collection.Dispose() }`;
function normalizeFonts(value) {
  if (!Array.isArray(value)) throw Error('Invalid font list');
  return [...new Set(value.filter(s => typeof s === 'string' && s.trim() && s.length <= 200 && !/[\u0000-\u001f\u007f]/.test(s)))].slice(0, 5000).sort((a,b) => a.localeCompare(b));
}
function createFontLister({ run = execFile, platform = process.platform } = {}) {
  let pending;
  return () => {
    if (platform !== 'win32') return Promise.resolve({ fonts: [], error: 'Installed font discovery is available in the Windows app.' });
    if (pending) return pending;
    pending = new Promise(resolve => run(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      { windowsHide: true, timeout: 15000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout) => { try { if (error) throw error; resolve({ fonts: normalizeFonts(JSON.parse(stdout.replace(/^\uFEFF/, '').trim())) }); }
        catch { resolve({ fonts: [], error: 'Could not read installed fonts. You can retry or import a font file.' }); } })).finally(() => { pending = null; });
    return pending;
  };
}
function registerFontIpc(ipcMain, window, expectedUrl, list = createFontLister()) {
  ipcMain.handle('mantis:list-fonts', event => {
    if (!trustedSender(event, window, expectedUrl)) throw Error('Untrusted font request.');
    return list();
  });
  window.on('closed', () => ipcMain.removeHandler('mantis:list-fonts'));
}
module.exports = { normalizeFonts, createFontLister, registerFontIpc };
