import { describe, expect, it } from "vitest";
import { blankProject, createObject } from "./model";
import {
  DEFAULT_JOB,
  MACHINE_PROFILES,
  makeJobDraft,
  usbReport,
  bluetoothReport,
  validatePreferences,
} from "./machine";

describe("job drafts", () => {
  it("all catalog models retain a planning-only draft with appropriate transport", () => {
    const p = { ...blankProject(), objects: [createObject("heart")] };
    for (const model of Object.keys(
      MACHINE_PROFILES,
    ) as (keyof typeof MACHINE_PROFILES)[]) {
      const settings = validatePreferences({ ...DEFAULT_JOB, model });
      expect(settings.transport).toBe(
        MACHINE_PROFILES[model].usb ? "usb" : "bluetooth",
      );
      const draft = makeJobDraft(p, settings, 0, false);
      expect(draft.target.model).toBe(model);
      expect(draft.machineReady).toBe(false);
      expect(draft.preflight.sendAllowed).toBe(false);
      expect(
        draft.preflight.issues.some((i) => i.code === "adapter-unavailable"),
      ).toBe(true);
    }
  });
  it("BLE and original Joy scoring limitations are explicit without blocking draft export", () => {
    const p = {
      ...blankProject(),
      objects: [{ ...createObject("heart"), operation: "score" as const }],
    };
    const ble = makeJobDraft(
      p,
      { ...DEFAULT_JOB, model: "joy-2", transport: "bluetooth" },
      0,
      false,
    );
    expect(
      ble.preflight.issues.some((i) => i.code === "ble-not-implemented"),
    ).toBe(true);
    const joy = makeJobDraft(p, { ...DEFAULT_JOB, model: "joy" }, 0, false);
    expect(
      joy.preflight.issues.some((i) => i.code === "scoring-unavailable"),
    ).toBe(true);
  });
  it("migrates old preferences without losing material, model or passes", () => {
    const old = { model: "maker-3", material: "Vinyl", passes: 3, tool: "pen" };
    expect(validatePreferences(old)).toEqual({ ...old, transport: "usb" });
    expect(
      validatePreferences({ ...old, transport: "bluetooth" }).transport,
    ).toBe("bluetooth");
    expect(() => validatePreferences({ ...old, transport: "wifi" })).toThrow();
  });
  it("Bluetooth reports omit names and identifiers while retaining pairing state", () => {
    const report = bluetoothReport({
      status: "ok",
      radio: "on",
      warnings: [],
      devices: [
        {
          id: "private-id",
          name: "Maker4-private",
          modelHint: "maker-4",
          transport: "bluetooth",
          protocol: "classic",
          paired: true,
          remembered: true,
          windowsConnected: false,
          connection: "detected-only",
          canSend: false,
        },
      ],
    });
    expect(JSON.stringify(report)).not.toContain("private");
    expect(report.devices[0]).toMatchObject({
      paired: true,
      availability: "unknown",
      canSend: false,
    });
  });
  it("preserves geometry, physical dimensions and mirror without inventing a machine-ready payload", () => {
    const p = { ...blankProject(), objects: [createObject("heart")] };
    const draft = makeJobDraft(
      p,
      { ...DEFAULT_JOB, material: "Vinyl", passes: 2 },
      0,
      true,
    );
    expect(draft.status).toBe("draft-only");
    expect(draft.machineReady).toBe(false);
    expect(draft.preflight.sendAllowed).toBe(false);
    expect(draft.artwork.canvasMm.width).toBeCloseTo(304.8);
    expect(draft.setup).toMatchObject({
      material: "Vinyl",
      passes: 2,
      mirror: true,
      pressure: null,
      speed: null,
    });
    expect(draft.artwork.svg).toContain("translate(1152 0) scale(-1 1)");
    expect(draft.target).toEqual({
      model: "maker-4",
      transport: "usb",
      firmware: null,
      adapter: null,
    });
  });
  it("keeps hidden/guide objects out and flags text, import and bounds independently", () => {
    const hidden = { ...createObject("text"), visible: false };
    const guide = { ...createObject("text"), operation: "guide" as const };
    const text = { ...createObject("text"), x: -10 };
    const imported = {
      ...createObject("svg"),
      svg: '<svg><path d="M0 0L10 10"/></svg>',
    };
    const p = { ...blankProject(), objects: [hidden, guide, text, imported] };
    const draft = makeJobDraft(p, DEFAULT_JOB, 0, false);
    expect(draft.artwork.objectIds).toEqual([text.id]);
    expect(draft.preflight.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([
        "material-missing",
        "text-needs-outlines",
        "outside-canvas",
        "adapter-unavailable",
      ]),
    );
    expect(
      makeJobDraft(p, DEFAULT_JOB, 1, false).preflight.issues.map(
        (i) => i.code,
      ),
    ).toContain("import-needs-path-validation");
  });
  it("matches tools to operations and reports explicit conflicts", () => {
    const p = {
      ...blankProject(),
      objects: [{ ...createObject("heart"), operation: "draw" as const }],
    };
    expect(makeJobDraft(p, DEFAULT_JOB, 0, false).setup.tool).toBe("pen");
    expect(
      makeJobDraft(
        p,
        { ...DEFAULT_JOB, tool: "fine-point" },
        0,
        false,
      ).preflight.issues.map((i) => i.code),
    ).toContain("tool-mismatch");
  });
  it("rejects invalid settings, out-of-range groups and unsupported model names", () => {
    for (const passes of [0, 1.5, 21, NaN, Infinity])
      expect(() => validatePreferences({ ...DEFAULT_JOB, passes })).toThrow();
    expect(() =>
      validatePreferences({ ...DEFAULT_JOB, model: "maker-99" }),
    ).toThrow();
    expect(() =>
      validatePreferences({ ...DEFAULT_JOB, material: "a".repeat(121) }),
    ).toThrow();
    expect(() => makeJobDraft(blankProject(), DEFAULT_JOB, 0, false)).toThrow();
    const p = { ...blankProject(), objects: [createObject("rect")] };
    expect(() => makeJobDraft(p, DEFAULT_JOB, 0.5, false)).toThrow();
  });
  it("exports diagnostic metadata without identifying paths, device names or instance IDs", () => {
    const report = usbReport({
      status: "ok",
      warnings: [],
      devices: [
        {
          id: "private-id",
          name: "Maker SN-private",
          vendorId: "20D3",
          productId: "1234",
          modelHint: "maker-4",
          ports: ["COM7"],
          windowsStatus: "OK",
          transport: "usb",
          connection: "detected-only",
          canSend: false,
        },
      ],
    });
    expect(JSON.stringify(report)).not.toContain("private");
    expect(report.devices[0]).toMatchObject({
      deviceHandshake: "not-performed",
      canSend: false,
    });
  });
});
