import catalog from "./shape-catalog.json";
import tabler from "./tabler-catalog.json";
import { createObject, type DesignObject, type Project } from "./model";

export type LibraryShape = (typeof catalog)[number] & { source?: string };
export const libraryShapes: readonly LibraryShape[] = [...catalog, ...tabler];
export const shapeCategories = [
  "All shapes",
  "Nature",
  "Animals",
  "Celebrations",
  "Essentials",
] as const;
export const allShapeCategories = [
  ...new Set(libraryShapes.map((s) => s.category)),
].sort();
function words(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
export function searchShapes(
  query: string,
  category = "All shapes",
  source = "all",
) {
  const terms = words(query);
  return libraryShapes.filter((shape) => {
    if (category !== "All shapes" && shape.category !== category) return false;
    if (source === "originals" && shape.source) return false;
    if (source === "tabler" && shape.source !== "tabler") return false;
    const tokens = words([shape.name, shape.category, ...shape.tags].join(" "));
    return terms.every((term) =>
      tokens.some(
        (token) =>
          token.startsWith(term) ||
          (term.length > 3 &&
            term.endsWith("s") &&
            token.startsWith(term.slice(0, -1))),
      ),
    );
  });
}
export function createLibraryObject(
  shape: LibraryShape,
  project: Pick<Project, "width" | "height">,
): DesignObject {
  const size = Math.min(192, project.width * 0.8, project.height * 0.8);
  const width = shape.aspect >= 1 ? size : size * shape.aspect;
  const height = shape.aspect >= 1 ? size / shape.aspect : size;
  return {
    ...createObject("path"),
    name: shape.name,
    pathData: shape.pathData,
    width,
    height,
    x: (project.width - width) / 2,
    y: (project.height - height) / 2,
  };
}
