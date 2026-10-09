import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const panel = (page: Page) =>
  page.getByRole("dialog", { name: "Machine and job setup" });
async function openLibrary(page: Page) {
  await page.getByRole("button", { name: "Prepare", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose material", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choose your material" }),
  ).toBeVisible();
}
async function exportDraft(page: Page) {
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save job draft", exact: true })
    .click();
  return JSON.parse(await readFile((await (await download).path())!, "utf8"));
}

test("Prepare finds and favorites materials without changing tool, passes or mirror; free text clears metadata", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "hopper.machine-preferences.v1",
      JSON.stringify({
        model: "explore-3",
        transport: "bluetooth",
        material: "Existing stock",
        passes: 3,
        tool: "pen",
      }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Prepare", exact: true }).click();
  await page.getByLabel("Mirror for iron-on").check();
  await page
    .getByRole("button", { name: "Choose material", exact: true })
    .click();
  await page.getByLabel("Search materials").fill("permanent");
  await expect(page.locator(".material-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Favorite Permanent vinyl", exact: true })
    .click();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await page
    .getByRole("button", { name: "Use this material", exact: true })
    .click();
  await expect(panel(page).getByLabel("Job material")).toHaveValue(
    "Permanent vinyl",
  );
  await expect(panel(page).getByLabel("Job tool")).toHaveValue("pen");
  await expect(panel(page).getByLabel("Job passes")).toHaveValue("3");
  await expect(panel(page).getByLabel("Mirror for iron-on")).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Browse materials", exact: true }),
  ).toBeFocused();
  const job = await exportDraft(page);
  expect(job.setup.materialProfile.id).toBe("starter:permanent-vinyl");
  expect(job.setup.pressure).toBeNull();
  expect(job.setup.speed).toBeNull();
  expect(job.machineReady).toBe(false);
  await panel(page).getByLabel("Job material").fill("My handwritten material");
  expect((await exportDraft(page)).setup.materialProfile).toBeUndefined();
  await page.reload();
  await openLibrary(page);
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator(".material-row")).toHaveCount(1);
  await expect(page.locator(".material-row")).toContainText("Permanent vinyl");
  await page.getByLabel("Filter material category").selectOption("paper");
  await expect(
    page.getByText("No materials found", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use this material", exact: true }),
  ).toHaveCount(0);
});

test("custom profiles persist, copy, edit and delete while existing job snapshots survive", async ({
  page,
}) => {
  await page.goto("/");
  await openLibrary(page);
  await page.getByRole("button", { name: "New material", exact: true }).click();
  await page
    .getByLabel("Material name", { exact: true })
    .fill("Studio drawing paper");
  await page.getByLabel("Material category", { exact: true }).selectOption("paper");
  await page.getByLabel("Brand or supplier").fill("My supplier");
  await page.getByLabel("Weight or thickness").fill("90 gsm");
  await page
    .getByLabel("Material notes")
    .fill("Blue pack\nUse the matte side.");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Favorite Studio drawing paper", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use this material", exact: true })
    .click();
  const original = (await exportDraft(page)).setup.materialProfile;
  expect(original).toMatchObject({
    source: "custom",
    name: "Studio drawing paper",
    specification: "90 gsm",
    notes: "Blue pack\nUse the matte side.",
  });
  await page.reload();
  await openLibrary(page);
  await page.getByRole("button", { name: "My materials", exact: true }).click();
  await expect(page.locator(".material-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Material notes").fill("New observation");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.getByRole("button", { name: "Make a copy", exact: true }).click();
  await expect(page.getByLabel("Material notes")).toHaveValue(
    "New observation",
  );
  await page.getByRole("button", { name: "Cancel edit", exact: true }).click();
  await expect(page.locator(".material-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Make a copy", exact: true }).click();
  await page.getByLabel("Material name", { exact: true }).fill("Second paper");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator(".material-row")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Favorite Second paper", exact: true })).toBeVisible();
  await page.locator('.material-pick').filter({ hasText: 'Studio drawing paper' }).click();
  await page
    .getByRole("button", { name: "Delete profile", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete material", exact: true })
    .click();
  await expect(page.locator(".material-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Back to job setup", exact: true })
    .click();
  expect((await exportDraft(page)).setup.materialProfile).toEqual(original);
  await page.reload();
  await openLibrary(page);
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator(".material-row")).toHaveCount(0);
});

test("material browsing is usable in dark mode at minimum size and never starts a device connection", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 1100, height: 740 });
  await page.addInitScript(() => {
    (window as any).testDeviceCalls = [];
    window.hopperMachine = {
      scanUsb: async () => {
        (window as any).testDeviceCalls.push("scan");
        return { status: "ok", devices: [], warnings: [] };
      },
      scanBluetooth: async () => ({
        status: "ok",
        radio: "off",
        devices: [],
        warnings: [],
      }),
      openBluetoothSettings: async () => ({ opened: true, message: "" }),
      connectBluetooth: async () => {
        (window as any).testDeviceCalls.push("connect");
        throw Error("Unexpected device access");
      },
    };
  });
  await page.goto("/");
  await openLibrary(page);
  expect(await page.evaluate(() => (window as any).testDeviceCalls)).toEqual(
    [],
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Search materials").fill("iron-on");
  await expect(page.locator(".material-row")).toHaveCount(2);
  expect(
    await panel(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: "test-results/materials-minimum-dark.png" });
  await page.getByRole("button", { name: "New material", exact: true }).click();
  await expect(page.getByLabel("Material name", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Cancel edit", exact: true }).click();
  await expect(page.getByLabel("Search materials")).toBeFocused();
});

test("storage failure keeps an unsaved custom form open and leaves the saved library intact", async ({
  page,
}) => {
  await page.goto("/");
  await openLibrary(page);
  await page.getByRole("button", { name: "New material", exact: true }).click();
  await page
    .getByLabel("Material name", { exact: true })
    .fill("Unsaved material");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "mantis.material-library.v1")
        throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await expect(page.getByLabel("Material name", { exact: true })).toHaveValue(
    "Unsaved material",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("mantis.material-library.v1"),
    ),
  ).toBeNull();
});
