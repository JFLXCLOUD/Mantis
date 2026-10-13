export const BOARD_COLOR_KEY = "mantis.board-color.v1";
export function loadBoardColor() {
  try {
    const color = localStorage.getItem(BOARD_COLOR_KEY);
    return color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff";
  } catch {
    return "#ffffff";
  }
}
export function darkBoard(hex: string) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 128;
}
