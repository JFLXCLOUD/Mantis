import { openProperties } from './property-helpers';
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function textFixture(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .setInputFiles({
      name: "text.hopper",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "hopper",
          version: 3,
          name: "Curved words",
          width: 1152,
          height: 1152,
          objects: [
            {
              id: "words",
              name: "Words",
              type: "text",
              text: "HELLO MANTIS",
              font: "Georgia",
              x: 280,
              y: 350,
              width: 560,
              height: 90,
              rotation: 0,
              fill: "#285c48",
              operation: "cut",
              visible: true,
              locked: false,
            },
          ],
        }),
      ),
    });
  await page.getByRole("button", { name: "Select Words", exact: true }).click();
  await openProperties(page, 'Effects');
  await page.getByRole('tab', {name:'Curve',exact:true}).click();
}
async function saved(page: Page) {
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("hopper.project.v1")!),
  );
}
async function exportFile(page: Page, name = "Export SVG") {
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return readFile((await (await downloading).path())!);
}
test("up/down curves keep editable words, fit selection bounds, reset and survive save/reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await textFixture(page);
  await page.getByRole("button", { name: "Curve up", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Text curve", exact: true }),
  ).toHaveValue("-60");
  const up = (await saved(page)).objects[0];
  expect(up.height).toBeGreaterThan(90);
  expect(up.text).toBe("HELLO MANTIS");
  expect(up.x + up.width / 2).toBeCloseTo(560);
  expect(up.y + up.height / 2).toBeCloseTo(395);
  const direction = await page
    .locator('[data-object-id="words"] defs path')
    .evaluate((p: SVGPathElement) => ({
      start: p.getPointAtLength(0).y,
      middle: p.getPointAtLength(p.getTotalLength() / 2).y,
    }));
  expect(direction.middle).toBeLessThan(direction.start);
  const fits = await page.locator('[data-object-id="words"]').evaluate((el) => {
    const glyphs = el.querySelector("text")!.getBoundingClientRect();
    const box = el.querySelector(":scope > rect")!.getBoundingClientRect();
    return (
      glyphs.left >= box.left - 1 &&
      glyphs.right <= box.right + 1 &&
      glyphs.top >= box.top - 1 &&
      glyphs.bottom <= box.bottom + 1
    );
  });
  expect(fits).toBe(true);
  await page.getByRole("button", { name: "Curve down", exact: true }).click();
  expect((await saved(page)).objects[0].textCurve).toBe(60);
  const down = await page
    .locator('[data-object-id="words"] defs path')
    .evaluate(
      (p: SVGPathElement) => p.getPointAtLength(p.getTotalLength() / 2).y,
    );
  expect(down).toBeGreaterThan(0);
  await page.getByRole("tab", {name:"Text",exact:true}).click();
  await page.getByLabel("Text content").fill("Café & craft");
  await page.getByRole("tab", {name:"Style",exact:true}).click();
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  await saved(page);
  await page.reload();
  await page.getByRole("button", { name: "Select Words", exact: true }).click();
  await openProperties(page, 'Effects');
  await page.getByRole('tab', {name:'Curve',exact:true}).click();
  await expect(
    page.getByRole("slider", { name: "Text curve", exact: true }),
  ).toHaveValue("60");
  await expect(page.locator('[data-object-id="words"] textPath')).toHaveText(
    "Café & craft",
  );
  await page.getByRole("button", { name: "Straight", exact: true }).click();
  await expect(page.locator('[data-object-id="words"] textPath')).toHaveCount(
    0,
  );
  const final = await saved(page);
  expect(final.version).toBe(5);
  expect(final.objects[0].textCurve).toBe(0);
  const project = await exportFile(page, "Save project");
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .setInputFiles({
      name: "reopened.hopper",
      mimeType: "application/json",
      buffer: project,
    });
  expect(errors).toEqual([]);
});

test("slider previews commit as one undo step; Escape cancels; locked text cannot curve", async ({
  page,
}) => {
  await textFixture(page);
  const slider = page.getByRole("slider", { name: "Text curve", exact: true });
  await slider.scrollIntoViewIfNeeded();
  const r = (await slider.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.16, r.y + r.height / 2, { steps: 7 });
  await page.mouse.up();
  expect((await saved(page)).objects[0].textCurve).toBeLessThan(-90);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(slider).toHaveValue("0");
  await page
    .getByRole("button", { name: "Redo (Ctrl+Shift+Z)", exact: true })
    .click();
  const curved = (await saved(page)).objects[0].textCurve;
  await slider.focus();
  await page.keyboard.down("ArrowRight");
  await page.keyboard.press("Escape");
  await page.keyboard.up("ArrowRight");
  await expect(slider).toHaveValue(String(curved));
  await page
    .locator('[data-layer-id="words"]')
    .getByRole("button", { name: /Lock/ })
    .click();
  await expect(slider).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Curve up", exact: true }),
  ).toBeDisabled();
});

test("curved SVGs retain local text paths when reimported and copied, and PNG export contains ink", async ({
  page,
}) => {
  await textFixture(page);
  await page.getByRole("button", { name: "Curve up", exact: true }).click();
  await openProperties(page, 'Size & position');
  await page.getByLabel("Width", { exact: true }).fill("4");
  const svg = (await exportFile(page)).toString("utf8");
  expect(svg).toContain("<textPath");
  expect(svg).toContain("HELLO MANTIS");
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .setInputFiles({
      name: "curve.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(svg),
    });
  await page
    .getByRole("button", { name: "Copy in place", exact: true })
    .click();
  const ids = await page
    .locator(".design-canvas textPath")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  expect(ids.length).toBe(3);
  expect(new Set(ids).size).toBe(3);
  expect(
    await page
      .locator(".design-canvas textPath")
      .evaluateAll((nodes) =>
        nodes.every(
          (n) =>
            document.getElementById(n.getAttribute("href")!.slice(1))
              ?.localName === "path",
        ),
      ),
  ).toBe(true);
  // Print only the original editable text, avoiding imported full-canvas bounds.
  await page.getByRole("button", { name: "Select Words", exact: true }).click();
  await openProperties(page, 'Effects');
  await page.getByRole('tab', {name:'Curve',exact:true}).click();
  await page
    .getByRole("button", { name: "Print Then Cut", exact: false })
    .click();
  const png = await exportFile(page, "Export print artwork (PNG)");
  const ink = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = 100;
    c.height = 100;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 100, 100);
    const bytes = ctx.getImageData(0, 0, 100, 100).data;
    let pixels = 0;
    for (let i = 3; i < bytes.length; i += 4) if (bytes[i]) pixels++;
    return pixels;
  }, png.toString("base64"));
  expect(ink).toBeGreaterThan(100);
});
