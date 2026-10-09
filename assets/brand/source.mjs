// Original editable Hopper geometry. Wordmark lettering is paths, not a font.
export const palette = {
  forest: "#285c48",
  sage: "#8fbc8f",
  mint: "#dce9d8",
  ivory: "#f5f8df",
};
export function grasshopper({
  ink = palette.forest,
  wing = palette.sage,
  face = palette.ivory,
} = {}) {
  return `<g stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M88 76 96 104h13M76 82 71 105H60" fill="none" stroke-width="7"/>
    <path d="M23 85C38 65 61 53 90 58 89 82 63 97 23 85Z" fill="${wing}" stroke-width="5"/>
    <path d="m32 83 46-17" fill="none" stroke="${face}" stroke-width="4"/>
    <path d="M76 88 43 48 51 105H29" fill="none" stroke-width="9"/>
    <path d="M90 31Q85 18 77 16M101 30Q105 15 116 14" fill="none" stroke-width="5"/>
    <path d="M77 51C77 38 84 30 96 30 108 30 116 39 116 51 116 63 108 70 97 70 84 70 77 62 77 51Z" fill="${face}" stroke-width="5"/>
    <circle cx="103" cy="46" r="3.5" fill="${ink}" stroke="none"/>
    <path d="M101 57q5 4 9-1" fill="none" stroke-width="2.8"/>
    <path d="m103 75 10 7 9-12" fill="none" stroke-width="6"/>
  </g>`;
}
export function lettering(color = palette.forest) {
  return `<g fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 13v54m0-23c0-24 31-24 31 0v23"/>
    <ellipse cx="72" cy="47" rx="18" ry="21"/>
    <path d="M106 88V29m0 18c0-28 37-28 37 0s-37 28-37 0"/>
    <path d="M160 88V29m0 18c0-28 37-28 37 0s-37 28-37 0"/>
    <path d="M213 46h34c0-27-35-28-35 1 0 22 20 26 33 16"/>
    <path d="M265 67V29m0 16c0-14 9-20 20-18"/>
  </g>`;
}
const svg = (width, height, contents, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title>${contents}</svg>\n`;
export const mark = svg(128, 128, grasshopper(), "Hopper grasshopper mark");
export const mono = svg(
  128,
  128,
  grasshopper({ wing: palette.forest, face: palette.ivory }),
  "Hopper grasshopper mark in one ink",
);
export const icon = svg(
  256,
  256,
  `<rect width="256" height="256" rx="58" fill="${palette.forest}"/><g transform="translate(13 11) scale(1.78)">${grasshopper({ ink: palette.ivory, wing: palette.sage, face: palette.forest })}</g>`,
  "Hopper app icon",
);
export const logo = svg(
  450,
  128,
  `${grasshopper()}<g transform="translate(151 10)">${lettering()}</g>`,
  "Hopper",
);
export const reversed = svg(
  450,
  128,
  `${grasshopper({ ink: palette.ivory, wing: palette.sage, face: palette.forest })}<g transform="translate(151 10)">${lettering(palette.ivory)}</g>`,
  "Hopper",
);
export const wordmark = svg(
  300,
  104,
  `<g transform="translate(3 1)">${lettering()}</g>`,
  "Hopper wordmark",
);
