import { useState, useId } from "react";
import type { DesignObject } from "./model";
import { FontPicker } from "./FontPicker";
import { TextCurveControl } from "./TextCurveControl";
export function TextOptions({
  object: o,
  onPatch,
  onPreview,
  onCommit,
  onEdit,
}: {
  object: DesignObject;
  onPatch(p: Partial<DesignObject>): void;
  onPreview(o: DesignObject | null): void;
  onCommit(o: DesignObject): void;
  onEdit(): void;
}) {
  const [tab, setTab] = useState("Text");
  const tabId = useId();
  return (
    <div className="text-options">
      <div
        className="text-option-tabs"
        role="tablist"
        aria-label="Text options"
      >
        {["Text", "Style", "Curve"].map((name, i) => (
          <button
            key={name}
            role="tab"
            id={`${tabId}-${name}`}
            aria-controls={`${tabId}-panel`}
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => setTab(name)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? 2
                      : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                setTab(["Text", "Style", "Curve"][next]);
                (
                  e.currentTarget.parentElement?.children[next] as HTMLElement
                ).focus();
              }
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${tabId}-panel`}
        aria-labelledby={`${tabId}-${tab}`}
      >
        {tab === "Text" && (
          <>
            <div className="text-edit-hint">
              <strong>Make your words your own</strong>
              <span>Double-click text on the board to type.</span>
              <button
                className="button secondary"
                disabled={o.locked}
                onClick={onEdit}
              >
                Edit on canvas
              </button>
            </div>
            <label className="field-label">
              Your words
              <textarea
                aria-label="Text content"
                maxLength={1000}
                value={o.text}
                disabled={o.locked}
                onChange={(e) =>
                  onPatch({
                    text: e.target.value,
                    ...(e.target.value.includes("\n")
                      ? { textCurve: 0, textCurveRatio: undefined }
                      : {}),
                  })
                }
              />
            </label>
            <FontPicker
              key={`font-${o.id}`}
              value={o.font || "Georgia"}
              disabled={o.locked}
              onChange={(font) => onPatch({ font })}
            />
          </>
        )}
        {tab === "Style" && (
          <>
            <fieldset disabled={o.locked} className="text-format-options">
              <legend>Typography</legend>
              <label className="field-label">
                Text height (pt)
                <input
                  aria-label="Text height in points"
                  type="number"
                  min={1}
                  max={7500}
                  step={1}
                  value={Math.round(o.height * 0.75 * 10) / 10}
                  onChange={(e) => {
                    const height = Number(e.target.value) / 0.75;
                    if (e.target.value !== "" && e.target.validity.valid)
                      onPatch({
                        height,
                        width: Math.min(100000, (o.width * height) / o.height),
                      });
                  }}
                />
              </label>
              <div
                className="text-toggle-row"
                role="group"
                aria-label="Text style"
              >
                <button
                  aria-label="Bold"
                  aria-pressed={!!o.bold}
                  onClick={() => onPatch({ bold: !o.bold })}
                >
                  <b>B</b>
                </button>
                <button
                  aria-label="Italic"
                  aria-pressed={!!o.italic}
                  onClick={() => onPatch({ italic: !o.italic })}
                >
                  <i>I</i>
                </button>
                <button
                  aria-label="Underline"
                  aria-pressed={!!o.underline}
                  onClick={() => onPatch({ underline: !o.underline })}
                >
                  <u>U</u>
                </button>
                <select
                  aria-label="Text alignment"
                  value={o.textAlign || "left"}
                  onChange={(e) =>
                    onPatch({
                      textAlign: e.target.value as DesignObject["textAlign"],
                    })
                  }
                >
                  <option value="left">Align left</option>
                  <option value="center">Center lines</option>
                  <option value="right">Align right</option>
                </select>
              </div>
              <div className="field-row">
                <label className="field-label">
                  Letter spacing
                  <input
                    aria-label="Letter spacing"
                    type="number"
                    min={-10}
                    max={50}
                    step={1}
                    value={o.letterSpacing || 0}
                    onChange={(e) => {
                      if (e.target.value !== "" && e.target.validity.valid)
                        onPatch({ letterSpacing: Number(e.target.value) });
                    }}
                  />
                </label>
                <label className="field-label">
                  Line spacing
                  <input
                    aria-label="Line spacing"
                    type="number"
                    min={0.8}
                    max={3}
                    step={0.1}
                    value={o.lineSpacing || 1.2}
                    onChange={(e) => {
                      if (e.target.value !== "" && e.target.validity.valid)
                        onPatch({ lineSpacing: Number(e.target.value) });
                    }}
                  />
                </label>
              </div>
              <div
                className="text-case-row"
                role="group"
                aria-label="Text case"
              >
                <button
                  onClick={() =>
                    onPatch({ text: o.text?.toUpperCase().slice(0, 1000) })
                  }
                >
                  UPPERCASE
                </button>
                <button
                  onClick={() =>
                    onPatch({ text: o.text?.toLowerCase().slice(0, 1000) })
                  }
                >
                  lowercase
                </button>
                <button
                  onClick={() =>
                    onPatch({
                      text: o.text
                        ?.toLowerCase()
                        .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
                        .slice(0, 1000),
                    })
                  }
                >
                  Title Case
                </button>
              </div>
            </fieldset>
            <fieldset disabled={o.locked} className="text-format-options">
              <legend>Text effects</legend>
              <div
                className="text-effect-tiles"
                role="group"
                aria-label="Text effects"
              >
                {(["plain", "outline", "shadow"] as const).map((effect) => (
                  <button
                    key={effect}
                    aria-label={
                      effect === "plain"
                        ? "Original"
                        : effect === "outline"
                          ? "Outline"
                          : "Shadow"
                    }
                    aria-pressed={(o.textEffect || "plain") === effect}
                    onClick={() =>
                      onPatch({
                        textEffect: effect === "plain" ? undefined : effect,
                      })
                    }
                  >
                    <span className={`effect-sample effect-${effect}`}>Aa</span>
                    {effect === "plain"
                      ? "Original"
                      : effect === "outline"
                        ? "Outline"
                        : "Shadow"}
                  </button>
                ))}
              </div>
              {o.textEffect && (
                <label className="field-label">
                  {o.textEffect === "outline"
                    ? "Outline thickness"
                    : "Shadow distance"}
                  <input
                    aria-label="Effect strength"
                    type="range"
                    min={1}
                    max={15}
                    value={o.effectAmount ?? 4}
                    onChange={(e) =>
                      onPatch({ effectAmount: Number(e.target.value) })
                    }
                  />
                </label>
              )}
              {o.textEffect === "shadow" && (
                <p className="field-note">
                  A translucent offset for printed artwork. Convert or separate
                  layers in your cutting workflow as needed.
                </p>
              )}
            </fieldset>
            <button
              className="button secondary"
              disabled={o.locked}
              onClick={() =>
                onPatch({
                  bold: undefined,
                  italic: false,
                  underline: undefined,
                  letterSpacing: undefined,
                  lineSpacing: undefined,
                  textAlign: undefined,
                  textEffect: undefined,
                  effectAmount: undefined,
                })
              }
            >
              Reset text styling
            </button>
          </>
        )}
        {tab === "Curve" && (
          <>
            {o.text?.includes("\n") ? (
              <p className="field-note">
                Curves work with a single line. Remove line breaks to curve
                these words.
              </p>
            ) : (
              <TextCurveControl
                key={`curve-${o.id}`}
                object={o}
                onPreview={onPreview}
                onCommit={onCommit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
