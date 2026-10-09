import paper from "paper/dist/paper-core";
import { basis } from "./geometry";
import { createObject, paths, type DesignObject } from "./model";

// Geometry only: no canvas, PaperScript, SVG import, or device commands.
const scope = new paper.PaperScope();
scope.setup(new scope.Size(1, 1));
scope.settings.insertItems = false;
export type CombineMode = "weld" | "subtract" | "intersect" | "slice";
export const combineLabels: Record<CombineMode, string> = {
  weld: "Weld",
  subtract: "Subtract",
  intersect: "Intersect",
  slice: "Slice",
};
export function vectorPath(o: DesignObject): paper.PathItem {
  scope.activate();
  let path: paper.PathItem;
  if (o.type === "rect") {
    const radius = Math.min(o.width, o.height) * 0.12;
    path = new scope.Path.Rectangle(
      new scope.Rectangle(0, 0, o.width, o.height),
      new scope.Size(radius, radius),
    );
  } else if (o.type === "ellipse") {
    path = new scope.Path.Ellipse(new scope.Rectangle(0, 0, o.width, o.height));
  } else if (o.type === "path" || paths[o.type]) {
    path = new scope.CompoundPath(
      o.type === "path" ? o.pathData || "" : paths[o.type],
    );
    path.scale(o.width / 100, o.height / 100, new scope.Point(0, 0));
  } else
    throw new Error(
      "Combine works with shapes and combined paths. Text and imported SVG need outlining first.",
    );
  const m = basis(o, true);
  path.transform(
    new scope.Matrix(
      m.a,
      m.b,
      m.c,
      m.d,
      o.x + o.width / 2 - (m.a * o.width) / 2 - (m.c * o.height) / 2,
      o.y + o.height / 2 - (m.b * o.width) / 2 - (m.d * o.height) / 2,
    ),
  );
  return path;
}
export function combineObjects(
  objects: DesignObject[],
  mode: CombineMode,
): DesignObject[] {
  if (objects.length < 2 || objects.length > 50)
    throw new Error("Select 2–50 shapes to combine.");
  if (objects.some((o) => !o.visible || o.locked || o.operation !== "cut"))
    throw new Error("Combine needs visible, unlocked Cut layers.");
  if (mode === "slice" && objects.length !== 2)
    throw new Error("Slice needs exactly two shapes.");
  const input = objects.map(vectorPath);
  const options = { insert: false };
  let result: paper.PathItem[];
  if (mode === "slice")
    result = [
      input[0].subtract(input[1], options),
      input[0].intersect(input[1], options),
      input[1].subtract(input[0], options),
    ];
  else {
    const method = mode === "weld" ? "unite" : mode;
    result = [input.slice(1).reduce((a, b) => a[method](b, options), input[0])];
  }
  const output = result.flatMap((path, index) => {
    const b = path.bounds.clone();
    if (
      Math.abs((path as paper.CompoundPath).area) < 0.001 ||
      b.width < 1 ||
      b.height < 1
    )
      return [];
    path.translate(new scope.Point(-b.x, -b.y));
    path.scale(100 / b.width, 100 / b.height, new scope.Point(0, 0));
    return [
      {
        ...createObject("path"),
        name: `${combineLabels[mode]}${mode === "slice" ? ` ${index + 1}` : ""}`,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        fill:
          mode === "slice" && index === 2 ? objects[1].fill : objects[0].fill,
        pathData: path.pathData,
      },
    ];
  });
  if (!output.length)
    throw new Error(
      "The result is empty or smaller than one canvas pixel. Nothing changed.",
    );
  return output;
}
