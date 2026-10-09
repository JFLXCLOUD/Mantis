# Public source preparation - 8 October 2026

- Production build passed; generated dependency notices retain license wording with normalized trailing whitespace.
- 44 renderer tests, 19 native device tests and 7 offline research tests passed (70 total).
- 28 browser/Electron scenarios passed. One hardware-discovery scenario is now explicitly opt-in and was skipped; previous physical results are recorded below. The preserved Hopper-profile migration test passed locally and skips on clean CI runners without the historical executable.
- The default Electron check verifies context isolation, sandboxing, no renderer Node access and the exact six-method device bridge without requiring a Bluetooth radio.
- Runtime dependency audit reported zero known vulnerabilities at validation time. This is not a full security audit.
- The offline summarizer reconstructed 31 frames per direction from 188 private idle-session fragments. Its public output excludes payloads and device identifiers; all raw evidence remains ignored.
- Reviewed the three public screenshots and local documentation links. Source staging excludes local builds, raw traces, private JSON, personal project files and hardware screenshots.
- Windows CI is configured for source build/tests only. Public application downloads remain gated on the physical checks in [release readiness](RELEASE_READINESS.md). No machine motion or new probe was requested during source preparation.

## Local validation - 0.6.0 Explore 3 Bluetooth connection

Validated on the user's Windows x64 PC, 8 October 2026 (9 October UTC).

- Physical machine confirmed as Explore 3. Windows Bluetooth radio was on and the target was already paired. No matching USB device was present. The original 0.5.1 app had no connection method; selecting a candidate only inspected metadata.
- Live uncached service discovery succeeded. The standard Serial Port RFCOMM socket opened with the service-advertised protection level. A separate vendor-specific service was not used. No command bytes, tool changes, firmware modifications or machine motion were requested.
- A sustained helper connection passed after correcting Windows PowerShell interop: Console.In.ReadLineAsync can block synchronously, and IInputStream must be invoked through its WinRT interface with an operation-with-progress task conversion. The helper now monitors socket closure and keeps bounded heartbeats; zero command bytes were sent.
- The real Explore 3 passed the source desktop end-to-end test: scan, select, connect, hold across multiple heartbeat intervals, close/reopen the setup dialog, verify sending remains disabled, and explicitly disconnect. The first UI discovery attempt did not yield the candidate within 35 seconds; the next complete run passed. No re-pairing or driver changes were required.
- All 44 renderer unit tests, 19 native unit tests and 29 browser/Electron scenarios passed. New native tests cover paired/model validation, arbitrary-ID rejection, cancellation races, startup/heartbeat expiry, malformed responses, process loss, trusted IPC and window cleanup. Browser checks cover the connection controls, state persistence across dialog changes, cancellation availability and loss reporting.
- The previous 0.5.1 window closed normally. Workspace storage was copied to release/workspace-backups/before-0.6.0 before opening the new version with the user's profile.
- The packaged Windows 0.6.0 app also passed the physical Explore 3 connection test through its bundled helper: discovery, sustained connection, setup dialog reopen, disabled cutting and explicit disconnect. No command bytes were sent.
- The broader packaged smoke passed branding, context-menu duplication/undo, transforms, autosave, Prepare, native USB/Bluetooth discovery and job/report/PNG/PDF downloads. Its first run hit the existing 15-second USB discovery timeout; the complete rerun passed without code or timeout changes.
- The user's existing profile was opened in 0.6.0, set to Explore 3 / Bluetooth, and left connected to the requested device. The saved project string stayed identical. The connection remained active after the test client detached, verified by a separate attachment; command bytes sent remained zero. This local session was launched with loopback-only debugging for verification; normal launches do not enable it.
- Portable build: release/v0.6.0/Mantis-Studio-0.6.0-Windows.exe (113,730,749 bytes). SHA-256: 1359B864CF394F6322AE5E42B60FF7702B665A6ECFEDE8AD091C56A1BF9B1815. The checksum is also in the release folder.
- Physical power-off/recovery, firmware identity, machine command protocol, job framing, motion, cutting and sensor registration remain unverified. The current status means a live data link, not machine readiness.

## Follow-up command research - 9 October 2026 UTC

