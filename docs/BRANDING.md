# Mantis Studio identity

The user approved **Mantis Studio** as the app name and **Manti** as the praying mantis mascot on 8 October 2026. This succeeds the Hopper/grasshopper identity. Folded forearms suggest precision cutting; the emblem combines a triangular face with an M-shaped silhouette.

## Deliverables

- [Identity board](../assets/brand/preview.html): local preview, light/dark treatments, mascot, palette and actual icon sizes.
- [Primary logo](../public/brand/mantis-logo.svg), [reversed logo](../public/brand/mantis-logo-reversed.svg), [wordmark](../public/brand/mantis-wordmark.svg).
- [Emblem](../public/brand/mantis-mark.svg), [true monochrome emblem](../public/brand/mantis-mark-mono.svg).
- [Transparent Manti](../public/brand/manti-mascot.png).
- [App icon](../public/brand/mantis-icon.svg), [Windows ICO](../build/icon.ico).
- assets/brand/exports/mantis-*: transparent logo PNGs and icon PNGs from 16 to 1024 pixels.
- [Editable source](../assets/brand/mantis-source.mjs): original vector geometry and path lettering; no font dependency.
- [Approved concept](../assets/brand/concepts/mantis/mantis-concept-board.png) and [generation prompts](../assets/brand/MANTIS-PROMPTS.md).
- assets/brand/archive-hopper-0.3.1/: previous production identity, source, exports, mascot and documentation preserved together. Archived HTML has its historical paths; use the current preview linked above.

Run npm run brand:build to regenerate vectors, PNGs and the nine-size ICO using Microsoft Edge via Playwright. The transparent mascot is a separate generated illustration. Normal application builds use saved assets without contacting an image service.

## Palette and use

| Color | Hex | Purpose |
| --- | --- | --- |
| Forest | #285c48 | Primary mark, lettering, icon tile |
| Sage | #8fbc8f | Mascot and accents |
| Mint | #dce9d8 | Supporting surfaces |
| Ivory | #f5f8df | Reversed mark and highlights |

Use the simplified emblem at small sizes. The 16/20/24/32px exports use thicker antennae and a larger silhouette. Keep the full mascot for illustration placements. Logos are vector paths; the mascot is raster artwork and is not a cut-ready file. Logo strokes may require outlining before cutting. Brand assets are not validated machine toolpaths.

## Compatibility

Version 0.4.0 changes the visible name, executable name, logos and mascot. The default profile remains %APPDATA%/hopper-studio; explicit --user-data-dir profiles remain supported. Existing project/settings storage keys, .hopper project format v2, .hopperjob draft format and internal device bridge identifiers stay stable. Branding does not relocate or rewrite projects. The Windows application ID remains stable for continuity.

## Provenance

The mascot was extracted/refined from the approved concept using the built-in image generation tool. Vector mark and lettering geometry were authored for this repository. Exact prompts are linked above. No competitor artwork was supplied. Original code and assets are included under the repository MIT license to the extent rights can be granted; the raster illustration's AI-generated origin is recorded here. No domain or trademark availability claim is made.
