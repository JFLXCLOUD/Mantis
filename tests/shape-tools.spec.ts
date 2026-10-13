import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const ring = {
  id: "ring",
  name: "Ring",
  type: "path",
  x: 180,
  y: 180,
  width: 300,
  height: 300,
  rotation: 0,
  fill: "#285c48",
  operation: "cut",
  visible: true,
  locked: false,
  pathData: "M0 0H100V100H0Z M25 25V75H75V25Z",
};
async function setup(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Import artwork or project", { exact: true })
    .setInputFiles({
      name: "shapes.mantis",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "hopper",
          version: 5,
          name: "Shape workshop",
          width: 1152,
          height: 1152,
          objects: [
            ring,
            { ...ring, id: "gold", name: "Gold", fill: "#e4b351", x: 550 },
            {
              ...ring,
              id: "locked",
              name: "Locked",
              locked: true,
              x: 200,
              y: 600,
            },
          ],
        }),
      ),
    });
  await page.getByRole("button", { name: "Select Ring", exact: true }).click();
}
async function save(page: Page) {
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  return JSON.parse(await readFile((await (await d).path())!, "utf8"));
}
async function tool(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Shape tools", exact: true });
  if ((await menu.getAttribute("aria-expanded")) !== "true") await menu.click();
  await page.getByRole("button", { name, exact: true }).click();
}
test("offset previews cancel, preserve originals, add behind selection and undo once", async ({
  page,
}) => {
  await setup(page);
  await tool(page, "Offset");
  await page.getByLabel("Offset distance", { exact: true }).fill("0.25");
  await page.getByLabel("Offset corners").selectOption("sharp");
  await expect(page.getByTestId("offset-preview").locator("path")).toHaveCount(
    1,
  );
  expect((await save(page)).objects).toHaveLength(3);
  await page.getByLabel("Offset distance", { exact: true }).press("Escape");
  await expect(page.getByTestId("offset-preview").locator("path")).toHaveCount(
    0,
  );
  await tool(page, "Offset");
  await page.getByLabel("Offset distance", { exact: true }).fill("0.25");
  await page.getByLabel("Offset corners").selectOption("sharp");
  await page
    .getByRole("button", { name: "Add offset layer", exact: true })
    .click();
  const saved = await save(page);
  expect(saved.objects).toHaveLength(4);
  expect(saved.objects[1]).toEqual(ring);
  expect(saved.objects[0].name).toBe("Offset");
  expect(saved.objects[0].width).toBeCloseTo(348, 1);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  expect((await save(page)).objects).toHaveLength(3);
  await page.getByRole("button", { name: "Select Ring", exact: true }).click();
  await tool(page, "Offset");
  await page.getByLabel("Offset distance", { exact: true }).fill("-1");
  await expect(page.getByRole("alert")).toContainText("entire shape");
  await expect(
    page.getByRole("button", { name: "Add offset layer", exact: true }),
  ).toBeDisabled();
});
test("contours restore after reload and stay within a small dark window", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 1100, height: 740 });
  await setup(page);
  await tool(page, "Contour");
  await page.getByLabel("Show contour 2").uncheck();
  expect((await save(page)).objects[0].hiddenContours).toBeUndefined();
  await page
    .getByRole("button", { name: "Apply contours", exact: true })
    .click();
  let saved = await save(page);
  expect(saved.objects[0].hiddenContours).toEqual([1]);
  expect(saved.version).toBe(6);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("hopper.project.v1") || "{}")
            .objects?.[0]?.hiddenContours,
      ),
    )
    .toEqual([1]);
  await page.reload();
  await page.getByRole("button", { name: "Select Ring", exact: true }).click();
  await tool(page, "Contour");
  await expect(page.getByLabel("Show contour 2")).not.toBeChecked();
  const b = await page.locator(".property-menu-content").boundingBox();
  expect(b!.y + b!.height).toBeLessThanOrEqual(740);
  await page.getByRole("button", { name: "Show all", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply contours", exact: true })
    .click();
  saved = await save(page);
  expect(saved.objects[0].hiddenContours).toEqual([]);
  expect(saved.objects[0].pathData.match(/[Mm]/g)).toHaveLength(2);
  await page
    .getByRole("button", { name: "Select Locked", exact: true })
    .click();
  await tool(page, "Contour");
  await expect(page.getByRole("alert")).toContainText("Unlock");
  await expect(
    page.getByRole("button", { name: "Apply contours", exact: true }),
  ).toHaveCount(0);
});
test("material colors preserve locked layers, operations and undo; Exclude creates editable geometry", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Material colors", exact: true })
    .click();
  await page.getByLabel("Source material color").selectOption("#285c48");
  await page.getByLabel("Target material color").selectOption("#e4b351");
  await page.getByRole("button", { name: "Match colors", exact: true }).click();
  let saved = await save(page);
  expect(saved.objects.map((o: { fill: string }) => o.fill)).toEqual([
    "#e4b351",
    "#e4b351",
    "#285c48",
  ]);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  saved = await save(page);
  expect(saved.objects[0].fill).toBe("#285c48");
  await page.getByRole("button", { name: "Select Ring", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Gold", exact: true })
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Combine", exact: true }).click();
  await page.getByRole("button", { name: /^Exclude/ }).click();
  saved = await save(page);
  expect(saved.objects).toHaveLength(2);
  expect(
    saved.objects.find((o: { name: string }) => o.name === "Exclude").type,
  ).toBe("path");
});
