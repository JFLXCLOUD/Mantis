// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  MATERIAL_LIBRARY_KEY,
  STARTER_MATERIALS,
  emptyMaterialLibrary,
  filterMaterials,
  loadMaterialLibrary,
  saveMaterialLibrary,
  validateMaterialLibrary,
  validateMaterialProfile,
} from "./materials";
import { DEFAULT_JOB, makeJobDraft, validatePreferences } from "./machine";
import { blankProject, createObject } from "./model";

const custom = {
  ...STARTER_MATERIALS[0],
  id: "custom:test",
  source: "custom" as const,
  name: "My card",
  brand: "Studio stock",
  specification: "Packaging weight",
  notes: "Matte finish",
};
beforeEach(() => localStorage.clear());
describe("material planning", () => {
  it("migrates free text without dropping settings and rejects mismatched or malformed snapshots independently", () => {
    const old = {
      ...DEFAULT_JOB,
      model: "explore-3" as const,
      material: "Old vinyl",
      tool: "pen" as const,
      passes: 4,
    };
    expect(validatePreferences(old)).toEqual(old);
    expect(validatePreferences({ ...old, materialProfile: custom })).toEqual(
      old,
    );
    expect(
      validatePreferences({
        ...old,
        materialProfile: { ...custom, notes: null },
      }),
    ).toEqual(old);
  });
  it("exports an independent planning snapshot without enabling pressure, speed or sending", () => {
    const project = {
      ...blankProject(),
      objects: [{ ...createObject("heart"), operation: "draw" as const }],
    };
    const draft = makeJobDraft(
      project,
      {
        ...DEFAULT_JOB,
        material: custom.name,
        materialProfile: custom,
        passes: 3,
      },
      0,
      true,
    );
    expect(draft.setup).toMatchObject({
      materialProfile: custom,
      tool: "pen",
      passes: 3,
      mirror: true,
      pressure: null,
      speed: null,
    });
    expect(draft.setup.materialProfile).not.toBe(custom);
    expect(draft.machineReady).toBe(false);
    expect(draft.preflight.sendAllowed).toBe(false);
    expect(draft.artwork.svg).toContain("scale(-1 1)");
  });
  it("round trips local profiles and favorites, removes stale favorites, and leaves snapshots independent", () => {
    saveMaterialLibrary({
      version: 1,
      custom: [custom],
      favorites: [custom.id, "starter:paper"],
    });
    expect(loadMaterialLibrary().data.custom).toEqual([custom]);
    expect(
      validateMaterialLibrary({
        version: 1,
        custom: [],
        favorites: [custom.id, "starter:paper", "starter:paper"],
      }).favorites,
    ).toEqual(["starter:paper"]);
    expect(custom.notes).toBe("Matte finish");
  });
  it("filters all search terms across name, category, supplier and notes with intersecting filters", () => {
    const profiles = [...STARTER_MATERIALS, custom];
    expect(
      filterMaterials(profiles, "STUDIO matte", "paper", "favorites", [
        custom.id,
      ]),
    ).toEqual([custom]);
    expect(
      filterMaterials(profiles, "STUDIO matte", "vinyl", "all", []),
    ).toEqual([]);
    expect(filterMaterials(profiles, "", "all", "custom", [])).toEqual([
      custom,
    ]);
    expect(filterMaterials(profiles, "", "all", "favorites", [])).toEqual([]);
  });
  it("rejects duplicate ids, excess profiles, invalid categories and oversized fields; strips configuration claims", () => {
    for (const patch of [
      { id: "starter:fake" },
      { category: "__proto__" },
      { name: " " },
      { notes: "x".repeat(2001) },
      { specification: 12 },
    ])
      expect(() => validateMaterialProfile({ ...custom, ...patch })).toThrow();
    expect(() =>
      validateMaterialLibrary({
        version: 1,
        custom: [custom, custom],
        favorites: [],
      }),
    ).toThrow();
    expect(() =>
      validateMaterialLibrary({
        version: 1,
        custom: Array(201).fill(custom),
        favorites: [],
      }),
    ).toThrow();
    expect(() =>
      validateMaterialLibrary({ version: 2, custom: [], favorites: [] }),
    ).toThrow();
    expect(
      validateMaterialProfile({ ...custom, pressure: 500, verified: true }),
    ).toEqual(custom);
  });
  it("preserves unreadable persisted data while reporting recovery instead of silently overwriting it", () => {
    localStorage.setItem(MATERIAL_LIBRARY_KEY, "{broken");
    expect(loadMaterialLibrary().data).toEqual(emptyMaterialLibrary());
    expect(loadMaterialLibrary().error).toContain("could not be read");
    expect(localStorage.getItem(MATERIAL_LIBRARY_KEY)).toBe("{broken");
  });
});
