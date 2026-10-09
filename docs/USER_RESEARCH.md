# Editing research and priorities

Research pass: 8 October 2026. Audience: Cricut/craft-cutting users (the initial mention of crochet was a typo).

## What the evidence supports

This is a small qualitative review of public, self-selected user reports, cross-checked against current official documentation. It identifies useful problems to investigate; it does not establish prevalence, prove every reported bug, or describe every user experience. No user accounts, private groups, proprietary source, or non-public protocols were accessed. No people were contacted.

| Theme | Public evidence | Hopper response |
| --- | --- | --- |
| Predictable geometry and undo | An [April 2026 firsthand report](https://www.reddit.com/r/cricut/comments/1sgkxbf/cricut_design_space_is_driving_me_insane/) describes unexpected duplicate placement/color and inconsistent undo. A [November 2025 discussion](https://www.reddit.com/r/cricut/comments/1owocg5/what_happened_to_design_space/) describes dimensions changing during duplication/import. These are reports, not independently reproduced findings. | Prioritize cursor behavior, preserved dimensions/color on duplication, single-step drag undo, saved-project regression tests. |
| Editing controls users can find | [September 2025 feedback](https://www.reddit.com/r/cricut/comments/1n60a44/frustrated_with_new_design_space/) describes difficulty finding Offset after a UI change. [February 2026 feedback](https://www.reddit.com/r/cricut/comments/1rdg41k/why_do_they_keep_breaking_designspace/) objects to moved position/rotation tools. | Keep commonly used transformations visible. Make the proportion lock a labeled state, with a short explanation. |
| More capable vector and text work | [March 2026 complaints](https://www.reddit.com/r/cricut/comments/1rxkb2e/what_are_your_actual_gripes_with_cricutdesign/) include object manipulation, text editing and canvas/production-area confusion. The April report also describes people using separate design applications. | Next major work: node editing, path booleans, reliable offsets, font outlines and letter spacing, richer SVG editing. |
| Reliable offset geometry | A [March 2026 report](https://www.reddit.com/r/cricut/comments/1rsbhy7/offset_problem/) describes unwanted cut marks in a larger offset. | Treat offsets as a geometry feature with contour tests and visual preflight, not merely a decorative stroke. Still planned. |
| Placement confidence | Public complaints include discrepancies between the design canvas and production preparation. | Retain explicit bounds checking; investigate real machine safe areas before claiming cutting compatibility. Automatic nesting and calibrated print/cut remain planned. |

## Distinguish opportunities from existing features

The [official Canvas Guide](https://help.cricut.com/hc/en-us/articles/26751604105879-Canvas-screen-Design-Space-Guide) already documents flipping, rotation, proportion locking, alignment and distribution. These are baseline expectations, not features uniquely missing from Design Space. Hopper's opportunity is dependable behavior, visible controls, portable files and room for deeper editing.

Design Space also has an [offline mode](https://help.cricut.com/hc/en-us/articles/360033894014-Design-Space-Offline-Feature?page=1), with setup and downloaded-content requirements. Do not claim it has no offline capability. [Current release notes](https://help.cricut.com/hc/en-us/articles/27054006457111-Design-Space-Release-Notes) show ongoing fixes; older anecdotes must not be presented as confirmed current defects. Subscription assertions in user discussions sometimes conflict or are corrected by other participants; this research does not use those assertions as facts.

## Delivered in Hopper 0.2.0

- Eight cursor resize handles, with independent width/height when proportions are unlocked.
- Rotated-object anchors and nonuniform group transformation, including the shear needed to preserve rotated member geometry.
- Cursor rotation; Shift snaps to 15 degrees. Shift constrains resizing; Alt resizes around the center.
- Flip horizontally/vertically, quarter-turn rotation and center-on-canvas controls.
- Duplicate-in-place, preserving colors, geometry, operation and independent group identity.
- Equal edge-gap distribution treating selected groups as units; group-aware alignment.
- Layer search and selection of visible, unlocked native layers matching a color for batch recoloring.
- Versioned project migration: read original v1 projects, save v2 so older readers reject unsupported transform data instead of silently losing it.

## Next, in priority order

1. **Vector fundamentals:** editable imported paths, node/Bezier editing, robust union/subtract/intersect and contour controls. These enable practical design fixes without a round trip to a second editor.
2. **Text that cuts reliably:** licensed font loading, text-to-path, spacing/kerning and curved text. Keep live text editable until explicitly outlined.
3. **Offsets and sticker borders:** real geometry with hole handling, joins, preview, and pathological-shape tests. No substitute strokes represented as cut-ready contours.
4. **Material planning:** true attachment semantics, nesting, verified machine margins, saved material profiles and preflight. Test physical workflows before claiming accurate production output.
5. **Project workflow:** file-backed library, thumbnails, recovery snapshots and a history view.

Maker, Maker 3 and Maker 4 remain the requested initial hardware targets. None are implemented or verified as connected devices.
