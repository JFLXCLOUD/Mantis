import {
  useId,
  useRef,
  useState,
  useLayoutEffect,
  type ReactNode,
} from "react";
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
  const root = useRef<HTMLElement>(null);
  const toggle = useRef(onToggle);
  toggle.current = onToggle;
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 400 });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const box = button.current!.getBoundingClientRect();
      setPosition({
        left: Math.max(12, Math.min(box.left, innerWidth - 402)),
        top: box.bottom + 6,
        maxHeight: Math.max(150, innerHeight - box.bottom - 24),
      });
    };
    place();
    const dismiss = (e: MouseEvent) => {
      // Keep the editing context during Save, Undo and layer visibility/lock actions.
      // Use the event path: applying a setting can replace its clicked button.
      const path = e.composedPath();
      if (path.some(node => node instanceof Element && node.matches('.app-header,.editor-toolbar,.editing-bar,.right-panel')))
        return;
      if (!path.includes(root.current!)) toggle.current(false);
    };
    window.addEventListener("resize", place);
    // The compact toolbar scrolls horizontally; keep its popout on the trigger.
    const toolbar = root.current?.closest('.context-toolbar');
    toolbar?.addEventListener("scroll", place);
    document.addEventListener("click", dismiss);
    return () => {
      window.removeEventListener("resize", place);
      toolbar?.removeEventListener("scroll", place);
      document.removeEventListener("click", dismiss);
    };
  }, [open]);
  return (
    <section
      ref={root}
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
        <div className="property-menu-content" id={id} style={position}>
          {children}
        </div>
      )}
    </section>
  );
}
