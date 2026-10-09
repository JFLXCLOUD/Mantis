# First public application release

The GitHub source is public for development and contributions. **No downloadable application release is approved yet.** Local 0.x builds and historical validation entries are development milestones, not public release announcements. CI must not publish installers, create release tags or attach binaries.

The first device target is **Explore 3 over Bluetooth on Windows**. Other model profiles remain planning metadata until their own evidence exists. The release must identify the exact model, firmware and transport tested; it must not imply all Cricut machines work.

| Gate | Evidence needed | Current state |
| --- | --- | --- |
| Source and provenance | Original implementation/assets, dependency licenses, documented research sources | Documented; source ready for contributors |
| Editor regressions | Build, unit/browser/desktop checks, file preservation and export validation | Automated coverage exists; run against each candidate |
| Discovery and transport | Physical pairing, connection, monitoring, cancellation and cleanup | Explore 3 Bluetooth data link tested |
| Identity and session | Verified firmware/model identification, framing, response meanings and session lifecycle | One startup exchange reproduced; meanings/session mechanism unresolved |
| Known-good pen baseline | Official-app 10 mm pen square, exact settings, timing and captured exchange on authorized hardware | Pending compatible pen, mat and scrap paper |
| Mantis pen job | Bounded original job, verified units/origin/tool state, actual acceptance and measured completed drawing | Not implemented or tested |
| Job stop and failure handling | Verified pause/cancel, no unwanted retry/replay, disconnect/power-loss behavior, bounded timeouts | Machine behavior unknown; transport cancellation alone does not qualify |
| Mantis cut job | Small documented cut with verified tool/material/settings, preflight and measured result | Not implemented or tested |
| Print Then Cut | Clearly scoped preparation features; any native registration claim requires printer/calibration/sensor evidence | PNG/PDF preparation implemented; native registration/cutting pending |
| Windows distribution | Tested installation/launch/upgrade and profile preservation, license notices, checksums and signing decision | Local unsigned packages only; public distribution withheld |

## Next physical session

1. Have a compatible Cricut pen, mat and scrap paper available, with the blade housing removed. Use the [10 mm fixture](device-tests/explore-3/pen-square-10mm.svg).
2. Record firmware and official-app versions from their UI. Disconnect Mantis before connecting Design Space.
3. Import the fixture into Design Space, explicitly select **Draw / Pen**, and verify a 10 mm width and height with clearance on the mat. The SVG's default import operation must not be used without checking it.
4. Follow the bounded local [observation procedure](research/EXPLORE3_PROTOCOL.md), recording completion and observed pause/cancel behavior. Keep raw evidence private. This is a baseline run by Design Space, not proof of Mantis motion support.
5. Compare a fresh session and repeated fixture offline before implementing a machine operation. Document the verified session/job/stop specification first.

Pen, motion and cutting gates cannot be closed by mocks, a successful socket write or matching idle replies. The user currently has no pen/mat/paper available, so work continues on offline analysis and source preparation. No estimated release date is assigned.
