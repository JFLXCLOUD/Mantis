import { objectMarkup } from "./io";
import { type Box } from "./geometry";
import { type DesignObject } from "./model";

export const PRINT_DPI = 300;
export const PAPERS = {
  letter: { name: "US Letter", width: 8.5, height: 11 },
  a4: { name: "A4", width: 210 / 25.4, height: 297 / 25.4 },
};
export type PaperSize = keyof typeof PAPERS;
export function printableObjects(objects: DesignObject[], ids?: string[]) {
  return objects.filter(
    (o) => o.visible && o.operation === "cut" && (!ids || ids.includes(o.id)),
  );
}
// Measure rendered glyphs and curves, including artwork outside nominal shape boxes.
export function artworkBounds(objects: DesignObject[]): Box {
  if (!objects.length) return { x: 0, y: 0, width: 0, height: 0 };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText =
    "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none";
  svg.innerHTML = `<g>${objects.map(objectMarkup).join("")}</g>`;
  document.body.append(svg);
  try {
    const b = (svg.firstElementChild as SVGGElement).getBBox();
    // One canvas pixel of transparent padding avoids trimming antialiased edges.
    return { x: b.x - 1, y: b.y - 1, width: b.width + 2, height: b.height + 2 };
  } finally {
    svg.remove();
  }
}
export function printLayout(
  box: Box,
  width: number,
  paper: PaperSize,
  landscape: boolean,
) {
  const sheet = PAPERS[paper];
  const pageWidth = landscape ? sheet.height : sheet.width;
  const pageHeight = landscape ? sheet.width : sheet.height;
  const height = (width * box.height) / box.width;
  const pixelsWidth = Math.round(width * PRINT_DPI),
    pixelsHeight = Math.round(height * PRINT_DPI);
  const valid =
    [width, height].every((n) => Number.isFinite(n) && n > 0) &&
    pixelsWidth > 0 &&
    pixelsHeight > 0;
  const exportable =
    valid &&
    pixelsWidth <= 8192 &&
    pixelsHeight <= 8192 &&
    pixelsWidth * pixelsHeight <= 24000000;
  const fits = valid && width <= pageWidth - 1 && height <= pageHeight - 1;
  return {
    width,
    height,
    pageWidth,
    pageHeight,
    pixelsWidth,
    pixelsHeight,
    exportable,
    fits,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
  };
}
export function printArtworkSvg(
  objects: DesignObject[],
  box: Box,
  pixelWidth: number,
  pixelHeight: number,
) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${pixelHeight}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">${objects.map(objectMarkup).join("")}</svg>`;
}
// Canvas PNGs default to 96 dpi. Replace/add a real pHYs chunk for 300 dpi.
export function pngDensity(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const chunk = new Uint8Array(21),
    view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  view.setUint32(8, 11811);
  view.setUint32(12, 11811);
  chunk[16] = 1;
  let crc = 0xffffffff;
  for (const byte of chunk.slice(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const pieces: Uint8Array[] = [bytes.slice(0, 8)];
  for (let offset = 8; offset < bytes.length;) {
    const length = new DataView(
      bytes.buffer,
      bytes.byteOffset + offset,
      4,
    ).getUint32(0);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (type !== "pHYs") pieces.push(bytes.slice(offset, offset + length + 12));
    if (type === "IHDR") pieces.push(chunk);
    offset += length + 12;
  }
  const output = new Uint8Array(
    pieces.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;
  for (const part of pieces) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
export async function rasterizeArtwork(
  objects: DesignObject[],
  box: Box,
  width: number,
): Promise<Blob> {
  const layout = printLayout(box, width, "letter", false);
  if (!layout.exportable)
    throw new Error(
      "Choose a smaller artwork size (maximum 8,192 pixels per side and 24 megapixels).",
    );
  await document.fonts.ready;
  const url = URL.createObjectURL(
    new Blob(
      [printArtworkSvg(objects, box, layout.pixelsWidth, layout.pixelsHeight)],
      { type: "image/svg+xml" },
    ),
  );
  const canvas = document.createElement("canvas");
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("The artwork could not be rendered."));
      image.src = url;
    });
    canvas.width = layout.pixelsWidth;
    canvas.height = layout.pixelsHeight;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Image export is unavailable on this device.");
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("PNG export failed.")),
        "image/png",
      ),
    );
    return new Blob([pngDensity(new Uint8Array(await blob.arrayBuffer()))], {
      type: "image/png",
    });
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}
export async function printProof(
  png: Blob,
  layout: ReturnType<typeof printLayout>,
  paper: PaperSize,
  landscape: boolean,
): Promise<Blob> {
  if (!layout.fits)
    throw new Error("Reduce the artwork size to fit the proof page.");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "in",
    format: paper === "letter" ? "letter" : "a4",
    compress: true,
  });
  pdf.setProperties({
    title: "Mantis Studio artwork proof",
    creator: "Mantis Studio",
  });
  pdf.addImage(
    new Uint8Array(await png.arrayBuffer()),
    "PNG",
    layout.x,
    layout.y,
    layout.width,
    layout.height,
  );
  pdf.setFontSize(8);
  pdf.setTextColor(90);
  pdf.text("MANTIS STUDIO / ARTWORK PROOF", 0.5, 0.3);
  pdf.text(
    `Print at Actual size (100%). Artwork: ${layout.width.toFixed(3)} x ${layout.height.toFixed(3)} in.`,
    0.5,
    layout.pageHeight - 0.28,
  );
  pdf.text(
    "No registration marks. Use Design Space to print a registered cut sheet.",
    0.5,
    layout.pageHeight - 0.14,
  );
  return pdf.output("blob");
}
