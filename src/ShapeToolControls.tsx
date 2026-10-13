import { useEffect, useMemo, useState } from "react";
import { COLORS, type DesignObject } from "./model";
import {
  contourParts,
  offsetObjects,
  shapeToolReason,
  withContours,
  consolidateColor,
} from "./shapeTools";

export function OffsetControl({
  objects,
  unit,
  onPreview,
  onApply,
}: {
  objects: DesignObject[];
  unit: "in" | "mm";
  onPreview(objects: DesignObject[]): void;
  onApply(objects: DesignObject[]): void;
}) {
  const [distance, setDistance] = useState(0.125 * 96),
    [corner, setCorner] = useState<"round" | "sharp">("round"),
    [joined, setJoined] = useState(true),
    [color, setColor] = useState("#373e36");
  const key = JSON.stringify(objects),
    scale = unit === "in" ? 96 : 96 / 25.4;
  const result = useMemo(() => {
    try {
      return {
        objects: offsetObjects(JSON.parse(key), distance, corner, joined).map(
          (o) => ({ ...o, fill: color }),
        ),
        error: "",
      };
    } catch (e) {
      return { objects: [], error: (e as Error).message };
    }
  }, [key, distance, corner, joined, color]);
  useEffect(() => {
    onPreview(result.objects);
    return () => onPreview([]);
  }, [result, onPreview]);
  return (
    <div className="shape-tool-options">
      <h3>Offset outline</h3>
      <p>Create a larger border or a smaller inset as a new layer.</p>
      <label className="field-label">
        Distance ({unit})
        <input
          aria-label="Offset distance"
          type="number"
          step={unit === "in" ? 0.01 : 0.1}
          min={-96 / scale}
          max={96 / scale}
          value={Number((distance / scale).toFixed(3))}
          onChange={(e) => setDistance(Number(e.target.value) * scale)}
        />
      </label>
      <input
        aria-label="Offset distance slider"
        type="range"
        min={-96}
        max={96}
        step={0.096}
        value={distance}
        onChange={(e) => setDistance(Number(e.target.value))}
      />
      <div className="field-row">
        <label className="field-label">
          Corners
          <select
            aria-label="Offset corners"
            value={corner}
            onChange={(e) => setCorner(e.target.value as typeof corner)}
          >
            <option value="round">Rounded</option>
            <option value="sharp">Sharp</option>
          </select>
        </label>
        <label className="field-label">
          Border color
          <select
            aria-label="Offset color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          >
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="shape-tool-check">
        <input
          type="checkbox"
          checked={joined}
          onChange={(e) => setJoined(e.target.checked)}
        />
        Merge overlapping offsets
      </label>
      <p className="field-note">
        Preview only until you add it. Original shapes stay editable; text and
        imported SVG are not supported yet.
      </p>
      {result.error && (
        <p role="alert" className="machine-error">
          {result.error}
        </p>
      )}
      <button
        className="button primary wide"
        disabled={!!result.error}
        onClick={() => onApply(result.objects)}
      >
        Add offset layer{result.objects.length > 1 ? "s" : ""}
      </button>
    </div>
  );
}

