import { describe, it, expect } from "vitest";
import { alignDrag } from "./alignmentGuides";
import { bounds } from "./geometry";
import { createObject } from "./model";

describe("drag alignment", () => {
  const box = { x: 10, y: 30, width: 100, height: 80 };
  it("snaps selection center to canvas center and leaves nonmatching axes alone", () => {
    const result = alignDrag(box, { x: 438, y: 7 }, [], 1000, 800, 6, true);
    expect(result.x).toBe(440);
    expect(result.y).toBe(7);
    expect(result.guides).toEqual([
      { axis: "x", position: 500, from: 0, to: 800, canvas: true },
    ]);
    expect(
      alignDrag(box, { x: 433, y: 7 }, [], 1000, 800, 6, true).guides,
    ).toEqual([]);
  });
  it("aligns transformed target edges, including locked targets but excluding hidden ones", () => {
    const other = {
      ...createObject("rect", 0),
      x: 300,
      y: 350,
      rotation: 30,
      skewX: 12,
      locked: true,
    };
    const edge = bounds([other]).x;
    const delta = { x: edge - box.x + 3, y: 0 };
    expect(alignDrag(box, delta, [other], 1152, 1152, 6, true).x).toBeCloseTo(
      edge - box.x,
    );
    expect(
      alignDrag(box, delta, [{ ...other, visible: false }], 1152, 1152, 6, true)
        .guides,
    ).toEqual([]);
    expect(alignDrag(box, delta, [other], 1152, 1152, 6, false).x).toBe(
      delta.x,
    );
  });
});
