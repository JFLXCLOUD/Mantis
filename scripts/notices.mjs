import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
const root = JSON.parse(await readFile("package.json", "utf8"));
const seen = new Set();
let notices =
  "Mantis Studio third-party notices\n\nMantis Studio original code and artwork: MIT (see LICENSE).\nElectron/Chromium notices are also included with the Windows runtime.\n";
async function include(name, from) {
  let dir = from,
    location,
    pkg;
  while (true) {
    location = join(dir, "node_modules", name);
    try {
      pkg = JSON.parse(await readFile(join(location, "package.json"), "utf8"));
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (dirname(dir) === dir) throw Error(`Missing dependency notice: ${name}`);
    dir = dirname(dir);
  }
  if (seen.has(location)) return;
  seen.add(location);
  const files = (await readdir(location)).filter((file) =>
    /^(licen[sc]e|copying)([.-]|$)/i.test(file),
  );
  if (!files.length) throw Error(`Missing license file: ${name}`);
  const license = (
    await Promise.all(
      files.map((file) => readFile(join(location, file), "utf8")),
    )
  ).join("\n");
  notices += `\n${"=".repeat(72)}\n${name} ${pkg.version}\nDeclared license: ${pkg.license}\n${"=".repeat(72)}\n\n${license}\n`;
  for (const dependency of Object.keys({
    ...pkg.dependencies,
    ...pkg.optionalDependencies,
  }).sort())
    await include(dependency, location);
}
for (const name of Object.keys(root.dependencies).sort())
  await include(name, resolve("."));
// Preserve license wording while keeping generated text free of trailing whitespace.
notices = notices.replace(/[ \t]+$/gm, "").trimEnd() + "\n";
await writeFile("THIRD_PARTY_NOTICES.txt", notices);
await writeFile("dist/THIRD_PARTY_NOTICES.txt", notices);
console.log("Bundled third-party license notices.");
