import { version as appVersion } from "../package.json";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  FolderOpen,
  Grid2X2,
  Grip,
  Group,
  Heart,
  HelpCircle,
  History,
  Layers,
  Leaf,
  Lock,
  LockOpen,
  Maximize,
  Minus,
  MousePointer2,
  Palette,
  Plus,
  Redo2,
  Repeat2,
  RotateCw,
  Save,
  Scissors,
  Settings2,
  Shapes,
  Sparkles,
  Square,
  Star,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Ungroup,
  Upload,
  X,
  ZoomIn,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignStartVertical,
  AlignEndVertical,
} from "lucide-react";
import {
  blankProject,
  bounds,
  COLORS,
  createObject,
  demoProject,
  id,
  materialGroups,
  paths,
  validateProject,
  type DesignObject,
  type Project,
  type Shape,
} from "./model";
import { download, exportSvg, filename, importSvg, readProject } from "./io";
import { SelectionFrame } from "./SelectionFrame";
import { MachineSetup } from "./MachineSetup";
import { PrintSetup } from "./PrintSetup";
import { ObjectContextMenu, type ContextAction } from "./ObjectContextMenu";
import { combineObjects, combineLabels, type CombineMode } from "./vector";
import {
  alignSelection,
  centerOnCanvas,
  distribute,
  flipSelection,
  objectTransform,
  resizeSelection,
  rotateSelection,
  selectionUnits,
  type Handle,
} from "./geometry";
import {
  FlipHorizontal2,
  FlipVertical2,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Focus,
  CopyPlus,
  Search,
  Usb,
} from "lucide-react";

