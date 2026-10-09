import { it, expect } from "vitest";
import { createObject } from "./model";
import { printableObjects, printLayout, printArtworkSvg } from "./printing";
it("only flattens visible cut artwork, retaining layer order and optional selection", () => {
  const a = createObject("rect"),
    b = createObject("ellipse");
  const objects = [
    a,
    { ...b, visible: false },
    { ...createObject("text"), operation: "draw" as const },
    { ...createObject("rect"), operation: "guide" as const },
  ];
  expect(printableObjects(objects)).toEqual([a]);
  expect(printableObjects(objects, [b.id])).toEqual([]);
});
it("calculates physical page fit, portrait/landscape and 300 dpi output without silently shrinking", () => {
  const box = { x: 10, y: 20, width: 192, height: 96 };
  expect(printLayout(box, 4, "letter", false)).toMatchObject({
    height: 2,
    pixelsWidth: 1200,
    pixelsHeight: 600,
    x: 2.25,
    y: 4.5,
    fits: true,
  });
  expect(printLayout(box, 8, "letter", false).fits).toBe(false);
  expect(printLayout(box, 8, "letter", true).fits).toBe(true);
  expect(printLayout(box, NaN, "a4", false).exportable).toBe(false);
  expect(printLayout(box, 40, "a4", false).exportable).toBe(false);
  const svg = printArtworkSvg([createObject("rect")], box, 1200, 600);
  expect(svg).toContain('viewBox="10 20 192 96"');
  expect(svg).not.toContain("registration");
});
