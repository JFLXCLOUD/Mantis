export const MATERIAL_CATEGORIES = {
  paper: "Paper & cardstock",
  vinyl: "Adhesive vinyl",
  "iron-on": "Iron-on",
  printable: "Printable & sticker",
  fabric: "Fabric & felt",
  other: "Other",
} as const;
export type MaterialCategory = keyof typeof MATERIAL_CATEGORIES;
export type MaterialProfile = {
  id: string;
  source: "starter" | "custom";
  name: string;
  category: MaterialCategory;
  brand: string;
  specification: string;
  notes: string;
};
const starter = (
  id: string,
  name: string,
  category: MaterialCategory,
): MaterialProfile => ({
  id: `starter:${id}`,
  source: "starter",
  name,
  category,
  brand: "",
  specification: "",
  notes: "",
});
// Original generic planning labels, not a manufacturer's machine-setting table.
export const STARTER_MATERIALS: MaterialProfile[] = [
  starter("paper", "Copy paper", "paper"),
  starter("light-cardstock", "Light cardstock", "paper"),
  starter("medium-cardstock", "Medium cardstock", "paper"),
  starter("heavy-cardstock", "Heavy cardstock", "paper"),
  starter("kraft", "Kraft paper", "paper"),
  starter("vellum", "Vellum", "paper"),
  starter("removable-vinyl", "Removable vinyl", "vinyl"),
  starter("permanent-vinyl", "Permanent vinyl", "vinyl"),
  starter("glitter-vinyl", "Glitter adhesive vinyl", "vinyl"),
  starter("iron-on", "Everyday iron-on", "iron-on"),
  starter("glitter-iron-on", "Glitter iron-on", "iron-on"),
  starter("sticker-paper", "Printable sticker paper", "printable"),
  starter("printable-vinyl", "Printable vinyl", "printable"),
  starter("cotton", "Cotton fabric", "fabric"),
  starter("felt", "Felt", "fabric"),
];
export const MATERIAL_LIBRARY_KEY = "mantis.material-library.v1";
export const MAX_CUSTOM_MATERIALS = 200;
export type MaterialLibraryData = {
  version: 1;
  custom: MaterialProfile[];
  favorites: string[];
};
export const emptyMaterialLibrary = (): MaterialLibraryData => ({
  version: 1,
  custom: [],
  favorites: [],
});
export function validateMaterialProfile(value: unknown): MaterialProfile {
  if (!value || typeof value !== "object")
    throw Error("Invalid material profile.");
  const p = value as MaterialProfile;
  if (
    !["starter", "custom"].includes(p.source) ||
    typeof p.id !== "string" ||
    !/^(starter|custom):[a-zA-Z0-9-]{1,80}$/.test(p.id) ||
    !p.id.startsWith(`${p.source}:`) ||
    !Object.hasOwn(MATERIAL_CATEGORIES, p.category)
  )
    throw Error("Invalid material profile.");
  for (const [key, limit] of [
    ["name", 120],
    ["brand", 120],
    ["specification", 80],
    ["notes", 2000],
  ] as const) {
    if (typeof p[key] !== "string" || p[key].length > limit)
      throw Error(`Invalid material ${key}.`);
  }
  if (!p.name.trim()) throw Error("Give your material a name.");
  // Copy only planning fields. Unknown configuration/verification fields never survive.
  return {
    id: p.id,
    source: p.source,
    name: p.name.trim(),
    category: p.category,
    brand: p.brand.trim(),
    specification: p.specification.trim(),
    notes: p.notes.trim(),
  };
}
export function validateMaterialLibrary(value: unknown): MaterialLibraryData {
  if (!value || typeof value !== "object")
    throw Error("Invalid material library.");
  const data = value as MaterialLibraryData;
  if (
    data.version !== 1 ||
    !Array.isArray(data.custom) ||
    data.custom.length > MAX_CUSTOM_MATERIALS ||
    !Array.isArray(data.favorites) ||
    data.favorites.length > MAX_CUSTOM_MATERIALS + STARTER_MATERIALS.length
  )
    throw Error("Invalid material library.");
  const custom = data.custom.map(validateMaterialProfile);
  if (
    custom.some((p) => p.source !== "custom") ||
    new Set(custom.map((p) => p.id)).size !== custom.length
  )
    throw Error("Invalid custom materials.");
  const ids = new Set([...STARTER_MATERIALS, ...custom].map((p) => p.id));
  const favorites = [
    ...new Set(
      data.favorites.filter((id) => typeof id === "string" && ids.has(id)),
    ),
  ];
  return { version: 1, custom, favorites };
}
export function loadMaterialLibrary(): {
  data: MaterialLibraryData;
  error: string;
} {
  try {
    const raw = localStorage.getItem(MATERIAL_LIBRARY_KEY);
    return {
      data: raw
        ? validateMaterialLibrary(JSON.parse(raw))
        : emptyMaterialLibrary(),
      error: "",
    };
  } catch {
    return {
      data: emptyMaterialLibrary(),
      error:
        "Your saved material library could not be read. Starter materials are available; changes will not replace the unreadable library.",
    };
  }
}
export function saveMaterialLibrary(data: MaterialLibraryData) {
  localStorage.setItem(
    MATERIAL_LIBRARY_KEY,
    JSON.stringify(validateMaterialLibrary(data)),
  );
}
export function filterMaterials(
  profiles: MaterialProfile[],
  query: string,
  category: string,
  scope: string,
  favorites: string[],
) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return profiles.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (scope !== "favorites" || favorites.includes(p.id)) &&
      (scope !== "custom" || p.source === "custom") &&
      words.every((word) =>
        `${p.name} ${p.brand} ${p.specification} ${p.notes} ${MATERIAL_CATEGORIES[p.category]}`
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
}
