import { test, expect, type Page } from "@playwright/test";
const object = (id: string, x: number, extra = {}) => ({
  id,
  name: id,
  type: "rect",
  x,
  y: 96,
  width: 144,
  height: 144,
  rotation: 0,
  fill: "#285c48",
  operation: "cut",
  visible: true,
  locked: false,
  ...extra,
});
async function load(
  page: Page,
  objects = [object("One", 96), object("Two", 336), object("Three", 576)],
) {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "menu.hopper",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "hopper",
        version: 3,
        name: "Object menu",
        width: 1152,
        height: 1152,
        objects,
      }),
    ),
  });
}
const menu = (page: Page) => page.getByRole("menu", { name: "Object actions" });
async function snapshot(page: Page) {
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("hopper.project.v1")!),
  );
}
test("right click targets an unselected object without moving it, duplicates and undoes in one step", async ({
  page,
}) => {
  await load(page);
  await page.getByRole("button", { name: "Select One", exact: true }).click();
  await page.locator('[data-object-id="Two"]').click({ button: "right" });
  await expect(page.getByLabel("Layer name", { exact: true })).toHaveValue(
    "Two",
  );
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press("Control+Shift+d");
  await expect(menu(page)).toHaveCount(0);
  const p = await snapshot(page);
  expect(p.objects).toHaveLength(4);
  expect(p.objects[3]).toMatchObject({
    name: "Two copy",
    x: 336,
    y: 96,
    width: 144,
    height: 144,
  });
  expect(p.objects[1]).toMatchObject({ x: 336, y: 96 });
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(
    page.getByText("3 editable objects", { exact: true }),
  ).toBeVisible();
});
test("multi-selection order, grouping and combined-shape dialog work from layer context menus", async ({
  page,
}) => {
  await load(page);
  await page.getByRole("button", { name: "Select One", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Two", exact: true })
    .click({ modifiers: ["Shift"] });
  await page.locator('[data-layer-id="Two"]').click({ button: "right" });
  await expect(
    menu(page).getByText("2 selected layers", { exact: true }),
  ).toBeVisible();
  await menu(page)
    .getByRole("menuitem", { name: "Bring to front", exact: true })
    .click();
  expect(
    (await snapshot(page)).objects.map((o: { id: string }) => o.id),
  ).toEqual(["Three", "One", "Two"]);
  await page.locator('[data-layer-id="Two"]').click({ button: "right" });
  await menu(page)
    .getByRole("menuitem", { name: "Group", exact: true })
    .click();
  const grouped = (await snapshot(page)).objects.filter(
    (o: { id: string }) => o.id !== "Three",
  );
  expect(grouped[0].groupId).toBeTruthy();
  expect(grouped[0].groupId).toBe(grouped[1].groupId);
  await page.locator('[data-layer-id="One"]').click({ button: "right" });
  await menu(page)
    .getByRole("menuitem", { name: "Combine shapes…", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Combine shapes" }),
  ).toBeVisible();
  await expect(menu(page)).toHaveCount(0);
});
test("locked canvas objects can be unlocked; mixed selections cannot partially delete and hidden layers can be shown", async ({
  page,
}) => {
  await load(page, [
    object("One", 96, { locked: true }),
    object("Two", 336),
    object("Three", 576, { visible: false }),
  ]);
  // Browser hit testing passes through locked objects; a coordinate click exercises
  // the menu's independent hit test rather than forcing events onto the DOM node.
  const box = await page.locator('[data-object-id="One"] > rect').boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, {
    button: "right",
  });
  await expect(
    menu(page).getByRole("menuitem", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Select Two", exact: true })
    .click({ modifiers: ["Shift"] });
  await page.locator('[data-layer-id="Two"]').click({ button: "right" });
  await expect(
    menu(page).getByRole("menuitem", { name: "Duplicate", exact: true }),
  ).toBeDisabled();
  await expect(
    menu(page).getByRole("menuitem", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.locator('[data-layer-id="Three"]').click({ button: "right" });
  await menu(page).getByRole("menuitem", { name: "Show", exact: true }).click();
  await expect(page.locator('[data-object-id="Three"]')).toBeVisible();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, {
    button: "right",
  });
  await menu(page)
    .getByRole("menuitem", { name: "Unlock", exact: true })
    .click();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, {
    button: "right",
  });
  await expect(
    menu(page).getByRole("menuitem", { name: "Delete", exact: true }),
  ).toBeEnabled();
});
test("menu stays on screen, supports keyboard navigation, preserves selection on Escape and dismisses outside", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 740 });
  await load(page);
  const layer = page.getByRole("button", { name: "Select Three", exact: true });
  await layer.focus();
  await page.keyboard.press("Shift+F10");
  await expect(menu(page)).toBeVisible();
  await expect(
    menu(page).getByRole("menuitem", { name: "Duplicate", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    menu(page).getByRole("menuitem", { name: "Delete", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await expect(
    menu(page).getByRole("menuitem", {
      name: "Duplicate in place",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(layer).toBeFocused();
  await expect(page.getByLabel("Layer name", { exact: true })).toHaveValue(
    "Three",
  );
  const row = page.locator('[data-layer-id="Three"]');
  const rect = await row.boundingBox();
  await page.mouse.click(
    rect!.x + rect!.width - 3,
    rect!.y + rect!.height - 3,
    { button: "right" },
  );
  const bounds = await menu(page).boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(8);
  expect(bounds!.y).toBeGreaterThanOrEqual(8);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1092);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(732);
  await page.screenshot({ path: "docs/screenshots/object-context-menu.png" });
  await page.getByLabel("Project name").click();
  await expect(menu(page)).toHaveCount(0);
  await row.click({ button: "right" });
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(menu(page)).toHaveCount(0);
});
