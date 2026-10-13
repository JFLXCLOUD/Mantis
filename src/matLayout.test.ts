import { describe, it, expect } from "vitest";
import { blankProject, createObject } from "./model";
import { bounds } from "./geometry";
import { planMats } from "./matLayout";
import { wrapWords } from "./textLayoutTools";
const options = {
  width: 300,
  height: 300,
  copies: 3,
  layout: "compact" as const,
  margin: 20,
  gap: 10,
};
describe("offline mat layout", () => {
  it("creates additional mats with bounded, separated copies and preserves canvas data", () => {
    const p = {
        ...blankProject(),
        objects: [
          { ...createObject("rect"), width: 200, height: 200, rotation: 10 },
        ],
      },
      original = JSON.stringify(p);
    const mats = planMats(p, options);
    expect(mats).toHaveLength(3);
    const ids = mats.flatMap((m) => m.objects.map((o) => o.id));
    expect(new Set(ids).size).toBe(3);
    for (const mat of mats) {
      const b = bounds(mat.objects);
      expect(b.x).toBeCloseTo(20, 4);
      expect(b.y).toBeCloseTo(20, 4);
      expect(b.x + b.width).toBeLessThanOrEqual(280.001);
    }
    expect(JSON.stringify(p)).toBe(original);
  });
  it("keeps groups together, separates operations and respects spacing", () => {
    const first = {
        ...createObject("rect"),
        x: 300,
        y: 250,
        width: 50,
        height: 50,
        groupId: "pair",
      },
      second = { ...first, id: "second", x: 370 };
    const p = {
      ...blankProject(),
      objects: [
        first,
        second,
        { ...first, id: "draw", operation: "draw" as const },
      ],
    };
    const mats = planMats(p, { ...options, copies: 2, width: 400 });
    expect(mats).toHaveLength(2);
    expect(mats[0].objects).toHaveLength(4);
    expect(mats[0].objects[1].x - mats[0].objects[0].x).toBe(70);
    expect(mats[0].objects[2].x - mats[0].objects[1].x).toBe(60);
    expect(mats[1].operation).toBe("draw");
  });
  it("keeps original positions by default and rejects invalid or oversized plans", () => {
    const p = { ...blankProject(), objects: [createObject("rect")] };
    expect(
      planMats(p, { ...options, layout: "canvas", copies: 1 })[0].objects,
    ).toEqual(p.objects);
    expect(() => planMats(p, { ...options, width: 100 })).toThrow(
      /does not fit/,
    );
    expect(() => planMats(p, { ...options, copies: 0 })).toThrow();
    expect(() => planMats(p, { ...options, copies: 1.5 })).toThrow();
    expect(() =>
      planMats(
        {
          ...p,
          objects: Array.from({ length: 30 }, () => createObject("rect")),
        },
        { ...options, copies: 50 },
      ),
    ).toThrow(/1,000/);
  });
  it("wraps at word boundaries, preserves paragraphs and leaves long words whole", () => {
    expect(wrapWords("Made with love\nEnjoy every moment", 10)).toBe(
      "Made with\nlove\nEnjoy\nevery\nmoment",
    );
    expect(wrapWords("Extraordinary things", 5)).toBe("Extraordinary\nthings");
    expect(() => wrapWords("words", 0)).toThrow();
  });
});
