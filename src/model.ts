export { bounds } from "./geometry";
export type Shape =
  | "rect"
  | "ellipse"
  | "triangle"
  | "star"
  | "heart"
  | "leaf"
  | "flower"
  | "text"
  | "path"
  | "svg";
export type Operation = "cut" | "draw" | "score" | "guide";
export type DesignObject = {
  id: string;
  name: string;
  type: Shape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  operation: Operation;
  visible: boolean;
  locked: boolean;
  text?: string;
  font?: string;
  italic?: boolean;
  svg?: string;
  pathData?: string;
  groupId?: string;
  flipX?: boolean;
  flipY?: boolean;
  skewX?: number;
};
export type Project = {
  format: "hopper";
  version: 3;
  name: string;
  width: number;
  height: number;
  objects: DesignObject[];
};
export const INCH = 96;
export const COLORS = [
  "#285c48",
  "#8eae89",
  "#e4b351",
  "#df896f",
  "#eacbbb",
  "#eee6d7",
  "#373e36",
  "#ffffff",
];
export const id = () => crypto.randomUUID();
export const paths: Record<string, string> = {
  triangle: "M50 0 L100 100 H0 Z",
  star: "M50 0 L61 35 L98 35 L68 57 L80 94 L50 72 L20 94 L32 57 L2 35 L39 35 Z",
  heart:
    "M50 94 C40 84 0 58 0 28 C0 -2 36 -10 50 17 C64 -10 100 -2 100 28 C100 58 60 84 50 94 Z",
  leaf: "M3 97 C-8 28 26 -5 97 3 C105 71 64 108 3 97 Z",
  flower:
    "M50 25 C24 -18 0 6 25 37 C-20 28 -6 72 26 64 C2 102 40 118 50 78 C66 119 105 97 76 64 C116 74 119 28 75 37 C105 5 69 -18 50 25 Z",
};
export function createObject(type: Shape, index = 0): DesignObject {
  return {
    id: id(),
    name:
      type === "text" ? "Your words" : type[0].toUpperCase() + type.slice(1),
    type,
    x: 192 + (index % 5) * 24,
    y: 192 + (index % 5) * 24,
    width: type === "text" ? 360 : 160,
    height: type === "text" ? 90 : 160,
    rotation: 0,
    fill: COLORS[0],
    operation: "cut",
    visible: true,
    locked: false,
    ...(type === "text" ? { text: "Your words", font: "Georgia" } : {}),
  };
}
export function blankProject(): Project {
  return {
    format: "hopper",
    version: 3,
    name: "Untitled project",
    width: 1152,
    height: 1152,
    objects: [],
  };
}
export function demoProject(): Project {
  const obj = (
    type: Shape,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    extra = {},
  ) => ({ ...createObject(type), name, x, y, width, height, fill, ...extra });
  return {
    ...blankProject(),
    name: "Good things grow here",
    objects: [
      obj("rect", "Terracotta backing", 232, 175, 688, 800, "#eacbbb"),
      obj("text", "GOOD THINGS", 330, 267, 490, 76, "#285c48", {
        text: "GOOD THINGS",
        font: "Arial",
      }),
      obj("text", "grow", 333, 350, 476, 176, "#285c48", {
        text: "grow",
        font: "Georgia",
        italic: true,
      }),
      obj("text", "here.", 378, 507, 390, 168, "#285c48", {
        text: "here.",
        font: "Georgia",
        italic: true,
      }),
      obj("leaf", "Sage leaf", 423, 739, 102, 142, "#8eae89", {
        rotation: -65,
      }),
      obj("leaf", "Forest leaf", 600, 737, 86, 139, "#285c48", {
        rotation: 15,
      }),
      obj("flower", "Golden bloom", 506, 686, 145, 145, "#e4b351"),
      obj("ellipse", "Flower center", 560, 742, 35, 35, "#df896f"),
      obj("text", "MADE WITH A LITTLE LOVE", 376, 903, 400, 20, "#285c48", {
        text: "MADE WITH A LITTLE LOVE",
        font: "Arial",
      }),
    ],
  };
}
export function validateProject(input: unknown): Project {
  if (!input || typeof input !== "object")
    throw new Error("This is not a Mantis Studio project.");
  const p = input as Omit<Project, "version"> & { version: number };
  if (
    p.format !== "hopper" ||
    ![1, 2, 3].includes(p.version) ||
    !Array.isArray(p.objects) ||
    p.objects.length > 1000
  )
    throw new Error(
      "Unsupported project format or too many objects (maximum 1,000).",
    );
  if (
    typeof p.name !== "string" ||
    p.name.length > 200 ||
    ![p.width, p.height].every(
      (n) => Number.isFinite(n) && n >= 96 && n <= 4800,
    )
  )
    throw new Error("Invalid project dimensions or name.");
  const ids = new Set<string>();
  for (const o of p.objects) {
    if (
      !o ||
      typeof o.id !== "string" ||
      ids.has(o.id) ||
      typeof o.name !== "string" ||
      o.name.length > 200
    )
      throw new Error("Invalid or duplicate layer.");
    ids.add(o.id);
    if (
      ![
        "rect",
        "ellipse",
        "triangle",
        "star",
        "heart",
        "leaf",
        "flower",
        "text",
        "path",
        "svg",
      ].includes(o.type) ||
      !["cut", "draw", "score", "guide"].includes(o.operation)
    )
      throw new Error("Unsupported layer type.");
    if (
      ![o.x, o.y, o.width, o.height, o.rotation].every(
        (n) => Number.isFinite(n) && Math.abs(n) <= 100000,
      ) ||
      o.width < 1 ||
      o.height < 1
    )
      throw new Error("Invalid layer geometry.");
    if (
      typeof o.fill !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(o.fill) ||
      typeof o.visible !== "boolean" ||
      typeof o.locked !== "boolean"
    )
      throw new Error("Invalid layer appearance.");
    if (
      o.type === "svg" &&
      (typeof o.svg !== "string" || o.svg.length > 2000000)
    )
      throw new Error("Invalid SVG layer.");
    if (
      o.type === "path" &&
      (typeof o.pathData !== "string" ||
        o.pathData.length > 200000 ||
        !/^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]+$/.test(o.pathData))
    )
      throw new Error("Invalid vector path.");
    if (
      o.type === "text" &&
      (typeof o.text !== "string" ||
        o.text.length > 1000 ||
        !["Georgia", "Arial", "Verdana", "Courier New"].includes(o.font || ""))
    )
      throw new Error("Invalid text layer.");
    if (o.groupId !== undefined && typeof o.groupId !== "string")
      throw new Error("Invalid group.");
    if (
      [o.flipX, o.flipY].some(
        (value) => value !== undefined && typeof value !== "boolean",
      )
    )
      throw new Error("Invalid reflection.");
    if (
      o.skewX !== undefined &&
      (!Number.isFinite(o.skewX) || Math.abs(o.skewX) >= 89.99)
    )
      throw new Error("Invalid skew.");
  }
  return {
    format: "hopper",
    version: 3,
    name: p.name,
    width: p.width,
    height: p.height,
    objects: p.objects,
  };
}
export function materialGroups(project: Project) {
  const groups = new Map<string, DesignObject[]>();
  for (const o of project.objects.filter(
    (o) => o.visible && o.operation !== "guide",
  )) {
    const key = o.type === "svg" ? `svg:${o.id}` : `${o.fill}:${o.operation}`;
    groups.set(key, [...(groups.get(key) || []), o]);
  }
  return [...groups.entries()].map(([key, objects]) => ({
    key,
    color: objects[0].fill,
    operation: objects[0].operation,
    objects,
  }));
}
