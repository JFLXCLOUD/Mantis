import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DesignObject } from "./model";
import { fontFamily } from "./fonts";
import { objectTransform } from "./geometry";

// The native text surface shares the object's rotation, shear, reflection,
// zoom and scrolling. Curves return after the straight text edit is finished.
export function CanvasTextEditor({
  object,
  onDone,
  onCancel,
}: {
  object: DesignObject;
  onDone(text: string): void;
  onCancel(): void;
}) {
  const [value, setValue] = useState(object.text || "");
  const input = useRef<HTMLTextAreaElement>(null);
  const draft = useRef(value);
  draft.current = value;
  const finish = useRef(onDone);
  finish.current = onDone;
  const closed = useRef(false);
  function done() {
    if (closed.current) return;
    closed.current = true;
    finish.current(draft.current);
  }
  useLayoutEffect(() => {
    input.current?.focus({ preventScroll: true });
    input.current?.select();
    const outside = (event: PointerEvent) => {
      if (event.target !== input.current) done();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, []);
  const layout = useMemo(() => {
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = `${object.italic ? "italic " : ""}${object.bold ? "bold " : ""}100px ${fontFamily(object.font)}`;
    const lines = value.split("\n");
    const width =
      Math.max(
        20,
        ...lines.map(
          (line) =>
            context.measureText(line || " ").width +
            Math.max(0, [...line].length - 1) * (object.letterSpacing || 0),
        ),
      ) + 4;
    const lineHeight = 100 * (object.lineSpacing || 1.2);
    return { width, height: lines.length * lineHeight, lineHeight };
  }, [
    value,
    object.font,
    object.bold,
    object.italic,
    object.letterSpacing,
    object.lineSpacing,
  ]);
  return (
    <g
      transform={objectTransform(object)}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <rect
        width={object.width}
        height={object.height}
        fill="none"
        stroke="#bf38ad"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <foreignObject
        width={layout.width}
        height={layout.height}
        transform={`scale(${object.width / layout.width} ${object.height / layout.height})`}
      >
        <textarea
          ref={input}
          className="canvas-inline-input"
          aria-label="Edit text on canvas"
          aria-describedby="canvas-edit-hint"
          maxLength={1000}
          wrap="off"
          spellCheck={false}
          value={value}
          style={{
            fontFamily: fontFamily(object.font),
            fontSize: 100,
            lineHeight: `${layout.lineHeight}px`,
            fontWeight: object.bold ? 700 : 400,
            fontStyle: object.italic ? "italic" : "normal",
            textDecoration: object.underline ? "underline" : "none",
            letterSpacing: object.letterSpacing || 0,
            textAlign: object.textAlign || "left",
            color: object.fill,
            caretColor: object.fill,
          }}
          onChange={(event) => setValue(event.target.value)}
          onBlur={done}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape") {
              event.preventDefault();
              closed.current = true;
              onCancel();
            } else if (
              event.key === "Enter" &&
              (event.ctrlKey || event.metaKey)
            ) {
              event.preventDefault();
              done();
              input.current?.closest("svg")?.focus({ preventScroll: true });
            }
          }}
        />
      </foreignObject>
    </g>
  );
}
