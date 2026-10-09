import { describe, expect, it } from 'vitest';
import { blankProject, bounds, createObject, demoProject, materialGroups, validateProject } from './model';
import { exportSvg } from './io';

describe('project data and geometry', () => {
  it('round trips the complete editable starter through JSON', () => {
    const project = demoProject(); expect(validateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  });
  it('rejects invalid dimensions, duplicate IDs and unsupported versions', () => {
    const project = demoProject();
    expect(() => validateProject({ ...project, version: 99 })).toThrow();
    expect(() => validateProject({ ...project, width: Infinity })).toThrow();
    expect(() => validateProject({ ...project, objects: [project.objects[0], project.objects[0]] })).toThrow();
    expect(() => validateProject({ ...project, objects: [{ ...project.objects[0], fill: 'url(https://example.org)' }] })).toThrow();
  });
  it('calculates rotated extents for preflight', () => {
    const object = { ...createObject('rect'), x: 10, y: 20, width: 100, height: 40, rotation: 90 };
    const b = bounds([object]); expect(b.x).toBeCloseTo(40); expect(b.y).toBeCloseTo(-10); expect(b.width).toBeCloseTo(40); expect(b.height).toBeCloseTo(100);
  });
  it('omits hidden and guide objects from export and material planning', () => {
    const a = { ...createObject('heart'), name: 'visible' };
    const p = { ...blankProject(), objects: [a, { ...createObject('star'), name: 'hidden', visible: false }, { ...createObject('leaf'), name: 'guide', operation: 'guide' as const }] };
    expect(materialGroups(p)).toHaveLength(1); const svg = exportSvg(p);
    expect(svg).toContain('data-name="visible"'); expect(svg).not.toContain('data-name="hidden"'); expect(svg).not.toContain('data-name="guide"'); expect(svg).toContain('width="12in"');
  });
  it('preserves physical size, rotation, text escaping and mirrored transforms', () => {
    const t = { ...createObject('text'), text: '<&" hello', rotation: 35 };
    const svg = exportSvg({ ...blankProject(), objects: [t] }, [t], true);
    expect(svg).toContain('&lt;&amp;&quot; hello'); expect(svg).toContain('rotate(35'); expect(svg).toContain('translate(1152 0) scale(-1 1)');
  });
  it('splits operations and imported multicolor artwork into distinct groups', () => {
    const objects = [createObject('rect'), { ...createObject('ellipse'), operation: 'draw' as const }, { ...createObject('svg'), svg: '<svg/>' }];
    expect(materialGroups({ ...blankProject(), objects })).toHaveLength(3);
  });
});
