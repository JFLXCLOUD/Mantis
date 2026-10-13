import type { DesignObject } from "./model";
import type { Box } from "./geometry";
import { fontFamily } from "./fonts";
import { textArc, TEXT_EM } from "./textCurve";

export const escapeText = (s: string) =>
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
export function richText(o: DesignObject) {
  return !!(
    o.bold ||
    o.underline ||
    o.letterSpacing ||
    o.lineSpacing ||
    o.textAlign ||
    o.textEffect ||
    o.text?.includes("\n")
  );
}
const cache = new Map<string, Box>();
export function styledTextLayout(o: DesignObject, id: string) {
  const lines = (o.text || "").split("\n");
  const curved = !!o.textCurve && lines.length === 1;
  const ratio = o.textCurveRatio ?? o.width / o.height;
  const arc = textArc(o.textCurve || 0, ratio);
  const attrs = `font-family="${escapeText(fontFamily(o.font))}" font-size="${TEXT_EM}" font-style="${o.italic ? "italic" : "normal"}" font-weight="${o.bold ? 700 : 400}" letter-spacing="${o.letterSpacing || 0}" text-decoration="${o.underline ? "underline" : "none"}" xml:space="preserve"`;
  let body: string;
  if (curved)
    body = `<defs><path id="${id}" d="${arc.path}"/></defs><text ${attrs}><textPath href="#${id}" textLength="${arc.length}" lengthAdjust="spacingAndGlyphs">${escapeText(lines[0])}</textPath></text>`;
  else {
    const anchor =
      o.textAlign === "center"
        ? "middle"
        : o.textAlign === "right"
          ? "end"
          : "start";
    body = lines
      .map(
        (line, i) =>
          `<text ${attrs} x="0" y="${80 + i * 100 * (o.lineSpacing || 1.2)}" text-anchor="${anchor}">${escapeText(line || "\u00a0")}</text>`,
      )
      .join("");
  }
  const key = JSON.stringify([
    o.text,
    o.font,
    o.italic,
    o.bold,
    o.underline,
    o.letterSpacing,
    o.lineSpacing,
    o.textAlign,
    o.textEffect,
    o.effectAmount,
    curved && o.textCurve,
    curved && ratio,
  ]);
  let box = cache.get(key);
  if (!box) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText =
      "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none";
    const measureId = `measure-styled-${crypto.randomUUID()}`;
    const measureBody = body
      .replace(`id="${id}"`, `id="${measureId}"`)
      .replace(`href="#${id}"`, `href="#${measureId}"`);
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `<g>${measureBody}</g>`;
    document.body.append(svg);
    try {
      const b = (svg.firstElementChild as SVGGElement).getBBox();
      box =
        b.width > 0 &&
        b.height > 0 &&
        [b.x, b.y, b.width, b.height].every(Number.isFinite)
          ? { x: b.x - 2, y: b.y - 2, width: b.width + 4, height: b.height + 4 }
          : {
              x: 0,
              y: 0,
              width: Math.max(100, lines[0].length * 60),
              height: 100 * lines.length,
            };
    } catch {
      box = {
        x: 0,
        y: 0,
        width: Math.max(100, lines[0].length * 60),
        height: 100 * lines.length,
      };
    } finally {
      svg.remove();
    }
    // Include decoration and effect extents in the selectable/exported box.
    if (o.underline) box.height += 12;
    const amount = o.effectAmount ?? 4;
    if (o.textEffect === "outline")
      box = {
        x: box.x - amount / 2,
        y: box.y - amount / 2,
        width: box.width + amount,
        height: box.height + amount,
      };
    if (o.textEffect === "shadow")
      box = { ...box, width: box.width + amount, height: box.height + amount };
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(key, box);
  }
  return { body, box };
}
export function styledTextMarkup(o: DesignObject, attrs: string, id: string) {
  const { body, box } = styledTextLayout(o, id);
  const amount = o.effectAmount ?? 4;
  const outline = o.textEffect === "outline";
  const paint = outline
    ? `fill="none" stroke="${o.fill}" stroke-width="${amount}" stroke-linejoin="round"`
    : attrs;
  const shadow =
    o.textEffect === "shadow"
      ? `<g transform="translate(${amount} ${amount})" opacity="0.3" ${attrs}>${styledTextLayout(o, `${id}-shadow`).body}</g>`
      : "";
  return `<g data-styled-text="true" transform="scale(${o.width / box.width} ${o.height / box.height}) translate(${-box.x} ${-box.y})">${shadow}<g ${paint}>${body}</g></g>`;
}
