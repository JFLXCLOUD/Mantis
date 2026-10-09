import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('appearance follows Windows, persists explicit choices, and leaves artwork unchanged', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add heart', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  const project = await page.evaluate(() => localStorage.getItem('hopper.project.v1'));
  const canvas = await page.locator('.design-canvas').innerHTML();
  await page.getByRole('button', { name: 'App settings', exact: true }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.modal')).toHaveCSS('background-color', 'rgb(32, 42, 36)');
  await page.screenshot({ path: 'test-results/settings-dark.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'App settings', exact: true })).toBeFocused();
  expect(await page.locator('.design-canvas').innerHTML()).toBe(canvas);
  expect(await page.evaluate(() => localStorage.getItem('hopper.project.v1'))).toBe(project);
  await page.screenshot({ path: 'test-results/editor-dark.png' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'App settings', exact: true }).click();
  await page.getByRole('button', { name: 'Follow Windows', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: 'test-results/settings-light.png' });
});

test('manual updates, error/empty/new-release states and saved opt-out work without downloads', async ({ page }) => {
  await page.addInitScript(() => {
    let calls = 0;
    window.mantisUpdates = {
      check: async () => {
        calls++;
        return { currentVersion: '0.7.0', checkedAt: new Date().toISOString(),
          ...(calls === 1 ? { status: 'no-release' as const, message: 'No public release yet.' } : calls === 2 ? { status: 'error' as const, message: 'Could not check for updates.' } : { status: 'available' as const, latestVersion: '0.8.0', message: 'Mantis Studio 0.8.0 is available.' }) };
      },
      openReleases: async () => ({ opened: false }),
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'App settings', exact: true }).click();
  await page.getByLabel('Automatically check for updates').uncheck();
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No public release yet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
  await expect(page.getByText('Could not check for updates.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
  await expect(page.getByText('Mantis Studio 0.8.0 is available.')).toBeVisible();
  await page.getByRole('button', { name: 'View update on GitHub' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not open your browser');
  await page.reload();
  await page.getByRole('button', { name: 'App settings', exact: true }).click();
  await expect(page.getByLabel('Automatically check for updates')).not.toBeChecked();
});

test('automatic checks respect opt-out and a daily interval across reloads', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    window.mantisUpdates = { check: async () => {
      const count = Number(localStorage.getItem('test-check-count') || '0') + 1;
      localStorage.setItem('test-check-count', String(count));
      return { status: 'current', currentVersion: '0.7.0', message: 'Up to date.' };
    }, openReleases: async () => ({ opened: true }) };
  });
  await page.goto('/');
  await page.clock.runFor(3000);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('test-check-count'))).toBe('1');
  await page.reload(); await page.clock.runFor(3000);
  expect(await page.evaluate(() => localStorage.getItem('test-check-count'))).toBe('1');
  await page.clock.fastForward(25 * 60 * 60 * 1000);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('test-check-count'))).toBe('2');
  await page.getByRole('button', { name: 'App settings', exact: true }).click();
  await page.getByLabel('Automatically check for updates').uncheck();
  await page.clock.fastForward(25 * 60 * 60 * 1000);
  expect(await page.evaluate(() => localStorage.getItem('test-check-count'))).toBe('2');
});

test('desktop update bridge works from the trusted renderer without exposing raw IPC', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'mantis-settings-test-'));
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  try {
    // Deterministic response at the HTTP boundary; exercise actual preload and IPC.
    await app.evaluate(() => { globalThis.fetch = async () => new Response('', { status: 404 }); });
    const page = await app.firstWindow();
    await page.getByRole('button', { name: 'App settings', exact: true }).click();
    await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
    await expect(page.getByText('No public release yet. You are using a development preview.')).toBeVisible();
    expect(await page.evaluate(() => Object.keys(window.mantisUpdates!))).toEqual(['check', 'openReleases']);
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  } finally {
    await app.close();
    if (!profile.startsWith(join(tmpdir(), 'mantis-settings-test-'))) throw Error('Unexpected test profile');
    await rm(profile, { recursive: true, force: true });
  }
});
