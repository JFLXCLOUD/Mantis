import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ContextAction = {
  label: string;
  icon: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  run(): void;
};
export function ObjectContextMenu({
  x,
  y,
  title,
  note,
  actions,
  close,
}: {
  x: number;
  y: number;
  title: string;
  note?: string;
  actions: ContextAction[];
  close(restoreFocus?: boolean): void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  const closeRef = useRef(close);
  closeRef.current = close;
  useLayoutEffect(() => {
    const menu = root.current!;
    const rect = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
    });
    menu
      .querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node)) closeRef.current(false);
    };
    const scroll = (event: Event) => {
      if (!menu.contains(event.target as Node)) closeRef.current(false);
    };
    const dismiss = () => closeRef.current(false);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
    };
  }, [x, y]);
  return createPortal(
    <div
      ref={root}
      className="object-context-menu"
      role="menu"
      aria-label="Object actions"
      style={position}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        event.stopPropagation();
        const shortcut =
          (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d"
            ? event.shiftKey
              ? "Ctrl+Shift+D"
              : "Ctrl+D"
            : !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                event.key === "Delete"
              ? "Del"
              : undefined;
        if (shortcut) {
          event.preventDefault();
          const action = actions.find((item) => item.shortcut === shortcut);
          if (action && !action.disabled) {
            close(true);
            action.run();
          }
          return;
        }
        if (["Escape", "Tab"].includes(event.key)) {
          event.preventDefault();
          close(true);
          return;
        }
        const items = [
          ...root.current!.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const index = items.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        let next: HTMLButtonElement | undefined;
        if (event.key === "ArrowDown") next = items[(index + 1) % items.length];
        else if (event.key === "ArrowUp")
          next = items[(index - 1 + items.length) % items.length];
        else if (event.key === "Home") next = items[0];
        else if (event.key === "End") next = items[items.length - 1];
        else if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          event.key !== " "
        )
          next = [...items.slice(index + 1), ...items.slice(0, index + 1)].find(
            (item) =>
              item
                .getAttribute("aria-label")!
                .toLowerCase()
                .startsWith(event.key.toLowerCase()),
          );
        if (next) {
          event.preventDefault();
          next.focus();
        }
      }}
    >
      <div className="object-menu-heading" role="presentation">
        <strong>{title}</strong>
        {note && <span>{note}</span>}
      </div>
      {actions.map((action) => (
        <div key={action.label} role="presentation">
          {action.separator && (
            <div className="object-menu-separator" role="separator" />
          )}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-label={action.label}
            disabled={action.disabled}
            className={action.danger ? "danger" : ""}
            onClick={() => {
              close(true);
              action.run();
            }}
          >
            {action.icon}
            <span>{action.label}</span>
            {action.shortcut && <kbd aria-hidden="true">{action.shortcut}</kbd>}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
