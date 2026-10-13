// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { blankProject, createObject, validateProject } from "./model";
import { textArc } from "./textCurve";
import { readProject, sanitizeSvg } from "./io";
import { scopeSvgTextPaths } from "./svgReferences";

describe("curved text data and local SVG references", () => {
  it("migrates older documents without changing artwork and saves version 6", () => {
    const objects = [createObject("text")];
    for (const version of [1, 2, 3]) {
      const p = validateProject({ ...blankProject(), version, objects });
      expect(p.version).toBe(6);
      expect(p.objects).toEqual(objects);
    }
  });
  it("round trips curve properties and rejects malformed angles and proportions", () => {
    const o = { ...createObject("text"), textCurve: -120, textCurveRatio: 4 };
    expect(
      readProject(JSON.stringify({ ...blankProject(), objects: [o] })).objects,
    ).toEqual([o]);
    for (const patch of [
      { textCurve: NaN },
      { textCurve: 181 },
      { textCurve: 0.5 },
      { textCurve: "60" },
      { textCurveRatio: 0 },
      { textCurveRatio: Infinity },
      { textCurveRatio: undefined },
      { type: "rect" },
    ])
      expect(() =>
        validateProject({ ...blankProject(), objects: [{ ...o, ...patch }] }),
      ).toThrow();
  });
  it("reverses arc direction while retaining run length and finite paths at the limits", () => {
    const up = textArc(-120, 4),
      down = textArc(120, 4);
    expect(up.length).toBe(400);
    expect(down.length).toBe(400);
    expect(up.path).toContain("0 0 1");
    expect(down.path).toContain("0 0 0");
    for (const angle of [-180, -1, 0, 1, 180])
      expect(textArc(angle, 4).path).not.toMatch(/NaN|Infinity/);
  });
  it("retains and scopes local path text through sanitation without allowing external references or active content", () => {
    const clean = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="arc" d="M0 0 Q50 -20 100 0"/></defs><text><textPath href="#arc" textLength="100" lengthAdjust="spacingAndGlyphs">HELLO</textPath><textPath href="https://example.org/a.svg#arc">BAD</textPath><textPath href="#unknown">MISSING</textPath></text><script>alert(1)</script><use href="#arc"/></svg>',
    );
    const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
    expect(doc.querySelectorAll("textPath")).toHaveLength(1);
    const id = doc.querySelector("defs path")!.id;
    expect(id).toMatch(/^import-/);
    expect(doc.querySelector("textPath")!.getAttribute("href")).toBe(`#${id}`);
    expect(clean).not.toMatch(/BAD|MISSING|example.org|<script|<use/);
    const a = scopeSvgTextPaths(clean, "placement-a"),
      b = scopeSvgTextPaths(clean, "placement-b");
    expect(a).toContain('href="#placement-a-0"');
    expect(b).toContain('href="#placement-b-0"');
    expect(a).toContain('textLength="100"');
    expect(a).toContain("HELLO");
  });
});
