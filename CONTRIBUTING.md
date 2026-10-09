# Contributing to Mantis Studio

Mantis is a Windows development preview. The source is public so people can help build it; no public application release is available yet. Please read the [capability table](README.md#machine-support-what-works-today) before reporting an unsupported cutting operation as a bug.

## Development

Use Node.js 24 LTS (24.15 or newer within 24.x), Git and Microsoft Edge on Windows:

```powershell
npm ci
npm run desktop:dev
```

Before opening a pull request, run:

```powershell
npm run build
npm test
npm run test:e2e
```

`npm test` includes renderer, native device-manager and offline protocol-reader tests. Browser/Electron tests use temporary profiles. The historical Hopper migration test is skipped when its preserved local executable is unavailable. Windows CI runs the same commands without physical hardware, account credentials or publication steps. A passing CI run is not evidence of machine compatibility.

The optional discovery test needs a Windows Bluetooth radio turned on. It reads USB/Bluetooth metadata but does not send cutter commands:

```powershell
$env:MANTIS_TEST_HARDWARE = '1'
npx playwright test tests/machine.spec.ts --grep 'actual Windows USB'
Remove-Item Env:MANTIS_TEST_HARDWARE
```

Local packaging is available through `npm run package:win` / `npm run dist:win`. Keep these unsigned experimental builds local until the [release gates](docs/RELEASE_READINESS.md) pass. Packaging commands do not publish to GitHub.

## Changes and evidence

Keep geometry/document behavior independent of React and privileged device code separate from the renderer. Favor open formats and local operation. Preserve existing `.hopper` files, workspace recovery and the established desktop profile path. Label planned functionality clearly.

Explain the problem, changed behavior and relevant validation in your pull request. For file/geometry changes, include preservation or round-trip evidence. For machine changes, name the exact model, firmware (or explicitly unknown), transport, software revision and operation actually observed. Distinguish detection, transport connection, command response, accepted job and completed physical motion. Never infer support for another generation from a model name or a successful socket write.

## Independent implementation and hardware research

Read the [implementation policy](docs/INDEPENDENT_IMPLEMENTATION.md). Include sources and license information for imported work. Do not contribute proprietary Cricut implementation, extracted resources, keys, account tokens or firmware. Original contributions must be yours to submit under MIT; dependencies retain their own licenses.

Research scripts under `scripts/` are not a public device-control API and are not bundled in the desktop application. Offline readers cannot send bytes. The isolated startup probe is dry-run by default, sends only one previously observed request when explicitly enabled, and does not establish a safe status or motion protocol. Do not add arbitrary command entry, automatic capture replay or automatic retries of machine commands.

Use your own or explicitly authorized hardware. Physical tests require the appropriate setup, attendance, bounds and a verified stop procedure. The [Explore 3 observation plan](docs/research/EXPLORE3_PROTOCOL.md) explains the next baseline; it is not authorization to move another person's machine.

Keep raw captures, serial fragments, probe logs, workspace backups and generated builds private. They can contain identifiers or unrelated Bluetooth activity. `.gitignore` excludes these artifacts. Only three reviewed product screenshots are currently allowlisted; review new screenshots before adding them. Report sanitized observations, not raw account or device data.

For security problems, follow [SECURITY.md](SECURITY.md). For other reports, use the repository's issue templates and include a small original reproduction where possible.