- The user operated Design Space 10.6.104 over Bluetooth while bounded local Windows HCI traces were collected. The trace confirmed the same RFCOMM channel 6 as Mantis and supplied startup request/response observations.
- With Design Space closed and the user beside the machine with tools/mat removed, the separate research probe sent one fixed six-byte startup request and received ten bytes identical to the observed official-app response. An independent trace confirms the exact application bytes. The user reported no motion or unusual behavior.
- An initial COM DataWriter construction error occurred before any bytes were sent. Explicit interface-constructor invocation resolved it. No transmitted request was automatically retried.
- Three offline framing tests passed, plus validation of all 31 nonempty observed response streams with byte-at-a-time delivery. Research PowerShell scripts passed syntax checks, and the command probe defaults to a zero-I/O dry run.
- Capture sessions stopped and tracing/debug settings remained unchanged. The Mantis app was reconnected afterward. The shipped UI and cut-job restrictions were not changed; no new app release was built for these research-only scripts.
- See [protocol investigation](research/EXPLORE3_PROTOCOL.md) for evidence, script boundaries, provenance and remaining session/job/stop requirements. No Mantis motion, cutting or decoded firmware/status claim is made.

## Previous local validation - 0.5.1 Object context menu

Validated on Windows x64, 8 October 2026.

- Production TypeScript/Vite build and all 44 Vitest / 13 Node checks passed.
- All four new context-menu browser tests passed: unselected-object targeting without movement, duplicate shortcut and atomic undo, multi-selection ordering/grouping, Combine dialog integration, locked canvas targeting/unlocking, mixed-selection protection, hidden-layer recovery, keyboard focus/navigation, viewport bounds and outside/resize dismissal.
- The full browser/Electron run passed 26 of 27 scenarios. The pre-existing combined-path recovery test threw while polling a missing first autosave; its poll now tolerates empty storage until autosave completes, and the corrected scenario passed separately. All 27 scenarios have passing results.
- Reviewed the menu screenshot at 1100 by 740. It stays inside the viewport and matches Mantis styling. Normal drag/resize/rotation/lock tests and real Hopper profile migration passed unchanged.
- The previous 0.5.0 window closed normally. Workspace storage was copied to release/workspace-backups/before-0.5.1 before opening the new build.
- Packaged Windows 0.5.1 passed context-menu duplication/undo, editing, workspace recovery, actual USB/Bluetooth discovery and native job/report/PNG/PDF downloads. One earlier run stopped at an unrelated Bluetooth screenshot capture timeout; the subsequent full packaged run passed without application or test-timeout changes.
- Portable build: release/v0.5.1/Mantis-Studio-0.5.1-Windows.exe (113,726,367 bytes). SHA-256: D82393B4862C680C59B705556E86582A401F94E2F3296B2B57FC4019DF77488C. The checksum is also in the release folder.
- No project schema, device protocol or print-export behavior was changed by this release.

## Previous local validation - 0.5.0 Explore, vector tools and print preparation

Validated on Windows x64, 8 October 2026. No physical cutter or printer was available.

- Production TypeScript/Vite build passed. All 44 Vitest and 13 Node tests passed with one worker.
- All 23 browser/Electron scenarios are covered by passing results: 22 passed in the full run, and all three new feature tests passed after fixing the combined-path reload test to wait for the existing debounced autosave.
- Geometry checks cover boolean areas, subtraction holes, disjoint paths, reflected/rotated/sheared geometry, resizing, validation and non-mutation of source layers. Browser tests cover atomic undo/redo, saved v3 paths and recovery.
- Print export tests decode actual PNG pixels: transparent corners, correct artwork color, expected dimensions and 300 dpi pHYs metadata. PDF export has the expected Letter MediaBox. Oversized proofs are disabled. Original Joy displays its Print Then Cut limitation.
- Original Explore/One/Air have distinct planning profiles and conservative name hints; Explore/One show external Bluetooth adapter requirements. Unknown generations remain unknown. Direct sending stays disabled for all models.
- Real Hopper 0.3.1 profile migration, existing transforms, SVG import, machine preferences, redaction, BLE gating and restricted desktop discovery passed. New saves use project v3; opening old projects does not rewrite their original files.
- Paper.js core avoids the PaperScript evaluator so the existing strict CSP stays intact. Full-library eval was caught in the first browser attempt and removed by switching to the core build. All dependency licenses are included recursively in THIRD_PARTY_NOTICES.txt.
- The 0.4.1 window exited normally. Local storage was copied to release/workspace-backups/before-0.5.0 before the new app is opened.
- Packaged Windows 0.5.0 smoke passed: branding, editor transforms, autosave, Prepare, actual Windows USB/Bluetooth discovery through ASAR, native draft/report downloads, 300 dpi PNG export and PDF proof export. No renderer permission/security exception was added.
- Portable build: release/v0.5.0/Mantis-Studio-0.5.0-Windows.exe (113,726,093 bytes). SHA-256: 9BAA8F3E5F35954F780774CEA8E50A8B492AF14FF7AB8B9CD562311931375732. The checksum is also in the release folder. Executable metadata reports Mantis Studio 0.5.0.
- Remaining physical checks: Design Space PNG sizing/contours, printer Actual-size output, sensor registration, calibration, verified Explore identity/protocol and cutting. The PDF is explicitly a proof without sensor marks.

