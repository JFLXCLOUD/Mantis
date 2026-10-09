// Original vector reconstruction of the approved Mantis Studio concept.
// All lettering is editable path geometry; no font is embedded or required.
export const palette = {
  forest: "#285c48",
  sage: "#8fbc8f",
  mint: "#dce9d8",
  ivory: "#f5f8df",
};
export function mantis(ink = palette.forest, small = false) {
  return `<g fill="${ink}">
    <g fill="none" stroke="${ink}" stroke-width="${small ? 4 : 2.8}" stroke-linecap="round">
      <path d="M56 45C48 26 32 15 18 12M72 45C80 26 96 15 110 12"/>
    </g>
    <path d="M36 45Q64 41 92 45C78 51 79 73 64 80C49 73 50 51 36 45Z"/>
    <path fill-rule="evenodd" d="M32 46C24 45 28 65 47 70C46 57 39 48 32 46ZM34 52a2.6 2.6 0 1 0 0 5.2a2.6 2.6 0 1 0 0-5.2ZM96 46C104 45 100 65 81 70C82 57 89 48 96 46ZM94 52a2.6 2.6 0 1 0 0 5.2a2.6 2.6 0 1 0 0-5.2Z"/>
    <path d="M58 80L64 84L70 80L64 111Z"/>
    <path d="M29 69Q31 66 34 70L59 103L59 118L33 91L16 113Q11 118 8 117Q14 90 29 69ZM99 69Q97 66 94 70L69 103L69 118L95 91L112 113Q117 118 120 117Q114 90 99 69Z"/>
  </g>`;
}
export function lettering(ink = palette.forest) {
  return `<g fill="${ink}" fill-rule="evenodd">
    <path d="M0 23H13V30Q21 20 33 22Q43 22 49 31Q57 21 70 22Q91 22 91 47V84H77V48Q77 35 67 35Q55 35 55 49V84H41V48Q41 35 31 35Q14 35 14 50V84H0Z"/>
    <path d="M105 31Q119 20 136 22Q160 23 160 47V84H147V77Q139 86 125 85Q103 84 103 65Q103 44 146 47Q146 33 134 34Q122 34 113 42ZM146 58Q117 55 117 65Q117 74 128 73Q145 74 146 63Z"/>
    <path d="M174 23H187V31Q196 21 208 22Q231 22 231 48V84H217V49Q217 35 205 35Q188 35 188 51V84H174Z"/>
    <path d="M248 8H262V23H279V36H262V63Q262 74 279 71V84Q248 91 248 65V36H238V23H248Z"/>
    <path d="M291 23H305V84H291Z"/><circle cx="298" cy="7" r="8"/>
    <path d="M320 67Q331 76 342 74Q352 74 352 67Q352 61 338 58Q315 53 317 39Q318 22 340 22Q354 22 365 31L357 41Q347 34 339 34Q330 34 330 40Q330 45 343 48Q368 54 366 68Q365 85 342 85Q325 85 313 76Z"/>
  </g>`;
}
export function studio(ink = palette.forest) {
  return `<g fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="round">
    <path d="M11 2C0-4-4 7 6 8C17 9 12 20 1 15"/>
    <path d="M36 1H50M43 1V17M77 1V10C77 20 90 20 90 10V1"/>
    <path d="M118 1V17H123C136 17 136 1 123 1ZM158 1V17"/>
    <ellipse cx="195" cy="9" rx="8" ry="9"/>
  </g>`;
}
const svg = (w, h, content, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${content}</svg>\n`;
export const mark = svg(128, 128, mantis(), "Mantis Studio mark");
export const mono = svg(
  128,
  128,
  mantis("#000000"),
  "Mantis Studio monochrome mark",
);
export const icon = svg(
  256,
  256,
  `<rect width="256" height="256" rx="57" fill="${palette.forest}"/><g transform="translate(17 14) scale(1.73)">${mantis(palette.ivory)}</g>`,
  "Mantis Studio app icon",
);
export const smallIcon = svg(
  256,
  256,
  `<rect width="256" height="256" rx="50" fill="${palette.forest}"/><g transform="translate(10 8) scale(1.84)">${mantis(palette.ivory, true)}</g>`,
  "Mantis Studio small app icon",
);
function lockup(ink) {
  return `${mantis(ink)}<g transform="translate(148 10) scale(.92)">${lettering(ink)}</g><g transform="translate(151 104) scale(1 .85)">${studio(ink)}</g>`;
}
export const logo = svg(500, 128, lockup(palette.forest), "Mantis Studio");
export const reversed = svg(500, 128, lockup(palette.ivory), "Mantis Studio");
export const wordmark = svg(
  380,
  130,
  `<g transform="translate(6 8)">${lettering()}</g><g transform="translate(8 109)">${studio()}</g>`,
  "Mantis Studio wordmark",
);
