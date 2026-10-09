// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { importSvg, readProject, sanitizeSvg, exportSvg } from './io';
import { blankProject } from './model';
describe('untrusted SVG and project input', () => {
  it('removes active content, external resources, styles and resource paints', () => {
    const raw = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><image href="https://example.org/a"/><use href="https://example.org/a"/><path onclick="alert(1)" style="fill:red" fill="url(https://example.org/a)" d="M0 0L10 10"/></svg>';
    const clean = sanitizeSvg(raw); expect(clean).toContain('d="M0 0L10 10"');
    expect(clean).not.toMatch(/script|onclick|foreignObject|<image|<use|style=|example.org/);
  });
  it('imports physical dimensions and preserves aspect ratio and colors', () => {
    const o = importSvg('<svg xmlns="http://www.w3.org/2000/svg" width="2in" height="1in" viewBox="0 0 200 100"><rect width="200" height="100" fill="#ff0000"/></svg>', 'Artwork.svg');
    expect(o.width).toBe(192); expect(o.height).toBe(96); expect(o.svg).toContain('viewBox="0 0 200 100"'); expect(o.svg).toContain('#ff0000');
    const output = exportSvg({ ...blankProject(), objects: [o] }); expect(new DOMParser().parseFromString(output, 'image/svg+xml').querySelector('parsererror')).toBeNull();
  });
  it('sanitizes SVG embedded inside a project, not only standalone uploads', () => {
    const o = importSvg('<svg xmlns="http://www.w3.org/2000/svg"><circle r="30"/></svg>', 'Circle');
    o.svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><circle r="30"/></svg>';
    const project = readProject(JSON.stringify({ ...blankProject(), objects: [o] })); expect(project.objects[0].svg).not.toMatch(/script|onload/);
  });
  it('rejects non-SVG and malformed XML', () => {
    expect(() => importSvg('<html>hello</html>', 'bad.svg')).toThrow(); expect(() => importSvg('<svg><g>', 'bad.svg')).toThrow();
  });
});
