import type { PointerEvent } from "react";
import type { DesignObject } from "./model";
import { bounds, corners, handles, localPoint, type Handle } from "./geometry";

export function SelectionFrame({
  objects,
  zoom,
  editable,
  onHandle,
}: {
  objects: DesignObject[];
  zoom: number;
  editable: boolean;
  onHandle: (
    event: PointerEvent<SVGGElement>,
    handle: Handle | "rotate",
  ) => void;
}) {
  if (!objects.length) return null;
  const box = bounds(objects),
    single = objects.length === 1 ? objects[0] : undefined;
  const at = (x: number, y: number) =>
    single
      ? localPoint(single, (x * single.width) / 2, (y * single.height) / 2)
      : {
          x: box.x + ((x + 1) * box.width) / 2,
          y: box.y + ((y + 1) * box.height) / 2,
        };
  const frame = single
    ? corners(single)
    : [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)];
  const top = at(0, -1),
    center = at(0, 0),
    vx = top.x - center.x,
    vy = top.y - center.y,
    length = Math.hypot(vx, vy) || 1;
  const rotate = {
    x: top.x + ((vx / length) * 28) / zoom,
    y: top.y + ((vy / length) * 28) / zoom,
  };
  const size = 9 / zoom;
  return (
    <g className="selection-overlay">
      <polygon
        points={frame.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#31715a"
        strokeWidth={1.2 / zoom}
        strokeDasharray={single ? undefined : `${6 / zoom} ${4 / zoom}`}
        pointerEvents="none"
      />
      {editable && (
        <>
          <line
            x1={top.x}
            y1={top.y}
            x2={rotate.x}
            y2={rotate.y}
            stroke="#31715a"
            strokeWidth={1 / zoom}
            pointerEvents="none"
          />
          <g
            aria-label="Rotate selection"
            data-testid="rotate-handle"
            style={{ cursor: "grab" }}
            onPointerDown={(e) => onHandle(e, "rotate")}
          >
            <circle
              cx={rotate.x}
              cy={rotate.y}
              r={13 / zoom}
              fill="transparent"
            />
            <circle
              cx={rotate.x}
              cy={rotate.y}
              r={5 / zoom}
              fill="#285c48"
              stroke="#fff"
              strokeWidth={1.5 / zoom}
            />
          </g>
          {(Object.entries(handles) as [Handle, [number, number]][]).map(
            ([name, [x, y]]) => {
              const p = at(x, y),
                angle =
                  (Math.atan2(y, x) * 180) / Math.PI + (single?.rotation || 0);
              const cursors = [
                "ew-resize",
                "nwse-resize",
                "ns-resize",
                "nesw-resize",
              ];
              const cursor = cursors[((Math.round(angle / 45) % 4) + 4) % 4];
              return (
                <g
                  key={name}
                  aria-label={`Resize ${name}`}
                  data-testid={`resize-${name}`}
                  style={{ cursor }}
                  onPointerDown={(e) => onHandle(e, name)}
                >
                  <rect
                    x={p.x - 10 / zoom}
                    y={p.y - 10 / zoom}
                    width={20 / zoom}
                    height={20 / zoom}
                    fill="transparent"
                  />
                  <rect
                    x={p.x - size / 2}
                    y={p.y - size / 2}
                    width={size}
                    height={size}
                    rx={1.5 / zoom}
                    fill="#fff"
                    stroke="#31715a"
                    strokeWidth={1.2 / zoom}
                  />
                </g>
              );
            },
          )}
        </>
      )}
    </g>
  );
}
