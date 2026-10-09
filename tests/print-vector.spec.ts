import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const shape = (id: string, x: number, extra = {}) => ({
  id,
  name: id,
  type: "path",
  pathData: "M0 0H100V100H0Z",
  x,
  y: 96,
  width: 192,
  height: 192,
  rotation: 0,
  fill: "#285c48",
  operation: "cut",
  visible: true,
  locked: false,
  ...extra,
});
async function load(page: import("@playwright/test").Page, objects: unknown[]) {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "test.hopper",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "hopper",
        version: 3,
        name: "Print and vector test",
        width: 1152,
        height: 1152,
        objects,
      }),
    ),
  });
}
test("combine preserves holes, supports recolor/resize, and undo restores original layers", async ({
  page,
}) => {
  await load(page, [
    shape("Backing", 96),
    shape("Opening", 144, { y: 144, width: 96, height: 96 }),
  ]);
  await page.locator(".canvas-viewport").click({ position: { x: 10, y: 10 } });
  await page.keyboard.press("Control+a");
  await page.getByRole("button", { name: "Combine", exact: true }).click();
  await page.getByRole("button", { name: "Subtract", exact: false }).click();
  await expect(page.getByLabel("Layer name", { exact: true })).toHaveValue(
    "Subtract",
  );
  await page.getByLabel("Width", { exact: true }).fill("3");
  await page.getByLabel("Width", { exact: true }).press("Enter");
  await expect(page.getByLabel("Height", { exact: true })).toHaveValue("3");
  const filePromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await filePromise).path())!, "utf8"),
  );
  expect(saved.objects).toHaveLength(1);
  expect(saved.objects[0].type).toBe("path");
  expect((saved.objects[0].pathData.match(/m/gi) || []).length).toBe(2);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(
    page.getByText("2 editable objects", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Redo (Ctrl+Shift+Z)", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("hopper.project.v1") || "null")?.objects.length,
      ),
    )
    .toBe(1);
  await page.reload();
  await expect(
    page.getByText("1 editable objects", { exact: true }),
  ).toBeVisible();
});
test("Print Then Cut exports transparent 300 dpi PNG and physically sized PDF proof", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await load(page, [
    shape("Sticker", 96, { type: "ellipse" }),
    shape("Hidden", 600, { visible: false }),
    shape("Guide", 900, { operation: "guide" }),
  ]);
  await page
    .getByRole("button", { name: "Print Then Cut", exact: false })
    .click();
  await page.getByLabel("Print target machine").selectOption("explore");
  await page.getByLabel("Print artwork width").fill("4");
  await expect(page.getByText(/1 layers flattened/)).toBeVisible();
  await expect(page.getByText("1200 × 1200 pixels · 300 dpi")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/print-then-cut.png" });
  const pngPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export print artwork (PNG)", exact: true })
    .click();
  const png = await readFile((await (await pngPromise).path())!);
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(1200);
  const density = png.indexOf(Buffer.from("pHYs"));
  expect(density).toBeGreaterThan(0);
  expect(png.readUInt32BE(density + 4)).toBe(11811);
  const pixels = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return {
      corner: [...context.getImageData(0, 0, 1, 1).data],
      center: [...context.getImageData(600, 600, 1, 1).data],
    };
  }, png.toString("base64"));
  expect(pixels.corner[3]).toBe(0);
  expect(pixels.center).toEqual([40, 92, 72, 255]);
  const pdfPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export PDF proof", exact: true })
    .click();
  const pdf = await readFile((await (await pdfPromise).path())!, "latin1");
  expect(pdf).toContain("%PDF-");
  expect(pdf).toContain("/MediaBox [0 0 612. 792.]");
  await page.getByLabel("Print artwork width").fill("10");
  await expect(
    page.getByRole("button", { name: "Export PDF proof", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Print target machine").selectOption("joy");
  await expect(page.getByRole("alert")).toContainText(
    "does not support Print Then Cut",
  );
  expect(errors).toEqual([]);
});
test("original Explore offers USB and explains its external Bluetooth adapter", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await page.getByLabel("Target machine").selectOption("explore");
  await page.getByRole("button", { name: "Bluetooth", exact: true }).click();
  await expect(
    page.getByText(
      "This model requires the separate Cricut Wireless Bluetooth Adapter.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send cut job", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Target machine").selectOption("explore-air");
  await expect(
    page.getByText(
      "This model requires the separate Cricut Wireless Bluetooth Adapter.",
    ),
  ).toHaveCount(0);
});
