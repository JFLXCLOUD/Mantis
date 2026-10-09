import { test, expect } from "@playwright/test";
test("Explore 3 connection distinguishes pairing, transport and cut readiness, survives dialog closure and disconnects", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const id = "a".repeat(24);
    let state: any = {
      status: "disconnected",
      deviceId: null,
      name: null,
      modelHint: null,
      transport: "bluetooth",
      protocol: "rfcomm",
      machineReady: false,
      canSend: false,
      bytesSent: 0,
      bytesReceived: 0,
      message: "No link.",
    };
    window.hopperMachine = {
      scanUsb: async () => ({ status: "ok", devices: [], warnings: [] }),
      openBluetoothSettings: async () => ({
        opened: true,
        message: "Settings",
      }),
      scanBluetooth: async () => ({
        status: "ok",
        radio: "on",
        warnings: [],
        devices: [
          {
            id,
            name: "Explore3-test",
            modelHint: "explore-3",
            transport: "bluetooth",
            protocol: "classic",
            paired: true,
            remembered: true,
            windowsConnected: false,
            connection: "detected-only",
            canSend: false,
          },
        ],
      }),
      bluetoothStatus: async () => ({ ...state }),
      connectBluetooth: async (selected) => {
        if (selected !== id) throw Error("Unexpected target");
        state = {
          ...state,
          status: "connected",
          deviceId: id,
          name: "Explore3-test",
          modelHint: "explore-3",
          message:
            "Bluetooth data link connected. Machine protocol and cutting are not available yet.",
        };
        return { ...state };
      },
      disconnectBluetooth: async () => {
        state = { ...state, status: "disconnected" };
        return { ...state };
      },
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await page.getByRole("button", { name: "Bluetooth", exact: true }).click();
  await page.getByRole("button", { name: /Explore3-test/ }).click();
  const connect = page.getByRole("button", {
    name: "Connect Bluetooth data link",
    exact: true,
  });
  await expect(connect).toBeDisabled();
  await page.getByLabel("Target machine").selectOption("explore-3");
  await expect(connect).toBeEnabled();
  await connect.click();
  await expect(page.getByTestId("bluetooth-connection")).toContainText(
    "Bluetooth data link connected",
  );
  await expect(page.getByTestId("bluetooth-connection")).toContainText(
    "0 command bytes sent",
  );
  await expect(
    page.getByRole("button", { name: "Send cut job", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Disconnect Bluetooth", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "USB", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Disconnect Bluetooth", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Disconnect Bluetooth", exact: true })
    .click();
  await expect(page.getByTestId("bluetooth-connection")).toHaveCount(0);
});
test("an in-progress connection can be cancelled and a lost link is not shown as connected", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let state: any = {
      status: "connecting",
      deviceId: "a".repeat(24),
      name: "Explore3-test",
      modelHint: "explore-3",
      transport: "bluetooth",
      protocol: "rfcomm",
      machineReady: false,
      canSend: false,
      bytesSent: 0,
      bytesReceived: 0,
      message: "Connecting",
    };
    (window as any).loseLink = () =>
      (state = {
        ...state,
        status: "error",
        message: "The Bluetooth data link was lost.",
      });
    window.hopperMachine = {
      scanUsb: async () => ({ status: "ok", devices: [], warnings: [] }),
      scanBluetooth: async () => ({
        status: "ok",
        radio: "on",
        devices: [],
        warnings: [],
      }),
      openBluetoothSettings: async () => ({
        opened: true,
        message: "Settings",
      }),
      bluetoothStatus: async () => ({ ...state }),
      disconnectBluetooth: async () => {
        state = { ...state, status: "disconnected" };
        return { ...state };
      },
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel connection", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => (window as any).loseLink());
  await expect(page.getByTestId("bluetooth-connection")).toContainText(
    "Bluetooth connection interrupted",
  );
  await expect(
    page.getByRole("button", { name: "Disconnect Bluetooth", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send cut job", exact: true }),
  ).toBeDisabled();
});
