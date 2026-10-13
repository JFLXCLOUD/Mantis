import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DesignObject } from "./model";
import { fontFamily } from "./fonts";

export function CanvasTextEditor({
  object,
  anchor,
  onDone,
  onCancel,
}: {
  object: DesignObject;
  anchor: { x: number; y: number; width: number; height: number };
  onDone(text: string): void;
  onCancel(): void;
}) {
  const [value, setValue] = useState(object.text || "");
  const input = useRef<HTMLTextAreaElement>(null),
    root = useRef<HTMLDivElement>(null);
  const draft = useRef(value);
  draft.current = value;
  const finish = useRef(onDone);
  finish.current = onDone;
  const closed = useRef(false);
  function done() {
    if (!closed.current) {
      closed.current = true;
      finish.current(draft.current);
    }
  }
  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.select();
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) done();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const width = Math.min(600, Math.max(260, anchor.width + 24));
  const height = Math.min(260, Math.max(95, anchor.height + 20));
  return createPortal(
    <div
      ref={root}
      className="canvas-text-editor"
      style={{
        width,
        left: Math.max(12, Math.min(anchor.x - 12, innerWidth - width - 12)),
        top: Math.max(12, Math.min(anchor.y - 10, innerHeight - height - 70)),
      }}
    >
      <textarea
        ref={input}
        aria-label="Edit text on canvas"
        maxLength={1000}
        value={value}
        style={{
          height,
          fontFamily: fontFamily(object.font),
          fontWeight: object.bold ? "bold" : "normal",
          fontStyle: object.italic ? "italic" : "normal",
          fontSize: Math.min(
            42,
            Math.max(
              18,
              (anchor.height / Math.max(1, value.split("\n").length)) * 0.7,
            ),
          ),
        }}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") {
            e.preventDefault();
            closed.current = true;
            onCancel();
          }
          if (
            e.key === "Enter" &&
            (e.ctrlKey || e.metaKey) &&
            !e.nativeEvent.isComposing
          ) {
            e.preventDefault();
            done();
          }
        }}
      />
      <div>
        <small>Enter: new line · Ctrl+Enter: done</small>
        <button
          onClick={() => {
            closed.current = true;
            onCancel();
          }}
        >
          Cancel
        </button>
        <button className="button primary" onClick={done}>
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
