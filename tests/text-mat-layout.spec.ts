import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const word = {
  id: "words",
  type: "text",
  name: "Words",
  text: "MAKE",
  font: "Arial",
  x: 150,
  y: 160,
  width: 480,
  height: 90,
  rotation: 0,
  fill: "#285c48",
  operation: "cut",
  visible: true,
  locked: false,
};
async function setup(page: Page, objects: unknown[] = [word]) {
  await page.goto("/");
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .setInputFiles({
      name: "layout.mantis",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "hopper",
          version: 5,
          name: "Layout review",
          width: 1152,
          height: 1152,
          objects,
        }),
      ),
    });
}
async function save(page: Page) {
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  return JSON.parse(await readFile((await (await d).path())!, "utf8"));
}
async function layout(page: Page) {
  await page.getByRole("button", { name: "Select Words", exact: true }).click();
  await page.getByRole("button", { name: "Effects", exact: true }).click();
  await page.getByRole("tab", { name: "Layout", exact: true }).click();
}
test("separates plain letters into editable positioned layers with one undo", async ({
  page,
}) => {
  await setup(page);
  await layout(page);
  await page
    .getByRole("button", { name: "Separate letters", exact: true })
    .click();
  let saved = await save(page);
  expect(saved.objects.map((o: { text: string }) => o.text)).toEqual([
    "M",
    "A",
    "K",
    "E",
  ]);
  expect(
    saved.objects.every(
      (o: { type: string; height: number }) =>
        o.type === "text" && o.height === 90,
    ),
  ).toBe(true);
  expect(saved.objects[0].x).toBeCloseTo(150, 0);
  expect(saved.objects[3].x).toBeGreaterThan(saved.objects[0].x);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  expect((await save(page)).objects).toEqual([word]);
});
test("wraps words and separates styled lines while retaining placement and project recovery", async ({
  page,
}) => {
  await setup(page, [{ ...word, text: "Made with love", bold: true }]);
  await layout(page);
  await expect(
    page.getByRole("button", { name: "Separate letters", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Wrap line length").fill("9");
  await page
    .getByRole("button", { name: "Wrap words into lines", exact: true })
    .click();
  expect((await save(page)).objects[0].text).toBe("Made with\nlove");
  const before = await page
    .locator('[data-object-id="words"] text')
    .evaluateAll((ns) =>
      ns.map((n) => {
        const b = n.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      }),
    );
  await page
    .getByRole("button", { name: "Separate lines", exact: true })
    .click();
  let saved = await save(page);
  expect(saved.objects.map((o: { text: string }) => o.text)).toEqual([
    "Made with",
    "love",
  ]);
  expect(saved.objects.every((o: { bold: boolean }) => o.bold)).toBe(true);
  const after = await page.locator(".canvas-object text").evaluateAll((ns) =>
    ns.map((n) => {
      const b = n.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }),
  );
  for (let i = 0; i < 2; i++)
    for (const key of ["x", "y", "width", "height"] as const)
      expect(after[i][key]).toBeCloseTo(before[i][key], 0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("hopper.project.v1") || "{}").objects
            ?.length,
      ),
    )
    .toBe(2);
  await page.reload();
  expect((await save(page)).objects).toEqual(saved.objects);
});
test("preparation copies pack onto multiple mats and export the preview without changing the canvas", async ({
  page,
}) => {
  const shape = {
    ...word,
    id: "shape",
    name: "Large tile",
    type: "rect",
    text: undefined,
    font: undefined,
    width: 700,
    height: 700,
  };
  await setup(page, [shape]);
  await page.getByRole("button", { name: "Prepare", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Prepare your design" });
  await dialog.getByLabel("Mat layout").selectOption("compact");
  await dialog.getByLabel("Project copies").fill("3");
  await expect(dialog.locator(".material-list > button")).toHaveCount(3);
  await dialog.locator(".material-list > button").nth(2).click();
  await dialog.getByLabel("Mirror for iron-on").check();
  let d = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Export this group", exact: true })
    .click();
  const svg = await readFile((await (await d).path())!, "utf8");
  expect(svg).toContain("scale(-1 1)");
  expect(svg).toContain("translate(24 24)");
  d = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Save this mat draft", exact: true })
    .click();
  const draft = JSON.parse(await readFile((await (await d).path())!, "utf8"));
  expect(draft.artwork.objectCount).toBe(1);
  expect(draft.preflight.sendAllowed).toBe(false);
  expect(draft.artwork.svg).toBe(svg);
  await dialog.getByLabel("Project copies").fill("0");
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Export this group", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  expect((await save(page)).objects).toEqual([shape]);
});
