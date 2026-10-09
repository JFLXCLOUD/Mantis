# Architecture and project format

## Boundaries

- `shared/machines.json`: planning model catalog and USB/Classic/BLE distinctions, consumed by the renderer and native model-name parser. See [machine coverage](MACHINE_SUPPORT.md). These profiles do not supply cut commands or verified hardware capabilities.

The application is now Mantis Studio. The default desktop profile remains `%APPDATA%/hopper-studio`, and legacy document/storage/bridge identifiers remain stable to preserve existing work. An explicit `--user-data-dir` still selects an isolated profile. See [branding](BRANDING.md).

- `src/model.ts`: document types, primitive geometry, original sample, validation, rotated bounds and material grouping.
- `src/vector.ts`: Paper.js core geometry for weld/subtract/intersect/slice. No PaperScript or eval; renderer CSP stays unchanged. Results use the bottom color, replace selected layers at their highest position and undo atomically. Slice emits bottom-only, intersection and top-only regions; disconnected contours may remain in one compound layer. Empty/subpixel results are omitted; completely empty results leave originals intact.
- `src/printing.ts` and `src/PrintSetup.tsx`: DOM-measured artwork bounds, transparent 300 dpi PNGs, physical-size PDF proofs via jsPDF, and explicit handoff guidance. No device commands or fabricated registration marks.
- `src/geometry.ts`: affine resize/rotation/reflection, corners and bounds, group-aware layout operations.
- `src/SelectionFrame.tsx`: eight resize handles and the rotation handle, oriented with a selected object's geometry.
- `src/io.ts`: validated project loading, conservative SVG sanitation/import, SVG generation and file downloads.
- `src/App.tsx`: editor state, history, interaction, panels and preparation preview.
- `src/ObjectContextMenu.tsx`: viewport-clamped portal menu, focus and keyboard navigation, outside dismissal. App actions reuse the editor's history and geometry helpers. Canvas context targeting inverts each object's actual screen transform against its drag hit rectangle, including locked layers; normal drag targeting is unchanged. A right-click inside an existing selection retains it; an unselected grouped layer targets all group members. Editing commands require every selected layer to be visible and unlocked. Visibility and lock toggles remain available for protected layers, matching the layer panel.
- `src/styles.css`: independent Mantis Studio interface.
- `electron/main.cjs`: local desktop host; isolated, sandboxed renderer; permission requests, navigation and popups denied.
- `electron/preload.cjs` and `electron/devices/`: restricted Windows USB/Bluetooth discovery plus an Explore 3 RFCOMM data link. Bridge methods are `hopperMachine.scanUsb()`, `scanBluetooth()`, `openBluetoothSettings()`, `bluetoothStatus()`, `connectBluetooth(deviceId)` and `disconnectBluetooth()`. Trusted-frame IPC invokes fixed bundled OS scripts. The connection manager validates a fresh scan's paired Explore 3 candidate and accepts only a 24-character opaque ID, never an address, COM port, executable or script. A fixed PowerShell helper independently resolves that ID, discovers the advertised standard Serial Port service, and opens a socket. There is no output-stream/write or machine-command API. Startup and heartbeat deadlines close failed helpers; cancellation invalidates late results. Window closure, navigation or renderer failure disconnects. No automatic reconnection or job replay.
- `src/machine.ts` and `src/MachineSetup.tsx`: validated local preferences, independent draft-job JSON with embedded SVG, device discovery UI and preflight. See [device integration](DEVICE_INTEGRATION.md).

All coordinates are in SVG user units at 96 units per inch. Millimeters are a display/input conversion. The file canvas dimensions specify exported physical size. Positive rotation is clockwise in the SVG coordinate system, around each object's center. Layer order is back to front. Hidden objects remain in project files but are omitted from SVG export. Guide objects are omitted from export and preparation.

## `.hopper` v3 (reads v1 and v2)

UTF-8 JSON, readable without Mantis Studio:

```json
{
  "format": "hopper",
  "version": 3,
  "name": "My project",
  "width": 1152,
  "height": 1152,
  "objects": []
}
```

