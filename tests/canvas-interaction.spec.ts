import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const shape = (id: string, x: number, y: number, extra = {}) => ({
  id,
  name: id,
  type: "rect",
  x,
  y,
  width: 120,
  height: 96,
  rotation: 0,
  fill: "#285c48",
  operation: "cut",
  visible: true,
  locked: false,
  ...extra,
});
const objects = [
  shape("First", 150, 200),
  shape("Other", 720, 700),
  shape("Words", 250, 390, {
    type: "text",
    text: "Make it yours",
    font: "Georgia",
    width: 550,
    height: 90,
  }),
];
async function setup(page: Page, items = objects) {
  await page.goto("/");
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .setInputFiles({
      name: "canvas.mantis",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "hopper",
          version: 6,
          name: "Canvas interaction",
          width: 1152,
          height: 1152,
          objects: items,
        }),
      ),
    });
  await page.keyboard.press("Escape");
}
async function saved(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, "utf8"));
}
async function screen(page: Page, x: number, y: number) {
  return page.getByTestId("design-canvas").evaluate(
    (svg, p) => {
      const point = new DOMPoint(p.x, p.y).matrixTransform(
        (svg as SVGSVGElement).getScreenCTM()!,
      );
      return { x: point.x, y: point.y };
    },
    { x, y },
  );
}
async function moveTo(page: Page, x: number, y: number) {
  const p = await screen(page, x, y);
  await page.mouse.move(p.x, p.y, { steps: 4 });
}

test("selection, deselection, mixed selections and click jitter never move or resize the canvas or artwork", async ({
  page,
}) => {
  await setup(page);
  for (const size of [
    { width: 1500, height: 980 },
    { width: 1100, height: 740 },
  ]) {
    await page.setViewportSize(size);
    await page.getByRole("button", { name: "Snap on", exact: true }).click();
    await page.keyboard.press("Escape");
    const before = await page.getByTestId("design-canvas").boundingBox();
    for (const id of ["First", "Words", "Other"]) {
      const b = (await page.locator(`[data-object-id="${id}"]`).boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 1, b.y + b.height / 2 + 1);
      await page.mouse.up();
      expect(await page.getByTestId("design-canvas").boundingBox()).toEqual(
        before,
      );
      await page
        .getByRole("button", { name: "Select First", exact: true })
        .click({ modifiers: ["Shift"] });
      expect(await page.getByTestId("design-canvas").boundingBox()).toEqual(
        before,
      );
      const blank = await screen(page, 1080, 100);
      await page.mouse.click(blank.x, blank.y);
      expect(await page.getByTestId("design-canvas").boundingBox()).toEqual(
        before,
      );
    }
    expect((await saved(page)).objects).toEqual(objects);
    await page.getByRole("button", { name: "Snap off", exact: true }).click();
  }
});

test("drag shows canvas center and object guides, snaps accurately, supports Alt bypass and single undo", async ({
  page,
}) => {
  await setup(page);
  await moveTo(page, 210, 248);
  await page.mouse.down();
  await moveTo(page, 573, 300);
  await expect(
    page.locator(
      '[data-testid="alignment-guide"][data-axis="x"][data-target="canvas"]',
    ),
  ).toHaveCount(1);
  await page.screenshot({ path: "test-results/canvas-center-guide.png" });
  await page.mouse.up();
  expect((await saved(page)).objects[0].x).toBe(516);
  await expect(page.getByTestId("alignment-guide")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  expect((await saved(page)).objects[0]).toEqual(objects[0]);
  await moveTo(page, 210, 248);
  await page.mouse.down();
  await moveTo(page, 778, 340);
  await expect(
    page.locator(
      '[data-testid="alignment-guide"][data-axis="x"][data-target="object"]',
    ),
  ).toHaveCount(1);
  await page.keyboard.down("Alt");
  await moveTo(page, 774, 340);
  await expect(page.getByTestId("alignment-guide")).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up("Alt");
  expect((await saved(page)).objects[0].x).toBeCloseTo(714, 3);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await page.getByRole("button", { name: "Snap on", exact: true }).click();
  await moveTo(page, 210, 248);
  await page.mouse.down();
  await moveTo(page, 576, 310);
  await expect(
    page.locator('[data-testid="alignment-guide"][data-axis="x"]'),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await saved(page)).objects[0]).toEqual(objects[0]);
});

test("inline text occupies the object, follows zoom and transforms, commits on click-away and cancels without geometry changes", async ({
  page,
}) => {
  await setup(page, [
    shape("Words", 270, 310, {
      type: "text",
      text: "Make it yours",
      font: "Georgia",
      width: 500,
      height: 100,
      rotation: 17,
      skewX: 12,
      bold: true,
    }),
  ]);
  const item = page.locator('[data-object-id="Words"]');
  const before = (await saved(page)).objects[0];
  await item.dblclick();
  const editor = page.getByRole("textbox", {
    name: "Edit text on canvas",
    exact: true,
  });
  await expect(editor).toBeFocused();
  await expect(
    page.locator("svg.design-canvas foreignObject textarea"),
  ).toBeVisible();
  await expect(page.locator(".canvas-text-editor")).toHaveCount(0);
  const a = (await item.boundingBox())!,
    b = (await editor.boundingBox())!;
  for (const k of ["x", "y", "width", "height"] as const)
    expect(b[k]).toBeCloseTo(a[k], 0);
  await editor.fill("Made here\nwith care");
  await page.screenshot({ path: "test-results/canvas-inline-text.png" });
  const blank = await screen(page, 1050, 150);
  await page.mouse.click(blank.x, blank.y);
  await expect(editor).toHaveCount(0);
  expect((await saved(page)).objects[0]).toMatchObject({
    ...before,
    text: "Made here\nwith care",
  });
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  expect((await saved(page)).objects[0]).toEqual(before);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await item.dblclick();
  await editor.fill("Canceled");
  await editor.press("Escape");
  expect((await saved(page)).objects[0]).toEqual(before);
});
