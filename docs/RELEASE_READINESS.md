# First public application release

The GitHub source is public for development and contributions. **No downloadable application release is approved yet.** Local 0.x builds and historical validation entries are development milestones, not public release announcements. CI must not publish installers, create release tags or attach binaries.

The first device target is **Explore 3 over Bluetooth on Windows**. Other model profiles remain planning metadata until their own evidence exists. The release must identify the exact model, firmware and transport tested; it must not imply all Cricut machines work.

| Gate | Evidence needed | Current state |
| --- | --- | --- |
| Source and provenance | Original implementation/assets, dependency licenses, documented research sources | Documented; source ready for contributors |
| Editor regressions | Build, unit/browser/desktop checks, file preservation and export validation | Automated coverage exists; run against each candidate |
| Discovery and transport | Physical pairing, connection, monitoring, cancellation and cleanup | Explore 3 Bluetooth data link tested |
| Identity and session | Verified firmware/model identification, framing, response meanings and session lifecycle | One startup exchange reproduced; meanings/session mechanism unresolved |
| Tool-free motion baseline | Official-app Draw attempt with empty clamps, loaded mat, observed movement and captured exchange | Observed on Explore 3: user confirmed carriage movement after Go and Design Space completion; captured on an existing connection |
| Known-good pen baseline | Official-app 10 mm pen square, exact settings, timing and captured exchange on authorized hardware | Pending compatible pen, mat and scrap paper |
| Mantis pen job | Bounded original job, verified units/origin/tool state, actual acceptance and measured completed drawing | Not implemented or tested |
| Job stop and failure handling | Verified pause/cancel, no unwanted retry/replay, disconnect/power-loss behavior, bounded timeouts | Machine behavior unknown; transport cancellation alone does not qualify |
| Mantis cut job | Small documented cut with verified tool/material/settings, preflight and measured result | Not implemented or tested |
| Print Then Cut | Clearly scoped preparation features; any native registration claim requires printer/calibration/sensor evidence | PNG/PDF preparation implemented; native registration/cutting pending |
| Windows distribution | Tested installation/launch/upgrade and profile preservation, license notices, checksums and signing decision | Local unsigned packages only; public distribution withheld |

## Physical observation procedure

1. For an initial motion-only observation, remove both tool housings, close the empty clamps and have an empty compatible mat available. Stay beside the clear machine with the power button reachable. Use the [10 mm fixture](device-tests/explore-3/pen-square-10mm.svg). A later measured drawing test needs a compatible pen and scrap paper, with the blade housing removed.
2. Record firmware and official-app versions from their UI. Disconnect Mantis before connecting Design Space.
3. Import the fixture into Design Space, explicitly select **Draw / Pen**, and verify a 10 mm width and height with clearance on the mat. The SVG's default import operation must not be used without checking it.
4. Follow the bounded local [observation procedure](research/EXPLORE3_PROTOCOL.md), recording loading, actual movement, completion and any observed pause/cancel behavior. Start capture before selecting Make/loading. If Design Space or the machine refuses the empty-tool setup, record the refusal without bypassing checks. Keep raw evidence private. This is a baseline run by Design Space, not proof of Mantis motion support.
5. Compare a fresh session and repeated fixture offline before implementing a machine operation. Document the verified session/job/stop specification first.

Pen, motion and cutting gates cannot be closed by mocks, a successful socket write or matching idle replies. An observed tool-free job can establish visible movement and supply a protocol trace; it cannot verify drawn dimensions, pen contact, cut quality or an untested stop command. A pen is not a prerequisite for the initial motion-only observation. No estimated release date is assigned.

The first tool-free baseline completed on 8 October 2026 (9 October UTC). The first capture covered Load only: rollers moved, but Go had not been pressed. In the second capture the user pressed Go, observed carriage movement and reported Design Space completion. See the [recorded observations](research/EXPLORE3_PROTOCOL.md#observed-tool-free-result). Next, compare a repeat from a fresh connection that includes startup and the same job, establish session/job meanings and test stop behavior before implementing a Mantis sender. No Mantis motion or cut capability has been enabled.
