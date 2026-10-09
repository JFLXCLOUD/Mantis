import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("multi-family profiles disable unsupported transports and never offer Classic pairing to BLE models", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.hopperMachine = {
      scanUsb: async () => ({ status: "ok", devices: [], warnings: [] }),
      scanBluetooth: async () => {
        (window as any).classicScans = ((window as any).classicScans || 0) + 1;
        return { status: "ok", radio: "on", devices: [], warnings: [] };
      },
      openBluetoothSettings: async () => ({
        opened: true,
        message: "Test settings",
      }),
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  const model = page.getByLabel("Target machine");
  await expect(model.locator("option")).toHaveCount(15);
  await model.selectOption("joy-2");
  await expect(
    page.getByRole("button", { name: "USB", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Bluetooth Low Energy support is planned"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Windows Bluetooth settings" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).classicScans || 0)).toBe(0);
  await expect(
    page.getByRole("button", { name: "Send cut job", exact: true }),
  ).toBeDisabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save job draft" }).click();
  const job = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(job.target).toMatchObject({ model: "joy-2", transport: "bluetooth" });
  expect(job.preflight.sendAllowed).toBe(false);
  await page.reload();
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await expect(model).toHaveValue("joy-2");
  await model.selectOption("explore-5");
  await page.getByRole("button", { name: "USB", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Scan USB devices" }),
  ).toBeVisible();
  await model.selectOption("joy-xtra");
  await expect(
    page.getByRole("button", { name: "USB", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Scan Bluetooth devices" }),
  ).toBeVisible();
  await model.selectOption("venture");
  await expect(
    page.getByText(/Sending is unavailable until a Cricut Venture adapter/),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/machine-families.png" });
});
