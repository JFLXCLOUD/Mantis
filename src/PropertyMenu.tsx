import { useId, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
export function PropertyMenu({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle(open: boolean): void;
  children: ReactNode;
}) {
  const id = useId(),
    button = useRef<HTMLButtonElement>(null);
  return (
    <section
      className={`property-menu ${open ? "is-open" : ""}`}
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onToggle(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        className="property-menu-trigger"
        type="button"
        aria-label={title}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onToggle(!open)}
      >
        <span>
          <strong>{title}</strong>
          {summary && <small>{summary}</small>}
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="property-menu-content" id={id}>
          {children}
        </div>
      )}
    </section>
  );
}
