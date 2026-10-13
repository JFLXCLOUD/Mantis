import { useEffect, useRef, useState } from "react";
import type { DesignObject } from "./model";
import { withTextCurve } from "./textCurve";

export function TextCurveControl({
  object,
  onPreview,
  onCommit,
}: {
  object: DesignObject;
  onPreview(object: DesignObject | null): void;
  onCommit(object: DesignObject): void;
}) {
  const [pending, setPending] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => () => onPreview(null), [onPreview]);
  function cancel() {
    pendingRef.current = null;
    setPending(null);
    onPreview(null);
  }
  function apply(angle = pendingRef.current) {
    if (angle === null) return;
    try {
      onCommit(withTextCurve(object, angle));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
    cancel();
  }
  const value = pending ?? object.textCurve ?? 0;
  return (
    <fieldset className="text-curve-control" disabled={object.locked}>
      <legend>Curve text</legend>
      <div
        className="text-curve-presets"
        role="group"
        aria-label="Text curve direction"
      >
        <button
          type="button"
          aria-pressed={value < 0}
          onClick={() => apply(-Math.max(60, Math.abs(value)))}
        >
          Curve up
        </button>
        <button
          type="button"
          aria-pressed={value === 0}
          onClick={() => apply(0)}
        >
          Straight
        </button>
        <button
          type="button"
          aria-pressed={value > 0}
          onClick={() => apply(Math.max(60, Math.abs(value)))}
        >
          Curve down
        </button>
      </div>
      <div className="text-curve-caption">
        <span>Up</span>
        <span className="text-curve-value" aria-hidden="true">
          {value === 0
            ? "Straight"
            : `${Math.abs(value)}° ${value < 0 ? "up" : "down"}`}
        </span>
        <span>Down</span>
      </div>
      <input
        aria-label="Text curve"
        aria-valuetext={
          value === 0
            ? "Straight"
            : `${Math.abs(value)} degrees ${value < 0 ? "up" : "down"}`
        }
        type="range"
        min={-180}
        max={180}
        step={1}
        value={value}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onChange={(e) => {
          const angle = Number(e.target.value);
          pendingRef.current = angle;
          setPending(angle);
          try {
            onPreview(withTextCurve(object, angle));
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
        onPointerUp={() => apply()}
        onPointerCancel={cancel}
        onBlur={() => apply()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cancel();
          }
        }}
        onKeyUp={(e) => {
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
              "PageUp",
              "PageDown",
            ].includes(e.key)
          )
            apply();
        }}
      />
      <p>Drag to bend your words. Choose Straight to reset.</p>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