const STORAGE_KEY = "hopper.project.v1";
function initialProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return readProject(raw);
  } catch {
    /* Keep invalid recovery data until the user makes an edit. */
  }
  return demoProject();
}
const shapeIcons: Record<string, ReactNode> = {
  rect: <Square />,
  ellipse: <Circle />,
  triangle: <Triangle />,
  star: <Star />,
  heart: <Heart />,
  leaf: <Leaf />,
  flower: <Sparkles />,
};
function IconButton({
  title,
  children,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  active?: boolean;
}) {
  return (
    <button
      {...props}
      title={title}
      aria-label={title}
      className={`icon-button ${active ? "active" : ""} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
function Logo() {
  return <img src="./brand/mantis-mark.svg" width="42" height="42" alt="" />;
}
function Artwork({ object: o }: { object: DesignObject }) {
  const outline =
    o.operation === "draw" ||
    o.operation === "score" ||
    o.operation === "guide";
  const props = {
    fill: outline ? "none" : o.fill,
    stroke: outline ? o.fill : "none",
    strokeWidth: 1.5,
    strokeDasharray:
      o.operation === "score" || o.operation === "guide" ? "6 4" : undefined,
  };
  return (
    <g
      transform={objectTransform(o)}
      opacity={o.operation === "guide" ? 0.45 : 1}
    >
      {o.type === "rect" ? (
        <rect
          width={o.width}
          height={o.height}
          rx={Math.min(o.width, o.height) * 0.12}
          {...props}
        />
      ) : o.type === "ellipse" ? (
        <ellipse
          cx={o.width / 2}
          cy={o.height / 2}
          rx={o.width / 2}
          ry={o.height / 2}
          {...props}
        />
      ) : o.type === "text" ? (
        <text
          x="0"
          y={o.height * 0.8}
          fontFamily={o.font}
          fontSize={o.height}
          fontStyle={o.italic ? "italic" : "normal"}
          textLength={o.width}
          lengthAdjust="spacingAndGlyphs"
          {...props}
        >
          {o.text}
        </text>
      ) : o.type === "svg" ? (
        <svg
          width={o.width}
          height={o.height}
          dangerouslySetInnerHTML={{ __html: o.svg || "" }}
        />
      ) : (
        <path
          d={o.type === "path" ? o.pathData : paths[o.type]}
          transform={`scale(${o.width / 100} ${o.height / 100})`}
          {...props}
        />
      )}
    </g>
  );
}
function NumberField({
  label,
  value,
  onChange,
  step = 0.1,
  min,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const apply = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() && Number.isFinite(n) && (min === undefined || n >= min))
      onChange(n);
    setDraft(null);
  };
  return (
    <label className="number-field">
      <span>{label}</span>
      <div>
        <input
          aria-label={label}
          type="number"
          value={draft ?? String(+value.toFixed(3))}
          min={min}
          step={step}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}
type Drag = {
  kind: "move" | "resize" | "marquee" | "rotate";
  handle?: Handle;
  proportional?: boolean;
  centered?: boolean;
  shift?: boolean;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  ids: string[];
  box: ReturnType<typeof bounds>;
  originals: DesignObject[];
};
export default function App() {
  const [history, setHistory] = useState<{
    past: Project[];
    present: Project;
    future: Project[];
  }>(() => ({ past: [], present: initialProject(), future: [] }));
  const project = history.present;
  const [selection, setSelection] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    origin: HTMLElement | SVGElement;
  } | null>(null);
  const [layerSearch, setLayerSearch] = useState("");
  const [tab, setTab] = useState<"create" | "projects">("create");
  const [dialog, setDialog] = useState<
    | "prepare"
    | "machine"
    | "repeat"
    | "help"
    | "new"
    | "combine"
    | "print"
    | null
  >(null);
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState("Local workspace");
  const [unit, setUnit] = useState<"in" | "mm">("in");
  const [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true),
    [aspect, setAspect] = useState(true);
  const [zoom, setZoom] = useState(1),
    [fit, setFit] = useState(0.5);
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (value: Drag | null) => {
    dragRef.current = value;
    setDragState(value);
  };
  const [repeatRows, setRepeatRows] = useState(2),
    [repeatCols, setRepeatCols] = useState(3),
    [repeatGap, setRepeatGap] = useState(0.25);
  const [mirror, setMirror] = useState(false),
    [matIndex, setMatIndex] = useState(0);
  const viewport = useRef<HTMLDivElement>(null),
    canvas = useRef<SVGSVGElement>(null),
    file = useRef<HTMLInputElement>(null);
  const lastSaved = useRef(JSON.stringify(project));
  const modal = useRef<HTMLElement>(null);
  const scale = unit === "in" ? 96 : 96 / 25.4;
  const selected = project.objects.filter((o) => selection.includes(o.id));
  const editable = selected.filter((o) => !o.locked && o.visible);
  const single = selected.length === 1 ? selected[0] : undefined;
  const editableUnits = selectionUnits(editable).length;
  const commit = (update: Project | ((p: Project) => Project)) =>
    setHistory((h) => {
      const next = typeof update === "function" ? update(h.present) : update;
      if (JSON.stringify(next) === JSON.stringify(h.present)) return h;
      return {
        past: [...h.past.slice(-79), h.present],
        present: next,
        future: [],
      };
    });
  const undo = () =>
    setHistory((h) =>
      h.past.length
        ? {
            past: h.past.slice(0, -1),
            present: h.past[h.past.length - 1],
            future: [h.present, ...h.future],
          }
        : h,
    );
  const redo = () =>
    setHistory((h) =>
      h.future.length
        ? {
            past: [...h.past, h.present],
            present: h.future[0],
            future: h.future.slice(1),
          }
        : h,
    );
  const patch = (changes: Partial<DesignObject>) =>
    commit((p) => ({
      ...p,
      objects: p.objects.map((o) =>
        selection.includes(o.id) && !o.locked
          ? {
              ...o,
              ...changes,
              ...(o.type === "svg"
                ? { fill: o.fill, operation: o.operation }
                : {}),
            }
          : o,
      ),
    }));
  const notify = (message: string) => setToast(message);
  const [combineError, setCombineError] = useState("");
  function combine(mode: CombineMode) {
    try {
      const output = combineObjects(selected, mode);
      const selectedIds = new Set(selected.map((o) => o.id));
      const topIndex = project.objects.indexOf(selected[selected.length - 1]);
      commit(
        validateProject({
          ...project,
          objects: project.objects.flatMap((o, i) =>
            i === topIndex ? output : selectedIds.has(o.id) ? [] : [o],
          ),
        }),
      );
      setSelection(output.map((o) => o.id));
      setDialog(null);
      notify(
        `${combineLabels[mode]} created ${output.length} editable ${output.length === 1 ? "path" : "paths"}. Undo restores your layers.`,
      );
    } catch (error) {
      setCombineError((error as Error).message);
    }
  }
  const commitObjects = (objects: DesignObject[]) => {
    const replacements = new Map(objects.map((o) => [o.id, o]));
    commit((p) => ({
      ...p,
      objects: p.objects.map((o) => replacements.get(o.id) || o),
    }));
  };
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (JSON.stringify(project) === lastSaved.current) return;
    setSaved("Saving locally…");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        lastSaved.current = JSON.stringify(project);
        setSaved("Saved on this device");
      } catch {
        setSaved("Workspace storage full — save a file");
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = modal.current;
    const focusable = () => [
      ...(root?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ) || []),
    ];
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    root?.addEventListener("keydown", trap);
    return () => {
      root?.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [dialog]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setFit(
        Math.max(
          0.15,
          Math.min(
            (el.clientWidth - 120) / project.width,
            (el.clientHeight - 120) / project.height,
          ),
        ),
      ),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [project.width, project.height]);
  function add(type: Shape) {
    if (project.objects.length >= 1000)
      return notify("This project has reached the 1,000-object limit.");
    const object = createObject(type, project.objects.length);
    commit((p) => ({ ...p, objects: [...p.objects, object] }));
    setSelection([object.id]);
  }
  function duplicate(inPlace = false) {
    if (!editable.length) return;
    if (project.objects.length + editable.length > 1000)
      return notify("This would exceed the 1,000-object limit.");
    const groups = new Map<string, string>();
    const copies = editable.map((o) => {
      if (o.groupId && !groups.has(o.groupId)) groups.set(o.groupId, id());
      return {
        ...o,
        id: id(),
        name: `${o.name.slice(0, 190)} copy`,
        x: o.x + (inPlace ? 0 : 24),
        y: o.y + (inPlace ? 0 : 24),
        groupId: o.groupId ? groups.get(o.groupId) : undefined,
      };
    });
    commit((p) => ({ ...p, objects: [...p.objects, ...copies] }));
    setSelection(copies.map((o) => o.id));
  }
  function closeContextMenu(restoreFocus = false) {
    if (restoreFocus) contextMenu?.origin.focus({ preventScroll: true });
    setContextMenu(null);
  }
  function openObjectMenu(
    o: DesignObject,
    x: number,
    y: number,
    origin: HTMLElement | SVGElement,
  ) {
    if (dragRef.current || dialog) return;
    if (!selection.includes(o.id))
      setSelection(
        o.groupId
          ? project.objects
              .filter((item) => item.groupId === o.groupId)
              .map((item) => item.id)
          : [o.id],
      );
    setContextMenu({ x, y, origin });
  }
  function canvasContextMenu(event: ReactMouseEvent<SVGSVGElement>) {
    event.preventDefault();
    // Inspect the same rectangular hit areas used for dragging, including locked
    // layers whose pointer events deliberately pass through during normal editing.
    const targets = [
      ...event.currentTarget.querySelectorAll<SVGGElement>(".canvas-object"),
    ].reverse();
    for (const target of targets) {
      const hit = target.querySelector<SVGRectElement>(":scope > rect");
      const matrix = hit?.getScreenCTM();
      if (!hit || !matrix) continue;
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      if (
        p.x >= 0 &&
        p.y >= 0 &&
        p.x <= hit.width.baseVal.value &&
        p.y <= hit.height.baseVal.value
      ) {
        const object = project.objects.find(
          (item) => item.id === target.dataset.objectId,
        );
        if (object)
          openObjectMenu(
            object,
            event.clientX,
            event.clientY,
            event.currentTarget,
          );
        return;
      }
    }
    closeContextMenu();
  }
  const allEditable =
    selected.length > 0 && editable.length === selected.length;
  const toggleSelected = (field: "locked" | "visible", value: boolean) =>
    commit((p) => ({
      ...p,
      objects: p.objects.map((o) =>
        selection.includes(o.id) ? { ...o, [field]: value } : o,
      ),
    }));
  function arrangeEdge(front: boolean) {
    const ids = new Set(editable.map((o) => o.id));
    commit((p) => {
      const moving = p.objects.filter((o) => ids.has(o.id));
      const remaining = p.objects.filter((o) => !ids.has(o.id));
      return {
        ...p,
        objects: front ? [...remaining, ...moving] : [...moving, ...remaining],
      };
    });
  }
  const contextActions: ContextAction[] = [
    {
      label: "Duplicate",
      icon: <Copy />,
      shortcut: "Ctrl+D",
      disabled: !allEditable,
      run: () => duplicate(),
    },
    {
      label: "Duplicate in place",
      icon: <CopyPlus />,
      shortcut: "Ctrl+Shift+D",
      disabled: !allEditable,
      run: () => duplicate(true),
    },
    {
      label: selected.some((o) => o.groupId) ? "Ungroup" : "Group",
      icon: selected.some((o) => o.groupId) ? <Ungroup /> : <Group />,
      separator: true,
      disabled:
        !allEditable ||
        (selected.length < 2 && !selected.some((o) => o.groupId)),
      run: () =>
        patch({ groupId: selected.some((o) => o.groupId) ? undefined : id() }),
    },
    {
      label: "Combine shapes…",
      icon: <Shapes />,
      disabled: !allEditable || selected.length < 2,
      run: () => {
        setCombineError("");
        setDialog("combine");
      },
    },
    {
      label: "Repeat pattern…",
      icon: <Repeat2 />,
      disabled: !allEditable,
      run: () => setDialog("repeat"),
    },
    {
      label: "Flip horizontally",
      icon: <FlipHorizontal2 />,
      separator: true,
      disabled: !allEditable,
      run: () => commitObjects(flipSelection(editable, "horizontal")),
    },
    {
      label: "Flip vertically",
      icon: <FlipVertical2 />,
      disabled: !allEditable,
      run: () => commitObjects(flipSelection(editable, "vertical")),
    },
    {
      label: "Bring to front",
      icon: <ArrowUp />,
      separator: true,
      disabled: !allEditable,
      run: () => arrangeEdge(true),
    },
    {
      label: "Send to back",
      icon: <ArrowDown />,
      disabled: !allEditable,
      run: () => arrangeEdge(false),
    },
    {
      label: selected.some((o) => o.visible) ? "Hide" : "Show",
      icon: selected.some((o) => o.visible) ? <EyeOff /> : <Eye />,
      separator: true,
      run: () => toggleSelected("visible", !selected.some((o) => o.visible)),
    },
    {
      label: selected.some((o) => !o.locked) ? "Lock" : "Unlock",
      icon: selected.some((o) => !o.locked) ? <Lock /> : <LockOpen />,
      run: () => toggleSelected("locked", !selected.every((o) => o.locked)),
    },
    {
      label: "Delete",
      icon: <Trash2 />,
      shortcut: "Del",
      separator: true,
      danger: true,
      disabled: !allEditable,
      run: remove,
    },
  ];
  function remove() {
    commit((p) => ({
      ...p,
      objects: p.objects.filter((o) => !selection.includes(o.id) || o.locked),
    }));
    setSelection([]);
  }
  function saveFile() {
    download(
      JSON.stringify(project, null, 2),
      `${filename(project.name)}.hopper`,
      "application/json",
    );
    notify("Project file saved. Everything stays editable.");
  }
  function exportFile() {
    download(
      exportSvg(project),
      `${filename(project.name)}.svg`,
      "image/svg+xml",
    );
    notify(
      "SVG exported. Text stays editable; set cut operations in your cutting software.",
    );
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (contextMenu) return;
      if (
        !dialog &&
        !dragRef.current &&
        (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) &&
        !(
          e.target instanceof HTMLElement &&
          /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
        )
      ) {
        const row =
          e.target instanceof Element
            ? e.target.closest<HTMLElement>("[data-layer-id]")
            : null;
        const object = row
          ? project.objects.find((o) => o.id === row.dataset.layerId)
          : selected[0];
        if (object) {
          e.preventDefault();
          const anchor = row || canvas.current!;
          const rect = anchor.getBoundingClientRect();
          openObjectMenu(
            object,
            rect.left + Math.min(rect.width / 2, 160),
            rect.top + Math.min(rect.height / 2, 120),
            row?.querySelector<HTMLButtonElement>(".layer-select") ||
              canvas.current!,
          );
        }
        return;
      }
      if (e.key === "Escape") {
        setDialog(null);
        setSelection([]);
        setDrag(null);
        return;
      }
      if (
        dialog ||
        dragRef.current ||
        (e.target instanceof HTMLElement &&
          /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
      )
        return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["z", "y", "s", "d", "a", "o"].includes(e.key.toLowerCase()))
        e.preventDefault();
      if (mod && e.key.toLowerCase() === "z")
        return e.shiftKey ? redo() : undo();
      if (mod && e.key.toLowerCase() === "y") return redo();
      if (mod && e.key.toLowerCase() === "s") return saveFile();
      if (mod && e.key.toLowerCase() === "d") return duplicate(e.shiftKey);
      if (mod && e.key.toLowerCase() === "a")
        return setSelection(
          project.objects
            .filter((o) => o.visible && !o.locked)
            .map((o) => o.id),
        );
      if (mod && e.key.toLowerCase() === "o") return file.current?.click();
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        editable.length
      ) {
        e.preventDefault();
        const distance = e.shiftKey ? 10 : 1;
        commit((p) => ({
          ...p,
          objects: p.objects.map((o) =>
            selection.includes(o.id) && !o.locked
              ? {
                  ...o,
                  x:
                    o.x +
                    (e.key === "ArrowLeft"
                      ? -distance
                      : e.key === "ArrowRight"
                        ? distance
                        : 0),
                  y:
                    o.y +
                    (e.key === "ArrowUp"
                      ? -distance
                      : e.key === "ArrowDown"
                        ? distance
                        : 0),
                }
              : o,
          ),
        }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function choose(o: DesignObject, shift = false) {
    const ids = o.groupId
      ? project.objects
          .filter((s) => s.groupId === o.groupId && s.visible)
          .map((s) => s.id)
      : [o.id];
    const next = shift
      ? selection.includes(o.id)
        ? selection.filter((s) => !ids.includes(s))
        : [...new Set([...selection, ...ids])]
      : ids;
    setSelection(next);
    return next;
  }
  function point(
    e: ReactPointerEvent<SVGSVGElement | SVGGElement | SVGRectElement>,
  ) {
    const rect = canvas.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * project.width,
      y: ((e.clientY - rect.top) / rect.height) * project.height,
    };
  }
  function beginDrag(
    e: ReactPointerEvent<SVGGElement | SVGRectElement>,
    o?: DesignObject,
    handle?: Handle | "rotate",
  ) {
    e.stopPropagation();
    if (e.button !== 0 || o?.locked) return;
    const ids = o
      ? selection.includes(o.id) && !e.shiftKey
        ? selection
        : choose(o, e.shiftKey)
      : selection;
    const originals = project.objects.filter(
      (s) => ids.includes(s.id) && !s.locked && s.visible,
    );
    if (!originals.length) return;
    const p = point(e);
    canvas.current?.setPointerCapture(e.pointerId);
    setDrag({
      kind: handle === "rotate" ? "rotate" : handle ? "resize" : "move",
      handle: handle === "rotate" ? undefined : handle,
      proportional: aspect || e.shiftKey,
      centered: e.altKey,
      shift: e.shiftKey,
      startX: p.x,
      startY: p.y,
      dx: 0,
      dy: 0,
      ids,
      box: bounds(originals),
      originals,
    });
  }
  function dragObjects(current: Drag | null): DesignObject[] {
    if (!current || current.kind === "marquee") return [];
    if (current.kind === "move")
      return current.originals.map((o) => ({
        ...o,
        x: o.x + current.dx,
        y: o.y + current.dy,
      }));
    if (current.kind === "resize")
      return resizeSelection(
        current.originals,
        current.handle!,
        { x: current.dx, y: current.dy },
        !!current.proportional,
        !!current.centered,
      );
    const first = current.originals[0];
    const cx =
      current.originals.length === 1
        ? first.x + first.width / 2
        : current.box.x + current.box.width / 2;
    const cy =
      current.originals.length === 1
        ? first.y + first.height / 2
        : current.box.y + current.box.height / 2;
    let angle =
      ((Math.atan2(
        current.startY + current.dy - cy,
        current.startX + current.dx - cx,
      ) -
        Math.atan2(current.startY - cy, current.startX - cx)) *
        180) /
      Math.PI;
    if (current.shift) {
      const base = current.originals.length === 1 ? first.rotation : 0;
      angle = Math.round((base + angle) / 15) * 15 - base;
    }
    return rotateSelection(current.originals, angle);
  }
  const preview = new Map(dragObjects(drag).map((o) => [o.id, o]));
  const displayed = project.objects.map((o) => preview.get(o.id) || o);
  function updateDrag(e: ReactPointerEvent<SVGSVGElement>) {
    const current = dragRef.current;
    if (!current) return null;
    const p = point(e),
      increment = snap && current.kind === "move" ? 12 : 1;
    const next = {
      ...current,
      dx: Math.round((p.x - current.startX) / increment) * increment,
      dy: Math.round((p.y - current.startY) / increment) * increment,
      proportional: aspect || e.shiftKey,
      centered: e.altKey,
      shift: e.shiftKey,
    };
    setDrag(next);
    return next;
  }
  function endDrag(e: ReactPointerEvent<SVGSVGElement>) {
    const drag = updateDrag(e);
    if (!drag) return;
    if (drag.kind === "marquee") {
      const left = Math.min(drag.startX, drag.startX + drag.dx),
        top = Math.min(drag.startY, drag.startY + drag.dy);
      const right = left + Math.abs(drag.dx),
        bottom = top + Math.abs(drag.dy);
      const hits = project.objects.filter((o) => {
        const b = bounds([o]);
        return (
          !o.locked &&
          o.visible &&
          b.x >= left &&
          b.y >= top &&
          b.x + b.width <= right &&
          b.y + b.height <= bottom
        );
      });
      const groups = new Set(hits.map((o) => o.groupId).filter(Boolean));
      setSelection([
        ...new Set([
          ...drag.ids,
          ...project.objects
            .filter(
              (o) => hits.includes(o) || (o.groupId && groups.has(o.groupId)),
            )
            .map((o) => o.id),
        ]),
      ]);
    } else if (drag.dx || drag.dy) commitObjects(dragObjects(drag));
    setDrag(null);
  }
  function align(direction: "left" | "center" | "right" | "middle") {
    commitObjects(alignSelection(editable, direction));
  }
  function arrange(delta: number) {
    commit((p) => {
      const objects = [...p.objects];
      const indices = objects
        .map((o, i) => (selection.includes(o.id) && !o.locked ? i : -1))
        .filter((i) => i >= 0);
      if (delta > 0) indices.reverse();
      for (const index of indices) {
        const next = index + delta;
        if (
          next >= 0 &&
          next < objects.length &&
          !selection.includes(objects[next].id)
        )
          [objects[index], objects[next]] = [objects[next], objects[index]];
      }
      return { ...p, objects };
    });
  }
  async function openFile(f?: File) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024)
      return notify("Please use a file smaller than 5 MB.");
    try {
      const raw = await f.text();
      if (/\.svg$/i.test(f.name)) {
        if (project.objects.length >= 1000)
          return notify("This project has reached the 1,000-object limit.");
        const object = importSvg(raw, f.name);
        commit((p) => ({ ...p, objects: [...p.objects, object] }));
        setSelection([object.id]);
        notify(
          "SVG imported as one layer. Paths and inline colors are supported; review its appearance.",
        );
      } else {
        commit(readProject(raw));
        setSelection([]);
        setZoom(1);
        notify("Project opened. Your previous canvas is available with Undo.");
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not open that file.");
    }
  }
  function repeatSelection() {
    if (!editable.length) return;
    if (
      !Number.isInteger(repeatRows) ||
      !Number.isInteger(repeatCols) ||
      repeatRows < 1 ||
      repeatCols < 1 ||
      repeatRows > 20 ||
      repeatCols > 20 ||
      !Number.isFinite(repeatGap) ||
      repeatGap < 0 ||
      repeatGap > 100
    )
      return notify("Use 1–20 rows and columns, and a gap from 0–100.");
    const b = bounds(editable),
      copies: DesignObject[] = [];
    if (
      project.objects.length + editable.length * (repeatRows * repeatCols - 1) >
      1000
    )
      return notify(
        "This pattern exceeds the 1,000-object limit. Try fewer copies.",
      );
    for (let row = 0; row < repeatRows; row++)
      for (let col = 0; col < repeatCols; col++) {
        if (!row && !col) continue;
        const groupMap = new Map<string, string>();
        for (const o of editable) {
          if (o.groupId && !groupMap.has(o.groupId))
            groupMap.set(o.groupId, id());
          copies.push({
            ...o,
            id: id(),
            x: o.x + col * (b.width + repeatGap * scale),
            y: o.y + row * (b.height + repeatGap * scale),
            groupId: o.groupId ? groupMap.get(o.groupId) : undefined,
          });
        }
      }
    commit((p) => ({ ...p, objects: [...p.objects, ...copies] }));
    setSelection([...selection, ...copies.map((o) => o.id)]);
    setDialog(null);
    notify(
      `Created ${repeatRows * repeatCols} repeats, including the original.`,
    );
  }
  const groups = materialGroups(project),
    activeMat = groups[Math.min(matIndex, groups.length - 1)];
  const outOfBounds = project.objects.filter(
    (o) =>
      o.visible &&
      o.operation !== "guide" &&
      (() => {
        const b = bounds([o]);
        return (
          b.x < 0 ||
          b.y < 0 ||
          b.x + b.width > project.width ||
          b.y + b.height > project.height
        );
      })(),
  );
  const zoomPercent = Math.round(fit * zoom * 100);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img
            className="brand-logo"
            src="./brand/mantis-logo.svg"
            width="172"
            height="44"
            alt="Mantis Studio"
          />
          <span className="alpha">ALPHA</span>
        </div>
        <div className="project-heading">
          <input
            aria-label="Project name"
            value={project.name}
            maxLength={200}
            onChange={(e) => commit({ ...project, name: e.target.value })}
          />
          <span>
            <span className="status-dot" />
            {saved}
          </span>
        </div>
        <div className="header-actions">
          <button
            className="button quiet machine-header-button"
            aria-label="Machine setup"
            title="Machine setup"
            onClick={() => setDialog("machine")}
          >
            <Usb size={16} /> Machine
          </button>
          <button className="button quiet" onClick={saveFile}>
            <Save size={16} />
            Save project
          </button>
          <button className="button secondary" onClick={exportFile}>
            <Download size={16} />
            Export SVG
          </button>
          <button
            className="button primary"
            onClick={() => {
              setMatIndex(0);
              setDialog("prepare");
            }}
          >
            Prepare <ArrowUpRight size={17} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="left-panel">
          <nav className="panel-tabs">
            <button
              className={tab === "create" ? "selected" : ""}
              onClick={() => setTab("create")}
            >
              Create
            </button>
            <button
              className={tab === "projects" ? "selected" : ""}
              onClick={() => setTab("projects")}
            >
              Projects
            </button>
          </nav>
          {tab === "create" ? (
            <>
              <div className="sidebar-intro">
                <span className="eyebrow">
                  A LITTLE IDEA. ENDLESS POSSIBILITIES.
                </span>
                <h2>What will you make?</h2>
              </div>
              <div className="quick-tools">
                <button onClick={() => add("text")}>
                  <Type />
                  <span>Add text</span>
                  <Plus size={14} />
                </button>
                <button onClick={() => file.current?.click()}>
                  <Upload />
                  <span>Import SVG</span>
                  <Plus size={14} />
                </button>
              </div>
              <section className="sidebar-section">
                <div className="section-heading">
                  <h3>Simple shapes</h3>
                  <Shapes size={15} />
                </div>
                <div className="shape-grid">
                  {Object.entries(shapeIcons).map(([type, icon]) => (
                    <button
                      key={type}
                      title={`Add ${type}`}
                      aria-label={`Add ${type}`}
                      onClick={() => add(type as Shape)}
                    >
                      {icon}
                      <span>
                        {type === "rect"
                          ? "Rectangle"
                          : type[0].toUpperCase() + type.slice(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="sidebar-section">
                <div className="section-heading">
                  <h3>Your creative toolkit</h3>
                  <Sparkles size={15} />
                </div>
                <button
                  className="feature-tool"
                  onClick={() => setDialog("print")}
                >
                  <div className="tool-icon">
                    <Palette />
                  </div>
                  <div>
                    <strong>Print Then Cut</strong>
                    <span>Artwork, print proof &amp; handoff.</span>
                  </div>
                  <ArrowUpRight size={14} />
                </button>
                <button
                  className="feature-tool"
                  disabled={!editable.length}
                  onClick={() => setDialog("repeat")}
                >
                  <div className="tool-icon">
                    <Repeat2 />
                  </div>
                  <div>
                    <strong>Repeat pattern</strong>
                    <span>One idea. A whole collection.</span>
                  </div>
                  <ArrowUpRight size={14} />
                </button>
                <button
                  className="feature-tool"
                  disabled={editable.length < 2}
                  onClick={() => patch({ groupId: id() })}
                >
                  <div className="tool-icon">
                    <Group />
                  </div>
                  <div>
                    <strong>Group selection</strong>
                    <span>Keep good things together.</span>
                  </div>
                  <ArrowUpRight size={14} />
                </button>
              </section>
              <div className="sidebar-bottom">
                <div className="open-note">
                  <img
                    className="sidebar-mascot"
                    src="./brand/manti-mascot.png"
                    width="90"
                    height="60"
                    alt=""
                  />
                  <strong>A little more freedom.</strong>
                  <p>
                    Your files. Your creativity.
                    <br />
                    An open-source place to make.
                  </p>
                  <span>
                    LOCAL FIRST <i /> NO ACCOUNT NEEDED
                  </span>
                </div>
                <button className="help-link" onClick={() => setDialog("help")}>
                  <HelpCircle size={16} />A quick tour of Mantis Studio
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="projects-panel">
              <h2>Made by you.</h2>
              <p>
                Your workspace saves on this device. Save a project file to keep
                or share it.
              </p>
              <button
                className="button secondary"
                onClick={() => setDialog("new")}
              >
                <FilePlus2 size={17} />
                New blank project
              </button>
              <button
                className="button secondary"
                onClick={() => file.current?.click()}
              >
                <FolderOpen size={17} />
                Open project
              </button>
              <button
                className="project-card"
                onClick={() => {
                  commit(demoProject());
                  setSelection([]);
                  setZoom(1);
                  notify(
                    "Starter project loaded. Undo brings back your previous canvas.",
                  );
                }}
              >
                <div className="mini-art">
                  <Leaf size={50} />
                  <span>
                    good things
                    <br />
                    <em>grow here.</em>
                  </span>
                </div>
                <strong>Good things grow here</strong>
                <span>An original Mantis Studio starter ↗</span>
              </button>
              <div className="tip-card">
                <History size={19} />
                <p>
                  Starting fresh? Your previous canvas stays in Undo until you
                  close the app.
                </p>
              </div>
            </div>
          )}
        </aside>
        <main className="editor">
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <IconButton title="Select tool" active>
                <MousePointer2 />
              </IconButton>
              <span className="toolbar-divider" />
              <IconButton
                title="Undo (Ctrl+Z)"
                disabled={!history.past.length}
                onClick={undo}
              >
                <Undo2 />
              </IconButton>
              <IconButton
                title="Redo (Ctrl+Shift+Z)"
                disabled={!history.future.length}
                onClick={redo}
              >
                <Redo2 />
              </IconButton>
            </div>
            <div className="toolbar-group selection-tools">
              <IconButton
                title="Duplicate (Ctrl+D)"
                disabled={!editable.length}
                onClick={() => duplicate()}
              >
                <Copy />
              </IconButton>
              <IconButton
                title="Delete selection"
                disabled={!editable.length}
                onClick={remove}
              >
                <Trash2 />
              </IconButton>
              <span className="toolbar-divider" />
              <IconButton
                title="Align left"
                disabled={editable.length < 2}
                onClick={() => align("left")}
              >
                <AlignStartVertical />
              </IconButton>
              <IconButton
                title="Align center"
                disabled={editable.length < 2}
                onClick={() => align("center")}
              >
                <AlignCenterVertical />
              </IconButton>
              <IconButton
                title="Align right"
                disabled={editable.length < 2}
                onClick={() => align("right")}
              >
                <AlignEndVertical />
              </IconButton>
              <IconButton
                title="Align middle"
                disabled={editable.length < 2}
                onClick={() => align("middle")}
              >
                <AlignCenterHorizontal />
              </IconButton>
            </div>
            <div className="toolbar-group">
              <select
                aria-label="Units"
                value={unit}
                onChange={(e) => setUnit(e.target.value as "in" | "mm")}
              >
                <option value="in">Inches</option>
                <option value="mm">Millimeters</option>
              </select>
            </div>
          </div>
          <div className="editing-bar" aria-label="Quick editing tools">
            <button
              disabled={selected.length < 2}
              onClick={() => {
                setCombineError("");
                setDialog("combine");
              }}
            >
              <Shapes /> Combine
            </button>
            <button
              disabled={!editable.length}
              onClick={() =>
                commitObjects(flipSelection(editable, "horizontal"))
              }
              title="Flip horizontally"
            >
              <FlipHorizontal2 />
              Flip H
            </button>
            <button
              disabled={!editable.length}
              onClick={() => commitObjects(flipSelection(editable, "vertical"))}
              title="Flip vertically"
            >
              <FlipVertical2 />
              Flip V
            </button>
            <button
              disabled={!editable.length}
              onClick={() => commitObjects(rotateSelection(editable, 90))}
              title="Rotate selection 90 degrees"
            >
              <RotateCw />
              90°
            </button>
            <button
              disabled={!editable.length}
              onClick={() =>
                commitObjects(
                  centerOnCanvas(editable, project.width, project.height),
                )
              }
              title="Center selection on canvas"
            >
              <Focus />
              Center
            </button>
            <button
              disabled={editableUnits < 3}
              onClick={() => commitObjects(distribute(editable, "horizontal"))}
              title="Distribute horizontal gaps evenly (3 or more objects or groups)"
            >
              <AlignHorizontalSpaceAround />
              Space H
            </button>
            <button
              disabled={editableUnits < 3}
              onClick={() => commitObjects(distribute(editable, "vertical"))}
              title="Distribute vertical gaps evenly (3 or more objects or groups)"
            >
              <AlignVerticalSpaceAround />
              Space V
            </button>
            <button
              disabled={!editable.length}
              onClick={() => duplicate(true)}
              title="Duplicate in place (Ctrl+Shift+D)"
            >
              <CopyPlus />
              Copy in place
            </button>
          </div>
          <div className="canvas-topline">
            <div>
              <span className="canvas-tag">CANVAS 01</span>
              <span>
                {(project.width / 96).toFixed(0)} ×{" "}
                {(project.height / 96).toFixed(0)} in
              </span>
            </div>
            <span>
              <span className="status-dot" />
              All your ideas welcome
            </span>
          </div>
          <div
            className="canvas-viewport"
            ref={viewport}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void openFile(e.dataTransfer.files[0]);
            }}
          >
            <div
              className="mat-surround"
              style={{
                width: project.width * fit * zoom + 36,
                height: project.height * fit * zoom + 36,
              }}
            >
              <div className="ruler-corner">{unit}</div>
              <div className="ruler horizontal">
                {Array.from(
                  { length: Math.floor(project.width / 96) + 1 },
                  (_, i) => (
                    <span
                      key={i}
                      style={{ left: `${((i * 96) / project.width) * 100}%` }}
                    >
                      {unit === "in" ? i : +(i * 25.4).toFixed(1)}
                    </span>
                  ),
                )}
              </div>
              <div className="ruler vertical">
                {Array.from(
                  { length: Math.floor(project.height / 96) + 1 },
                  (_, i) => (
                    <span
                      key={i}
                      style={{ top: `${((i * 96) / project.height) * 100}%` }}
                    >
                      {unit === "in" ? i : +(i * 25.4).toFixed(1)}
                    </span>
                  ),
                )}
              </div>
              <svg
                className="design-canvas"
                tabIndex={0}
                onContextMenu={canvasContextMenu}
                ref={canvas}
                data-testid="design-canvas"
                role="img"
                aria-label="Design canvas"
                width={project.width * fit * zoom}
                height={project.height * fit * zoom}
                viewBox={`0 0 ${project.width} ${project.height}`}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  const p = point(e);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  if (!e.shiftKey) setSelection([]);
                  setDrag({
                    kind: "marquee",
                    startX: p.x,
                    startY: p.y,
                    dx: 0,
                    dy: 0,
                    ids: e.shiftKey ? selection : [],
                    box: bounds([]),
                    originals: [],
                  });
                }}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
                onPointerCancel={() => setDrag(null)}
              >
                <defs>
                  <pattern
                    id="small-grid"
                    width="24"
                    height="24"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M24 0H0V24"
                      fill="none"
                      stroke="#e9ece4"
                      strokeWidth="1"
                    />
                  </pattern>
                  <pattern
                    id="big-grid"
                    width="96"
                    height="96"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="96" height="96" fill="url(#small-grid)" />
                    <path
                      d="M96 0H0V96"
                      fill="none"
                      stroke="#d8dfd1"
                      strokeWidth="1.4"
                    />
                  </pattern>
                </defs>
                <rect
                  width={project.width}
                  height={project.height}
                  fill={grid ? "url(#big-grid)" : "#ffffff"}
                />
                {displayed
                  .filter((o) => o.visible)
                  .map((o) => (
                    <g
                      key={o.id}
                      data-object-id={o.id}
                      aria-label={o.name}
                      className={`canvas-object ${o.locked ? "locked" : ""}`}
                      onPointerDown={(e) => beginDrag(e, o)}
                    >
                      <Artwork object={o} />
                      <rect
                        x={0}
                        y={0}
                        width={o.width}
                        height={o.height}
                        transform={objectTransform(o)}
                        fill="transparent"
                        pointerEvents={o.locked ? "none" : "all"}
                      />
                    </g>
                  ))}
                <SelectionFrame
                  objects={displayed.filter(
                    (o) =>
                      selection.includes(o.id) &&
                      o.visible &&
                      (!editable.length || !o.locked),
                  )}
                  zoom={fit * zoom}
                  editable={editable.length > 0}
                  onHandle={(e, handle) => beginDrag(e, undefined, handle)}
                />
                {drag?.kind === "marquee" && (
                  <rect
                    x={Math.min(drag.startX, drag.startX + drag.dx)}
                    y={Math.min(drag.startY, drag.startY + drag.dy)}
                    width={Math.abs(drag.dx)}
                    height={Math.abs(drag.dy)}
                    fill="#31715a18"
                    stroke="#31715a"
                    strokeWidth={1 / (fit * zoom)}
                    pointerEvents="none"
                  />
                )}
              </svg>
            </div>
            {!project.objects.length && (
              <div className="empty-canvas">
                <img
                  className="empty-mascot"
                  src="./brand/manti-mascot.png"
                  width="165"
                  height="150"
                  alt="Manti the praying mantis"
                />
                <h2>A fresh space for your next idea.</h2>
                <p>Add a shape, write a few words, or drop an SVG here.</p>
              </div>
            )}
          </div>
          <div className="canvas-footer">
            <div className="toolbar-group">
              <IconButton
                title="Toggle grid"
                active={grid}
                onClick={() => setGrid(!grid)}
              >
                <Grid2X2 />
              </IconButton>
              <button
                className={`snap-button ${snap ? "on" : ""}`}
                onClick={() => setSnap(!snap)}
              >
                <Grip size={15} />
                Snap {snap ? "on" : "off"}
              </button>
            </div>
            <span className="selection-hint">
              {selected.length
                ? `${selected.length} ${selected.length === 1 ? "object" : "objects"} selected · Shift + click to add`
                : "Drag to select · Drop an SVG to import"}
            </span>
            <div className="zoom-controls">
              <IconButton
                title="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}
              >
                <Minus />
              </IconButton>
              <span>{zoomPercent}%</span>
              <IconButton
                title="Zoom in"
                onClick={() => setZoom((z) => Math.min(5, z * 1.2))}
              >
                <Plus />
              </IconButton>
              <IconButton
                title="Fit canvas"
                onClick={() => {
                  setZoom(1);
                  viewport.current?.scrollTo(0, 0);
                }}
              >
                <Maximize />
              </IconButton>
            </div>
          </div>
        </main>
        <aside className="right-panel">
          <div className="inspector-heading">
            <Settings2 size={17} />
            <h3>Design properties</h3>
          </div>
          <div className="inspector">
            {selected.length ? (
              <>
                <div className="selected-title">
                  <span className="object-type-icon">
                    {single?.type === "text" ? (
                      <Type size={18} />
                    ) : (
                      <Shapes size={18} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {single ? single.name : `${selected.length} objects`}
                    </strong>
                    <span>
                      {single?.locked ? "Locked layer" : "Make it your own"}
                    </span>
                  </div>
                </div>
                {single && (
                  <label className="field-label">
                    Layer name
                    <input
                      value={single.name}
                      maxLength={200}
                      disabled={single.locked}
                      onChange={(e) => patch({ name: e.target.value })}
                      aria-label="Layer name"
                    />
                  </label>
                )}
                <div className="field-row">
                  <label className="field-label grow">
                    Operation
                    <select
                      aria-label="Operation"
                      disabled={!editable.length || single?.type === "svg"}
                      value={single?.operation || selected[0].operation}
                      onChange={(e) =>
                        patch({
                          operation: e.target
                            .value as DesignObject["operation"],
                        })
                      }
                    >
                      <option value="cut">Basic cut</option>
                      <option value="draw">Draw</option>
                      <option value="score">Score</option>
                      <option value="guide">Guide only</option>
                    </select>
                  </label>
                  <label className="color-field">
                    Color
                    <input
                      aria-label="Object color"
                      type="color"
                      value={single?.fill || selected[0].fill}
                      disabled={!editable.length || single?.type === "svg"}
                      onChange={(e) => patch({ fill: e.target.value })}
                    />
                  </label>
                </div>
                {single?.type === "svg" && (
                  <p className="field-note">
                    Imported SVG keeps its internal colors as one artwork layer.
                  </p>
                )}
                {single && single.type !== "svg" && (
                  <button
                    className="same-color-button"
                    disabled={single.locked}
                    onClick={() =>
                      setSelection(
                        project.objects
                          .filter(
                            (o) =>
                              o.visible &&
                              !o.locked &&
                              o.type !== "svg" &&
                              o.fill.toLowerCase() ===
                                single.fill.toLowerCase(),
                          )
                          .map((o) => o.id),
                      )
                    }
                  >
                    <Palette size={13} />
                    Select matching color<span>Recolor together</span>
                  </button>
                )}
                <button
                  className={`proportion-toggle ${aspect ? "locked" : "free"}`}
                  aria-label="Lock proportions"
                  aria-pressed={aspect}
                  disabled={!editable.length}
                  onClick={() => setAspect(!aspect)}
                  title={
                    aspect
                      ? "Unlock to stretch width and height independently"
                      : "Lock to preserve width-to-height ratio"
                  }
                >
                  {aspect ? <Lock size={15} /> : <LockOpen size={15} />}
                  <span>
                    {aspect ? "Proportions locked" : "Free resize"}
                    <small>
                      {aspect
                        ? "Unlock to stretch with the handles"
                        : "Drag any handle · Shift keeps proportions"}
                    </small>
                  </span>
                  <span className="toggle-track" />
                </button>
                {single && (
                  <fieldset disabled={single.locked} className="geometry">
                    <div className="section-heading">
                      <h3>Size & position</h3>
                      <span className="tiny-hint">Alt: resize from center</span>
                    </div>
                    <div className="field-row">
                      <NumberField
                        label="Width"
                        suffix={unit}
                        value={single.width / scale}
                        min={1 / scale}
                        onChange={(v) =>
                          patch({
                            width: Math.min(100000, v * scale),
                            ...(aspect
                              ? {
                                  height: Math.min(
                                    100000,
                                    (single.height * v * scale) / single.width,
                                  ),
                                }
                              : {}),
                          })
                        }
                      />
                      <NumberField
                        label="Height"
                        suffix={unit}
                        value={single.height / scale}
                        min={1 / scale}
                        onChange={(v) =>
                          patch({
                            height: Math.min(100000, v * scale),
                            ...(aspect
                              ? {
                                  width: Math.min(
                                    100000,
                                    (single.width * v * scale) / single.height,
                                  ),
                                }
                              : {}),
                          })
                        }
                      />
                    </div>
                    <div className="field-row">
                      <NumberField
                        label="X"
                        suffix={unit}
                        value={single.x / scale}
                        onChange={(v) =>
                          patch({
                            x: Math.max(-100000, Math.min(100000, v * scale)),
                          })
                        }
                      />
                      <NumberField
                        label="Y"
                        suffix={unit}
                        value={single.y / scale}
                        onChange={(v) =>
                          patch({
                            y: Math.max(-100000, Math.min(100000, v * scale)),
                          })
                        }
                      />
                      <NumberField
                        label="Rotate"
                        suffix="°"
                        value={single.rotation}
                        step={1}
                        onChange={(v) => patch({ rotation: v % 360 })}
                      />
                    </div>
                  </fieldset>
                )}
                {single?.type === "text" && (
                  <div className="text-properties">
                    <label className="field-label">
                      Your words
                      <textarea
                        aria-label="Text content"
                        maxLength={1000}
                        value={single.text}
                        disabled={single.locked}
                        onChange={(e) =>
                          patch({ text: e.target.value.replace(/\n/g, " ") })
                        }
                      />
                    </label>
                    <div className="field-row">
                      <select
                        aria-label="Font"
                        value={single.font}
                        disabled={single.locked}
                        onChange={(e) => patch({ font: e.target.value })}
                      >
                        {["Georgia", "Arial", "Verdana", "Courier New"].map(
                          (f) => (
                            <option key={f}>{f}</option>
                          ),
                        )}
                      </select>
                      <button
                        className={`italic-button ${single.italic ? "active" : ""}`}
                        disabled={single.locked}
                        onClick={() => patch({ italic: !single.italic })}
                        aria-label="Italic"
                      >
                        I
                      </button>
                    </div>
                  </div>
                )}
                {selected.length > 1 && (
                  <button
                    className="button secondary wide"
                    disabled={!editable.length}
                    onClick={() =>
                      patch({
                        groupId: selected.some((o) => o.groupId)
                          ? undefined
                          : id(),
                      })
                    }
                  >
                    {selected.some((o) => o.groupId) ? (
                      <Ungroup size={16} />
                    ) : (
                      <Group size={16} />
                    )}
                    {selected.some((o) => o.groupId)
                      ? "Ungroup selection"
                      : "Group selection"}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="selected-title">
                  <span className="object-type-icon">
                    <Palette size={19} />
                  </span>
                  <div>
                    <strong>The possibilities are yours.</strong>
                    <span>Select an object to fine-tune it.</span>
                  </div>
                </div>
                <label className="field-label">
                  Canvas size
                  <select
                    aria-label="Canvas size"
                    value={`${project.width}x${project.height}`}
                    onChange={(e) => {
                      const [width, height] = e.target.value
                        .split("x")
                        .map(Number);
                      commit({ ...project, width, height });
                      setZoom(1);
                    }}
                  >
                    <option value="1152x1152">12 × 12 in · Standard mat</option>
                    <option value="1152x2304">12 × 24 in · Long mat</option>
                    <option value="816x1056">8.5 × 11 in · Letter</option>
                    {!["1152x1152", "1152x2304", "816x1056"].includes(
                      `${project.width}x${project.height}`,
                    ) && (
                      <option value={`${project.width}x${project.height}`}>
                        Custom imported size
                      </option>
                    )}
                  </select>
                </label>
                <div className="palette-label">
                  A palette to get you started
                </div>
                <div className="swatches">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      aria-label={`Add ${color} shape`}
                      title="Add a shape in this color"
                      style={{ background: color }}
                      onClick={() => {
                        const object = {
                          ...createObject("rect", project.objects.length),
                          fill: color,
                        };
                        if (project.objects.length >= 1000)
                          return notify("Object limit reached.");
                        commit({
                          ...project,
                          objects: [...project.objects, object],
                        });
                        setSelection([object.id]);
                      }}
                    />
                  ))}
                </div>
                <p className="field-note">
                  Start with a color. See where it takes you.
                </p>
              </>
            )}
          </div>
          <div className="layers-heading">
            <div>
              <Layers size={17} />
              <h3>Layers</h3>
              <span>{project.objects.length}</span>
            </div>
            <div>
              <IconButton
                title="Move selection backward"
                disabled={!editable.length}
                onClick={() => arrange(-1)}
              >
                <ArrowDown />
              </IconButton>
              <IconButton
                title="Move selection forward"
                disabled={!editable.length}
                onClick={() => arrange(1)}
              >
                <ArrowUp />
              </IconButton>
            </div>
          </div>
          <label className="layer-search">
            <Search size={14} />
            <input
              aria-label="Search layers"
              placeholder="Find a layer…"
              value={layerSearch}
              onChange={(e) => setLayerSearch(e.target.value)}
            />
            {layerSearch && (
              <IconButton
                title="Clear layer search"
                onClick={() => setLayerSearch("")}
              >
                <X />
              </IconButton>
            )}
          </label>
          <div className="layers-list">
            {[...project.objects]
              .reverse()
              .filter((o) =>
                `${o.name} ${o.type} ${o.operation}`
                  .toLowerCase()
                  .includes(layerSearch.toLowerCase()),
              )
              .map((o) => (
                <div
                  className={`layer-row ${selection.includes(o.id) ? "selected" : ""} ${!o.visible ? "hidden-layer" : ""}`}
                  key={o.id}
                  data-layer-id={o.id}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openObjectMenu(
                      o,
                      event.clientX,
                      event.clientY,
                      event.currentTarget.querySelector<HTMLButtonElement>(
                        ".layer-select",
                      )!,
                    );
                  }}
                >
                  <button
                    className="layer-select"
                    aria-label={`Select ${o.name}`}
                    onClick={(e) => choose(o, e.shiftKey)}
                  >
                    <span className="layer-thumb" style={{ color: o.fill }}>
                      {o.type === "text" ? (
                        <Type />
                      ) : o.type === "svg" ? (
                        <Shapes />
                      ) : (
                        shapeIcons[o.type] || <Shapes />
                      )}
                    </span>
                    <span>
                      <strong>{o.name || "Untitled layer"}</strong>
                      <small>
                        {o.groupId ? "Grouped · " : ""}
                        {o.type === "svg"
                          ? "Imported SVG"
                          : o.operation === "cut"
                            ? "Basic cut"
                            : o.operation[0].toUpperCase() +
                              o.operation.slice(1)}
                      </small>
                    </span>
                  </button>
                  <IconButton
                    title={`${o.visible ? "Hide" : "Show"} ${o.name}`}
                    onClick={() =>
                      commit((p) => ({
                        ...p,
                        objects: p.objects.map((s) =>
                          s.id === o.id ? { ...s, visible: !s.visible } : s,
                        ),
                      }))
                    }
                  >
                    {o.visible ? <Eye /> : <EyeOff />}
                  </IconButton>
                  <IconButton
                    title={`${o.locked ? "Unlock" : "Lock"} ${o.name}`}
                    onClick={() =>
                      commit((p) => ({
                        ...p,
                        objects: p.objects.map((s) =>
                          s.id === o.id ? { ...s, locked: !s.locked } : s,
                        ),
                      }))
                    }
                  >
                    {o.locked ? <Lock /> : <LockOpen />}
                  </IconButton>
                </div>
              ))}
            {project.objects.length > 0 &&
              !project.objects.some((o) =>
                `${o.name} ${o.type} ${o.operation}`
                  .toLowerCase()
                  .includes(layerSearch.toLowerCase()),
              ) && (
                <p className="empty-layers">No layers match “{layerSearch}”.</p>
              )}
            {!project.objects.length && (
              <p className="empty-layers">
                Your layers will appear here.
                <br />
                Every good thing starts somewhere.
              </p>
            )}
          </div>
          <div className="layers-footer">
            <span>
              <CheckCheck size={15} />
              {project.objects.length} editable objects
            </span>
            <span>100% yours</span>
          </div>
        </aside>
      </div>
      <footer className="app-status">
        <span>
          <Logo />A space for whatever comes next.
        </span>
        <span>
          Mantis Studio {appVersion} <i />
          Open source <i />
          Windows preview
        </span>
      </footer>
      <input
        ref={file}
        type="file"
        accept=".svg,.hopper,.json"
        hidden
        onChange={(e) => {
          void openFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <IconButton title="Dismiss notification" onClick={() => setToast("")}>
            <X />
          </IconButton>
        </div>
      )}
      {contextMenu && (
        <ObjectContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          title={
            selected.length === 1
              ? selected[0].name || "Untitled layer"
              : `${selected.length} selected layers`
          }
          note={
            !allEditable
              ? "Unlock and show all selected layers to edit."
              : undefined
          }
          actions={contextActions}
          close={closeContextMenu}
        />
      )}
      {dialog && (
        <div className="modal-backdrop" onClick={() => setDialog(null)}>
          <section
            ref={modal}
            className={`modal ${dialog === "prepare" ? "prepare-modal" : dialog === "machine" || dialog === "print" ? "machine-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              dialog === "print"
                ? "Print Then Cut"
                : dialog === "combine"
                  ? "Combine shapes"
                  : dialog === "prepare"
                    ? "Prepare your design"
                    : dialog === "machine"
                      ? "Machine and job setup"
                      : dialog === "repeat"
                        ? "Repeat pattern"
                        : dialog === "new"
                          ? "New project"
                          : "Welcome to Mantis Studio"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              className="close-modal"
              title="Close dialog"
              onClick={() => setDialog(null)}
            >
              <X />
            </IconButton>
            {dialog === "print" && (
              <PrintSetup project={project} selectedIds={selection} />
            )}
            {dialog === "combine" && (
              <>
                <span className="eyebrow">MAKE SOMETHING NEW</span>
                <h2>Combine shapes</h2>
                <p>
                  Combine {selected.length} selected layers into editable paths.
                  Works with visible, unlocked Cut shapes; text and imported SVG
                  need outlining first.
                </p>
                <div className="combine-options">
                  {(
                    ["weld", "subtract", "intersect", "slice"] as CombineMode[]
                  ).map((mode) => (
                    <button
                      className="button secondary"
                      key={mode}
                      onClick={() => combine(mode)}
                    >
                      <strong>{combineLabels[mode]}</strong>
                      <span>
                        {
                          {
                            weld: "Join every shape into one path.",
                            subtract:
                              "Remove upper shapes from the bottom layer.",
                            intersect:
                              "Keep only the area shared by every shape.",
                            slice:
                              "Split two shapes into outside and overlap pieces.",
                          }[mode]
                        }
                      </span>
                    </button>
                  ))}
                </div>
                <p>
                  The bottom layer supplies the color. Undo restores the
                  original layers. Results replace the selection at its highest
                  layer position.
                </p>
                {combineError && (
                  <p role="alert" className="machine-error">
                    {combineError}
                  </p>
                )}
              </>
            )}
            {dialog === "machine" && (
              <MachineSetup
                project={project}
                initialGroup={matIndex}
                setGroup={setMatIndex}
                mirror={mirror}
                setMirror={setMirror}
                back={() => setDialog("prepare")}
              />
            )}
            {dialog === "new" && (
              <>
                <div className="modal-icon">
                  <FilePlus2 />
                </div>
                <span className="eyebrow">A FRESH START</span>
                <h2>Make space for a new idea.</h2>
                <p>
                  Save a project file if you want to keep this design. Your
                  local workspace will become the new project; Undo can bring
                  this canvas back during this session.
                </p>
                <div className="modal-actions">
                  <button className="button secondary" onClick={saveFile}>
                    Save current project
                  </button>
                  <button
                    className="button primary"
                    onClick={() => {
                      commit(blankProject());
                      setSelection([]);
                      setZoom(1);
                      setDialog(null);
                    }}
                  >
                    Start fresh
                    <Plus size={17} />
                  </button>
                </div>
              </>
            )}
            {dialog === "repeat" && (
              <>
                <div className="modal-icon">
                  <Repeat2 />
                </div>
                <span className="eyebrow">MAKE MORE OF A GOOD THING</span>
                <h2>Repeat your pattern.</h2>
                <p>
                  Build a grid from your selection. Each copy stays fully
                  editable.
                </p>
                <div className="field-row">
                  <NumberField
                    label="Rows"
                    value={repeatRows}
                    min={1}
                    step={1}
                    onChange={setRepeatRows}
                  />
                  <NumberField
                    label="Columns"
                    value={repeatCols}
                    min={1}
                    step={1}
                    onChange={setRepeatCols}
                  />
                  <NumberField
                    label="Gap"
                    value={repeatGap}
                    min={0}
                    suffix={unit}
                    onChange={setRepeatGap}
                  />
                </div>
                <div className="repeat-preview">
                  {Array.from({ length: Math.min(6, repeatRows) }, (_, row) => (
                    <div key={row}>
                      {Array.from(
                        { length: Math.min(8, repeatCols) },
                        (_, col) => (
                          <Leaf key={col} />
                        ),
                      )}
                    </div>
                  ))}
                </div>
                <p className="field-note">
                  Copies may extend beyond the canvas. Prepare will flag any
                  overhang.
                </p>
                <button
                  className="button primary wide"
                  onClick={repeatSelection}
                >
                  Create {repeatRows * repeatCols} repeats
                  <ArrowUpRight size={17} />
                </button>
              </>
            )}
            {dialog === "help" && (
              <>
                <div className="help-brand">
                  <Logo />
                  <img
                    src="./brand/manti-mascot.png"
                    width="100"
                    height="125"
                    alt="Manti the praying mantis"
                  />
                </div>
                <span className="eyebrow">YOUR IDEAS, WITHOUT LIMITS.</span>
                <h2>Meet Manti. Make it yours.</h2>
                <p>
                  Mantis Studio is an independent, open-source craft design
                  studio. This Windows editor includes USB/Bluetooth discovery
                  and job drafts for Maker, Explore, Joy and Venture profiles.
                  Direct cutting is still in development.
                </p>
                <div className="help-grid">
                  <div>
                    <MousePointer2 />
                    <strong>Make it yours</strong>
                    <p>
                      Drag any of eight handles to resize. Unlock proportions to
                      stretch freely. Shift keeps proportions; Alt resizes from
                      center. Use the round handle to rotate.
                    </p>
                  </div>
                  <div>
                    <Save />
                    <strong>Keep your work</strong>
                    <p>
                      Your workspace saves locally. Save a .hopper file for a
                      portable, editable copy.
                    </p>
                  </div>
                  <div>
                    <Download />
                    <strong>Take it with you</strong>
                    <p>
                      Export SVG for other design tools. Text is not outlined;
                      imported effects and styles are limited.
                    </p>
                  </div>
                  <div>
                    <Scissors />
                    <strong>Before you cut</strong>
                    <p>
                      Prepare reviews colors and bounds. Direct cutting,
                      automatic nesting, offsets, and text outlines are not
                      implemented yet.
                    </p>
                  </div>
                </div>
                <div className="shortcut-list">
                  <span>
                    Undo <kbd>Ctrl Z</kbd>
                  </span>
                  <span>
                    Duplicate <kbd>Ctrl D</kbd>
                  </span>
                  <span>
                    Save <kbd>Ctrl S</kbd>
                  </span>
                  <span>
                    Select all <kbd>Ctrl A</kbd>
                  </span>
                </div>
              </>
            )}
            {dialog === "prepare" && (
              <>
                <span className="eyebrow">FROM IDEA TO SOMETHING REAL</span>
                <h2>A little prep. A lovely result.</h2>
                <p>
                  Review your artwork by color and operation. Positions stay
                  exactly as designed.
                </p>
                <div className="prepare-layout">
                  <div className="mat-preview">
                    <svg
                      viewBox={`0 0 ${project.width} ${project.height}`}
                      aria-label="Material preview"
                    >
                      <rect
                        width={project.width}
                        height={project.height}
                        fill="#fff"
                      />
                      <g
                        transform={
                          mirror
                            ? `translate(${project.width} 0) scale(-1 1)`
                            : undefined
                        }
                      >
                        {activeMat?.objects.map((o) => (
                          <Artwork object={o} key={o.id} />
                        ))}
                      </g>
                    </svg>
                    <span>
                      {project.width / 96} × {project.height / 96} in ·{" "}
                      {mirror ? "Mirrored" : "Original orientation"}
                    </span>
                  </div>
                  <div className="prepare-controls">
                    <div className="section-heading">
                      <h3>Artwork groups</h3>
                      <span className="pill">{groups.length}</span>
                    </div>
                    <div className="material-list">
                      {groups.map((g, i) => (
                        <button
                          key={g.key}
                          className={activeMat?.key === g.key ? "selected" : ""}
                          onClick={() => setMatIndex(i)}
                        >
                          <span
                            className="material-swatch"
                            style={{ background: g.color }}
                          />
                          <span>
                            <strong>
                              {g.objects[0].type === "svg"
                                ? "Imported artwork"
                                : `${g.operation[0].toUpperCase() + g.operation.slice(1)} · ${i + 1}`}
                            </strong>
                            <small>
                              {g.objects.length}{" "}
                              {g.objects.length === 1 ? "object" : "objects"}
                            </small>
                          </span>
                          <ChevronDown size={15} />
                        </button>
                      ))}
                    </div>
                    {!groups.length && (
                      <p>Add visible artwork to prepare an export.</p>
                    )}
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={mirror}
                        onChange={(e) => setMirror(e.target.checked)}
                      />
                      <span>Mirror for iron-on</span>
                      <Repeat2 size={17} />
                    </label>
                    <div className="prepare-notice">
                      <strong>
                        {outOfBounds.length
                          ? `${outOfBounds.length} objects extend off the canvas`
                          : "Your visible artwork fits the canvas"}
                      </strong>
                      <p>
                        {outOfBounds.length
                          ? "Move or resize these objects before using your export."
                          : "This checks canvas bounds only. Machine margins and material settings still need review."}
                      </p>
                    </div>
                    <button
                      className="button primary wide"
                      disabled={!activeMat}
                      onClick={() => {
                        if (!activeMat) return;
                        download(
                          exportSvg(project, activeMat.objects, mirror),
                          `${filename(project.name)}-group-${matIndex + 1}.svg`,
                          "image/svg+xml",
                        );
                        notify("Artwork group exported.");
                      }}
                    >
                      <Download size={17} />
                      Export this group
                    </button>
                  </div>
                </div>
                <div className="hardware-note">
                  <Scissors size={19} />
                  <div>
                    <strong>
                      Maker · Explore · Joy · Venture — planning profiles
                    </strong>
                    <p>
                      Set up your machine preference and prepare a job draft.
                      Direct cutting is not available yet. SVG export remains
                      available for your current cutting workflow.
                    </p>
                  </div>
                  <button
                    className="button secondary machine-setup-link"
                    onClick={() => setDialog("machine")}
                  >
                    Machine &amp; job setup <ArrowUpRight size={15} />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
