# Hopper identity

The chosen name is **Hopper**, with **Hopper Studio** as a descriptive form. The name comes from grasshopper, a playful insect-family connection to the sound of Cricut/cricket. The user confirmed keeping Hopper on 8 October 2026. Earlier alternative-name exploration is superseded.

The mascot is a friendly grasshopper, also called Hopper: folded leaf-like wings, large springy hind legs, curved antennae and a welcoming front-leg gesture. The vector mark abstracts those features. The lowercase wordmark uses original path lettering and has no installed-font dependency.

## Files

- [Preview board](preview.html) — opens locally; no server required.
- [Primary logo](brand/hopper-logo.svg), [reversed logo](brand/hopper-logo-reversed.svg), [wordmark](brand/hopper-wordmark.svg).
- [Vector mark](brand/hopper-mark.svg), [one-ink-on-ivory mark](brand/hopper-mark-mono.svg).
- [Transparent mascot PNG](brand/hopper-mascot.png), 1536 × 1024.
- [App icon SVG](brand/hopper-icon.svg), [Windows ICO](icon.ico).
- `assets/brand/exports/` — transparent logo/mark PNGs and icon PNGs from 16 to 1024 pixels.
- `assets/brand/source.mjs` — editable vector geometry and custom lettering.
- `assets/brand/archive-v0.2.0/` — previous placeholder identity, preserved.

Run `npm run brand:build` to regenerate vectors, PNG exports and ICO from geometry (uses installed Microsoft Edge through Playwright). The mascot is a separate illustration; the command does not regenerate it. Committed generated files let ordinary app builds work without a browser or image service. Header, favicon and Windows executable/window icon use this kit. The mascot appears in the sidebar, empty canvas and quick tour.

## Palette and use

| Color | Hex | Purpose |
| --- | --- | --- |
| Forest | `#285c48` | Primary ink and icon tile |
| Sage | `#8fbc8f` | Wing and accents |
| Mint | `#dce9d8` | Supporting surfaces |
| Ivory | `#f5f8df` | Light ink and highlights |

Keep proportions fixed, leave breathing room, and use the icon instead of the complete mascot at small sizes. Use the reversed logo on forest/dark backgrounds. The mascot is illustration artwork, not a cut-ready vector. For cutting, SVG mark strokes may need conversion to paths in a vector editor; the logo is a brand asset, not a validated machine toolpath.

## Provenance

The vector mark, lettering, export script and layouts were authored for this repository. The mascot was created with the built-in image generation tool, followed by a transparency refinement. Exact prompts are recorded in [brand prompts](PROMPTS.md). No competitor artwork was used as an input. Assets are included under the repository MIT license to the extent rights can be granted; the illustration's AI-generated origin is recorded here. No trademark or domain availability claim is made.