## Previous local validation — 0.4.1 multi-family planning

Validated on Windows x64, 8 October 2026. No physical cutter was available.

- Production build passed. All 38 Vitest tests passed with one worker after a concurrent run exhausted available worker-start time on this low-memory PC.
- All 13 Node tests passed. New tests cover cross-family name hints, unknown generations and Classic discovery of Explore/Joy Xtra/Venture candidates. A candidate-filter omission for compact JoyXtra/ExploreAir names was corrected before the final run.
- All 20 browser/Electron tests passed, including twelve profile choices, persisted Joy settings, disabled Joy USB, no Classic scan or Windows-pairing action for BLE models, and draft export that never claims machine readiness.
- Maker 3/4 preferences and Hopper project compatibility remain intact. The existing profile migration test passed.
- Model catalog is bundled for both renderer and main process. Profile entries and candidate names do not establish compatibility; no model gained a direct cutting protocol.
- Packaged 0.4.1 smoke passed: all twelve choices, Joy 2 BLE guidance/disabled USB, branding, editor transforms, workspace recovery, actual Windows USB/Classic Bluetooth discovery through ASAR, native draft/report downloads and disabled job sending.
- Portable build completed at release/v0.4.1/Mantis-Studio-0.4.1-Windows.exe; SHA-256 is recorded alongside it. This build used compression level 5 to reduce packaging memory requirements. The Windows alpha remains unsigned.
- The previous app exited normally after a delayed close. Its local storage was backed up to release/workspace-backups/before-0.4.1 before opening 0.4.1 with the existing profile.

Historical screenshots from this check remain local; see the README for reviewed public previews.

## Previous 0.4.0 Mantis Studio identity

Validated on Windows x64, 8 October 2026.

- Production TypeScript/Vite build passed. All 36 Vitest and 11 Node tests passed.
- All 19 browser/Electron tests passed, including the new real-profile transition from the preserved Hopper 0.3.1 executable to Mantis Studio. Workspace JSON and machine preference JSON matched exactly across the transition. Model, material and pass selections remained visible.
- Explicit test profile paths were respected; the public app name reported Mantis Studio. The default profile is explicitly kept at the existing hopper-studio location.
- Original editable SVG lettering and mark were exported successfully. All brand-board images loaded, and logo/mascot/icon appearance was reviewed on the board and in the app.
- Mascot PNG is 1145 by 1374 with real alpha transparency. The Windows ICO contains valid PNG entries at 16, 20, 24, 32, 40, 48, 64, 128 and 256 pixels. Small icons use thicker antennae and a larger silhouette.
- Hopper assets and their source/documentation were archived at assets/brand/archive-hopper-0.3.1. Project format v2, storage keys and machine API identifiers remain stable.
- Packaged 0.4.0 passed the same real Hopper-profile migration check. Native smoke passed branding, editing, undo/redo, autosave, Prepare, USB/Bluetooth discovery from ASAR, and native draft/report downloads. Two earlier USB scan attempts hit the existing 15-second timeout during packaging; direct packaged bridge probes completed in about four seconds and the final full smoke passed. Hardware timeout settings were not loosened or failures hidden by automatic retries.
- Windows executable metadata reports Mantis Studio version 0.4.0.0; its extracted associated icon matches the mantis design.
- The previous Hopper window closed normally. Local storage was copied to release/workspace-backups/before-mantis-0.4.0 before opening Mantis Studio with the existing profile.
- The downloadable brand kit contains SVG/PNG/ICO assets, the transparent mascot, preview board, editable vector source, generation prompts and license.
- Final portable build: release/v0.4.0/Mantis-Studio-0.4.0-Windows.exe; SHA-256 recorded in release/v0.4.0/SHA256SUMS.txt. Mantis Studio was verified visible/responding with the existing application profile. The Windows alpha remains unsigned.

