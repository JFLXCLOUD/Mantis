import { test, expect, _electron as electron } from '@playwright/test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('editor: layers, undo, geometry, repeat, saving and reload', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByLabel('Project name')).toHaveValue('Good things grow here');
  await page.getByRole('button', { name: 'Add heart', exact: true }).click();
  await expect(page.getByLabel('Layer name', { exact: true })).toHaveValue('Heart');
  await page.getByLabel('Width', { exact: true }).fill('2'); await page.getByLabel('Width', { exact: true }).press('Enter');
  await expect(page.getByLabel('Height', { exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'Repeat pattern' }).click();
  await page.getByRole('button', { name: 'Create 6 repeats' }).click();
  await expect(page.getByText('15 editable objects')).toBeVisible();
  await page.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click();
  await expect(page.getByText('10 editable objects')).toBeVisible();
  await page.getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true }).click();
  await expect(page.getByText('15 editable objects')).toBeVisible();
  const saved = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save project', exact: true }).click();
  const savedFile = await saved; const project = JSON.parse(await readFile((await savedFile.path())!, 'utf8')); expect(project.objects).toHaveLength(15);
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('15 editable objects')).toBeVisible(); expect(errors).toEqual([]);
});

test('SVG import, safe project reload, mirrored exports and bounds preflight', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'sample.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="192" height="96" viewBox="0 0 192 96"><script>window.pwned=true</script><rect width="192" height="96" fill="#123456"/></svg>') });
  await expect(page.getByLabel('Layer name', { exact: true })).toHaveValue('sample');
  await expect(page.getByLabel('Width', { exact: true })).toHaveValue('2');
  const imported = page.locator('.canvas-object').last();
  const artBounds = await imported.locator('svg rect').boundingBox();
  const hitBounds = await imported.locator(':scope > rect').boundingBox();
  expect(artBounds!.width).toBeCloseTo(hitBounds!.width, 0);
  expect(artBounds!.height).toBeCloseTo(hitBounds!.height, 0);
  await page.getByLabel('X', { exact: true }).fill('-1'); await page.getByLabel('X', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Prepare', exact: true }).click();
  await expect(page.getByText('1 objects extend off the canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Machine & job setup' })).toBeVisible();
  await page.getByLabel('Mirror for iron-on').check();
  const exported = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export this group' }).click();
  const svg = await readFile((await (await exported).path())!, 'utf8'); expect(svg).toContain('translate(1152 0) scale(-1 1)'); expect(svg).not.toContain('<script');
  expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
});

test('dragging creates one undo step; hidden and locked layers are protected', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Add star', exact: true }).click();
  const xBefore = await page.getByLabel('X', { exact: true }).inputValue();
  const target = page.locator('.canvas-object').last(); const rect = await target.boundingBox();
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + rect!.height / 2); await page.mouse.down(); await page.mouse.move(rect!.x + rect!.width / 2 + 55, rect!.y + rect!.height / 2 + 20, { steps: 6 }); await page.mouse.up();
  await expect(page.getByLabel('X', { exact: true })).not.toHaveValue(xBefore);
  await page.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click(); await expect(page.getByLabel('X', { exact: true })).toHaveValue(xBefore);
  await page.getByRole('button', { name: 'Lock Star', exact: true }).click(); await expect(page.getByLabel('Width', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Hide Star', exact: true }).click(); await expect(page.locator('.canvas-object')).toHaveCount(9);
});

test('starter and smaller Windows viewport render without overflow or errors', async ({ page }) => {
  await page.goto('/'); await page.screenshot({ path: 'docs/screenshots/studio.png' });
  await page.setViewportSize({ width: 1100, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Prepare', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/studio-compact.png' });
});

test('saved projects reopen intact and invalid input leaves the canvas unchanged', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByLabel('Text content', { exact: true }).fill('Hopper & friends');
  await page.getByLabel('Project name', { exact: true }).fill('My saved project');
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save project', exact: true }).click();
  const saved = await pending, projectPath = (await saved.path())!;
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'New blank project' }).click(); await page.getByRole('button', { name: 'Start fresh' }).click();
  await expect(page.getByText('0 editable objects')).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'saved.hopper', mimeType: 'application/json', buffer: await readFile(projectPath) });
  await expect(page.getByLabel('Project name')).toHaveValue('My saved project');
  await expect(page.getByText('10 editable objects')).toBeVisible();
  await page.getByRole('button', { name: 'Select Your words', exact: true }).click();
  await expect(page.getByLabel('Text content', { exact: true })).toHaveValue('Hopper & friends');
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.hopper', mimeType: 'application/json', buffer: Buffer.from('{"format":"hopper","version":99,"objects":[]}') });
  await expect(page.getByRole('status')).toContainText('Unsupported project format');
  await expect(page.getByText('10 editable objects')).toBeVisible();
});

test('production desktop loads in Electron with isolation and no renderer Node', async () => {
  test.setTimeout(60000);
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const profile = await mkdtemp(join(tmpdir(), 'hopper-test-'));
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  try {
    const window = await app.firstWindow(); await expect(window.getByLabel('Project name')).toBeVisible();
    expect(await window.evaluate(() => typeof (window as unknown as { require?: unknown }).require)).toBe('undefined');
    const prefs = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
    expect(prefs?.contextIsolation).toBe(true); expect(prefs?.sandbox).toBe(true); expect(prefs?.nodeIntegration).toBe(false);
    expect(await window.evaluate(() => Object.keys(window.hopperMachine!))).toEqual([
      'scanUsb', 'scanBluetooth', 'bluetoothStatus', 'connectBluetooth',
      'disconnectBluetooth', 'openBluetoothSettings',
    ]);
    await window.screenshot({ path: 'docs/screenshots/desktop.png' });
  } finally {
    await app.close();
    if (!profile.startsWith(join(tmpdir(), 'hopper-test-'))) throw new Error('Unexpected test profile location');
    await rm(profile, { recursive: true, force: true });
  }
});
