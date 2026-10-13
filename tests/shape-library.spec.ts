import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { openProperties } from "./property-helpers";

test("offline shamrock search inserts an editable path with undo, color, save and export", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await context.setOffline(true);
  const objects = page.locator(".canvas-object");
  const before = await objects.count();
  await page
    .getByRole("button", { name: "Shape library", exact: true })
    .click();
  const search = page.getByRole("textbox", { name: "Search shapes" });
  await expect(search).toBeFocused();
  await search.fill("shamrocks");
  await expect(page.locator(".shape-library-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Add Heart-leaf shamrock", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(objects).toHaveCount(before + 1);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(objects).toHaveCount(before);
  await page
    .getByRole("button", { name: "Redo (Ctrl+Shift+Z)", exact: true })
    .click();
  await expect(objects).toHaveCount(before + 1);
  await page
    .locator(".layer-row")
    .filter({ hasText: "Heart-leaf shamrock" })
    .locator(".layer-select")
    .click();
  await openProperties(page, "Color");
  await page.getByRole("button", { name: "Navy #243b70", exact: true }).click();
  async function download(name: string) {
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    return readFile((await (await event).path())!, "utf8");
  }
  const saved = JSON.parse(await download("Save project"));
  const added = saved.objects.at(-1);
  expect(added.type).toBe("path");
  expect(added.fill).toBe("#243b70");
  expect(await download("Export SVG")).toContain(added.pathData);
  // Download is immediate; workspace recovery waits for the debounced save.
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("hopper.project.v1") || "null"),
  )).toEqual(saved);
  await context.setOffline(false);
  await page.reload();
  await expect(objects).toHaveCount(before + 1);
  await expect(
    page.locator(".layer-row").filter({ hasText: "Heart-leaf shamrock" }),
  ).toBeVisible();
});

test("categories, empty results, keyboard dismissal and minimum-window layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 740 });
  await page.goto("/");
  const open = page.getByRole("button", { name: "Shape library", exact: true });
  await open.click();
  await page.getByRole("button", { name: "Animals", exact: true }).click();
  await expect(page.locator(".shape-library-card")).toHaveCount(5);
  await page.getByLabel("Search shapes").fill("shamrocks");
  await expect(
    page.getByText("No shapes found", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all shapes" }).click();
  await expect(page.locator(".shape-library-card")).toHaveCount(36);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (t) => (document.documentElement.dataset.theme = t),
      theme,
    );
    await expect(
      page.getByText("Mantis originals · CC0", { exact: true }),
    ).toBeInViewport();
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(740);
    await page.screenshot({ path: `test-results/shape-library-${theme}.png` });
  }
  await page.getByLabel("Search shapes").press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(open).toBeFocused();
});

test("object limit prevents insertion without changing the project", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const obj = {
      type: "path",
      name: "Shape",
      x: 10,
      y: 10,
      width: 10,
      height: 10,
      rotation: 0,
      fill: "#285c48",
      operation: "cut",
      visible: true,
      locked: false,
      pathData: "M0 0H100V100H0Z",
    };
    localStorage.setItem(
      "hopper.project.v1",
      JSON.stringify({
        format: "hopper",
        version: 4,
        name: "Full",
        width: 1152,
        height: 1152,
        objects: Array.from({ length: 1000 }, (_, i) => ({
          ...obj,
          id: `full-${i}`,
        })),
      }),
    );
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Shape library", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("1,000 objects");
  await expect(
    page.getByRole("button", { name: "Add Classic shamrock", exact: true }),
  ).toBeDisabled();
});
