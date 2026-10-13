import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  BASIC_COLORS,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHex,
  rgbToHex,
  type HSV,
} from "./colors";

export function ColorControl({
  colors,
  disabled,
  onPreview,
  onCommit,
  label = 'Object color',
}: {
  colors: string[];
  disabled: boolean;
  onPreview(color: string | null): void;
  onCommit(color: string): void;
  label?: string;
}) {
  const initial = colors[0] || "#285c48";
  const mixed = new Set(colors.map((c) => c.toLowerCase())).size > 1;
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(initial);
  const [hsv, setHsv] = useState(() => hexToHsv(initial));
  const [hex, setHex] = useState(initial);
  const [rgb, setRgb] = useState(() => hexToRgb(initial).map(String));
  const [invalid, setInvalid] = useState<"hex" | "rgb" | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const colorsKey = colors.join(",");
  useEffect(() => {
    setOpen(false);
    setColor(initial);
    setHex(initial);
    setRgb(hexToRgb(initial).map(String));
    setHsv(hexToHsv(initial));
    setInvalid(null);
  }, [initial, colorsKey]);
  useEffect(() => () => onPreview(null), [onPreview]);
  function update(next: string, nextHsv = hexToHsv(next)) {
    setColor(next);
    setHex(next);
    setRgb(hexToRgb(next).map(String));
    setHsv(nextHsv);
    setInvalid(null);
    onPreview(next);
  }
  function cancel() {
    setOpen(false);
    setColor(initial);
    setHex(initial);
    setRgb(hexToRgb(initial).map(String));
    setHsv(hexToHsv(initial));
    setInvalid(null);
    onPreview(null);
    toggle.current?.focus();
  }
  function changeHsv(next: HSV) {
    update(hsvToHex(next), next);
  }
  function point(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    changeHsv({
      ...hsv,
      s: Math.max(0, Math.min(100, ((e.clientX - box.left) / box.width) * 100)),
      v: Math.max(
        0,
        Math.min(100, (1 - (e.clientY - box.top) / box.height) * 100),
      ),
    });
  }
  return (
    <fieldset
      className="object-colors"
      disabled={disabled}
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          cancel();
        }
        if (
          open &&
          (e.ctrlKey || e.metaKey) &&
          ["z", "y"].includes(e.key.toLowerCase())
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <legend>{label}</legend>
      <div className="color-summary">
        <span
          className={`color-chip ${mixed && !open ? "mixed" : ""}`}
          style={{ backgroundColor: open ? color : initial }}
        />
        <span>
          {mixed && !open
            ? "Mixed colors"
            : (open ? color : initial).toUpperCase()}
        </span>
      </div>
      <div
        className="basic-colors"
        role="group"
        aria-label="Basic color palette"
      >
        {BASIC_COLORS.map(([name, value]) => (
          <button
            key={name}
            type="button"
            aria-label={`${name} ${value}`}
            title={`${name} · ${value.toUpperCase()}`}
            aria-pressed={
              (!mixed || open) &&
              (open ? color : initial).toLowerCase() === value
            }
            style={{ backgroundColor: value }}
            onClick={() => {
              if (open) update(value);
              else onCommit(value);
            }}
          >
            {(!mixed || open) &&
              (open ? color : initial).toLowerCase() === value && (
                <Check
                  size={14}
                  style={{
                    color:
                      hexToHsv(value).v > 65 && hexToHsv(value).s < 65
                        ? "#17241b"
                        : "#ffffff",
                  }}
                />
              )}
          </button>
        ))}
      </div>
      <button
        ref={toggle}
        type="button"
        className="advanced-color-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open) cancel();
          else setOpen(true);
        }}
      >
        Advanced color picker
        <ChevronDown size={14} />
      </button>
      {open && (
        <div id={panelId} className="advanced-colors">
          <div
            className="color-plane"
            aria-hidden="true"
            style={{ backgroundColor: hsvToHex({ h: hsv.h, s: 100, v: 100 }) }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              point(e);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) point(e);
            }}
          >
            <span style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
          </div>
          {(["h", "s", "v"] as const).map((key, i) => (
            <label className="color-slider" key={key}>
              <span>
                {["Hue", "Saturation", "Brightness"][i]}
                <span aria-hidden="true">
                  {Math.round(hsv[key])}
                  {key === "h" ? "°" : "%"}
                </span>
              </span>
              <input
                type="range"
                className={key === "h" ? "hue-slider" : ""}
                min={0}
                max={key === "h" ? 360 : 100}
                step={1}
                value={hsv[key]}
                aria-label={["Hue", "Saturation", "Brightness"][i]}
                onChange={(e) =>
                  changeHsv({ ...hsv, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label className="color-value-label">
            HEX
            <input
              aria-label="HEX color"
              spellCheck={false}
              value={hex}
              maxLength={7}
              aria-invalid={invalid === "hex"}
              onChange={(e) => {
                const value = e.target.value,
                  next = normalizeHex(value);
                if (next) update(next);
                setHex(value);
                setInvalid(next ? null : "hex");
              }}
            />
          </label>
          <div className="rgb-fields">
            {["Red", "Green", "Blue"].map((name, i) => (
              <label className="color-value-label" key={name}>
                {name}
                <input
                  aria-label={name}
                  type="number"
                  min={0}
                  max={255}
                  step={1}
                  value={rgb[i]}
                  aria-invalid={invalid === "rgb"}
                  onChange={(e) => {
                    const values = rgb.map((n, j) =>
                        j === i ? e.target.value : n,
                      ),
                      next = rgbToHex(values);
                    if (next) update(next);
                    setRgb(values);
                    setInvalid(next ? null : "rgb");
                  }}
                />
              </label>
            ))}
          </div>
          {invalid && (
            <p className="color-error" role="alert">
              {invalid === "hex"
                ? "Enter 3 or 6 HEX digits, such as #285C48."
                : "Enter whole numbers from 0 to 255 for red, green and blue."}
            </p>
          )}
          <p className="color-help">
            Previewing on the canvas. Apply to keep this color.
          </p>
          <div className="color-actions">
            <button type="button" onClick={cancel}>
              Cancel
            </button>
            <button
              type="button"
              className="apply-color"
              disabled={!!invalid}
              onClick={() => {
                onPreview(null);
                setOpen(false);
                toggle.current?.focus();
                onCommit(color);
              }}
            >
              Apply color
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