Historical screenshots from this check remain local; see the README for reviewed public previews.

## Previous 0.3.1 Bluetooth setup

Validated on Windows x64, 8 October 2026. The user's Maker 4 was not available.

- Production TypeScript/Vite build passed; dependency audit reported zero known vulnerabilities.
- 36 Vitest tests passed, including preservation of legacy preferences and redaction of Bluetooth device names/identifiers.
- 11 Node tests passed, including separate paired/remembered/link flags, fixed bounded Bluetooth inquiry, cache/coalescing, off/absent/disabled/malformed responses, IPC sender checks and the fixed Windows settings URI.
- All 18 browser/Electron tests passed. New checks cover Bluetooth preference persistence, pairing instructions/shortcut, reports, radio-off/errors, stale USB results after switching transports and the actual Windows Bluetooth scan through the isolated preload.
- The real PC's Bluetooth radio reported **on** and its Classic inquiry completed with no Cricut candidates. This validates host discovery, not Maker pairing or protocol compatibility.
- Desktop and compact layouts were visually reviewed. The machine modal scrolls vertically at small window sizes without horizontal overflow.
- Packaged Windows 0.3.1 smoke passed: branding, editor transforms, undo/redo, autosave/reload, Prepare, actual USB and Bluetooth scans with scripts loaded from ASAR, native job draft and Bluetooth report downloads. Exported files were read back; sending remained disabled.
- The 0.3.0 window closed normally. Its local storage was backed up to `release/workspace-backups/before-0.3.1`, and 0.3.1 opened with the existing app profile and was verified visible/responding. Project format remains v2.
- Portable Windows build completed at `release/v0.3.1/Hopper-0.3.1-Windows.exe`; its SHA-256 is recorded in `release/v0.3.1/SHA256SUMS.txt`. The build remains unsigned.
- The bridge exposes only USB discovery, Bluetooth discovery and the fixed Windows settings shortcut. No direct machine configuration or job-send API exists. Fixtures are confined to tests.
- Bluetooth pairing, machine identity/firmware exchange, configuration, motion and cutting remain untested with physical Maker hardware. Windows settings launch was verified with an injected opener; tests did not change the user's pairing or radio settings.

See [device integration](DEVICE_INTEGRATION.md) for sources, transport boundaries and the remaining direct-cut milestone.

## Previous 0.3.0 machine setup

Validated on Windows x64, 8 October 2026. The user's Maker 4 was not available for connection.

- Production TypeScript/Vite build passed.
- 34 Vitest unit tests passed, including draft geometry/units, mirror, settings validation, hidden/guide filtering, tool conflicts and report redaction.
- 7 Node device-boundary tests passed, including interface grouping, unknown model handling, Windows errors, fixed-command execution, timeouts, request coalescing and IPC sender restrictions.
- 16 browser/Electron checks passed (one obsolete label assertion was updated and rerun). These include saved preferences, mirrored draft exports, desktop-only discovery behavior, test-fixture disconnect/error handling, report redaction, disabled sending and actual Windows USB enumeration through the isolated preload.
- The artwork-group round trip between setup and preview was corrected and its targeted browser test passed after the final change.
- Packaged Windows 0.3.0 smoke passed: branding, transforms, undo/redo, autosave/reload, Prepare, actual Windows USB discovery with the query script inside ASAR, and a native `.hopperjob` download. The draft was read back and verified as not machine-ready. Electron's native download event was used for this check.
- The live Windows scan returned success with zero candidate Cricut devices and no metadata warnings. No physical connection, firmware response, configuration write, job transmission, motion or cutting was tested or claimed.
- Test-only device fixtures are excluded from the packaged application. The only exposed machine API is `scanUsb`; no send/write channel exists.
- Final portable build: `release/v0.3.0/Hopper-0.3.0-Windows.exe`; checksum recorded in `release/v0.3.0/SHA256SUMS.txt`. The Windows build remains unsigned.
- The 0.2.1 window was closed normally. Local storage was backed up to `release/workspace-backups/before-0.3.0`, and the 0.3.0 application was opened with the existing profile and verified visible/responding. Project format remains v2.

