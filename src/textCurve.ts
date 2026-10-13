import { richText, styledTextLayout } from './richText';
import type { DesignObject } from "./model";
import type { Box } from "./geometry";
import { fontFamily } from './fonts';

export const MAX_TEXT_CURVE = 180;
export const TEXT_EM = 100;
export function textArc(angle: number, ratio: number) {
  const length = ratio * TEXT_EM;
  const radians = (Math.abs(angle) * Math.PI) / 180;
  if (!radians) return { path: `M 0 80 H ${length}`, length };
  const radius = length / radians;
  const halfChord = radius * Math.sin(radians / 2);
  return {
    path: `M ${-halfChord} 0 A ${radius} ${radius} 0 0 ${angle < 0 ? 1 : 0} ${halfChord} 0`,
    length,
  };
}
const measured = new Map<string, Box>();
const ns = "http://www.w3.org/2000/svg";
export function curveLayout(o: DesignObject) {
  const angle = o.textCurve || 0;
  const ratio = o.textCurveRatio ?? o.width / o.height;
  const arc = textArc(angle, ratio);
  if (richText(o)) return {...arc,box:styledTextLayout(o,'styled-curve-measure').box};
  if (!angle)
    return { ...arc, box: { x: 0, y: 0, width: arc.length, height: TEXT_EM } };
  const key = JSON.stringify([angle, ratio, o.text, o.font, o.italic]);
  let box = measured.get(key);
  if (!box) {
    // SVG's own shaped glyph metrics include italics, accents and rotated letters.
    // Keep measurement out of the artwork DOM and cache across preview/export.
    const svg = document.createElementNS(ns, "svg");
    const defs = document.createElementNS(ns, "defs");
    const path = document.createElementNS(ns, "path");
    const text = document.createElementNS(ns, "text");
    const textPath = document.createElementNS(ns, "textPath");
    path.id = `measure-curve-${crypto.randomUUID()}`;
    path.setAttribute("d", arc.path);
    text.setAttribute("font-family", fontFamily(o.font));
    text.setAttribute("font-size", String(TEXT_EM));
    text.setAttribute("font-style", o.italic ? "italic" : "normal");
    textPath.setAttribute("href", `#${path.id}`);
    textPath.setAttribute("textLength", String(arc.length));
    textPath.setAttribute("lengthAdjust", "spacingAndGlyphs");
    textPath.textContent = o.text || "";
    text.append(textPath);
    defs.append(path);
    svg.append(defs, text);
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText =
      "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none";
    document.body.append(svg);
    try {
      const b = text.getBBox();
      // Empty text still needs a finite, selectable planning box.
      box =
        [b.x, b.y, b.width, b.height].every(Number.isFinite) &&
        b.width > 0 &&
        b.height > 0
          ? { x: b.x - 1, y: b.y - 1, width: b.width + 2, height: b.height + 2 }
          : {
              x: -arc.length / 2,
              y: -TEXT_EM,
              width: arc.length,
              height: TEXT_EM,
            };
    } finally {
      svg.remove();
    }
    if (measured.size >= 256) measured.delete(measured.keys().next().value!);
    measured.set(key, box);
  }
  return { ...arc, box };
}
export function curveTransform(o: DesignObject, box: Box) {
  return `scale(${o.width / box.width} ${o.height / box.height}) translate(${-box.x} ${-box.y})`;
}
export function withTextCurve(o: DesignObject, angle: number): DesignObject {
  if (o.type !== "text" || o.locked) return o;
  if (!Number.isInteger(angle) || Math.abs(angle) > MAX_TEXT_CURVE)
    throw Error("Text curve must be between -180 and 180 degrees.");
  if ((o.textCurve || 0) === angle) return o;
  const old = curveLayout(o);
  const next = {
    ...o,
    textCurve: angle,
    textCurveRatio: o.textCurveRatio ?? o.width / o.height,
  };
  const layout = curveLayout(next);
  const width = (o.width * layout.box.width) / old.box.width;
  const height = (o.height * layout.box.height) / old.box.height;
  const x = o.x + (o.width - width) / 2,
    y = o.y + (o.height - height) / 2;
  if (
    ![width, height].every(
      (n) => Number.isFinite(n) && n >= 1 && n <= 100000,
    ) ||
    ![x, y].every((n) => Number.isFinite(n) && Math.abs(n) <= 100000)
  )
    throw Error(
      "This curve exceeds the supported object size. Resize the text first.",
    );
  return {
    ...next,
    x,
    y,
    width,
    height,
    ...(angle === 0 ? { textCurveRatio: undefined } : {}),
  };
}
