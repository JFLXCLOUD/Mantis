// @vitest-environment jsdom
import { expect, it } from "vitest";
import { validFontName, fontFamily, importFont } from "./fonts";
import { validateProject, blankProject, createObject } from "./model";
import { BOARD_COLOR_KEY, loadBoardColor, darkBoard } from "./board";
it("accepts installed and imported family names with bounded, escaped CSS values", () => {
  for (const font of [
    "Segoe UI",
    "Noto Sans 日本語",
    "MantisFont_" + "a".repeat(64),
  ]) {
    expect(validFontName(font)).toBe(true);
    expect(
      validateProject({
        ...blankProject(),
        objects: [{ ...createObject("text"), font }],
      }).objects[0].font,
    ).toBe(font);
  }
  for (const font of ["", " ", "x".repeat(201), "bad\nfont", undefined])
    expect(validFontName(font)).toBe(false);
  expect(fontFamily('Some "font"')).toBe('"Some \\"font\\""');
});
it("rejects non-font and oversized imports before reading data", async () => {
  await expect(importFont(new File(["bad"], "bad.svg"))).rejects.toThrow(
    "Choose a TTF",
  );
  await expect(importFont(new File([], "empty.ttf"))).rejects.toThrow("10 MB");
});
it("loads only valid board colors and chooses visible grid contrast", () => {
  localStorage.removeItem(BOARD_COLOR_KEY);
  expect(loadBoardColor()).toBe("#ffffff");
  localStorage.setItem(BOARD_COLOR_KEY, "url(evil)");
  expect(loadBoardColor()).toBe("#ffffff");
  localStorage.setItem(BOARD_COLOR_KEY, "#123456");
  expect(loadBoardColor()).toBe("#123456");
  expect(darkBoard("#123456")).toBe(true);
  expect(darkBoard("#ffffff")).toBe(false);
});
