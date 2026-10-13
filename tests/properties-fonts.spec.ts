import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { openProperties } from "./property-helpers";
async function words(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
}
async function download(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return readFile((await (await pending).path())!);
}
test("menus keep text, curves and colors collapsed; switching menus cancels previews and Escape retains selection", async ({
  page,
}) => {
  await words(page);
  await expect(page.getByLabel("Text content")).toHaveCount(0);
  await expect(
    page.getByRole("slider", { name: "Text curve", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Basic color palette" }),
  ).toHaveCount(0);
  await openProperties(page, "Effects");
  await page.getByLabel("Text content").fill("A little magic");
  await page.getByRole("tab", {name:"Curve", exact:true}).click();
  await page.getByRole("button", { name: "Curve up", exact: true }).click();
  await page.getByRole("button", {name:"Curve up", exact:true}).press("Escape");
  await expect(
    page.getByRole("button", { name: "Effects", exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId("resize-e")).toBeVisible();
  await openProperties(page, "Color");
  await page.getByRole("button", { name: "Advanced color picker" }).click();
  await page.getByLabel("HEX color").fill("#ff0000");
  await openProperties(page, "Effects");
  await expect(page.getByLabel("HEX color")).toHaveCount(0);
  await expect(
    page.locator(".canvas-object").last().locator("text"),
  ).toHaveAttribute("fill", "#285c48");
  await expect(page.getByLabel("Text content")).toHaveValue("A little magic");
});
test("board color persists with contrasting grid, leaves project and exports unchanged, and resets", async ({
  page,
}) => {
  await words(page);
  const before = await download(page, "Save project");
  await openProperties(page, "Board settings");
  await page.getByRole("button", { name: "Navy #243b70", exact: true }).click();
  await expect(page.getByTestId("board-background")).toHaveAttribute(
    "fill",
    "#243b70",
  );
  await expect(page.locator("#small-grid path")).toHaveAttribute(
    "stroke",
    "#ffffff18",
  );
  const after = await download(page, "Save project");
  expect(after.equals(before)).toBe(true);
  expect((await download(page, "Export SVG")).toString()).not.toContain(
    "#243b70",
  );
  await page.reload();
  await expect(page.getByTestId("board-background")).toHaveAttribute(
    "fill",
    "#243b70",
  );
  await openProperties(page, "Board settings");
  await page.getByRole("button", { name: "Reset to white" }).click();
  await expect(page.getByTestId("board-background")).toHaveAttribute(
    "fill",
    "#ffffff",
  );
});
test("font search selects actual system families, accepts more than the original four, and survives undo/reload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.mantisFonts = {
      list: async () => ({ fonts: ["Arial", "Georgia", "Segoe UI", "Tahoma"] }),
    };
  });
  await words(page);
  await openProperties(page, "Effects");
  await page.getByLabel("Search fonts").fill("segoe");
  await expect(
    page.getByLabel("Font", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await page.getByLabel("Font", { exact: true }).selectOption("Segoe UI");
  await page.getByRole("tab", {name:"Curve", exact:true}).click();
  await page.getByRole("button", { name: "Curve down", exact: true }).click();
  const saved = JSON.parse((await download(page, "Save project")).toString());
  expect(saved.objects.at(-1).font).toBe("Segoe UI");
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .first()
    .setInputFiles({
      name: "font.hopper",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(saved)),
    });
  await page
    .getByRole("button", { name: "Select Your words", exact: true })
    .click();
  await openProperties(page, "Effects");
  await expect(page.getByLabel("Font", { exact: true })).toHaveValue(
    "Segoe UI",
  );
});
test("imported fonts are validated, deduplicated, restored before rendering and included in SVG/print output", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await words(page);
  await openProperties(page, "Effects");
  const importer = page.getByLabel("Import font file", { exact: true });
  await importer.setInputFiles({
    name: "broken.ttf",
    mimeType: "font/ttf",
    buffer: Buffer.from("not a font"),
  });
  await expect(page.getByRole("alert")).toContainText("damaged or unsupported");
  const bytes = await readFile(
    join(process.env.SystemRoot || "C:\\Windows", "Fonts", "arial.ttf"),
  );
  await importer.setInputFiles({
    name: "My imported font.ttf",
    mimeType: "font/ttf",
    buffer: bytes,
  });
  await expect(page.getByLabel("Font", { exact: true })).toHaveValue(
    /^MantisFont_/,
  );
  const family = await page.getByLabel("Font", { exact: true }).inputValue();
  await importer.setInputFiles({
    name: "Same font.ttf",
    mimeType: "font/ttf",
    buffer: bytes,
  });
  await expect(page.getByLabel("Font", { exact: true })).toHaveValue(family);
  await page.getByRole("tab", {name:"Curve", exact:true}).click();
  await page.getByRole("button", { name: "Curve up", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("hopper.project.v1") || "{}",
          ).objects?.at(-1)?.font,
      ),
    )
    .toBe(family);
  await page.reload();
  await page
    .getByRole("button", { name: "Select Your words", exact: true })
    .click();
  await openProperties(page, "Effects");
  await expect(page.getByLabel("Font", { exact: true })).toHaveValue(family);
  expect(
    await page.evaluate(
      (f) =>
        [...document.fonts].some(
          (font) => font.family === f && font.status === "loaded",
        ),
      family,
    ),
  ).toBe(true);
  const svg = (await download(page, "Export SVG")).toString();
  expect(svg).toContain("@font-face");
  expect(svg).toContain("data:font/ttf;base64,");
  const printed = await page.evaluate(async () => {
    const { printArtworkSvg, rasterizeArtwork, artworkBounds } =
      await import("/src/printing.ts");
    const { importSvg } = await import('/src/io.ts');
    const objects = JSON.parse(
      localStorage.getItem("hopper.project.v1")!,
    ).objects.slice(-1);
    const box = artworkBounds(objects),
      svg = printArtworkSvg(objects, box, 200, 100);
    const blob = await rasterizeArtwork(objects, box, 2);
    const reference = await rasterizeArtwork(objects.map((o: any) => ({ ...o, font: 'Arial' })), box, 2);
    const actualBytes = new Uint8Array(await blob.arrayBuffer());
    const referenceBytes = new Uint8Array(await reference.arrayBuffer());
    return {
      hasFont: svg.includes("@font-face"),
      reimportKeepsFont: printArtworkSvg([importSvg(svg, 'font.svg')], box, 200, 100).includes('@font-face'),
      matchesSystemFont: actualBytes.length === referenceBytes.length && actualBytes.every((value, i) => value === referenceBytes[i]),
      type: blob.type,
      size: blob.size,
    };
  });
  expect(printed.hasFont).toBe(true);
  expect(printed.reimportKeepsFont).toBe(true);
  expect(printed.matchesSystemFont).toBe(true);
  expect(printed.type).toBe("image/png");
  expect(printed.size).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});
