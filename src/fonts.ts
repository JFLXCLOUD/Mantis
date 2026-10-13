export const DEFAULT_FONTS = [
  "Arial",
  "Courier New",
  "Georgia",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];
export type ImportedFont = { family: string; name: string; data: ArrayBuffer };
const fonts = new Map<string, ImportedFont>();
export let fontLoadError = "";
export const fontFamily = (name = "Georgia") =>
  `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
export function validFontName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 200 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
declare global {
  interface Window {
    mantisFonts?: { list(): Promise<{ fonts: string[]; error?: string }> };
  }
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mantis-fonts", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("fonts", { keyPath: "family" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error("Font storage is unavailable."));
    request.onblocked = () =>
      reject(Error("Close other Mantis windows and try again."));
  });
}
async function activate(font: ImportedFont) {
  const face = new FontFace(font.family, font.data);
  await face.load();
  document.fonts.add(face);
  fonts.set(font.family, font);
}
export function importedFonts() {
  return [...fonts.values()].map(({ family, name }) => ({ family, name }));
}
export async function loadImportedFonts() {
  try {
    const db = await database();
    const records = await new Promise<ImportedFont[]>((resolve, reject) => {
      const request = db.transaction("fonts").objectStore("fonts").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).finally(() => db.close());
    for (const record of records.slice(0, 50)) {
      try {
        if (
          !/^MantisFont_[a-f0-9]{64}$/.test(record.family) ||
          !validFontName(record.name) ||
          !(record.data instanceof ArrayBuffer) ||
          record.data.byteLength > 10 * 1024 * 1024
        )
          throw Error();
        await activate(record);
      } catch {
        fontLoadError =
          "A saved font could not be loaded. Import its original file again.";
      }
    }
  } catch {
    fontLoadError =
      "Saved fonts could not be loaded. Font storage may be unavailable.";
  }
}
export async function importFont(file: File) {
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name))
    throw Error("Choose a TTF, OTF, WOFF or WOFF2 font file.");
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw Error("Choose a font smaller than 10 MB.");
  const data = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", data);
  const family =
    "MantisFont_" +
    Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  if (fonts.has(family)) return fonts.get(family)!;
  if (
    fonts.size >= 50 ||
    [...fonts.values()].reduce(
      (sum, f) => sum + f.data.byteLength,
      data.byteLength,
    ) >
      50 * 1024 * 1024
  )
    throw Error("The font library is full (50 fonts or 50 MB).");
  const name =
    file.name
      .replace(/\.(ttf|otf|woff2?)$/i, "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 200) || "Imported font";
  const record = { family, name, data };
  const face = new FontFace(family, data);
  try {
    await face.load();
  } catch {
    throw Error(
      "This font file is damaged or unsupported. Try another font file.",
    );
  }
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("fonts", "readwrite");
    tx.objectStore("fonts").put(record);
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(Error("The font could not be saved. Check available disk space."));
  }).finally(() => db.close());
  document.fonts.add(face);
  fonts.set(family, record);
  return record;
}
export function embeddedFonts(objects: { font?: string; svg?: string }[]) {
  const used = new Set(objects.map((o) => o.font));
  for (const object of objects)
    for (const family of object.svg?.match(/MantisFont_[a-f0-9]{64}/g) || []) used.add(family);
  const rules = [...fonts.values()]
    .filter((f) => used.has(f.family))
    .map((f) => {
      let binary = "";
      const bytes = new Uint8Array(f.data);
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const magic = binary.slice(0, 4);
      const format =
        magic === "wOF2"
          ? "woff2"
          : magic === "wOFF"
            ? "woff"
            : magic === "OTTO"
              ? "otf"
              : "ttf";
      return `@font-face{font-family:'${f.family}';src:url(data:font/${format};base64,${btoa(binary)})}`;
    });
  return rules.length ? `<defs><style>${rules.join("\n")}</style></defs>` : "";
}
