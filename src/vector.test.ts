import { describe, it, expect, vi } from "vitest";
// Paper supports a worker context without a canvas; use that for geometry tests.
vi.hoisted(() => vi.stubGlobal("self", { navigator: { userAgent: "node" } }));
import { createObject, blankProject, validateProject } from "./model";
import { combineObjects, vectorPath } from "./vector";
import { exportSvg, readProject } from "./io";
import type paper from "paper";
const square = (x = 0, size = 100) => ({
  ...createObject("path"),
  x,
  y: 0,
  width: size,
  height: size,
  pathData: "M0 0H100V100H0Z",
});
const area = (o: ReturnType<typeof square>) =>
  Math.abs((vectorPath(o) as paper.CompoundPath).area);
describe("editable vector operations", () => {
  it("welds, intersects, subtracts and slices overlapping shapes with correct areas", () => {
    const objects = [square(), square(50)];
    expect(
      area(combineObjects(objects, "weld")[0] as ReturnType<typeof square>),
    ).toBeCloseTo(15000, 2);
    expect(
      area(
        combineObjects(objects, "intersect")[0] as ReturnType<typeof square>,
      ),
    ).toBeCloseTo(5000, 2);
    expect(
      area(combineObjects(objects, "subtract")[0] as ReturnType<typeof square>),
    ).toBeCloseTo(5000, 2);
    const pieces = combineObjects(objects, "slice");
    expect(pieces).toHaveLength(3);
    expect(
      pieces.reduce((sum, o) => sum + area(o as ReturnType<typeof square>), 0),
    ).toBeCloseTo(15000, 2);
  });
  it("keeps a hole through save, reload, resize and export", () => {
    const result = combineObjects(
      [square(), { ...square(25, 50), y: 25 }],
      "subtract",
    )[0];
    const p = readProject(
      JSON.stringify({ ...blankProject(), objects: [result] }),
    );
    expect(area(p.objects[0] as ReturnType<typeof square>)).toBeCloseTo(
      7500,
      2,
    );
    expect(
      area({ ...result, width: 200, height: 200 } as ReturnType<typeof square>),
    ).toBeCloseTo(30000, 2);
    expect(exportSvg(p)).toContain(result.pathData);
    expect(p.version).toBe(3);
  });
  it("preserves transformed world geometry and does not mutate source layers", () => {
    const objects = [
      { ...square(), rotation: 37, skewX: 21, flipX: true },
      square(500),
    ];
    const before = JSON.stringify(objects);
    const result = combineObjects(objects, "weld")[0];
    expect(area(result as ReturnType<typeof square>)).toBeCloseTo(20000, 1);
    expect(JSON.stringify(objects)).toBe(before);
    expect(result.rotation).toBe(0);
  });
  it("rejects protected, unsupported, empty and excessive selections", () => {
    expect(() =>
      combineObjects([square(), { ...square(), locked: true }], "weld"),
    ).toThrow(/unlocked/);
    expect(() =>
      combineObjects([square(), createObject("text")], "weld"),
    ).toThrow(/outlining/);
    expect(() => combineObjects([square(), square(500)], "intersect")).toThrow(
      /empty/,
    );
    expect(() =>
      combineObjects([square(), square(), square()], "slice"),
    ).toThrow(/exactly two/);
    expect(() =>
      validateProject({
        ...blankProject(),
        objects: [{ ...square(), pathData: 'M0 0" onload="alert(1)' }],
      }),
    ).toThrow(/vector path/);
  });
});
