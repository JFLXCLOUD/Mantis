# Explore 3 command investigation

Investigated 9 October 2026 UTC on the user's Windows PC. Target: the user's paired Explore 3, stock firmware version not yet known. Bluetooth is the available transport.

## Result so far

The shipped Mantis 0.6.0 app can hold an RFCOMM connection, but cannot yet encode or send an Explore 3 job, status query or motion command. Its live connection initially reported zero command bytes sent and zero unsolicited bytes received. A subsequent **separate research probe** sent one captured startup request and received the same response as Design Space; see the measured result below. This does not enable cutting or motion in the application.

The previous service discovery found standard Serial Port UUID `00001101-0000-1000-8000-00805f9b34fb` and vendor-specific UUID `00000000-deca-fade-deca-deafdecacaff`. Only the standard serial service has been opened by Mantis. The subsequent Design Space trace confirmed use of the same channel 6 Serial Port service.

No guessed G-code, legacy-framed Cricut packets, homing commands, firmware writes or captured-job replays were sent. There is no generic renderer API for writing arbitrary bytes.

## Public leads and their limits

| Primary source | Finding | Consequence for this machine |
| --- | --- | --- |
| [FreeKnife README](https://github.com/OddPig/FreeKnife/blob/main/README.md) | Author reports testing only Explore Air 2, with limited tool support and error handling. | A lead for stock-machine interoperability; not Explore 3 validation. |
| [FreeKnife open letter](https://github.com/OddPig/FreeKnife/blob/main/OPENLETTER.md) | Author describes an extracted-AES-key prerequisite and says the project is GPL licensed. | No code or keys were imported. Its implementation is not a drop-in MIT dependency or a verified Explore 3 command specification. |
| [CutCutGo](https://github.com/virtualabs/cutcutgo) | Replacement-firmware work for the original Maker. | Does not establish commands for this stock Explore 3. |
| [licut communication notes](https://github.com/Fordi/licut/wiki/Cricut-Communication-Specs) | Covers older Cricut hardware, including different Mini behavior. | Legacy command meanings cannot be assumed on Explore 3. |
| [Protocol analysis toolkit README](https://github.com/christianmeurer/cricut-re-toolkit/blob/master/README.md) | Explicitly does not drive cutting or other physical operations. | No tested Explore 3 sender established. Its broad BLE listing is not evidence against the Classic transport observed here. |

This was a bounded search, not proof that no working implementation exists. Only public descriptions/documentation were consulted for these leads; third-party controller source, Design Space implementation files, extracted keys and firmware were not inspected or copied.

## Bluetooth-only observation route

[Microsoft Bluetooth Virtual Sniffer (BTVS)](https://learn.microsoft.com/en-us/windows-hardware/drivers/bluetooth/testing-btp-tools-btvs) provides local HCI traces to Wireshark. It is distributed in the [Microsoft Bluetooth Test Platform](https://www.microsoft.com/en-us/download/details.aspx?id=100872). [Wireshark's capture guide](https://wiki.wireshark.org/CaptureSetup/Bluetooth) also describes Windows ETW capture on supported versions. This can observe this PC's exchange with the cutter; it cannot natively record an exchange between a phone and the cutter.

The initial inventory found no Design Space, Wireshark or BTP installation in their usual locations, no matching uninstall entries, and no relevant tools on PATH. A custom installation elsewhere has not been ruled out. No capture software was installed and no capture session was started during this inventory.

### Local preparation and first observation

The user subsequently installed/opened Design Space and signed in. Microsoft BTP 1.14.0 and portable Wireshark 4.6.9 were downloaded from their official sites, signatures verified, and diagnostic binaries extracted into the ignored local research folder. No capture driver was installed. Download SHA-256 values:

- BTP MSI: `0DF5A3E3AEDE62770333FAB8FD2E044FC3BD6C891226F2087698291E7BAD69CA`
- Wireshark portable package: `71BCFDA9EEFEC8088FAAF0B8E6D026369EA83AE6149CD0B76CCF0B3194240DB0`

The BTVS stream approach did not meet the local-listener check and was stopped. The working approach uses Windows `logman` with the locally enumerated `Microsoft-Windows-BTH-BTHPORT` provider (`8A1F9517-3A8C-4A9E-A018-4F17A200F277`), its `HCIRAW` keyword `0x8000000000000000`, and level 4. Microsoft BTETLParse converts the completed ETL to pcapng; Wireshark reads it offline. This approach opens no network listener. The capture runner is [capture-bluetooth-baseline.ps1](../../scripts/capture-bluetooth-baseline.ps1), requires Windows administrator access, limits the trace to 16 MiB and 10-120 seconds, and stops only its uniquely named ETW session in cleanup. It neither opens a cutter socket nor sends commands. Raw logs may contain unrelated local Bluetooth activity and are not committed.

The first 45-second Mantis transport baseline decoded 147 HCI frames, including 8 SDP and 11 RFCOMM frames. RFCOMM established **channel 6 (Serial Port)**, with transport negotiation and no nonempty channel-6 application payload observed. Mantis reconnected successfully and still reported zero command bytes. The initial runner misreported conversion failure because Windows PowerShell did not retain the subprocess exit handle; standalone conversion returned 0 and produced the same-size readable capture. The runner now retains that handle before waiting.

Mantis was subsequently disconnected explicitly to allow a separate Design Space connect/idle observation. The user was asked to connect only, without loading material, starting a job or updating firmware. No automatic reconnect to Mantis occurs during this observation.

The first Design Space window completed and decoded 22 HCI frames, with no RFCOMM frames. The user reported a successful Design Space connection afterward; the actual connection time relative to that capture is unknown. A separate reconnect capture was requested rather than interpreting the empty application trace as a protocol failure. The local Design Space executable reports version **10.6.104**. Firmware remains unknown. Normal Bluetooth logging settings were rechecked and no sensitive-data or pairing-debug flags were set.

### Captured startup and first direct request

The repeated Design Space capture decoded 795 HCI frames, including 232 RFCOMM frames and 188 serial application fragments. Design Space used **the same channel 6 Serial Port service** as Mantis. Startup traffic included length-prefixed exchanges, followed by 18-byte messages with header `80 10` and an opaque 16-byte body. Periodic host requests were observed roughly three seconds apart. The purpose of the header flag and the session/cryptographic mechanism remain unverified; opaque bytes alone do not establish an encryption algorithm. No proprietary implementation or keys were accessed.

An observed startup request was `00 04 12 00 00 00`, with response `00 08 bf fe ff ff 23 e8 00 00`. [Older command documentation](https://github.com/Fordi/licut/wiki/Cricut-Commands) associates opcode `12` with firmware version, but uses different framing and response semantics. Therefore this is labeled **an unverified startup request**, not a firmware-version decoder or verified read-only API.

The user confirmed Design Space was closed, tools and mat removed, and attendance beside the clear machine before the isolated probe. [probe-explore-command.ps1](../../scripts/probe-explore-command.ps1) defaults to a dry run and requires the explicit `-RunCapturedStartupQuery` switch to send that one fixed six-byte request. It accepts no arbitrary bytes. It sends no padding, reset, authentication sequence, cut job or other opcode; it waits at most five seconds for the expected response shape, closes the socket and never retries automatically.

- The first attempt failed at DataWriter construction **before submitting any bytes**. The socket's Windows Runtime COM proxy needed explicit interface-constructor invocation; an in-memory stream did not reproduce that binding problem.
- After correcting that interop issue, the probe stored exactly **6 bytes** and received **10 bytes identical to Design Space's response**.
- The independent trace confirmed a single outbound application fragment `000412000000` and inbound fragments `0008`, `bffeffff`, `23e80000`. The user confirmed the carriage/rollers stayed still with normal behavior.
- No firmware version, status meaning, coordinate units, job format, tool pressure, motion command or cancel semantics were established. `machineReady` and `canSendJob` remain false. The research probe is not exposed in the shipping UI.
- The offline [frame reader](../../scripts/explore-frame-reader.mjs) records the observed length/flag structure without interpreting payloads. Three tests pass for every split of the observed response, coalesced and byte-at-a-time messages, flagged bodies, truncation and invalid lengths. It has no device connection/write capability.
- All 31 nonempty Design Space response streams also passed the offline reader using byte-at-a-time delivery. The shipping Mantis app was reconnected successfully after the diagnostic, with job sending still disabled.

Local evidence digests: Design Space reconnect capture SHA-256 `A52494AC616D9E53ADC8EF670567FD053636411FF5E154A07353009EF297D2F1`; independent probe capture SHA-256 `3CB94F6B0C6D4297E9072A7310FC6CDA69CA1A7A699622B20C0BE7FF02CCB6B8`. ETW sessions stopped successfully; no research capture session or BTVS listener remained. Raw captures, extracted application fragments and private probe logs remain in the ignored local research directory.

1. Establish Design Space running on this same PC with the user's own sign-in. Do not inspect its source or collect its web/account traffic.
2. Prepare local Bluetooth tracing. Use normal pairing, leave pairing debug mode off, and start without Full Packet Logging. Microsoft notes that Full Packet Logging also collects sensitive data such as encryption keys and HID reports; it is not a default requirement for this plan. If required payloads are missing, assess that specific limitation first.
3. Disconnect Mantis's data link before letting Design Space connect. Record a short connect/idle/disconnect trace before attempting movement. Identify the cutter's connection handle, service/channel, direction and exchange boundaries; exclude other Bluetooth devices from exported analysis.
4. Record the model/firmware and Design Space version shown by the official UI. Do not infer firmware from the Bluetooth name.
5. With the user at the machine, use the fixture below for a separate pen-only run in Design Space. Record loading, start, completion and observed pause behavior with timestamps. This is a Design Space baseline, not a Mantis cut test.
6. Repeat a fresh connection and the same fixture to distinguish stable framing from counters/session data. Captures may remain encrypted at the application layer; HCI visibility alone does not guarantee a usable specification.
7. Write a behavior specification with evidence for identity/status, framing, responses, session state, coordinate units, bounds and stop behavior. Implement Mantis queries first, then a bounded pen operation. A successful socket write is never counted as machine acceptance or completed motion.

Raw captures stay local under the ignored `release/protocol-research/` directory. Review and minimize them before sharing. Record SHA-256 digests and a stage/time log; retain the unmodified originals locally. No automatic replay of captured packets is part of this workflow.

## Offline baseline comparison

The [session summarizer](../../scripts/summarize-explore-capture.mjs) reads a local JSON array of prefiltered serial fragments. Each row has a strictly increasing `frame` number, nondecreasing relative `time` in seconds, `direction` (`0x00` host-to-device or `0x01` device-to-host), and a nonempty even-length hexadecimal `hex` string. Filter to one device and one connection before using it; it cannot identify a device or recover missing packets. No connection or transmission occurs.

```powershell
node scripts/summarize-explore-capture.mjs <local-serial-fragments.private.json>
```

The tool reconstructs each direction independently, accepts the exact observed initial 64-byte `40` host padding, and rejects truncated or malformed streams rather than guessing boundaries. Output includes only counts, lengths, duration, equality counts and frame-completion timing; it excludes payload bytes, identifiers, file paths and additional input fields. Four additional tests cover interleaving, coalescing, padding splits, malformed inputs and payload exclusion. Combined with the frame reader, seven offline tests pass.

The [reviewed reconnect summary](explore3-idle-summary.json) reconstructs **31 host and 31 device frames** from **188 fragments** (32 host, 156 device). Each direction contains 20 unflagged and 11 flagged frames. The observed application span is 29.559283 seconds; startup padding accounts for 64 host bytes. Equal frame counts do not prove request/reply semantics. Repeated opaque frames do not establish encryption or authentication behavior, and timing is measured when a frame completes, not when a command executes.

This is an idle-session baseline for later comparison, not a job encoder. The public summary was generated from the previously recorded private trace; no new hardware commands were sent. Firmware identity, session mechanism, coordinates, job acceptance and stop behavior are still unresolved. The next physical pen baseline is pending compatible pen, mat and scrap paper; see [release readiness](../RELEASE_READINESS.md).

## Test fixture

[pen-square-10mm.svg](../device-tests/explore-3/pen-square-10mm.svg) is an original, single closed 10 mm square centerline. It is artwork, not device instructions. After import into Design Space, explicitly choose **Draw / Pen**, verify width and height are **10 mm**, place it inside the mat with clearance, and use scrap paper and the appropriate pen with the blade removed. Do not accept the import's default Basic Cut operation. If its dimensions or operation differ, correct them before starting.

Motion testing depends on an independently established session/job specification, stop behavior and the user's physical setup and observation. No Mantis motion or cut result is claimed yet.
