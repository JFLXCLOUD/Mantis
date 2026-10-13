import { describe, it, expect, vi } from "vitest";
vi.hoisted(() => vi.stubGlobal("self", { navigator: { userAgent: "node" } }));
import type paper from "paper";
import { createObject, blankProject, validateProject } from "./model";
import { vectorPath, combineObjects } from "./vector";
import {
  offsetObjects,
  withContours,
  contourParts,
  consolidateColor,
} from "./shapeTools";
const square = (x = 0) => ({
  ...createObject("path"),
  x,
  y: 0,
  width: 100,
  height: 100,
  pathData: "M0 0H100V100H0Z",
});
const area = (o: ReturnType<typeof createObject>) =>
  Math.abs((vectorPath(o) as paper.CompoundPath).area);
const ring = () => ({
  ...square(),
  pathData: "M0 0H100V100H0Z M25 25V75H75V25Z",
});
describe("shape borders and contours", () => {
  it("preserves rounded rectangle corners when converting non-square objects to contours", () => {
    const rect = {...createObject('rect'),width:300,height:100,rotation:27};
    expect(area(withContours(rect,[]))).toBeCloseTo(area(rect),1);
  });
  it("offsets by a physical distance and preserves original geometry", () => {
    const source = square(),
      before = JSON.stringify(source);
    const enlarged = offsetObjects([source], 10, "sharp", true)[0];
    expect(enlarged.x).toBeCloseTo(-10, 2);
    expect(enlarged.width).toBeCloseTo(120, 2);
    expect(area(enlarged)).toBeCloseTo(14400, 1);
    expect(area(offsetObjects([source], -10, "sharp", true)[0])).toBeCloseTo(
      6400,
      1,
    );
    const round = offsetObjects([source], 10, "round", true)[0];
    expect(area(round)).toBeGreaterThan(14300);
    expect(area(round)).toBeLessThan(14400);
    expect(JSON.stringify(source)).toBe(before);
  });
  it("preserves holes, reflected overlap and independent offsets", () => {
    expect(area(offsetObjects([ring()], 10, "sharp", true)[0])).toBeCloseTo(
      13500,
      1,
    );
    expect(area(offsetObjects([ring()], -10, "sharp", true)[0])).toBeCloseTo(
      1500,
      1,
    );
    expect(
      area(
        offsetObjects(
          [square(), { ...square(), flipX: true }],
          10,
          "sharp",
          true,
        )[0],
      ),
    ).toBeCloseTo(14400, 1);
    expect(
      offsetObjects([square(), square(200)], 10, "round", false),
    ).toHaveLength(2);
    const o = { ...square(), rotation: 37, skewX: 15, flipY: true };
    expect(area(offsetObjects([o], 5, "round", true)[0])).toBeGreaterThan(
      area(o),
    );
  });
  it("rejects unsupported inputs and empty insets without mutating artwork", () => {
    for (const distance of [0, NaN, Infinity, 97, -97])
      expect(() =>
        offsetObjects([square()], distance, "sharp", true),
      ).toThrow();
    for (const o of [
      { ...square(), locked: true },
      { ...square(), visible: false },
      { ...square(), operation: "draw" as const },
      createObject("text"),
      { ...square(), pathData: "M0 0L100 100" },
    ])
      expect(() => offsetObjects([o], 10, "round", true)).toThrow();
    expect(() => offsetObjects([square()], -60, "round", true)).toThrow(
      /entire shape/,
    );
  });
  it("hides and restores holes across save and transform without shifting the object", () => {
    const original = { ...ring(), rotation: 25, flipX: true },
      parts = contourParts(original);
    expect(parts.parts).toHaveLength(2);
    const solid = withContours(original, [1]);
    expect(area(solid)).toBeCloseTo(10000, 2);
    expect(solid.x).toBe(original.x);
    expect(solid.width).toBe(original.width);
    const saved = validateProject(
      JSON.parse(JSON.stringify({ ...blankProject(), objects: [solid] })),
    ).objects[0];
    expect(saved.hiddenContours).toEqual([1]);
    expect(area(withContours(saved, []))).toBeCloseTo(7500, 2);
    expect(() => withContours(saved, [0, 1])).toThrow();
    expect(() => withContours(saved, [3])).toThrow();
    for (const hidden of [[0, 1], [-1], [1.5], [2], [1, 1]])
      expect(() =>
        validateProject({
          ...blankProject(),
          objects: [{ ...solid, hiddenContours: hidden }],
        }),
      ).toThrow();
  });
  it("excludes overlaps and consolidates only editable native material colors", () => {
    expect(
      area(combineObjects([square(), square(50)], "exclude")[0]),
    ).toBeCloseTo(10000, 1);
    const objects = [
      square(),
      { ...square(), locked: true },
      { ...square(), visible: false },
      { ...square(), operation: "guide" as const },
      { ...createObject("svg"), svg: "<svg/>" },
      { ...square(), operation: "draw" as const },
    ];
    const changed = consolidateColor(objects, "#285C48", "#e4b351");
    expect(changed.map((o) => o.fill)).toEqual([
      "#e4b351",
      "#285c48",
      "#285c48",
      "#285c48",
      "#285c48",
      "#e4b351",
    ]);
    expect(changed[5].operation).toBe("draw");
    expect(objects[0].fill).toBe("#285c48");
  });
});
