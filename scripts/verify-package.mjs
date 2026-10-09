import { _electron as electron, expect } from "@playwright/test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const profile = await mkdtemp(join(tmpdir(), "hopper-package-test-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({
    executablePath: resolve(
      `release/v${version}/win-unpacked/Mantis Studio.exe`,
    ),
    args: [`--user-data-dir=${profile}`],
    env,
    timeout: 60000,
  });
  const page = await app.firstWindow();
  await expect(page.getByLabel("Project name")).toHaveValue(
    "Good things grow here",
  );
  await expect(
    page.getByAltText("Mantis Studio", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".brand-logo")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator(".sidebar-mascot")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.screenshot({ path: "docs/screenshots/packaged-branding.png" });
  await page
    .getByRole("button", { name: "A quick tour of Mantis Studio" })
    .click();
  await expect(page.getByAltText("Manti the praying mantis")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/brand-tour.png" });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Add heart", exact: true }).click();
  await expect(page.getByLabel("Layer name", { exact: true })).toHaveValue(
    "Heart",
  );
  await page
    .getByRole("button", { name: "Select Heart", exact: true })
    .click({ button: "right" });
  const contextMenu = page.getByRole("menu", { name: "Object actions" });
  await expect(contextMenu).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/packaged-object-context-menu.png",
  });
  await contextMenu
    .getByRole("menuitem", { name: "Duplicate in place", exact: true })
    .click();
  await expect(page.getByLabel("Layer name", { exact: true })).toHaveValue(
    "Heart copy",
  );
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await page.getByRole("button", { name: "Select Heart", exact: true }).click();
  await page.getByLabel("Width", { exact: true }).fill("2");
  await page.getByLabel("Width", { exact: true }).press("Enter");
  await expect(page.getByLabel("Height", { exact: true })).toHaveValue("2");
  expect(await app.evaluate(({ app }) => app.getVersion())).toBe(version);
  await page
    .getByRole("button", { name: "Lock proportions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lock proportions", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  const handle = await page.getByTestId("resize-e").boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2 + 60,
    handle.y + handle.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Width", { exact: true }).inputValue()),
    )
    .toBeGreaterThan(2);
  await expect(page.getByLabel("Height", { exact: true })).toHaveValue("2");
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue("2");
  await page
    .getByRole("button", { name: "Redo (Ctrl+Shift+Z)", exact: true })
    .click();
  await page.screenshot({
    path: `docs/screenshots/packaged-editing-${version}.png`,
  });
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("10 editable objects")).toBeVisible();
  await page.getByRole("button", { name: "Prepare", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Machine & job setup" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Machine & job setup" }).click();
  await expect(
    page.getByRole("dialog", { name: "Machine and job setup" }),
  ).toBeVisible();
  await expect(page.getByLabel("Target machine")).toHaveValue("maker-4");
  await expect(page.getByLabel("Target machine").locator("option")).toHaveCount(
    15,
  );
  await page.getByLabel("Target machine").selectOption("joy-2");
  await expect(
    page.getByRole("button", { name: "USB", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Bluetooth Low Energy support is planned"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Windows Bluetooth settings" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/packaged-model-catalog.png",
  });
  await page.getByLabel("Target machine").selectOption("maker-4");
  await expect(
    page.getByRole("button", { name: "Scan Bluetooth devices" }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "USB", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Scan USB devices" }),
  ).toBeEnabled({ timeout: 20000 });
  const scan = await page.evaluate(() => window.hopperMachine.scanUsb());
  expect(scan.status, scan.message).toBe("ok");
  expect(scan.devices.every((device) => !device.canSend)).toBe(true);
  await expect(
    page.getByRole("button", { name: "Send cut job", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Job material").fill("Test vinyl");
  const draftPath = join(profile, "test-job.hopperjob");
  await app.evaluate(({ session }, savePath) => {
    globalThis.hopperTestDownload = "waiting";
    session.defaultSession.once("will-download", (_event, item) => {
      item.setSavePath(savePath);
      item.once("done", (_event, state) => {
        globalThis.hopperTestDownload = state;
      });
    });
  }, draftPath);
  await page.getByRole("button", { name: "Save job draft" }).click();
  await expect
    .poll(() => app.evaluate(() => globalThis.hopperTestDownload))
    .toBe("completed");
  const job = JSON.parse(await readFile(draftPath, "utf8"));
  expect(job.machineReady).toBe(false);
  expect(job.setup.material).toBe("Test vinyl");
  await page.screenshot({
    path: "docs/screenshots/packaged-machine-setup.png",
  });
  await page.getByRole("button", { name: "Bluetooth", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Scan Bluetooth devices" }),
  ).toBeEnabled({ timeout: 30000 });
  const bluetooth = await page.evaluate(() =>
    window.hopperMachine.scanBluetooth(),
  );
  expect(bluetooth.status, bluetooth.message).toBe("ok");
  expect(bluetooth.radio).toBe("on");
  expect(bluetooth.devices.every((device) => !device.canSend)).toBe(true);
  const reportPath = join(profile, "test-bluetooth-report.json");
  await app.evaluate(({ session }, savePath) => {
    globalThis.hopperTestDownload = "waiting";
    session.defaultSession.once("will-download", (_event, item) => {
      item.setSavePath(savePath);
      item.once("done", (_event, state) => {
        globalThis.hopperTestDownload = state;
      });
    });
  }, reportPath);
  await page.getByRole("button", { name: "Save Bluetooth report" }).click();
  await expect
    .poll(() => app.evaluate(() => globalThis.hopperTestDownload))
    .toBe("completed");
  expect(JSON.parse(await readFile(reportPath, "utf8")).format).toBe(
    "hopper-bluetooth-report",
  );
  await page.screenshot({ path: "docs/screenshots/packaged-bluetooth.png" });
  await page.getByRole("button", { name: "Artwork preview" }).click();
  await page.screenshot({ path: "docs/screenshots/packaged-prepare.png" });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Print Then Cut", exact: false })
    .click();
  await page.getByLabel("Print target machine").selectOption("explore");
  await page.getByLabel("Print artwork width").fill("4");
  for (const [name, button] of [
    ["print.png", "Export print artwork (PNG)"],
    ["proof.pdf", "Export PDF proof"],
  ]) {
    const savePath = join(profile, name);
    await app.evaluate(({ session }, savePath) => {
      globalThis.hopperTestDownload = "waiting";
      session.defaultSession.once("will-download", (_event, item) => {
        item.setSavePath(savePath);
        item.once("done", (_event, state) => {
          globalThis.hopperTestDownload = state;
        });
      });
    }, savePath);
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect
      .poll(() => app.evaluate(() => globalThis.hopperTestDownload), {
        timeout: 30000,
      })
      .toBe("completed");
    const bytes = await readFile(savePath);
    if (name.endsWith("png")) expect(bytes.readUInt32BE(16)).toBe(1200);
    else expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  }
  await page.screenshot({
    path: "docs/screenshots/packaged-print-then-cut.png",
  });
  console.log(
    `Packaged Windows ${version} passed: branding, object context menu with duplication/undo, editor transforms, autosave, Prepare, actual Windows USB and Bluetooth discovery through ASAR, native job draft, Bluetooth report, 300 dpi PNG and PDF proof downloads. Direct sending remains disabled.`,
  );
} finally {
  if (app) await app.close();
  if (!profile.startsWith(join(tmpdir(), "hopper-package-test-")))
    throw new Error("Unexpected test profile location");
  await rm(profile, { recursive: true, force: true });
}
