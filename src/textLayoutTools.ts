import { createObject, type DesignObject } from "./model";
import { basis } from "./geometry";
import { richText, styledTextLayout } from "./richText";
import { fontFamily } from "./fonts";
const ns = "http://www.w3.org/2000/svg";
export function wrapWords(text: string, columns: number) {
  if (!Number.isInteger(columns) || columns < 4 || columns > 100)
    throw Error("Choose 4–100 characters per line.");
  return text
    .split("\n")
    .map((line) => {
      let row = "",
        rows: string[] = [];
      for (const word of line.trim().split(/\s+/)) {
        if (row && row.length + 1 + word.length > columns) {
          rows.push(row);
          row = word;
        } else row += `${row ? " " : ""}${word}`;
      }
      rows.push(row);
      return rows.join("\n");
    })
    .join("\n")
    .slice(0, 1000);
}
/** Separate straight text into editable layers. Native SVG metrics preserve
 * line placement; single-line letters keep their measured advance positions. */
export function separateText(
  o: DesignObject,
  mode: "lines" | "letters",
): DesignObject[] {
  if (o.type !== "text" || o.locked || !o.visible)
    throw Error("Select visible, unlocked text.");
  if (o.textCurve) throw Error("Straighten the text before separating it.");
  if (mode === "letters" && (richText(o) || o.text?.includes("\n")))
    throw Error(
      "Separate letters currently supports a plain single line. Reset styling first, or separate lines instead.",
    );
  const m = basis(o, true);
  const place = (
    next: DesignObject,
    left: number,
    top: number,
    width: number,
    height: number,
  ) => {
    if (width < 1 || height < 1)
      throw Error("Some pieces would be too small. Enlarge the text first.");
    const dx = left + width / 2 - o.width / 2,
      dy = top + height / 2 - o.height / 2;
    return {
      ...next,
      id: createObject("text").id,
      groupId: undefined,
      x: o.x + o.width / 2 + m.a * dx + m.c * dy - width / 2,
      y: o.y + o.height / 2 + m.b * dx + m.d * dy - height / 2,
      width,
      height,
    };
  };
  if (mode === "lines") {
    const lines = (o.text || "").split("\n");
    if (lines.length < 2)
      throw Error("Add a line break before separating lines.");
    const old = styledTextLayout(o, "split-lines").box,
      sx = o.width / old.width,
      sy = o.height / old.height;
    return lines.flatMap((text, i) => {
      if (!text.trim()) return [];
      const next = {
        ...o,
        text,
        name: text.slice(0, 200),
        textCurve: undefined,
        textCurveRatio: undefined,
        lineSpacing: o.lineSpacing || 1.2,
      };
      const box = styledTextLayout(next, `split-line-${i}`).box;
      return [
        place(
          next,
          (box.x - old.x) * sx,
          (box.y + i * 100 * (o.lineSpacing || 1.2) - old.y) * sy,
          box.width * sx,
          box.height * sy,
        ),
      ];
    });
  }
  const text = o.text || "",
    segments = [
      ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
        text,
      ),
    ];
  if (segments.filter((s) => s.segment.trim()).length < 2)
    throw Error("Enter at least two letters.");
  const svg = document.createElementNS(ns, "svg"),
    node = document.createElementNS(ns, "text");
  svg.style.cssText = "position:fixed;left:-100000px;top:0;visibility:hidden";
  node.setAttribute("font-family", fontFamily(o.font));
  node.setAttribute("font-size", String(o.height));
  node.setAttribute("font-style", o.italic ? "italic" : "normal");
  node.setAttribute("textLength", String(o.width));
  node.setAttribute("lengthAdjust", "spacingAndGlyphs");
  node.setAttribute("xml:space", "preserve");
  node.textContent = text;
  svg.append(node);
  document.body.append(svg);
  try {
    const count = node.getNumberOfChars();
    if (count !== Array.from(text).length)
      throw Error(
        "This script cannot be separated reliably. Keep it as editable text.",
      );
    let char = 0;
    return segments.flatMap((s) => {
      const length = Array.from(s.segment).length,
        start = node.getStartPositionOfChar(char),
        end = node.getEndPositionOfChar(char + length - 1);
      char += length;
      if (!s.segment.trim()) return [];
      if (end.x <= start.x)
        throw Error(
          "Right-to-left text should stay together to preserve shaping.",
        );
      return [
        place(
          { ...o, text: s.segment, name: s.segment },
          start.x,
          0,
          end.x - start.x,
          o.height,
        ),
      ];
    });
  } finally {
    svg.remove();
  }
}