See [device integration](DEVICE_INTEGRATION.md) for public research, implementation boundaries and the remaining direct-cut milestone.

## Previous 0.2.1 branding validation

Validated on Windows x64, 8 October 2026.

- Production TypeScript/Vite build passed with the final branding.
- All 13 existing editor/browser/Electron tests passed. After the final CSS corrections, the compact-window and production Electron tests were rerun and passed (2/2).
- Targeted visual checks passed: every brand image decodes, alpha badge and footer icon dimensions, compact-window quick tour, blank canvas mascot, and first-object creation dismissing the empty state. No renderer errors.
- Packaged Windows smoke passed: logo and mascot load from packaged files, quick tour, version 0.2.1, free cursor resize, unchanged height, undo/redo, autosave, reload and Prepare.
- Native ICO structure verified: nine valid PNG entries, 16, 20, 24, 32, 40, 48, 64, 128 and 256 pixels. The executable's associated icon was extracted for inspection.
- The transparent mascot was reviewed on the ivory app background. Vector lettering has no font dependency. Brand board images all load from disk.
- Final portable Windows build completed at `release/v0.2.1/Hopper-0.2.1-Windows.exe`; SHA-256 is recorded in `release/v0.2.1/SHA256SUMS.txt`. It remains unsigned. The final native app is visible and responding with the existing profile.
- The branding ZIP contains SVG/PNG/ICO deliverables, geometry/export source, preview board, exact image generation prompts and license.
- Existing local storage was copied to the ignored release/workspace-backups/before-0.2.1 directory before opening the updated app. Project format remains v2.



## Previous 0.2.0 validation

Validated on Windows x64, 8 October 2026.

- TypeScript and production renderer build passed.
- `npm test`: 29 tests passed, including rotated anchors, independent/locked scaling, reflected/sheared geometry, group stretching, layout operations and v1-to-v2 project migration.
- `npm run test:e2e`: 13 tests passed, including actual cursor resize/rotate, Shift/Alt modifiers, cancellation, undo, file persistence, same-color selection, layer search, SVG stretch and Electron isolation.
- `npm install --package-lock-only --ignore-scripts`: dependency audit reported zero known vulnerabilities at this check.
- `node scripts/verify-package.mjs`: packaged 0.2.0 passed actual free cursor resizing with a fixed height, single-step undo/redo, workspace recovery, and Prepare. The executable reports product version 0.2.0.
- The development watcher excludes release files and screenshots; the compact-window test passed after this change, with packaging active.
- Portable build completed: `release/v0.2.0/Hopper-0.2.0-Windows.exe`; its hash is recorded in `release/v0.2.0/SHA256SUMS.txt`. The build is unsigned.
- The previous app window was closed normally, local storage was copied to the ignored `release/workspace-backups/before-0.2.0` folder, and the updated executable was opened successfully with the existing application profile.



The original 0.1.0 build remains separate. Version 0.2.0 reads the original project format and saves v2 to protect new transforms from older readers.

## Original 0.1.0 validation

Validated on Windows x64, 8 October 2026.

- `npm run build`: TypeScript and production renderer build passed.
- `npm test`: 10 tests passed across geometry/project validation and SVG I/O/security suites.
- `npm run test:e2e`: 6 tests passed (5 editor/browser flows and 1 production Electron startup/isolation check).
- `node scripts/verify-package.mjs`: the packaged `release/win-unpacked/Hopper.exe` launched successfully; object creation, physical sizing, local autosave, reload recovery and Prepare all passed.
- `npm run dist:win`: portable Windows build completed. `release/SHA256SUMS.txt` records the SHA-256 of `Hopper-0.1.0-Windows.exe`.
- Dependency installation/audit reported zero known vulnerabilities after replacing affected build-tool transitive versions with the recorded overrides. This is a point-in-time audit, not a guarantee against future advisories.

Editor checks cover repeat grids, single-step drag undo, redo, locked/hidden layers, SVG scaling and active-content removal, mirrored export, off-canvas detection, editable file reopening, invalid-file preservation, and horizontal fit at a 1100 × 740 browser viewport.

The desktop check confirms `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`, and confirms that `window.require` is absent. Desktop automation uses isolated temporary profiles, not the user's working project profile.

Screenshots:






No physical cutter was connected. No device protocol, machine motion, cutting, print registration, text outlining or automatic nesting was validated. These remain roadmap work. The Windows alpha is unsigned.
