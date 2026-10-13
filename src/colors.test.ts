import { describe, expect, it } from "vitest";
import {
  BASIC_COLORS,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHex,
  rgbToHex,
} from "./colors";
describe("object colors", () => {
  it("normalizes opaque HEX and rejects malformed or alpha colors", () => {
    expect(normalizeHex(" ABC ")).toBe("#aabbcc");
    expect(normalizeHex("#12AbEf")).toBe("#12abef");
    for (const input of ["", "#12", "#1234", "#12345678", "red", "12gg00"])
      expect(normalizeHex(input)).toBeNull();
  });
  it("bounds RGB channels and rejects incomplete, fractional and negative entries", () => {
    expect(rgbToHex(["0", "128", "255"])).toBe("#0080ff");
    expect(hexToRgb("#0080ff")).toEqual([0, 128, 255]);
    for (const value of ["", "-1", "256", "1.5", "NaN"])
      expect(rgbToHex([value, "0", "0"])).toBeNull();
  });
  it("round trips palette colors and neutral extremes through HSV", () => {
    for (const hex of [
      ...BASIC_COLORS.map((c) => c[1]),
      "#000000",
      "#ff0000",
      "#00ff00",
      "#0000ff",
    ])
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    expect(hsvToHex({ h: 360, s: 100, v: 100 })).toBe("#ff0000");
    expect(hsvToHex({ h: 180, s: 100, v: 100 })).toBe("#00ffff");
  });
});
