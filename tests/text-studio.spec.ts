import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { openProperties } from "./property-helpers";
async function setup(page: Page) {
  await page.goto("/");
  const project = {
    format: "hopper",
    version: 4,
    name: "Type studio",
    width: 1152,
    height: 1152,
    objects: [
      {
        id: "words",
        type: "text",
        name: "Words",
        text: "Make something",
        font: "Georgia",
        x: 160,
        y: 230,
        width: 620,
        height: 100,
        rotation: 0,
        fill: "#285c48",
        operation: "cut",
        visible: true,
        locked: false,
      },
    ],
  };
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .setInputFiles({
      name: "studio.mantis",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await page.getByRole("button", { name: "Select Words", exact: true }).click();
}
async function save(page: Page) {
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  return JSON.parse(
    await readFile((await (await downloading).path())!, "utf8"),
  );
}
test("canvas double-click edits multiline text, commits once, cancels and protects locked text", async ({
  page,
}) => {
  await setup(page);
  await page.locator('[data-object-id="words"]').dblclick();
  const editor = page.getByRole("textbox", { name: "Edit text on canvas" });
  await expect(editor).toBeFocused();
  await editor.fill("Made with\nlove");
  await editor.press("Control+Enter");
  await expect(editor).toHaveCount(0);
  expect((await save(page)).objects[0].text).toBe("Made with\nlove");
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  expect((await save(page)).objects[0].text).toBe("Make something");
  await page
    .getByRole("button", { name: "Redo (Ctrl+Shift+Z)", exact: true })
    .click();
  await page.locator('[data-object-id="words"]').dblclick();
  await editor.fill("Cancel this");
  await editor.press("Escape");
  expect((await save(page)).objects[0].text).toBe("Made with\nlove");
  await page.getByRole("button", { name: "Lock Words", exact: true }).click();
  await page.locator('[data-object-id="words"]').dispatchEvent("dblclick");
  await expect(editor).toHaveCount(0);
});
test("top controls, collapsible rail, text styles and exports stay usable in a small dark window", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 1100, height: 740 });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.getByRole("button", { name: "Collapse left sidebar" }).click();
  await expect(page.locator(".workspace")).toHaveClass(/left-collapsed/);
  await openProperties(page, "Effects");
  await expect(
    page.getByRole("button", { name: "Effects", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByRole("button", { name: "Underline", exact: true }).click();
  await page.getByLabel("Letter spacing", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Outline", exact: true }).click();
  await page.getByLabel("Effect strength").fill("7");
  const obj = (await save(page)).objects[0];
  expect(obj).toMatchObject({
    bold: true,
    underline: true,
    letterSpacing: 5,
    textEffect: "outline",
    effectAmount: 7,
  });
  const exporting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export SVG", exact: true }).click();
  const svg = await readFile((await (await exporting).path())!, "utf8");
  expect(svg).toContain('font-weight="700"');
  expect(svg).toContain('stroke-width="7"');
  await openProperties(page, "Effects");
  const box = await page.locator(".property-menu-content").boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1100);
  expect(box!.y + box!.height).toBeLessThanOrEqual(740);
  await page.screenshot({ path: "test-results/text-studio-dark.png" });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("hopper.project.v1") || "{}")
            .objects?.[0]?.textEffect,
      ),
    )
    .toBe("outline");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expand left sidebar" }),
  ).toBeVisible();
  await expect(page.locator(".right-panel .property-menu")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Shape library", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Shape library" }),
  ).toBeVisible();
});
test("larger artwork catalog searches offline, paginates and inserts editable third-party geometry", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Shape library", exact: true })
    .click();
  await expect(page.locator(".shape-library-card")).toHaveCount(40);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel("Shape collection").selectOption("tabler");
  await page.getByLabel("Search shapes").fill("cherry");
  await expect(
    page.getByRole("button", { name: "Add Cherry", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add Cherry", exact: true }).click();
  expect((await save(page)).objects.at(-1)).toMatchObject({
    type: "path",
    name: "Cherry",
  });
  const exporting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export SVG", exact: true }).click();
  const svg = await readFile((await (await exporting).path())!, "utf8");
  expect(svg).toContain("MIT License");
  expect(svg).toContain("Paweł Kuna");
});