export function ContourControl({
  object,
  onPreview,
  onApply,
}: {
  object: DesignObject;
  onPreview(o: DesignObject | null): void;
  onApply(o: DesignObject): void;
}) {
  const [hidden, setHidden] = useState(object.hiddenContours || []);
  const key = JSON.stringify(object);
  const info = useMemo(() => {
    try {
      return {
        ...contourParts(JSON.parse(key)),
        error: shapeToolReason([JSON.parse(key)]),
      };
    } catch (e) {
      return { source: "", parts: [], error: (e as Error).message };
    }
  }, [key]);
  const result = useMemo(() => {
    try {
      return info.error ? null : withContours(JSON.parse(key), hidden);
    } catch {
      return null;
    }
  }, [key, hidden, info]);
  useEffect(() => {
    onPreview(result);
    return () => onPreview(null);
  }, [result, onPreview]);
  const largest = info.parts.reduce(
    (best, p) => (p.area > (best?.area || 0) ? p : best),
    info.parts[0],
  );
  return (
    <div className="shape-tool-options">
      <h3>Contour</h3>
      <p>Hide individual paths or holes. Reopen this menu to restore them.</p>
      {info.error ? (
        <p role="alert" className="machine-error">
          {info.error}
        </p>
      ) : (
        <>
          <svg
            className="contour-result"
            viewBox="-5 -5 110 110"
            aria-label="Contour result preview"
          >
            <path d={result?.pathData} fill={object.fill} />
          </svg>
          <div className="contour-actions">
            <button onClick={() => setHidden([])}>Show all</button>
            <button
              disabled={info.parts.length < 2}
              onClick={() =>
                setHidden(
                  info.parts
                    .filter((p) => p.index !== largest.index)
                    .map((p) => p.index),
                )
              }
            >
              Keep largest only
            </button>
          </div>
          <div className="contour-list">
            {info.parts.map((p) => (
              <label key={p.index} className="contour-item">
                <svg viewBox="-5 -5 110 110" aria-hidden="true">
                  <path d={p.data} fill="currentColor" />
                </svg>
                <span>Contour {p.index + 1}</span>
                <input
                  aria-label={`Show contour ${p.index + 1}`}
                  type="checkbox"
                  checked={!hidden.includes(p.index)}
                  disabled={
                    !hidden.includes(p.index) &&
                    hidden.length === info.parts.length - 1
                  }
                  onChange={() =>
                    setHidden((h) =>
                      h.includes(p.index)
                        ? h.filter((i) => i !== p.index)
                        : [...h, p.index],
                    )
                  }
                />
              </label>
            ))}
          </div>
          <p className="field-note">
            Keep at least one path visible. Closing this menu cancels the
            preview.
          </p>
          <button
            className="button primary wide"
            disabled={!result}
            onClick={() => result && onApply(result)}
          >
            Apply contours
          </button>
        </>
      )}
    </div>
  );
}

export function MaterialColors({
  objects,
  onApply,
}: {
  objects: DesignObject[];
  onApply(objects: DesignObject[]): void;
}) {
  const editable = objects.filter(
    (o) =>
      o.visible && !o.locked && o.type !== "svg" && o.operation !== "guide",
  );
  const colors = [...new Set(editable.map((o) => o.fill.toLowerCase()))];
  const [from, setFrom] = useState(colors[0] || ""),
    [to, setTo] = useState(colors[1] || colors[0] || "");
  const source = colors.includes(from) ? from : colors[0] || "",
    target = colors.includes(to) ? to : colors[0] || "";
  const matches = editable.filter((o) => o.fill.toLowerCase() === source);
  return (
    <div className="material-colors">
      <span className="eyebrow">FEWER COLORS. SIMPLER MAKING.</span>
      <h2>Material colors</h2>
      <p>
        Consolidate colors across your design. Each layer keeps its Cut, Draw or
        Score operation.
      </p>
      <div className="material-color-groups">
        {colors.map((c) => (
          <div key={c}>
            <span className="material-color-swatch" style={{ background: c }} />
            <strong>{c.toUpperCase()}</strong>
            <span>
              {editable.filter((o) => o.fill.toLowerCase() === c).length} layers
            </span>
          </div>
        ))}
      </div>
      {colors.length < 2 ? (
        <p>Add artwork with another color to consolidate colors.</p>
      ) : (
        <>
          <div className="field-row">
            <label className="field-label">
              Change this color
              <select
                aria-label="Source material color"
                value={source}
                onChange={(e) => setFrom(e.target.value)}
              >
                {colors.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              To this color
              <select
                aria-label="Target material color"
                value={target}
                onChange={(e) => setTo(e.target.value)}
              >
                {colors.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <p>
            {matches.length} {matches.length === 1 ? "layer" : "layers"} will
            change:{" "}
            {matches
              .slice(0, 4)
              .map((o) => o.name)
              .join(", ")}
            {matches.length > 4 ? "…" : ""}
          </p>
          <button
            className="button primary"
            disabled={source === target}
            onClick={() => onApply(consolidateColor(objects, source, target))}
          >
            Match colors
          </button>
        </>
      )}
      <p className="field-note">
        Locked, hidden and guide layers keep their colors. Imported SVG may
        contain multiple colors and is excluded.
      </p>
    </div>
  );
}
