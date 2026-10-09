import { _electron as electron, expect } from "@playwright/test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const targetName = process.argv[2];
if (!targetName)
  throw Error(
    "Pass the exact paired Explore 3 name. This opens its data link but sends no machine commands.",
  );
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const profile = await mkdtemp(join(tmpdir(), "mantis-live-explore-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let app, page;
try {
  app = await electron.launch(
    process.argv.includes("--source")
      ? { args: [".", `--user-data-dir=${profile}`], env }
      : {
          executablePath: resolve(
            `release/v${version}/win-unpacked/Mantis Studio.exe`,
          ),
          args: [`--user-data-dir=${profile}`],
          env,
        },
  );
  page = await app.firstWindow();
  await page
    .getByRole("button", { name: "Machine setup", exact: true })
    .click();
  await page.getByLabel("Target machine").selectOption("explore-3");
  await page.getByRole("button", { name: "Bluetooth", exact: true }).click();
  await expect(
    page.locator(".machine-device").filter({ hasText: targetName }),
  ).toBeVisible({ timeout: 35000 });
  await page.locator(".machine-device").filter({ hasText: targetName }).click();
  await page
    .getByRole("button", { name: "Connect Bluetooth data link", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.hopperMachine.bluetoothStatus()), {
      timeout: 65000,
    })
    .toMatchObject({
      status: "connected",
      name: targetName,
      bytesSent: 0,
      canSend: false,
      machineReady: false,
    });
  console.log(
    "Live Explore 3 RFCOMM connection established; no command bytes sent.",
  );
  // Check several native heartbeat periods, not only the initial connect result.
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(
      await page.evaluate(() => window.hopperMachine.bluetoothStatus()),
    ).toMatchObject({ status: "connected", bytesSent: 0, canSend: false });
  }
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
  await page.screenshot({ path: "docs/screenshots/explore-3-connected.png" });
  await page
    .getByRole("button", { name: "Disconnect Bluetooth", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.hopperMachine.bluetoothStatus()))
    .toMatchObject({ status: "disconnected", canSend: false });
  console.log(
    "Live test passed: paired Explore 3, sustained data link, dialog reopen, disabled cutting, explicit disconnect.",
  );
} catch(error) {
  if(page) console.error('Connection screen:', await page.getByRole('dialog').innerText().catch(()=>''));
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  if (!profile.startsWith(join(tmpdir(), "mantis-live-explore-")))
    throw Error("Unexpected profile path");
  await rm(profile, { recursive: true, force: true });
}
