import paper from "paper/dist/paper-core";
import Clipper from "clipper-lib";
import { vectorPath } from "./vector";
import { createObject, paths, type DesignObject } from "./model";

const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
scope.settings.insertItems = false;
export const isNativeShape = (o: DesignObject) =>
  o.type !== "text" && o.type !== "svg";
export function shapeToolReason(objects: DesignObject[]) {
  if (!objects.length || objects.length > 50) return "Select 1–50 shapes.";
  if (objects.some((o) => o.locked || !o.visible))
    return "Unlock and show every selected layer first.";
  if (objects.some((o) => !isNativeShape(o)))
    return "Choose native shapes or library artwork. Text and imported SVG need conversion to paths first.";
  if (objects.some((o) => o.operation !== "cut"))
    return "Choose Basic cut shapes for this tool.";
  return "";
}
function pathObject(
  path: paper.PathItem,
  source: DesignObject,
  name: string,
): DesignObject {
  const b = path.bounds.clone();
  if (
    b.width < 1 ||
    b.height < 1 ||
    ![b.x, b.y, b.width, b.height].every(Number.isFinite)
  )
    throw Error(
      "The result is empty or smaller than one canvas pixel. Try a smaller inset.",
    );
  path.translate(new scope.Point(-b.x, -b.y));
  path.scale(100 / b.width, 100 / b.height, new scope.Point(0, 0));
  const data = path.pathData;
  if (data.length > 200000)
    throw Error("This outline is too complex. Try fewer or simpler shapes.");
  return {
    ...createObject("path"),
    name: name.slice(0, 200),
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    fill: source.fill,
    pathData: data,
  };
}

/** Offset in world coordinates, preserving holes and reflected winding. Curves
 * are flattened to 0.08 canvas pixels; integer clipping uses 1/1000 pixel units. */
export function offsetObjects(
  objects: DesignObject[],
  distance: number,
  corner: "round" | "sharp",
  joined: boolean,
): DesignObject[] {
  const reason = shapeToolReason(objects);
  if (reason) throw Error(reason);
  if (
    !Number.isFinite(distance) ||
    Math.abs(distance) > 96 ||
    Math.abs(distance) < 0.096
  )
    throw Error("Choose a nonzero distance between −1 and 1 inch.");
  const groups = joined ? [objects] : objects.map((o) => [o]);
  return groups.map((group) => {
    const polygons: Clipper.Paths = [];
    let count = 0;
    for (const o of group) {
      const path = vectorPath(o);
      const parts =
        path instanceof paper.Path
          ? [path]
          : ((path as paper.CompoundPath).children as paper.Path[]);
      if (parts.reduce((n, p) => n + p.segments.length, 0) > 5000)
        throw Error("This shape is too complex to offset.");
      const local: Clipper.Paths = [];
      for (const part of parts) {
        if (!part.closed) throw Error("Offsets need closed shapes.");
        part.flatten(0.08);
        count += part.segments.length;
        if (count > 50000)
          throw Error("This outline is too complex. Select fewer shapes.");
        local.push(
          part.segments.map((s) => ({
            X: Math.round(s.point.x * 1000),
            Y: Math.round(s.point.y * 1000),
          })),
        );
      }
      // Normalize each filled object before joining: reflected shapes can have
      // opposite winding and must not cancel an overlapping unreflected shape.
      const clean = new Clipper.Clipper();
      clean.AddPaths(local, Clipper.PolyType.ptSubject, true);
      const normalized: Clipper.Paths = [];
      clean.Execute(
        Clipper.ClipType.ctUnion,
        normalized,
        Clipper.PolyFillType.pftNonZero,
        Clipper.PolyFillType.pftNonZero,
      );
      polygons.push(...normalized);
    }
    const union = new Clipper.Clipper();
    union.AddPaths(polygons, Clipper.PolyType.ptSubject, true);
    const merged: Clipper.Paths = [];
    union.Execute(
      Clipper.ClipType.ctUnion,
      merged,
      Clipper.PolyFillType.pftNonZero,
      Clipper.PolyFillType.pftNonZero,
    );
    const offset = new Clipper.ClipperOffset(2, 80);
    offset.AddPaths(
      merged,
      corner === "round" ? Clipper.JoinType.jtRound : Clipper.JoinType.jtMiter,
      Clipper.EndType.etClosedPolygon,
    );
    const result: Clipper.Paths = [];
    offset.Execute(result, distance * 1000);
    if (!result.length)
      throw Error(
        "This inset removes the entire shape. Try a smaller distance.",
      );
    scope.activate();
    const data = result
      .map(
        (p) =>
          p
            .map((v, i) => `${i ? "L" : "M"}${v.X / 1000} ${v.Y / 1000}`)
            .join(" ") + "Z",
      )
      .join(" ");
    return pathObject(
      new scope.CompoundPath(data),
      group[0],
      joined ? "Offset" : `${group[0].name} offset`,
    );
  });
}

export function contourParts(o: DesignObject) {
  if (!isNativeShape(o))
    throw Error("Contour needs a native shape or library path.");
  scope.activate();
  let source = o.contourSource || o.pathData || paths[o.type];
  if (!source) {
    const local = vectorPath({
      ...o,
      x: 0,
      y: 0,
      rotation: 0,
      skewX: 0,
      flipX: false,
      flipY: false,
    });
    local.scale(100 / o.width, 100 / o.height, new scope.Point(0, 0));
    source = local.pathData;
  }
  const path = new scope.CompoundPath(source);
  const parts = (path.children as paper.Path[]).map((p, index) => ({
    index,
    data: p.pathData,
    area: Math.abs(p.area),
  }));
  if (!parts.length || parts.length > 500)
    throw Error("Contour supports shapes with 1–500 paths.");
  return { source, parts };
}
export function withContours(o: DesignObject, hidden: number[]): DesignObject {
  const reason = shapeToolReason([o]);
  if (reason) throw Error(reason);
  const { source, parts } = contourParts(o);
  const indices = [...new Set(hidden)].sort((a, b) => a - b);
  if (indices.some((i) => !Number.isInteger(i) || i < 0 || i >= parts.length))
    throw Error("Invalid contour selection.");
  if (indices.length === parts.length)
    throw Error("Keep at least one contour visible.");
  return {
    ...o,
    type: "path",
    pathData: parts
      .filter((p) => !indices.includes(p.index))
      .map((p) => p.data)
      .join(" "),
    contourSource: source,
    hiddenContours: indices,
  };
}

export function consolidateColor(
  objects: DesignObject[],
  from: string,
  to: string,
) {
  if (!/^#[0-9a-f]{6}$/i.test(from) || !/^#[0-9a-f]{6}$/i.test(to))
    throw Error("Choose two valid colors.");
  return objects.map((o) =>
    o.visible &&
    !o.locked &&
    o.type !== "svg" &&
    o.operation !== "guide" &&
    o.fill.toLowerCase() === from.toLowerCase()
      ? { ...o, fill: to }
      : o,
  );
}
