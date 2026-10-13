import { describe, it, expect, vi } from "vitest";
vi.hoisted(() => vi.stubGlobal("self", { navigator: { userAgent: "node" } }));
import {
  libraryShapes,
  searchShapes,
  createLibraryObject,
} from "./shapeCatalog";
import { blankProject, validateProject } from "./model";
import { vectorPath } from "./vector";
import { exportSvg, readProject } from "./io";
import type paper from "paper";

describe("original shape library", () => {
  it("finds plural names, aliases, punctuation and intersected categories", () => {
    expect(searchShapes("shamrocks", "All shapes", "originals")).toHaveLength(4);
    expect(searchShapes("St. Patrick’s")).toHaveLength(5);
    expect(searchShapes("  SHAMROCKS ", "All shapes", "originals")).toHaveLength(4);
    expect(searchShapes("butterflies")[0].id).toBe("butterfly");
    expect(searchShapes("flowers").length).toBeGreaterThan(2);
    expect(searchShapes("shamrock", "Animals")).toHaveLength(0);
    expect(searchShapes("not-in-this-collection")).toHaveLength(0);
  });
  it("ships unique, closed, bounded vector designs that round-trip as native editable paths", () => {
    expect(new Set(libraryShapes.map((s) => s.id)).size).toBe(
      libraryShapes.length,
    );
    for (const shape of libraryShapes) {
      const project = blankProject();
      const object = createLibraryObject(shape, project);
      const geometry = vectorPath(object) as paper.CompoundPath;
      expect(
        geometry.children.every((child) => (child as paper.Path).closed),
        shape.name,
      ).toBe(true);
      expect(Math.abs(geometry.area), shape.name).toBeGreaterThan(10);
      expect(geometry.bounds.width).toBeCloseTo(object.width, 2);
      expect(geometry.bounds.height).toBeCloseTo(object.height, 2);
      expect(object.width / object.height).toBeCloseTo(shape.aspect, 5);
      expect(object.x).toBeGreaterThanOrEqual(0);
      expect(object.y).toBeGreaterThanOrEqual(0);
      project.objects = [object];
      expect(validateProject(project)).toBeTruthy();
      expect(readProject(JSON.stringify(project)).objects[0]).toEqual(object);
      expect(exportSvg(project)).toContain(shape.pathData);
    }
  });
  it("preserves holes in tags and frames and fits small boards", () => {
    for (const id of ["round-tag", "gift-tag", "frame"]) {
      const shape = libraryShapes.find((s) => s.id === id)!;
      const obj = createLibraryObject(shape, { width: 50, height: 40 });
      const geometry = vectorPath(obj) as paper.CompoundPath;
      expect(geometry.children).toHaveLength(2);
      const areas = geometry.children.map((p) => (p as paper.Path).area);
      expect(areas[0] * areas[1]).toBeLessThan(0);
      expect(obj.width).toBeLessThanOrEqual(40);
      expect(obj.height).toBeLessThanOrEqual(32);
    }
  });
});
