import { materialGroups, type Project, type DesignObject } from "./model";
import { bounds } from "./geometry";
export type MatOptions = {
  width: number;
  height: number;
  copies: number;
  layout: "canvas" | "compact";
  margin: number;
  gap: number;
};
export function planMats(project: Project, options: MatOptions) {
  const { width, height, copies, layout, margin, gap } = options;
  if (
    ![width, height].every((n) => Number.isFinite(n) && n >= 96 && n <= 4800) ||
    !Number.isInteger(copies) ||
    copies < 1 ||
    copies > 50 ||
    !Number.isFinite(margin) ||
    margin < 0 ||
    margin > 192 ||
    !Number.isFinite(gap) ||
    gap < 0 ||
    gap > 96
  )
    throw Error("Check mat size, copies, margin and spacing.");
  const source = materialGroups(project);
  if (source.reduce((n, g) => n + g.objects.length, 0) * copies > 1000)
    throw Error("Prepare up to 1,000 objects at once. Reduce the copies.");
  const output: ReturnType<typeof materialGroups> = [];
  for (const group of source) {
    if (layout === "canvas") {
      for (let copy = 0; copy < copies; copy++)
        output.push({
          ...group,
          key: `${group.key}:copy-${copy}`,
          objects: group.objects.map((o) => ({ ...o })),
        });
      continue;
    }
    const units = new Map<string, DesignObject[]>();
    for (let copy = 0; copy < copies; copy++)
      for (const o of group.objects) {
        const key = `${copy}:${o.groupId || o.id}`;
        units.set(key, [
          ...(units.get(key) || []),
          {
            ...o,
            id: `mat-${copy}-${o.id}`,
            groupId: o.groupId ? `mat-${copy}-${o.groupId}` : undefined,
          },
        ]);
      }
    const sorted = [...units.values()]
      .map((objects) => ({ objects, box: bounds(objects) }))
      .sort((a, b) => b.box.height - a.box.height);
    let x = margin,
      y = margin,
      row = 0,
      objects: DesignObject[] = [],
      index = 0;
    const finish = () => {
      if (objects.length)
        output.push({ ...group, key: `${group.key}:mat-${index++}`, objects });
      objects = [];
      x = margin;
      y = margin;
      row = 0;
    };
    for (const unit of sorted) {
      const b = unit.box;
      if (
        b.width > width - 2 * margin + 0.001 ||
        b.height > height - 2 * margin + 0.001
      )
        throw Error(
          `“${unit.objects[0].name}” does not fit this mat with the chosen margin. Resize it or choose a larger mat.`,
        );
      if (x + b.width > width - margin + 0.001) {
        x = margin;
        y += row + gap;
        row = 0;
      }
      if (y + b.height > height - margin + 0.001) finish();
      objects.push(
        ...unit.objects.map((o) => ({
          ...o,
          x: o.x + x - b.x,
          y: o.y + y - b.y,
        })),
      );
      x += b.width + gap;
      row = Math.max(row, b.height);
    }
    finish();
  }
  return output;
}
