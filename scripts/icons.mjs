import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import {
  mark,
  mono,
  icon,
  smallIcon,
  logo,
  reversed,
  wordmark,
} from "../assets/brand/mantis-source.mjs";
await mkdir("public/brand", { recursive: true });
await mkdir("assets/brand/exports", { recursive: true });
await mkdir("build", { recursive: true });
for (const [name, source] of Object.entries({
  mark,
  "mark-mono": mono,
  icon,
  logo,
  "logo-reversed": reversed,
  wordmark,
})) {
  await writeFile(`public/brand/mantis-${name}.svg`, source);
}
await writeFile("public/mantis.svg", smallIcon);
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  async function render(source, width, height) {
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:100%;height:100%}</style>${source}`,
    );
    return page.screenshot({ omitBackground: true });
  }
  const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256];
  const images = [];
  for (const size of [...sizes, 512, 1024]) {
    const png = await render(size <= 32 ? smallIcon : icon, size, size);
    await writeFile(`assets/brand/exports/mantis-icon-${size}.png`, png);
    if (size === 256) await writeFile("public/mantis.png", png);
    if (sizes.includes(size)) images.push({ size, png });
  }
  for (const [name, source, width, height] of [
    ["logo", logo, 2000, 512],
    ["logo-reversed", reversed, 2000, 512],
    ["mark", mark, 1024, 1024],
    ["wordmark", wordmark, 1520, 520],
  ])
    await writeFile(
      `assets/brand/exports/mantis-${name}.png`,
      await render(source, width, height),
    );
  // Native-size PNG entries keep Windows Explorer/taskbar rendering sharp.
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile(
    "build/icon.ico",
    Buffer.concat([header, ...images.map(({ png }) => png)]),
  );
  console.log(
    "Mantis Studio brand exported: 6 SVGs, 11 icon PNGs, 4 logo PNGs, 9-size Windows ICO.",
  );
} finally {
  await browser.close();
}
