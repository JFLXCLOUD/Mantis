// Imported SVG may reference local paths for curved text only. Each placement
// gets a fresh namespace so copied/imported layers cannot hijack another path.
export function scopeTextPathReferences(root: Element, prefix: string) {
  const ids = new Map<string, string>();
  for (const el of root.querySelectorAll("[id]")) {
    const old = el.getAttribute("id")!;
    el.removeAttribute("id");
    if (el.localName !== "path" || !old || ids.has(old)) continue;
    const id = `${prefix}-${ids.size}`;
    ids.set(old, id);
    el.setAttribute("id", id);
  }
  for (const el of root.querySelectorAll("*")) {
    const href = el.getAttribute("href") || el.getAttribute("xlink:href");
    el.removeAttribute("href");
    el.removeAttribute("xlink:href");
    if (el.localName === "textPath") {
      const id = href?.startsWith("#") ? ids.get(href.slice(1)) : undefined;
      if (id) el.setAttribute("href", `#${id}`);
      else el.remove();
    }
  }
  root.removeAttribute("id");
  root.removeAttribute("href");
  root.removeAttribute("xlink:href");
}
export function scopeSvgTextPaths(raw: string, prefix: string) {
  if (!/<textPath\b/i.test(raw)) return raw;
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  scopeTextPathReferences(doc.documentElement, prefix);
  return new XMLSerializer().serializeToString(doc.documentElement);
}
