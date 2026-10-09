import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("Mantis reopens a real Hopper profile with its workspace and machine preferences intact", async () => {
  test.skip(
    !existsSync("release/v0.3.1/win-unpacked/Hopper.exe"),
    "Optional migration check needs the preserved Hopper 0.3.1 build.",
  );
  test.setTimeout(60000);
  const profile = await mkdtemp(join(tmpdir(), "mantis-migration-test-"));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  let app;
  try {
    app = await electron.launch({
      executablePath: resolve("release/v0.3.1/win-unpacked/Hopper.exe"),
      args: [`--user-data-dir=${profile}`],
      env,
    });
    let page = await app.firstWindow();
    await page.getByLabel("Project name").fill("Preserved Hopper artwork");
    await page.getByRole("button", { name: "Add heart", exact: true }).click();
    await expect(
      page.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Machine setup", exact: true })
      .click();
    await page.getByLabel("Target machine").selectOption("maker-3");
    await page.getByLabel("Job material").fill("Legacy vinyl");
    await page.getByLabel("Job passes").selectOption("3");
    const before = await page.evaluate(() => ({
      project: localStorage.getItem("hopper.project.v1"),
      preferences: localStorage.getItem("hopper.machine-preferences.v1"),
    }));
    await app.close();
    app = undefined;
    app = await electron.launch(
      process.env.MANTIS_TEST_EXECUTABLE
        ? {
            executablePath: process.env.MANTIS_TEST_EXECUTABLE,
            args: [`--user-data-dir=${profile}`],
            env,
          }
        : { args: [".", `--user-data-dir=${profile}`], env },
    );
    page = await app.firstWindow();
    await expect(page).toHaveTitle(
      "Mantis Studio \u2014 Your ideas, without limits.",
    );
    await expect(page.getByLabel("Project name")).toHaveValue(
      "Preserved Hopper artwork",
    );
    expect(await app.evaluate(({ app }) => app.getPath("userData"))).toBe(
      profile,
    );
    expect(await app.evaluate(({ app }) => app.getName())).toBe(
      "Mantis Studio",
    );
    const after = await page.evaluate(() => ({
      project: JSON.parse(localStorage.getItem("hopper.project.v1")!),
      preferences: localStorage.getItem("hopper.machine-preferences.v1"),
    }));
    expect(after.project).toEqual(JSON.parse(before.project!));
    expect(after.preferences).toEqual(before.preferences);
    await expect(
      page.getByAltText("Mantis Studio", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Machine setup", exact: true })
      .click();
    await expect(page.getByLabel("Target machine")).toHaveValue("maker-3");
    await expect(page.getByLabel("Job material")).toHaveValue("Legacy vinyl");
    await expect(page.getByLabel("Job passes")).toHaveValue("3");
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await page
      .getByRole("button", { name: "A quick tour of Mantis Studio" })
      .click();
    await expect(page.getByAltText("Manti the praying mantis")).toBeVisible();
    expect(
      await page
        .locator("img")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth > 0),
        ),
    ).toBe(true);
    await page.screenshot({ path: "docs/screenshots/mantis-tour.png" });
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await page.screenshot({
      path: "docs/screenshots/mantis-profile-preservation.png",
    });
  } finally {
    if (app) await app.close();
    if (!profile.startsWith(join(tmpdir(), "mantis-migration-test-")))
      throw Error("Unexpected profile location");
    await rm(profile, { recursive: true, force: true });
  }
});
