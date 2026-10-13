import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_FONTS,
  fontFamily,
  fontLoadError,
  importedFonts,
  importFont,
  validFontName,
} from "./fonts";
export function FontPicker({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange(font: string): void;
}) {
  const [system, setSystem] = useState(DEFAULT_FONTS),
    [imported, setImported] = useState(importedFonts);
  const [search, setSearch] = useState(""),
    [error, setError] = useState(fontLoadError),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null),
    alive = useRef(true);
  async function refresh() {
    if (!window.mantisFonts) return;
    setLoading(true);
    try {
      const result = await window.mantisFonts.list();
      if (!alive.current) return;
      if (result.error) setError(result.error);
      else {
        setSystem(result.fonts.filter(validFontName));
        setError("");
      }
    } catch {
      if (alive.current)
        setError("Installed fonts could not be read. Try Refresh fonts.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, []);
  const matches = (s: string) => s.toLowerCase().includes(search.toLowerCase());
  const known =
    system.includes(value) || imported.some((f) => f.family === value);
  return (
    <div className="font-picker">
      <label className="field-label">
        Find a font
        <input
          aria-label="Search fonts"
          placeholder="Search font names…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <label className="field-label">
        Font
        <select
          aria-label="Font"
          value={value}
          disabled={disabled || busy}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value={value}>
            {imported.find((f) => f.family === value)?.name ||
              (value.startsWith("MantisFont_")
                ? "Missing imported font"
                : value)}{" "}
            (current)
          </option>
          <optgroup label="Imported fonts">
            {imported
              .filter((f) => matches(f.name) && f.family !== value)
              .map((f) => (
                <option
                  key={f.family}
                  value={f.family}
                  style={{ fontFamily: fontFamily(f.family) }}
                >
                  {f.name}
                </option>
              ))}
          </optgroup>
          <optgroup
            label={
              window.mantisFonts
                ? "Installed on this computer"
                : "Common system fonts"
            }
          >
            {system
              .filter((f) => matches(f) && f !== value)
              .map((f) => (
                <option key={f} style={{ fontFamily: fontFamily(f) }}>
                  {f}
                </option>
              ))}
          </optgroup>
        </select>
      </label>
      <div className="font-preview" style={{fontFamily:fontFamily(value)}} aria-label="Font preview">Aa Bb Cc · Made with love</div>
      <div className="font-actions">
        <button
          className="button secondary"
          type="button"
          disabled={disabled || busy}
          onClick={() => file.current?.click()}
        >
          {busy ? "Importing…" : "Import font file"}
        </button>
        {window.mantisFonts && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
          >
            Refresh fonts
          </button>
        )}
      </div>
      <input
        ref={file}
        type="file"
        hidden
        aria-label="Import font file"
        accept=".ttf,.otf,.woff,.woff2"
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          e.target.value = "";
          if (!selected || disabled || busy) return;
          setBusy(true);
          setError("");
          try {
            const font = await importFont(selected);
            if (alive.current) {
              setImported(importedFonts());
              onChange(font.family);
            }
          } catch (e) {
            if (alive.current) setError((e as Error).message);
          } finally {
            if (alive.current) setBusy(false);
          }
        }}
      />
      <details className="font-help"><summary>Font files &amp; portability</summary>
      <p className="field-note">
        {loading
          ? "Reading installed fonts…"
          : "TTF, OTF, WOFF or WOFF2. Imported fonts stay in Mantis on this computer."}
      </p>
      <p className="field-note">
        Project files reference fonts; another computer needs the same fonts.
        SVG and print exports include imported fonts used in the artwork.
      </p>
      </details>
      {!known && !loading && (
        <p className="font-error">
          This font is unavailable here. Import its file or choose an installed
          font.
        </p>
      )}
      {error && (
        <p className="font-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
