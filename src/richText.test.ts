// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createObject, blankProject, validateProject } from "./model";
import { objectMarkup, exportSvg, importSvg, readProject } from "./io";
import { richText } from "./richText";
describe("editable typography", () => {
  it("preserves styled multiline text and effect settings through project and SVG output", () => {
    const project = blankProject();
    const text = {
      ...createObject("text"),
      text: "Made with\nlove & care",
      bold: true,
      italic: true,
      underline: true,
      letterSpacing: 4,
      lineSpacing: 1.4,
      textAlign: "center" as const,
      textEffect: "outline" as const,
      effectAmount: 6,
    };
    project.objects = [text];
    const saved = readProject(JSON.stringify(project));
    expect(saved.version).toBe(5);
    expect(saved.objects[0]).toEqual(text);
    const svg = exportSvg(saved);
    expect(svg).toContain('font-weight="700"');
    expect(svg).toContain('text-decoration="underline"');
    expect(svg).toContain('letter-spacing="4"');
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain("love &amp; care");
    expect(svg).toContain('stroke-width="6"');
    const imported = importSvg(svg, "styled.svg");
    expect(imported.svg).toContain('letter-spacing="4"');
    expect(imported.svg).toContain('text-decoration="underline"');
  });
  it("escapes user text and font names; shadow references remain distinct", () => {
    const o = {
      ...createObject("text"),
      text: "<script>alert(1)</script>",
      font: 'A" onload="bad',
      textEffect: "shadow" as const,
      textCurve: -60,
      textCurveRatio: 4,
    };
    const svg = objectMarkup(o);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain(' onload="bad');
    const ids = [...svg.matchAll(/<path id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
  it("rejects invalid effects and typography values while old projects keep their artwork", () => {
    for (const patch of [
      { bold: "yes" },
      { underline: 1 },
      { letterSpacing: Infinity },
      { letterSpacing: 51 },
      { lineSpacing: 0.1 },
      { effectAmount: -1 },
      { textAlign: "justify" },
      { textEffect: "url(evil)" },
    ]) {
      expect(() =>
        validateProject({
          ...blankProject(),
          objects: [{ ...createObject("text"), ...patch }],
        }),
      ).toThrow();
    }
    const old = {
      ...blankProject(),
      version: 4,
      objects: [createObject("text")],
    };
    expect(richText(old.objects[0])).toBe(false);
    const current = readProject(JSON.stringify(old));
    expect(current.objects).toEqual(old.objects);
    expect(current.version).toBe(5);
  });
});
