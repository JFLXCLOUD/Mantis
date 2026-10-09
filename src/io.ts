import DOMPurify from "dompurify";
import { objectTransform } from "./geometry";
import {
  createObject,
  paths,
  validateProject,
  type DesignObject,
  type Project,
} from "./model";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function sanitizeSvg(raw: string): string {
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "svg",
      "g",
      "path",
      "rect",
      "circle",
      "ellipse",
      "line",
      "polyline",
      "polygon",
      "text",
      "tspan",
      "title",
      "desc",
    ],
    ALLOWED_ATTR: [
      "xmlns",
      "viewBox",
      "width",
      "height",
      "x",
      "y",
      "x1",
      "y1",
      "x2",
      "y2",
      "cx",
      "cy",
      "r",
      "rx",
      "ry",
      "d",
      "points",
      "fill",
      "fill-rule",
      "fill-opacity",
      "stroke",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-dasharray",
      "stroke-opacity",
      "opacity",
      "transform",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "text-anchor",
      "textLength",
      "lengthAdjust",
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
  const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw new Error("This file does not contain a valid SVG.");
  for (const el of doc.querySelectorAll("*")) {
    for (const attr of [...el.attributes])
      if (
        /url\s*\(|(?:https?|data|javascript):/i.test(attr.value) &&
        attr.name !== "xmlns"
      )
        el.removeAttribute(attr.name);
  }
  const root = doc.documentElement;
  root.setAttribute("width", "100%");
  root.setAttribute("height", "100%");
  root.setAttribute("preserveAspectRatio", "none");
  return new XMLSerializer().serializeToString(root);
}
export function importSvg(raw: string, name: string): DesignObject {
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw new Error("Please choose a valid SVG file.");
  const root = doc.documentElement;
  const viewBox = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const length = (s: string | null) => {
    if (!s) return NaN;
    const match = s.match(/^([\d.]+)\s*(px|in|mm|cm|pt)?$/);
    return match
      ? Number(match[1]) *
          ({ px: 1, in: 96, mm: 96 / 25.4, cm: 96 / 2.54, pt: 96 / 72 }[
            match[2] || "px"
          ] || 1)
      : NaN;
  };
  let width = length(root.getAttribute("width")),
    height = length(root.getAttribute("height"));
  if (!Number.isFinite(width)) width = viewBox?.[2] || 300;
  if (!Number.isFinite(height)) height = viewBox?.[3] || 300;
  if (width <= 0 || height <= 0 || width > 100000 || height > 100000)
    throw new Error("SVG dimensions are outside the supported range.");
  if (
    !viewBox ||
    viewBox.length !== 4 ||
    !viewBox.every(Number.isFinite) ||
    viewBox[2] <= 0 ||
    viewBox[3] <= 0
  )
    root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  return {
    ...createObject("svg"),
    name: name.replace(/\.svg$/i, "").slice(0, 200),
    width,
    height,
    svg: sanitizeSvg(new XMLSerializer().serializeToString(root)),
  };
}
export function readProject(raw: string): Project {
  const project = validateProject(JSON.parse(raw));
  return {
    ...project,
    objects: project.objects.map((o) =>
      o.type === "svg" ? { ...o, svg: sanitizeSvg(o.svg!) } : o,
    ),
  };
}
export function objectMarkup(o: DesignObject): string {
  const stroke = o.operation === "draw" || o.operation === "score";
  const attrs = `fill="${stroke ? "none" : o.fill}" stroke="${stroke ? o.fill : "none"}" stroke-width="1.5"${o.operation === "score" ? ' stroke-dasharray="6 4"' : ""}`;
  let body = "";
  if (o.type === "rect")
    body = `<rect width="${o.width}" height="${o.height}" rx="${Math.min(o.width, o.height) * 0.12}" ${attrs}/>`;
  else if (o.type === "ellipse")
    body = `<ellipse cx="${o.width / 2}" cy="${o.height / 2}" rx="${o.width / 2}" ry="${o.height / 2}" ${attrs}/>`;
  else if (o.type === "text")
    body = `<text x="0" y="${o.height * 0.8}" font-family="${escape(o.font || "Georgia")}" font-size="${o.height}" font-style="${o.italic ? "italic" : "normal"}" textLength="${o.width}" lengthAdjust="spacingAndGlyphs" ${attrs}>${escape(o.text || "")}</text>`;
  else if (o.type === "svg")
    body = `<svg width="${o.width}" height="${o.height}">${o.svg}</svg>`;
  else
    body = `<path d="${escape(o.type === "path" ? o.pathData || "" : paths[o.type])}" transform="scale(${o.width / 100} ${o.height / 100})" ${attrs}/>`;
  return `<g data-name="${escape(o.name)}" data-operation="${o.operation}" transform="${objectTransform(o)}">${body}</g>`;
}
export function exportSvg(
  project: Project,
  objects = project.objects,
  mirror = false,
): string {
  const visible = objects.filter((o) => o.visible && o.operation !== "guide");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${project.width / 96}in" height="${project.height / 96}in" viewBox="0 0 ${project.width} ${project.height}">\n<title>${escape(project.name)}</title>\n<desc>Created with Mantis Studio. Text is editable text, not outlined paths. Operation labels are metadata; configure operations in your cutting software.</desc>\n<g${mirror ? ` transform="translate(${project.width} 0) scale(-1 1)"` : ""}>${visible.map(objectMarkup).join("\n")}</g>\n</svg>`;
}
export function download(contents: string | Blob, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const filename = (name: string) =>
  name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 100) || "Mantis Studio project";
