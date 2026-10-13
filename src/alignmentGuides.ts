import { bounds, type Box, type Point } from "./geometry";
import type { DesignObject } from "./model";

export type AlignmentGuide = {
  axis: "x" | "y";
  position: number;
  from: number;
  to: number;
  canvas: boolean;
};

// The tolerance is supplied in design units so the acquisition distance stays
// constant in screen pixels at every zoom. Work on the whole selection bounds.
export function alignDrag(
  box: Box,
  delta: Point,
  others: DesignObject[],
  width: number,
  height: number,
  tolerance: number,
  snap: boolean,
) {
  const moving = { ...box, x: box.x + delta.x, y: box.y + delta.y };
  const targets = others.filter((o) => o.visible).map((o) => bounds([o]));
  const matches: { guide: AlignmentGuide; correction: number }[] = [];
  for (const axis of ["x", "y"] as const) {
    const size = axis === "x" ? "width" : "height";
    const cross = axis === "x" ? "y" : "x";
    const crossSize = axis === "x" ? "height" : "width";
    const positions = [
      moving[axis],
      moving[axis] + moving[size] / 2,
      moving[axis] + moving[size],
    ];
    const candidates = [
      {
        position: (axis === "x" ? width : height) / 2,
        from: 0,
        to: axis === "x" ? height : width,
        canvas: true,
      },
      ...targets.flatMap((b) =>
        [b[axis], b[axis] + b[size] / 2, b[axis] + b[size]].map((position) => ({
          position,
          from: b[cross],
          to: b[cross] + b[crossSize],
          canvas: false,
        })),
      ),
    ];
    let best = tolerance + 1;
    let match: (typeof matches)[number] | undefined;
    for (const target of candidates)
      for (const position of positions) {
        const correction = target.position - position;
        if (Math.abs(correction) <= tolerance && Math.abs(correction) < best) {
          best = Math.abs(correction);
          match = {
            correction,
            guide: {
              axis,
              position: target.position,
              from: Math.min(target.from, moving[cross]),
              to: Math.max(target.to, moving[cross] + moving[crossSize]),
              canvas: target.canvas,
            },
          };
        }
      }
    if (match) matches.push(match);
  }
  return {
    x:
      delta.x +
      (snap ? matches.find((m) => m.guide.axis === "x")?.correction || 0 : 0),
    y:
      delta.y +
      (snap ? matches.find((m) => m.guide.axis === "y")?.correction || 0 : 0),
    guides: matches.map((m) => m.guide),
  };
}