An object has `id`, `name`, `type`, `x`, `y`, `width`, `height`, `rotation`, hex `fill`, `operation`, `visible`, and `locked`. Optional fields include `groupId`, text content/font/italic, sanitized nested SVG, and the v2 `flipX`, `flipY`, and `skewX` transforms. Transform order about the object's center is rotation, horizontal shear, then reflection. The geometry helpers, renderer, hit regions, bounds and SVG exporter share this representation.

Version 1/2 files open with their original geometry and are saved as version 3. Native `path` layers store normalized 100-by-100 SVG path geometry in `pathData`; object dimensions and transforms remain editable. Nonzero winding retains holes. The format bump prevents older readers from silently misrendering new paths. The autosave storage key stays `hopper.project.v1` so an existing workspace is found; the document inside it is versioned independently. Unknown versions are rejected. Using v2 prevents the 0.1.0 reader from silently accepting a reflected/sheared project and displaying it incorrectly. Original project files are never rewritten by opening them. Imports and local recovery pass through the same validation and SVG sanitation.

Groups are editing relationships only. Each member retains its geometry and color. Repeat and duplicate assign new group IDs per copied group. Alignment and equal-gap distribution treat each selected group as one unit. Locked/hidden layers are excluded from cursor transforms and quick layout actions. Mat review retains original positioning and splits native objects by color and operation. Imported SVGs receive separate groups because their internal colors are not decomposed. The imported SVG viewport fills its object's dimensions so unlocked resizing visibly stretches the artwork instead of letterboxing it.

Undo stores snapshots (80 entries). A drag commits one snapshot on pointer release; intermediate frames are previews. Local workspace saving is debounced. Project file export is the durable interchange path. A future implementation should replace snapshot history with compact commands for large projects.

## Known engineering limits

SVG text uses a target text length and Windows system fonts, not glyph outlines. Primitive shapes are intentionally simple. The rectangle tool currently creates rounded rectangles. Conservative SVG import omits resources/effects; it is not a full SVG implementation. Native-shape booleans and print-proof export are implemented; a machine toolpath engine and verified cutting driver are not.

## Appearance and release checks (0.7.0)

`src/preferences.ts` stores appearance and automatic-check preferences separately from artwork under `mantis.preferences.v1`. System appearance is the default and follows live Windows color-scheme changes. Semantic CSS tokens theme interface surfaces, controls and dialogs; SVG artwork, canvas grids, paper and export colors remain unchanged. A failed preference write remains usable for the current session and is reported in Settings. The window appears after its first render to avoid showing an unthemed launch background.

`src/useAppSettings.ts` checks after startup when enabled, then at most once per 24 hours, including across restarts. It checks the schedule hourly while open; failed attempts also respect that daily automatic schedule. The default is enabled and the Settings checkbox persists an opt-out. Manual checks remain available. No project, device identifier, account credential or analytics event is included in the request. GitHub receives a normal unauthenticated HTTPS request and its ordinary connection metadata.

`electron/updates.cjs` queries only the public repository's fixed [latest stable release endpoint](https://docs.github.com/en/rest/releases/releases#get-the-latest-release). It uses numeric version comparison, excludes drafts/prereleases, coalesces concurrent requests and caches responses for 60 seconds. Requests have a ten-second abort deadline, reject redirects and cap response bodies at 1 MiB. A 404 is reported as no public release; rate limits, invalid metadata and network failures are errors, not an up-to-date claim.

The sandboxed preload exposes only `mantisUpdates.check()` and `openReleases()`. Both IPC handlers require the exact trusted top-level renderer. Release links are constructed from the fixed repository path and a validated version tag; neither renderer input nor API-provided URLs are passed to [Electron's external URL handler](https://www.electronjs.org/docs/latest/api/shell#shellopenexternalurl-options). Release bodies are not rendered. The app never downloads or executes an update, silently replaces itself, or restarts a project. This workflow supports the current portable Windows preview; signed installer-based automatic installation is future work.

Browser development previews support appearance settings and a normal GitHub releases link. The actual update checker requires Electron. No GitHub releases or tags are created by this feature.
