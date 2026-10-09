import { test, expect, _electron as electron } from "@playwright/test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("machine setup saves preferences and exports an honest mirrored job draft", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "Machine and job setup" });
  await expect(
    panel.getByText("Open Mantis Studio for Windows to scan USB"),
  ).toBeVisible();
  await expect(panel.getByLabel("Target machine")).toHaveValue("maker-4");
  await panel.getByLabel("Target machine").selectOption("maker-3");
  await panel.getByLabel("Job material").fill("Removable vinyl");
  await panel.getByLabel("Job passes").selectOption("3");
  await panel.getByLabel("Mirror for iron-on").check();
  await expect(
    panel.getByRole("button", { name: "Send cut job", exact: true }),
  ).toBeDisabled();
  const downloading = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save job draft" }).click();
  const job = JSON.parse(
    await readFile((await (await downloading).path())!, "utf8"),
  );
  expect(job.target.model).toBe("maker-3");
  expect(job.setup).toMatchObject({
    material: "Removable vinyl",
    passes: 3,
    mirror: true,
  });
  expect(job.artwork.svg).toContain("scale(-1 1)");
  expect(job.preflight.sendAllowed).toBe(false);
  expect(job.machineReady).toBe(false);
  await page.reload();
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await expect(panel.getByLabel("Target machine")).toHaveValue("maker-3");
  await expect(panel.getByLabel("Job material")).toHaveValue("Removable vinyl");
  await expect(panel.getByLabel("Job passes")).toHaveValue("3");
  await page.setViewportSize({ width: 1100, height: 740 });
  await page.screenshot({ path: "docs/screenshots/machine-setup-browser.png" });
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await panel.getByLabel("Job artwork group").selectOption("1");
  await panel.getByRole("button", { name: "Artwork preview" }).click();
  await expect(
    page.getByRole("dialog", { name: "Prepare your design" }),
  ).toBeVisible();
  await expect(page.locator(".material-list > button").nth(1)).toHaveClass(
    "selected",
  );
  await page.getByRole("button", { name: "Machine & job setup" }).click();
  await expect(panel.getByLabel("Job artwork group")).toHaveValue("1");
});

test("discovery fixtures show detected-only, redact reports and clear disconnected devices", async ({
  page,
}) => {
  // Test-only bridge fixture; production has no simulated device list.
  await page.addInitScript(() => {
    let calls = 0;
    window.hopperMachine = {
      scanBluetooth: async () => ({
        status: "ok",
        radio: "on",
        devices: [],
        warnings: [],
      }),
      openBluetoothSettings: async () => ({ opened: true, message: "Opened" }),
      scanUsb: async () => {
        calls++;
        if (calls > 2)
          return {
            status: "error",
            devices: [],
            warnings: [],
            message: "Test scan timed out.",
          };
        return {
          status: "ok",
          warnings: [],
          devices:
            calls === 1
              ? [
                  {
                    id: "test-private-id",
                    name: "Cricut Maker 4",
                    vendorId: "20D3",
                    productId: "1234",
                    modelHint: "maker-4",
                    ports: ["COM7"],
                    windowsStatus: "OK",
                    transport: "usb",
                    connection: "detected-only",
                    canSend: false,
                  },
                ]
              : [],
        };
      },
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "Machine and job setup" });
  await expect(panel.getByText(/Detected by Windows.*COM7/)).toBeVisible();
  await panel.getByRole("button", { name: /Cricut Maker 4 Detected/ }).click();
  await expect(
    panel.getByText(/no device handshake has been performed/),
  ).toBeVisible();
  await panel.getByLabel("Target machine").selectOption("maker-3");
  await expect(panel.getByRole("alert")).toContainText(
    "device name suggests Cricut Maker 4",
  );
  const downloading = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Save USB report" }).click();
  const report = await readFile((await (await downloading).path())!, "utf8");
  expect(report).not.toContain("test-private-id");
  expect(report).toContain("not-performed");
  await panel.getByRole("button", { name: "Scan USB devices" }).click();
  await expect(panel.getByText("No Cricut USB device detected")).toBeVisible();
  await expect(panel.locator(".machine-device")).toHaveCount(0);
  await panel.getByRole("button", { name: "Scan USB devices" }).click();
  await expect(panel.getByRole("alert")).toContainText("Test scan timed out.");
  await expect(panel.getByText("No Cricut USB device detected")).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Send cut job", exact: true }),
  ).toBeDisabled();
});

test("desktop discovers actual Windows USB metadata through a restricted bridge", async () => {
  test.skip(process.env.MANTIS_TEST_HARDWARE !== "1", "Opt-in local USB/Bluetooth discovery; requires a Windows Bluetooth radio turned on.");
  test.setTimeout(60000);
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const profile = await mkdtemp(join(tmpdir(), "hopper-machine-test-"));
  const app = await electron.launch({
    args: [".", `--user-data-dir=${profile}`],
    env,
  });
  try {
    const page = await app.firstWindow();
    await expect(page.getByLabel("Project name")).toBeVisible();
    const result = await page.evaluate(async () => ({
      keys: Object.keys(window.hopperMachine!),
      scan: await window.hopperMachine!.scanUsb(),
      node: typeof (window as unknown as { require?: unknown }).require,
    }));
    expect(result.keys).toEqual([
      "scanUsb",
      "scanBluetooth",
      "bluetoothStatus",
      "connectBluetooth",
      "disconnectBluetooth",
      "openBluetoothSettings",
    ]);
    expect(result.node).toBe("undefined");
    expect(result.scan.status).toBe("ok");
    expect(
      result.scan.devices.every(
        (d) => d.connection === "detected-only" && !d.canSend,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Machine setup", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Scan USB devices" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Send cut job", exact: true }),
    ).toBeDisabled();
    await page.screenshot({
      path: "docs/screenshots/machine-setup-desktop.png",
    });
    await page.getByRole("button", { name: "Bluetooth", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Scan Bluetooth devices" }),
    ).toBeEnabled({ timeout: 30000 });
    const bluetooth = await page.evaluate(() =>
      window.hopperMachine!.scanBluetooth(),
    );
    expect(bluetooth.status).toBe("ok");
    expect(bluetooth.radio).toBe("on");
    expect(
      bluetooth.devices.every(
        (d) => d.connection === "detected-only" && !d.canSend,
      ),
    ).toBe(true);
    await page.screenshot({ path: "docs/screenshots/bluetooth-desktop.png" });
  } finally {
    await app.close();
    if (!profile.startsWith(join(tmpdir(), "hopper-machine-test-")))
      throw new Error("Unexpected profile location");
    await rm(profile, { recursive: true, force: true });
  }
});
