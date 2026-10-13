import { openProperties } from './property-helpers';
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const object = (id: string, extra = {}) => ({
  id,
  name: id,
  type: "rect",
  x: 200,
  y: 250,
  width: 240,
  height: 120,
  rotation: 0,
  fill: "#285c48",
  operation: "cut",
  visible: true,
  locked: false,
  ...extra,
});
async function fixture(page: Page, objects = [object("First")]) {
  await page.goto("/");
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .setInputFiles({
      name: "colors.hopper",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "hopper",
          version: 4,
          name: "Color studies",
          width: 1152,
          height: 1152,
          objects,
        }),
      ),
    });
  await page.getByRole("button", { name: "Select First", exact: true }).click();
  await openProperties(page, 'Color');
}
async function saved(page: Page) {
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("hopper.project.v1")!),
  );
}
test("basic palette applies, undoes, persists and exports exact colors", async ({
  page,
}) => {
  await fixture(page);
  await expect(
    page
      .getByRole("group", { name: "Basic color palette" })
      .getByRole("button"),
  ).toHaveCount(20);
  await page.getByRole("button", { name: "Blue #2979ff", exact: true }).click();
  expect((await saved(page)).objects[0].fill).toBe("#2979ff");
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  expect((await saved(page)).objects[0].fill).toBe("#285c48");
  await page
    .getByRole("button", { name: "Redo (Ctrl+Shift+Z)", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await page.getByRole("button", { name: "Select First", exact: true }).click();
  await openProperties(page, 'Color');
  await expect(
    page.getByRole("button", { name: "Blue #2979ff", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export SVG", exact: true }).click();
  expect(await readFile((await (await downloading).path())!, "utf8")).toContain(
    "#2979ff",
  );
});
test("advanced colors preview, validate, cancel and apply as one undo step", async ({
  page,
}) => {
  await fixture(page);
  await saved(page);
  await page.getByRole("button", { name: "Advanced color picker" }).click();
  await page.getByLabel("HEX color").fill("#f00");
  await expect(
    page.locator('[data-object-id="First"] > g > rect').first(),
  ).toHaveAttribute("fill", "#ff0000");
  expect((await saved(page)).objects[0].fill).toBe("#285c48");
  await page.getByLabel("HEX color").fill("#zz");
  await expect(
    page.getByRole("button", { name: "Apply color" }),
  ).toBeDisabled();
  await page.getByLabel("HEX color").press("Escape");
  await expect(
    page.getByRole("button", { name: "Advanced color picker" }),
  ).toBeFocused();
  await expect(
    page.locator('[data-object-id="First"] > g > rect').first(),
  ).toHaveAttribute("fill", "#285c48");
  await page.getByRole("button", { name: "Advanced color picker" }).click();
  await page.getByLabel("Red", { exact: true }).fill("256");
  await expect(
    page.getByRole("button", { name: "Apply color" }),
  ).toBeDisabled();
  await page.getByLabel("Red", { exact: true }).fill("12");
  await page.getByLabel("Green", { exact: true }).fill("34");
  await page.getByLabel("Blue", { exact: true }).fill("56");
  await expect(page.getByLabel("HEX color")).toHaveValue("#0c2238");
  await page.getByRole("button", { name: "Apply color" }).click();
  expect((await saved(page)).objects[0].fill).toBe("#0c2238");
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  expect((await saved(page)).objects[0].fill).toBe("#285c48");
});
test("mixed selection recolors editable objects and protects SVG and locked layers", async ({
  page,
}) => {
  await fixture(page, [
    object("First"),
    object("Second", { fill: "#ffffff", x: 500, operation: "draw" }),
    object("Locked", { locked: true }),
    object("Hidden", { visible: false }),
    object("SVG", {
      type: "svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ff0000"/></svg>',
      viewBox: "0 0 100 100",
    }),
  ]);
  for (const name of ["Second", "Locked", "Hidden", "SVG"])
    await page
      .getByRole("button", { name: `Select ${name}`, exact: true })
      .click({ modifiers: ["Shift"] });
  await openProperties(page, 'Color');
  await openProperties(page, "Color");
  await expect(page.getByText("Mixed colors", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pink #ec78a4", exact: true }).click();
  const p = await saved(page);
  expect(p.objects.map((o: { fill: string }) => o.fill)).toEqual([
    "#ec78a4",
    "#ec78a4",
    "#285c48",
    "#285c48",
    "#285c48",
  ]);
  await expect(
    page.locator('[data-object-id="Second"] > g > rect').first(),
  ).toHaveAttribute("stroke", "#ec78a4");
  await page.getByRole("button", { name: "Select SVG", exact: true }).click();
  await openProperties(page, 'Color');
  await expect(
    page.getByRole("button", { name: "Advanced color picker" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Select Locked", exact: true })
    .click();
  await openProperties(page, 'Color');
  await expect(
    page.getByRole("button", { name: "Blue #2979ff", exact: true }),
  ).toBeDisabled();
});
test("pointer and keyboard picker controls work in dark mode at minimum window size", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "mantis.preferences.v1",
      JSON.stringify({ theme: "dark", automaticUpdates: false }),
    ),
  );
  await page.setViewportSize({ width: 1100, height: 740 });
  await fixture(page, [object("First"), object("Other", { x: 500 })]);
  await page.getByRole("button", { name: "Advanced color picker" }).click();
  await page.getByLabel("HEX color").fill("#ff0000");
  await page.getByRole("slider", { name: "Hue", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("HEX color")).not.toHaveValue("#ff0000");
  await page.locator(".color-plane").click({ position: { x: 90, y: 35 } });
  const next = await page.getByLabel("HEX color").inputValue();
  expect(next).not.toBe("#ff0000");
  await page.getByRole("button", { name: "Apply color" }).click();
  expect((await saved(page)).objects[0].fill).toBe(next);
  await page.getByRole("button", { name: "Advanced color picker" }).click();
  await page.getByLabel("HEX color").fill("#abcdef");
  await page.getByRole("button", { name: "Select Other", exact: true }).click();
  await openProperties(page, 'Color');
  await expect(
    page.getByRole("button", { name: "Advanced color picker" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect((await saved(page)).objects[0].fill).toBe(next);
  await page.getByRole("button", { name: "Advanced color picker" }).click();
  await page
    .getByRole("button", { name: "Apply color" })
    .scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "release/colors-dark.png" });
});
