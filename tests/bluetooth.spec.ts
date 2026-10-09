import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("Bluetooth pairs through Windows, persists preferences and exports a redacted report", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let count = 0;
    window.hopperMachine = {
      scanUsb: async () => ({ status: "ok", devices: [], warnings: [] }),
      openBluetoothSettings: async () => ({
        opened: true,
        message: "Windows pairing opened for test.",
      }),
      scanBluetooth: async () => {
        count++;
        if (count === 2)
          return {
            status: "unavailable",
            radio: "off",
            devices: [],
            warnings: [],
            message: "Bluetooth is turned off.",
          };
        if (count === 3)
          return {
            status: "error",
            radio: "unknown",
            devices: [],
            warnings: [],
            message: "Bluetooth scan timed out.",
          };
        return {
          status: "ok",
          radio: "on",
          warnings: [],
          devices: [
            {
              id: "private-bt-id",
              name: "Maker4-private-name",
              modelHint: "maker-4",
              transport: "bluetooth",
              protocol: "classic",
              paired: true,
              remembered: true,
              windowsConnected: false,
              connection: "detected-only",
              canSend: false,
            },
            {
              id: "private-bt-id-2",
              name: "Maker3-test",
              modelHint: "maker-3",
              transport: "bluetooth",
              protocol: "classic",
              paired: false,
              remembered: false,
              windowsConnected: true,
              connection: "detected-only",
              canSend: false,
            },
          ],
        };
      },
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "Machine and job setup" });
  await panel.getByRole("button", { name: "Bluetooth", exact: true }).click();
  await expect(
    panel.getByText("Paired in Windows", { exact: false }),
  ).toHaveCount(2);
  await expect(
    panel.getByText(/Availability unknown; saved devices/),
  ).toBeVisible();
  await expect(
    panel.getByText("Windows link active; Mantis Studio readiness unknown"),
  ).toBeVisible();
  await panel.getByRole("button", { name: /Maker3-test/ }).click();
  await expect(panel.getByRole("alert")).toContainText("Cricut Maker 3");
  await panel
    .getByRole("button", { name: "Open Windows Bluetooth settings" })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Windows pairing opened for test.",
  );
  const downloading = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save Bluetooth report" }).click();
  const report = await readFile((await (await downloading).path())!, "utf8");
  expect(report).not.toContain("private");
  expect(JSON.parse(report).devices[0]).toMatchObject({
    paired: true,
    canSend: false,
  });
  await panel.getByRole("button", { name: "Scan Bluetooth devices" }).click();
  await expect(panel.getByRole("alert")).toHaveText("Bluetooth is turned off.");
  await expect(panel.locator(".machine-device")).toHaveCount(0);
  await panel.getByRole("button", { name: "Scan Bluetooth devices" }).click();
  await expect(panel.getByRole("alert")).toHaveText(
    "Bluetooth scan timed out.",
  );
  await expect(
    panel.getByRole("button", { name: "Send cut job", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Bluetooth", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 1100, height: 740 });
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "docs/screenshots/bluetooth-compact.png" });
});

test("late USB scans cannot overwrite the active Bluetooth view", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.hopperMachine = {
      scanUsb: () =>
        new Promise((resolve) => {
          (window as any).finishUsb = () =>
            resolve({
              status: "error",
              devices: [],
              warnings: [],
              message: "Stale USB response",
            });
        }),
      scanBluetooth: async () => ({
        status: "ok",
        radio: "on",
        devices: [],
        warnings: [],
      }),
      openBluetoothSettings: async () => ({
        opened: false,
        message: "Open Windows settings manually.",
      }),
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Scanning Windows USB…" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bluetooth", exact: true }).click();
  await page.evaluate(() => (window as any).finishUsb());
  await expect(
    page.getByText("No Cricut Bluetooth device detected"),
  ).toBeVisible();
  await expect(page.getByText("Stale USB response")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open Windows Bluetooth settings" })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Open Windows settings manually.",
  );
});
