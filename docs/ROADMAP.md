# Mantis Studio roadmap

## Next work, in order

1. **First real device workflow:** use the confirmed Explore 3 and verified Bluetooth data link to establish identity/status and session behavior, then bounded motion/pen jobs, stop/cancel, disconnect recovery and a validated cut job. One observed startup request has been reproduced. Tool-free Draw jobs in Design Space produced user-observed carriage movement and completion, including a fresh-session capture with startup. Authorized local device-component analysis now supports an independently written session codec, verified offline against 676 messages. The next step is a fresh Mantis session/status probe, followed by job/stop validation. Public key provisioning remains unresolved. A pen is needed later for measured drawing validation, not initial motion observation. See the [first-release gates](RELEASE_READINESS.md).
2. **Print Then Cut:** extend the preparation workflow with editable cut contours, sticker offsets and bleed. Native sensor registration and calibration require the verified Explore adapter and physical printer/machine tests. Project/material planning follows with a project library, reusable material notes and mat layout.
3. **Vector editing:** offsets, editable nodes and text outlines. Curved editable text and Weld/union, subtract, intersect and slice for native shapes are implemented. Make exported artwork reliably editable and cuttable in other tools while device work progresses.
4. **Broader Cricut coverage:** independent Maker, Explore, Joy and Venture adapters, including a separate BLE track. Track each model/firmware/transport explicitly; do not equate a dropdown entry with cutting support.
5. **Public application release:** source and contributor workflow live at [JFLXCLOUD/Mantis](https://github.com/JFLXCLOUD/Mantis). Hold downloads until machine validation passes, then finish Windows distribution, signing and updates.

## 0.13.0 - Text studio, top controls and expanded artwork (implemented locally)

Editing controls open above the board; the left sidebar collapses and the right
sidebar focuses on layers. Double-clicking text opens a canvas editor with
multiline typing, cancel and one-step undo. Text, Style and Curve tabs organize
fonts, bold/italic/underline, size, spacing, alignment, case, outline, shadow and
curves. The offline library contains 1,055 designs across Mantis CC0 originals
and MIT-licensed Tabler filled artwork, with collection/category filters and
paged results. Projects save as v5 and read earlier formats.

## 0.12.1 - Mantis file extensions (implemented locally)

New project downloads use `.mantis` and job planning drafts use `.mantisjob`.
The file picker continues to accept legacy `.hopper` projects and JSON files;
existing files need no conversion. Internal format identifiers, schema versions
and workspace storage remain unchanged.

## 0.12.0 - Searchable original shape library (implemented locally)

The Create sidebar opens an offline library of 36 original designs, including
four shamrock/clover options. Search names and aliases or browse Nature,
Animals, Celebrations and Essentials. One click inserts a native editable path
with preserved proportions and undo support. Original library geometries are
dedicated to CC0 for personal and commercial projects. The catalog is generated
from auditable original geometry, not fetched from an unlicensed image search.
See [the library guide](SHAPE_LIBRARY.md).

## 0.11.0 - Organized properties, fonts and board colors (implemented locally)

The inspector offers mutually exclusive Color, Size & position, Effects and Board settings dropdowns. Text editing, font choice, italic and curves are grouped under Effects. Windows font discovery lists installed families through a restricted local IPC method; TTF/OTF/WOFF/WOFF2 imports are validated and stored in a bounded local font library. Fonts load before workspace rendering and used imported fonts are embedded in SVG/print output. Projects reference fonts and require the same local fonts on another computer. Board color is a saved workspace preview with contrasting grid lines; it is excluded from artwork, job drafts and exports.

## 0.10.0 - Object color palette and advanced picker (implemented locally)

Selected objects offer 20 named swatches and an advanced saturation/brightness area, hue/saturation/brightness sliders and exact HEX/RGB entry. Advanced changes preview on canvas until Apply; Cancel or Escape restores the original color. One application is one undo step. Mixed selections recolor editable native layers together, while locked/hidden layers and imported SVG colors remain protected. Existing opaque HEX project storage and export behavior are unchanged.

## 0.9.0 - Curved editable text (implemented locally)

Text layers have Curve up, Straight and Curve down controls plus a signed 180-degree slider with live preview, single-step undo and Escape cancellation. Measured glyph bounds keep selection and resizing aligned with the curve. Curved text remains editable in project v4 and exports as SVG text on a local path, including print artwork/proofs. Earlier project versions migrate without altering artwork. Imported text-path references are restricted to local paths and scoped per placement. Font outlining and machine sending remain pending.

## 0.8.0 - Material planning library (implemented locally)

Prepare now opens a searchable material library with 15 original generic starter profiles, category filters, favorites and up to 200 custom profiles. Custom materials support supplier, weight/thickness, notes, copying, editing and deletion. Selecting a profile adds a snapshot to machine preferences and exported job drafts while preserving tool, passes and mirror. Existing handwritten materials still work. Pressure, speed, machine compatibility and cutting remain unverified; no machine presets or commands are enabled.

## 0.7.0 - Appearance and release notifications (implemented locally)

Light, Dark and Follow Windows modes, saved independently of artwork; a shared Settings dialog; manual GitHub update checks and an automatic daily-check preference; clear no-release, offline, rate-limit, up-to-date and new-release states. Downloads open on the fixed GitHub releases page and remain user-initiated. No automatic installation, machine commands or public application release is introduced.

## 0.6.0 - Explore 3 Bluetooth data link (implemented)

Paired-device validation, uncached service discovery, real RFCOMM socket connection, live monitoring, cancel/disconnect and cleanup on app closure. Physical Explore 3 connection tested without sending command bytes. Cut-job sending, configuration and Print Then Cut sensor registration remain unimplemented.

## 0.5.1 - Object context menu (implemented)

Right-click a canvas object or layer row to duplicate, group/ungroup, combine, repeat, flip, reorder, hide/show, lock/unlock or delete. Existing multi-selections are preserved; unselected groups are targeted together. Mixed locked/hidden selections disable editing actions instead of partially editing the selection. Locked canvas objects can be targeted for unlocking without changing normal pointer-through behavior. Shift+F10 or the keyboard menu key opens object actions; arrows, Home/End, first-letter navigation, Enter, Escape and Tab are supported. Menu placement stays inside the window and closes on outside interaction, scrolling, resize or focus loss.

## 0.5.0 - Explore and print preparation (implemented)

Fifteen profiles including original Explore, Explore One and Explore Air; adapter-specific Bluetooth guidance. Native shape Weld/Subtract/Intersect/Slice with editable compound paths and v3 project files. Print Then Cut preparation exports 300 dpi transparent artwork and physical-size PDF proofs, with Design Space handoff. Direct cutting and native registration are still unavailable.

## 0.4.1 — Multi-family planning catalog (implemented)

Twelve Maker, Explore, Joy and Venture profiles, model-specific transport choices, BLE guidance and conservative discovery name hints. Joy USB is disabled; BLE profiles never run the Classic scanner. Direct cutting remains unavailable for every model. See [device coverage and evidence](MACHINE_SUPPORT.md).

## 0.4 — Mantis Studio identity (implemented)

Approved mantis branding, Manti mascot, editable vector logos, small-size icon variants and Windows identity. Existing Hopper profiles, projects and machine preferences remain compatible. The rebrand does not change machine-control capabilities.

## 0.1 — Break ground (implemented)

Original Windows desktop editor; editable objects and local projects; layers, selection, grouping, alignment and repeats; SVG interchange; artwork preparation preview. See README for supported subsets.

## 0.2 — Predictable editing (implemented)

Eight-handle free/proportional cursor resizing, rotation, reflections, duplicate-in-place, group-aware distribution/alignment, canvas centering, layer search and same-color selection. Original v1 projects open with preserved geometry; new saves use v2 for the additional transforms.

See [user research and priorities](USER_RESEARCH.md) for the public feedback behind this milestone.

## Next — Vector tools worth switching for

- True node editing, pen/Bezier tools, compound paths and non-destructive booleans.
- Extend shipped native-shape booleans to outlined text and decomposed imports; contour selection and reliable offsets.
- Text outlining with appropriately licensed bundled fonts and finer kerning; multiline and curved editable text are implemented.
- More complete SVG import with an explicit unsupported-feature report and editable imported paths.
- Pan, configurable snapping and guides.
- Project library with thumbnails, explicit recent files, recovery snapshots and file-backed autosave.

## 0.3 — Device discovery and job drafts (implemented)

Maker 4 default and Maker 3 target preferences, read-only Windows USB metadata discovery, redacted reports, local setup defaults and one-group draft jobs with embedded SVG. No direct machine connection or job sending. See [device integration](DEVICE_INTEGRATION.md) for evidence and remaining blockers.

## Next — Material planning

Bluetooth setup shipped in 0.3.1: saved transport choice, Windows Classic discovery and pairing/link states, radio diagnostics, Windows pairing shortcut and redacted Bluetooth reports. This does not implement a machine session or cut transport.

- Machine-independent job document separate from artwork.
- Explicit attachment semantics; verified path geometry and draw/score/cut ordering.
- Material profiles, actual machine-safe areas, multiple mats, automatic nesting and repeat counts.
- Required native Print Then Cut: editable cut contours, offsets/bleed, verified sensor registration and physical printer/machine calibration. PNG/PDF artwork preparation shipped in 0.5.0; see [the complete workflow](PRINT_THEN_CUT.md).
- Preflight: open contours, tiny segments, self-intersections, text outlines, material bounds.

## Hardware track — Explore first

Targets now include **Maker, Explore, Joy and Venture** families. The user has confirmed a Cricut Explore 3. Its Bluetooth data link is now verified; machine identity/status and cut commands still require protocol work. Track each model independently. No model supports direct cutting in Mantis Studio yet. Legacy machines are a separate research track; see [device coverage](MACHINE_SUPPORT.md).

1. Establish available public, redistributable protocol specifications and integration routes. Record provenance; identify any access or account requirements.
2. Build an adapter boundary in a separate privileged process. Document discovery, connection lifecycle, capabilities and transport failures.
3. Validate read-only discovery/status on authorized physical hardware for each model.
4. Validate explicit user-started test motion and pen plotting, bounded jobs, pause, cancel and disconnect recovery.
5. Validate cutting with model-specific tools/materials and safe job limits. Record hardware/firmware/Windows versions and reproducible evidence.
6. Mark only verified combinations as supported; retain standard SVG export for unsupported machines.

No assumed cross-model protocol compatibility, no fake device selector, and no simulated connection described as hardware support. Availability of a permissible and workable integration route is still an open research question.

## Release track

Accessible keyboard operation, broader regression coverage, signed Windows builds, installer/updater, reproducible release checksums and third-party notices. The MIT-licensed source is public; automated Windows checks do not publish application builds. Follow the [release-readiness matrix](RELEASE_READINESS.md) before the first public download.
