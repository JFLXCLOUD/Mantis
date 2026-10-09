import { describe, expect, it } from 'vitest';
import { createObject, demoProject, validateProject } from './model';
import { alignSelection, basis, bounds, centerOnCanvas, corners, distribute, flipSelection, localPoint, resizeObject, resizeSelection, rotateSelection, scaleWorld, type Handle } from './geometry';
import { exportSvg, readProject } from './io';

const object = (extra = {}) => ({ ...createObject('rect'), x: 100, y: 100, width: 200, height: 100, ...extra });
describe('cursor transforms', () => {
  it('unlocked corners change width and height independently and preserve the opposite corner', () => {
    const o = object(), next = resizeObject(o, 'se', { x: 80, y: 15 }, false);
    expect(next).toMatchObject({ x: 100, y: 100, width: 280, height: 115 });
  });
  it.each(['n', 's', 'e', 'w'] as Handle[])('edge handle %s changes only its axis', handle => {
    const o = object(), next = resizeObject(o, handle, { x: 30, y: 20 }, false);
    if (handle === 'n' || handle === 's') { expect(next.width).toBe(o.width); expect(next.height).not.toBe(o.height); }
    else { expect(next.height).toBe(o.height); expect(next.width).not.toBe(o.width); }
  });
  it.each(['nw', 'ne', 'se', 'sw'] as Handle[])('locked corner %s preserves aspect ratio', handle => {
    const next = resizeObject(object(), handle, { x: 75, y: 14 }, true);
    expect(next.width / next.height).toBeCloseTo(2, 9);
  });
  it('keeps the opposite point fixed while resizing rotated, sheared artwork', () => {
    const o = object({ rotation: 37, skewX: 12 });
    const anchor = localPoint(o, -100, -50), next = resizeObject(o, 'se', { x: 64, y: 27 }, false);
    const after = localPoint(next, -next.width / 2, -next.height / 2);
    expect(after.x).toBeCloseTo(anchor.x, 9); expect(after.y).toBeCloseTo(anchor.y, 9);
  });
  it('Alt-style resizing holds the center and clamps crossing handles safely', () => {
    const o = object(), next = resizeObject(o, 'e', { x: 50, y: 0 }, false, true);
    expect(next.width).toBe(300); expect(next.x + next.width / 2).toBe(200);
    const crossed = resizeObject(o, 'w', { x: 500, y: 0 }, false);
    expect(crossed.width).toBe(1); expect(crossed.x + crossed.width).toBe(300);
  });
  it('nonuniform group resizing transforms every rotated corner correctly', () => {
    const objects = [object({ rotation: 31 }), object({ x: 420, y: 250, rotation: -57, skewX: 8 })];
    const b = bounds(objects), next = resizeSelection(objects, 'se', { x: b.width * .4, y: b.height * .1 }, false);
    objects.forEach((o, i) => {
      corners(o).forEach((p, n) => {
        const target = corners(next[i])[n];
        expect(target.x).toBeCloseTo(b.x + (p.x - b.x) * 1.4, 7);
        expect(target.y).toBeCloseTo(b.y + (p.y - b.y) * 1.1, 7);
      });
    });
  });
  it('double reflection restores the full transform, including shear', () => {
    const o = object({ rotation: 32, skewX: 19 });
    for (const axis of ['horizontal', 'vertical'] as const) {
      const twice = flipSelection(flipSelection([o], axis), axis)[0];
      const a = basis(o, true), b = basis(twice, true);
      expect(twice.x).toBeCloseTo(o.x); expect(twice.y).toBeCloseTo(o.y);
      for (const key of ['a', 'b', 'c', 'd'] as const) expect(b[key]).toBeCloseTo(a[key], 9);
    }
  });
  it('reflects asymmetric artwork geometry without moving its center', () => {
    const o = object({ rotation: 25 }), anchor = { x: 200, y: 150 };
    const next = scaleWorld(o, -1, 1, anchor), before = basis(o, true), after = basis(next, true);
    expect(after.a * next.width).toBeCloseTo(-before.a * o.width);
    expect(after.b * next.width).toBeCloseTo(before.b * o.width);
    expect(next.x + next.width / 2).toBeCloseTo(200);
  });
  it('rotates multiple objects around their combined center', () => {
    const objects = [object(), object({ x: 450 })], b = bounds(objects), next = rotateSelection(objects, 180);
    expect(next[0].x + next[0].width / 2).toBeCloseTo(b.x + b.width - 100);
    expect(next[0].rotation).toBe(180);
  });
});

describe('layout and project compatibility', () => {
  it('distributes equal edge gaps, with groups treated as one unit', () => {
    const objects = [object({ x: 0, width: 50 }), object({ x: 73, width: 20, groupId: 'g' }), object({ x: 103, width: 20, groupId: 'g' }), object({ x: 450, width: 70 })];
    const next = distribute(objects, 'horizontal');
    expect(next[0].x).toBe(0); expect(next[3].x).toBe(450);
    expect(next[2].x - next[1].x).toBe(30);
    expect(next[1].x - 50).toBeCloseTo(450 - next[2].x - 20);
  });
  it('alignment and centering preserve group offsets', () => {
    const objects = [object({ groupId: 'g' }), object({ x: 150, y: 200, groupId: 'g' }), object({ x: 500 })];
    const aligned = alignSelection(objects, 'right');
    expect(aligned[1].x - aligned[0].x).toBe(50);
    const centered = centerOnCanvas(objects, 1152, 1152), b = bounds(centered);
    expect(b.x + b.width / 2).toBe(576); expect(b.y + b.height / 2).toBe(576);
  });
  it('opens v1 projects with preserved geometry and writes v2 to protect transforms from older readers', () => {
    const old = { ...demoProject(), version: 1 }, next = validateProject(old);
    expect(next.version).toBe(3); expect(next.objects).toEqual(old.objects);
    const o = object({ flipX: true, skewX: 10 });
    const p = { ...demoProject(), objects: [o] };
    expect(readProject(JSON.stringify(p)).objects).toEqual([o]);
    expect(exportSvg(p)).toContain('skewX(10) scale(-1 1)');
  });
  it('rejects malformed new transform fields', () => {
    for (const changes of [{ flipX: 'yes' }, { skewX: Infinity }, { skewX: 90 }]) {
      expect(() => validateProject({ ...demoProject(), objects: [object(changes)] })).toThrow();
    }
  });
});
