// Convert the pinned MIT-licensed filled Tabler collection to editable paths.
// Outline icons are intentionally excluded: their strokes are not cut contours.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
globalThis.self = { navigator: { userAgent: "node" } };
const { default: paper } = await import("paper/dist/paper-core.js");
const s = new paper.PaperScope();
s.setup(new s.Size(1, 1));
s.settings.insertItems = false;
const root = "node_modules/@tabler/icons/";
const nodes = JSON.parse(
  readFileSync(root + "tabler-nodes-filled.json", "utf8"),
);
const metadata = JSON.parse(readFileSync(root + "icons.json", "utf8"));
const catalog = [];
for (const [name, elements] of Object.entries(nodes)) {
  if (name.startsWith("brand-")) continue;
  const paths = elements.map(([tag, attrs]) => {
    if (
      tag !== "path" ||
      typeof attrs.d !== "string" ||
      attrs.transform ||
      attrs["fill-rule"]
    )
      throw Error(`Review unsupported geometry: ${name}`);
    const p = new s.CompoundPath(attrs.d);
    for (const child of p.children) child.closed = true; // SVG fills implicitly close subpaths.
    return p;
  });
  const geometry = paths.reduce((a, b) => a.unite(b));
  const b = geometry.bounds.clone();
  if (!(b.width > 0 && b.height > 0)) throw Error(`Empty shape: ${name}`);
  geometry.translate(new s.Point(-b.x, -b.y));
  geometry.scale(100 / b.width, 100 / b.height, new s.Point(0, 0));
  const meta = metadata[name] || {};
  catalog.push({
    id: `tabler-${name}`,
    name: name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    category: meta.category || "Symbols",
    tags: [...(meta.tags || []), name].map(String),
    aspect: Number((b.width / b.height).toFixed(6)),
    pathData: geometry.getPathData(null, 5),
    source: "tabler",
  });
}
writeFileSync("src/tabler-catalog.json", JSON.stringify(catalog) + "\n");
mkdirSync("licenses", { recursive: true });
writeFileSync("licenses/TABLER_ICONS.txt", readFileSync(root + "LICENSE"));
console.log(
  `Generated ${catalog.length} filled shapes from Tabler ${JSON.parse(readFileSync(root + "package.json")).version}; brand marks excluded.`,
);
process.exit(0);
