import type { DesignObject } from "./model";

export type Point = { x: number; y: number };
export type Box = Point & { width: number; height: number };
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const handles: Record<Handle, [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
};
const rad = (degrees: number) => (degrees * Math.PI) / 180;
export function basis(o: DesignObject, includeFlip = false) {
  const c = Math.cos(rad(o.rotation)),
    s = Math.sin(rad(o.rotation)),
    k = Math.tan(rad(o.skewX || 0));
  const fx = includeFlip && o.flipX ? -1 : 1,
    fy = includeFlip && o.flipY ? -1 : 1;
  return { a: c * fx, b: s * fx, c: (c * k - s) * fy, d: (s * k + c) * fy };
}
export function localPoint(o: DesignObject, x: number, y: number): Point {
  const m = basis(o);
  return {
    x: o.x + o.width / 2 + m.a * x + m.c * y,
    y: o.y + o.height / 2 + m.b * x + m.d * y,
  };
}
export function corners(o: DesignObject) {
  return [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ].map(([x, y]) => localPoint(o, x * o.width, y * o.height));
}
export function bounds(objects: DesignObject[]): Box {
  if (!objects.length) return { x: 0, y: 0, width: 0, height: 0 };
  const points = objects.flatMap(corners);
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  };
}
export function objectTransform(o: DesignObject) {
  const cx = o.width / 2,
    cy = o.height / 2;
  return `translate(${o.x} ${o.y}) translate(${cx} ${cy}) rotate(${o.rotation}) skewX(${o.skewX || 0}) scale(${o.flipX ? -1 : 1} ${o.flipY ? -1 : 1}) translate(${-cx} ${-cy})`;
}
function resizedBox(
  box: Box,
  handle: Handle,
  dx: number,
  dy: number,
  locked: boolean,
  centered: boolean,
): Box {
  const [hx, hy] = handles[handle],
    multiplier = centered ? 2 : 1;
  let width = box.width + hx * dx * multiplier,
    height = box.height + hy * dy * multiplier;
  if (locked) {
    const change =
      hx && hy
        ? (hx * dx * box.width + hy * dy * box.height) /
          (box.width ** 2 + box.height ** 2)
        : hx
          ? (hx * dx) / box.width
          : (hy * dy) / box.height;
    const factor = Math.max(
      Math.max(1 / box.width, 1 / box.height),
      Math.min(
        Math.min(100000 / box.width, 100000 / box.height),
        1 + change * multiplier,
      ),
    );
    width = box.width * factor;
    height = box.height * factor;
  } else {
    width = Math.max(1, Math.min(100000, width));
    height = Math.max(1, Math.min(100000, height));
  }
  return {
    x:
      box.x +
      (centered
        ? (box.width - width) / 2
        : ((box.width - width) * (1 - hx)) / 2),
    y:
      box.y +
      (centered
        ? (box.height - height) / 2
        : ((box.height - height) * (1 - hy)) / 2),
    width,
    height,
  };
}
export function resizeObject(
  o: DesignObject,
  handle: Handle,
  delta: Point,
  locked: boolean,
  centered = false,
): DesignObject {
  const m = basis(o),
    det = m.a * m.d - m.b * m.c;
  const local = {
    x: (m.d * delta.x - m.c * delta.y) / det,
    y: (-m.b * delta.x + m.a * delta.y) / det,
  };
  const next = resizedBox(
    { x: -o.width / 2, y: -o.height / 2, width: o.width, height: o.height },
    handle,
    local.x,
    local.y,
    locked,
    centered,
  );
  const center = localPoint(
    o,
    next.x + next.width / 2,
    next.y + next.height / 2,
  );
  return {
    ...o,
    x: center.x - next.width / 2,
    y: center.y - next.height / 2,
    width: next.width,
    height: next.height,
  };
}
// Retain the shear introduced when a rotated group is stretched nonuniformly.
// This decomposition is shared by display, hit testing, bounds, and export.
export function scaleWorld(
  o: DesignObject,
  sx: number,
  sy: number,
  anchor: Point,
): DesignObject {
  const m = basis(o, true);
  const a = sx * m.a,
    b = sy * m.b,
    c = sx * m.c,
    d = sy * m.d;
  const scaleX = Math.hypot(a, b),
    signedY = (a * d - b * c) / scaleX;
  const width = o.width * scaleX,
    height = o.height * Math.abs(signedY);
  const cx = anchor.x + (o.x + o.width / 2 - anchor.x) * sx,
    cy = anchor.y + (o.y + o.height / 2 - anchor.y) * sy;
  return {
    ...o,
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    rotation: (Math.atan2(b, a) * 180) / Math.PI,
    skewX: (Math.atan((a * c + b * d) / (scaleX * signedY)) * 180) / Math.PI,
    flipX: false,
    flipY: signedY < 0,
  };
}
export function resizeSelection(
  objects: DesignObject[],
  handle: Handle,
  delta: Point,
  locked: boolean,
  centered = false,
): DesignObject[] {
  if (objects.length === 1)
    return [resizeObject(objects[0], handle, delta, locked, centered)];
  const box = bounds(objects),
    next = resizedBox(box, handle, delta.x, delta.y, locked, centered);
  const sx = next.width / box.width,
    sy = next.height / box.height;
  const result = objects.map((o) => {
    const scaled = scaleWorld(o, sx, sy, box);
    return {
      ...scaled,
      x: scaled.x + next.x - box.x,
      y: scaled.y + next.y - box.y,
    };
  });
  return result.every(
    (o) =>
      o.width >= 1 &&
      o.height >= 1 &&
      o.width <= 100000 &&
      o.height <= 100000 &&
      Math.abs(o.skewX || 0) < 89.99,
  )
    ? result
    : objects;
}
export function rotateSelection(
  objects: DesignObject[],
  degrees: number,
): DesignObject[] {
  const box = bounds(objects),
    center =
      objects.length === 1
        ? {
            x: objects[0].x + objects[0].width / 2,
            y: objects[0].y + objects[0].height / 2,
          }
        : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const c = Math.cos(rad(degrees)),
    s = Math.sin(rad(degrees));
  return objects.map((o) => {
    const x = o.x + o.width / 2 - center.x,
      y = o.y + o.height / 2 - center.y;
    return {
      ...o,
      x: center.x + c * x - s * y - o.width / 2,
      y: center.y + s * x + c * y - o.height / 2,
      rotation: (o.rotation + degrees) % 360,
    };
  });
}
export function flipSelection(
  objects: DesignObject[],
  axis: "horizontal" | "vertical",
) {
  const b = bounds(objects),
    center = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  return objects.map((o) =>
    scaleWorld(
      o,
      axis === "horizontal" ? -1 : 1,
      axis === "vertical" ? -1 : 1,
      center,
    ),
  );
}
export function selectionUnits(objects: DesignObject[]) {
  const units = new Map<string, DesignObject[]>();
  objects.forEach((o) => {
    const key = o.groupId || o.id;
    units.set(key, [...(units.get(key) || []), o]);
  });
  return [...units.values()];
}
export function distribute(
  objects: DesignObject[],
  axis: "horizontal" | "vertical",
): DesignObject[] {
  const horizontal = axis === "horizontal",
    position = horizontal ? "x" : "y",
    size = horizontal ? "width" : "height";
  const units = selectionUnits(objects)
    .map((members) => ({ members, box: bounds(members) }))
    .sort((a, b) => a.box[position] - b.box[position]);
  if (units.length < 3) return objects;
  const first = units[0].box,
    last = units[units.length - 1].box;
  const gap =
    (last[position] +
      last[size] -
      first[position] -
      units.reduce((sum, unit) => sum + unit.box[size], 0)) /
    (units.length - 1);
  let cursor = first[position];
  const moved = new Map<string, DesignObject>();
  units.forEach((unit) => {
    const delta = cursor - unit.box[position];
    unit.members.forEach((o) =>
      moved.set(o.id, { ...o, [position]: o[position] + delta }),
    );
    cursor += unit.box[size] + gap;
  });
  return objects.map((o) => moved.get(o.id)!);
}
export function alignSelection(
  objects: DesignObject[],
  direction: "left" | "center" | "right" | "middle" | "top" | "bottom",
) {
  const box = bounds(objects),
    moved = new Map<string, DesignObject>();
  for (const members of selectionUnits(objects)) {
    const b = bounds(members);
    const dx =
      direction === "left"
        ? box.x - b.x
        : direction === "right"
          ? box.x + box.width - b.x - b.width
          : direction === "center"
            ? box.x + box.width / 2 - b.x - b.width / 2
            : 0;
    const dy =
      direction === "top"
        ? box.y - b.y
        : direction === "bottom"
          ? box.y + box.height - b.y - b.height
          : direction === "middle"
            ? box.y + box.height / 2 - b.y - b.height / 2
            : 0;
    members.forEach((o) => moved.set(o.id, { ...o, x: o.x + dx, y: o.y + dy }));
  }
  return objects.map((o) => moved.get(o.id)!);
}
export function centerOnCanvas(
  objects: DesignObject[],
  width: number,
  height: number,
) {
  const b = bounds(objects),
    dx = (width - b.width) / 2 - b.x,
    dy = (height - b.height) / 2 - b.y;
  return objects.map((o) => ({ ...o, x: o.x + dx, y: o.y + dy }));
}
