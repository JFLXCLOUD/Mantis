export const BASIC_COLORS = [
  ["Black", "#202020"],
  ["Gray", "#808080"],
  ["Silver", "#c0c0c0"],
  ["White", "#ffffff"],
  ["Red", "#e53935"],
  ["Orange", "#f58220"],
  ["Yellow", "#f5d547"],
  ["Gold", "#e4b351"],
  ["Green", "#388e3c"],
  ["Forest", "#285c48"],
  ["Sage", "#8eae89"],
  ["Teal", "#00897b"],
  ["Blue", "#2979ff"],
  ["Navy", "#243b70"],
  ["Purple", "#8e44ad"],
  ["Lavender", "#b39ddb"],
  ["Pink", "#ec78a4"],
  ["Coral", "#df896f"],
  ["Peach", "#eacbbb"],
  ["Cream", "#eee6d7"],
] as const;

export type HSV = { h: number; s: number; v: number };
export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex))
    return (
      "#" +
      [...hex]
        .map((c) => c + c)
        .join("")
        .toLowerCase()
    );
  return /^[0-9a-f]{6}$/i.test(hex) ? "#" + hex.toLowerCase() : null;
}
export function hexToRgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function rgbToHex(rgb: string[]): string | null {
  if (
    rgb.length !== 3 ||
    rgb.some((c) => !/^\d{1,3}$/.test(c) || Number(c) > 255)
  )
    return null;
  return "#" + rgb.map((c) => Number(c).toString(16).padStart(2, "0")).join("");
}
export function hexToHsv(hex: string): HSV {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  const h =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d + 6) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  return { h: h * 60, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}
export function hsvToHex({ h, s, v }: HSV): string {
  const hue = (((h % 360) + 360) % 360) / 60;
  const c = ((v / 100) * s) / 100,
    x = c * (1 - Math.abs((hue % 2) - 1)),
    m = v / 100 - c;
  const rgb =
    hue < 1
      ? [c, x, 0]
      : hue < 2
        ? [x, c, 0]
        : hue < 3
          ? [0, c, x]
          : hue < 4
            ? [0, x, c]
            : hue < 5
              ? [x, 0, c]
              : [c, 0, x];
  return rgbToHex(rgb.map((n) => String(Math.round((n + m) * 255))))!;
}
