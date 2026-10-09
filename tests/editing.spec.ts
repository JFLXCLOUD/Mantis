import { test, expect, type Page } from '@playwright/test';

const base = (id: string, x = 192, extra = {}) => ({ id, name: id, type: 'rect', x, y: 240, width: 192, height: 96, rotation: 0, fill: '#285c48', operation: 'cut', visible: true, locked: false, ...extra });
async function fixture(page: Page, objects = [base('First')]) {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'legacy.hopper', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'hopper', version: 1, name: 'Transform test', width: 1152, height: 1152, objects })) });
  await page.getByRole('button', { name: 'Select First', exact: true }).click();
}
async function drag(page: Page, handle: string, dx: number, dy: number) {
  const rect = await page.getByTestId(handle).boundingBox();
  const x = rect!.x + rect!.width / 2, y = rect!.y + rect!.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 6 }); await page.mouse.up();
}
async function field(page: Page, name: string) { return Number(await page.getByLabel(name, { exact: true }).inputValue()); }
async function snapshot(page: Page) {
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  return page.evaluate(() => JSON.parse(localStorage.getItem('hopper.project.v1')!));
}

test('unlocked cursor stretch, edge handles, single-step undo and persistence', async ({ page }) => {
  await fixture(page);
  await expect(page.getByRole('button', { name: 'Lock proportions', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Lock proportions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lock proportions', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await drag(page, 'resize-e', 65, 19);
  expect(await field(page, 'Width')).toBeGreaterThan(3); expect(await field(page, 'Height')).toBe(1);
  const afterEdge = await field(page, 'Width');
  await drag(page, 'resize-se', 15, 45);
  expect(await field(page, 'Height')).toBeGreaterThan(1.5);
  await page.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click();
  expect(await field(page, 'Width')).toBe(afterEdge); expect(await field(page, 'Height')).toBe(1);
  await page.getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true }).click();
  const saved = await snapshot(page); expect(saved.version).toBe(3);
  await page.reload(); await page.getByRole('button', { name: 'Select First', exact: true }).click();
  expect(await field(page, 'Height')).toBeCloseTo(saved.objects[0].height / 96, 3);
});

test('locked and Shift resizing preserve proportions; Alt holds the center', async ({ page }) => {
  await fixture(page); await drag(page, 'resize-se', 75, 8);
  await expect.poll(async () => (await field(page, 'Width')) / (await field(page, 'Height'))).toBeCloseTo(2, 2);
  await page.getByRole('button', { name: 'Lock proportions', exact: true }).click();
  await page.keyboard.down('Shift'); await drag(page, 'resize-se', 30, 5); await page.keyboard.up('Shift');
  await expect.poll(async () => (await field(page, 'Width')) / (await field(page, 'Height'))).toBeCloseTo(2, 2);
  const center = (await field(page, 'X')) + (await field(page, 'Width')) / 2;
  await page.keyboard.down('Alt'); await drag(page, 'resize-e', 15, 0); await page.keyboard.up('Alt');
  expect((await field(page, 'X')) + (await field(page, 'Width')) / 2).toBeCloseTo(center, 2);
});

test('rotated resize anchors the opposite corner and cursor rotation snaps with Shift', async ({ page }) => {
  await fixture(page, [base('First', 300, { rotation: 30 })]);
  await page.getByRole('button', { name: 'Lock proportions', exact: true }).click();
  const anchor = await page.locator('.selection-overlay polygon').getAttribute('points');
  await drag(page, 'resize-se', 58, 23);
  const after = await page.locator('.selection-overlay polygon').getAttribute('points');
  const beforeCoords = anchor!.split(' ')[0].split(',').map(Number), afterCoords = after!.split(' ')[0].split(',').map(Number);
  expect(afterCoords[0]).toBeCloseTo(beforeCoords[0], 6); expect(afterCoords[1]).toBeCloseTo(beforeCoords[1], 6);
  await page.keyboard.down('Shift'); await drag(page, 'rotate-handle', 55, 20); await page.keyboard.up('Shift');
  const rotation = await field(page, 'Rotate'); expect(rotation).not.toBe(30); expect(rotation % 15).toBeCloseTo(0);
  await page.screenshot({ path: 'docs/screenshots/editing-0.2.png' });
});

test('Escape cancels a transform and locked layers offer no resize handles', async ({ page }) => {
  await fixture(page);
  const rect = await page.getByTestId('resize-se').boundingBox();
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + rect!.height / 2); await page.mouse.down();
  await page.mouse.move(rect!.x + 70, rect!.y + 25); await page.keyboard.press('Escape'); await page.mouse.up();
  await page.getByRole('button', { name: 'Select First', exact: true }).click();
  expect(await field(page, 'Width')).toBe(2);
  await page.getByRole('button', { name: 'Lock First', exact: true }).click();
  await expect(page.getByTestId('resize-se')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lock proportions', exact: true })).toBeDisabled();
});

test('duplicate in place preserves appearance; matching color and search help manage layers', async ({ page }) => {
  await fixture(page, [base('First', 220, { rotation: 17, fill: '#df896f' }), base('Other', 600), base('Hidden', 700, { visible: false, fill: '#df896f' })]);
  await page.getByRole('button', { name: 'Copy in place', exact: true }).click();
  let p = await snapshot(page), original = p.objects[0], copy = p.objects[3];
  expect(copy.id).not.toBe(original.id);
  for (const key of ['x', 'y', 'width', 'height', 'rotation', 'fill']) expect(copy[key]).toEqual(original[key]);
  await page.getByRole('button', { name: /Select matching color/ }).click();
  await expect(page.getByText('2 objects selected', { exact: false })).toBeVisible();
  await page.getByLabel('Object color', { exact: true }).fill('#123456');
  p = await snapshot(page); expect(p.objects[0].fill).toBe('#123456'); expect(p.objects[3].fill).toBe('#123456'); expect(p.objects[2].fill).toBe('#df896f');
  await page.getByLabel('Search layers').fill('other');
  await expect(page.locator('.layer-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear layer search', exact: true }).click();
  await expect(page.locator('.layer-row')).toHaveCount(4);
});

test('spacing and centering operate on groups without changing their internal layout', async ({ page }) => {
  await fixture(page, [base('First', 100, { width: 50, groupId: 'g' }), base('Partner', 170, { width: 30, groupId: 'g' }), base('Middle', 280, { width: 80 }), base('Last', 800, { width: 70 })]);
  await page.getByRole('button', { name: 'Select Middle', exact: true }).click({ modifiers: ['Shift'] });
  await page.getByRole('button', { name: 'Select Last', exact: true }).click({ modifiers: ['Shift'] });
  await page.getByRole('button', { name: 'Space H', exact: true }).click();
  let p = await snapshot(page);
  expect(p.objects[1].x - p.objects[0].x).toBe(70);
  expect(p.objects[2].x - 200).toBeCloseTo(800 - p.objects[2].x - 80);
  await page.getByRole('button', { name: 'Center', exact: true }).click();
  p = await snapshot(page); expect((p.objects[0].x + p.objects[3].x + 70) / 2).toBe(576);
});

test('SVG imports stretch to the new dimensions and flip survives export', async ({ page }) => {
  await fixture(page);
  await page.locator('input[type=file]').setInputFiles({ name: 'arrow.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" fill="#123456"/></svg>') });
  await page.getByRole('button', { name: 'Lock proportions', exact: true }).click();
  await drag(page, 'resize-e', 65, 0);
  const object = page.locator('.canvas-object').last(), art = await object.locator('svg rect').boundingBox(), hit = await object.locator(':scope > rect').boundingBox();
  expect(art!.width).toBeCloseTo(hit!.width, 0); expect(art!.height).toBeCloseTo(hit!.height, 0);
  await page.getByRole('button', { name: 'Flip H', exact: true }).click();
  const p = await snapshot(page); expect(p.objects.at(-1).flipY).toBe(true);
  await page.reload(); await expect(page.locator('.canvas-object').last().locator('g').first()).toHaveAttribute('transform', /scale\(1 -1\)/);
});
