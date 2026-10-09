# Explore 3 experimental session encoding

## Scope and provenance

On 8 October 2026 local time (9 October UTC), after the complete startup/job capture, the hardware owner authorized local analysis of the installed Design Space device implementation for interoperability. This phase inspected the device component of Design Space 10.6.104 and read bounded device-session/configuration data from that component's process. It did not inspect account credentials or cloud traffic, modify the official application, or write to the machine during offline analysis.

This changes the earlier capture-only research approach. The codec is independently written, but is informed by proprietary implementation analysis; it is **not a formally separated clean-room implementation**. Earlier capture-only findings retain their original provenance. Proprietary implementation files, disassembly, extracted configuration, bootstrap/session keys and raw captures remain in ignored local research storage. None is distributed with Mantis.

The [codec](../../scripts/explore-session-codec.mjs) uses Node's standard crypto implementation. It contains no device keys, key extractor, native application code or hardware I/O. Tests use synthetic keys and messages. A distributable key-provisioning route remains unresolved; local research success does not establish a public, standalone machine-control product.

## Verified encoding behavior

Validation covers two complete Bluetooth sessions from the same Explore 3. It does not establish other models or firmware versions.

| Element | Observed and independently checked behavior |
| --- | --- |
| Outer frame | Two-byte big-endian length; bit `0x8000` marks an encrypted payload; remaining bits give ciphertext bytes |
| Cipher | AES-256, independently encrypted 16-byte blocks (ECB), with no library-added padding |
| Host cleartext | Two-byte big-endian command-payload length, command payload, zero fill, final checksum byte |
| Host allocation | Smallest multiple of 16 that fits the inner length, payload and at least one checksum byte |
| Device cleartext | Two-byte **little-endian** reply-payload length, payload, remaining bytes, final checksum byte; remaining bytes are not consistently zero |
| Checksum | Sum of all preceding cleartext bytes modulo 256; this is not a cryptographic authentication tag |
| Session request | Unflagged `c7` plus 48 fresh bytes, with the first body byte in the observed range 2–13 |
| Session reply | 48 bytes decrypted using a separately provisioned bootstrap key; the first cleartext byte selects the start of a 32-byte session key |

The session reply alone is not authenticated. The research helper restricts its offset to 2–13 and treats the result as a candidate until an encrypted status response passes frame, checksum, length and opcode checks. These checks detect many format/key failures but are not a claim of cryptographic authenticity.

The codec caps encrypted payloads at 512 bytes, rejects truncated/extra bytes and invalid inner lengths, and distinguishes reply byte order from command byte order. It rejects nonzero host padding without imposing that restriction on device replies. It does not label arbitrary decoded commands as safe to send.

## Offline results

The [reviewed validation report](explore3-codec-validation.json) records:

- Earlier startup/idle session: 11 host and 11 device encrypted messages decoded with valid lengths/checksums. All 11 host messages re-encoded byte-for-byte.
- Fresh connection plus tool-free square: 327 host and 327 device encrypted messages decoded with valid lengths/checksums. All 327 host messages re-encoded byte-for-byte.
- Combined: **676 decoded messages**, **338 exact host re-encodes**, two independently established session keys derived from their recorded setup replies.

Matching captured bytes is an offline codec result. It is not a new machine operation, verification of coordinate units, job acceptance, physical stop behavior or completed Mantis motion.

The fresh capture's square packet (`43`) contains seven nine-byte records, consistent with a mode byte and two little-endian float32 coordinates. Its numeric bounds are 0.25–10.25 on both axes, matching the requested 10 mm span. This is evidence for the geometry investigation, not a physical measurement or a verified general job encoder. Begin/end and abort command candidates were identified; their required surrounding configuration, completion and physical stop semantics still need validation.

## Fixed session/status diagnostic

[probe-explore-session.ps1](../../scripts/probe-explore-session.ps1) is a standalone Windows diagnostic, excluded from desktop packaging. Dry-run is the default:

```powershell
powershell -NoProfile -File scripts/probe-explore-session.ps1 -TargetName Explore3-EXAMPLE
```

The explicit `-RunSessionStatusProbe` mode additionally requires `-BootstrapKeyFile` pointing to a local `.private.json` file containing a 32-byte research key as hexadecimal under `key`. No key is supplied by this repository. Do not paste keys into issues, terminal command arguments or public logs.

Before a live diagnostic, close Design Space, disconnect the Mantis app's ordinary Bluetooth link, remove tool housings and attend the idle machine. The probe opens the exact paired Explore 3's advertised Serial Port service. It sends only observed startup padding, the Bluetooth alert, a session reset, a fresh session request and one fixed machine-status query (`60 00 00 00`). The opaque reset reply is checked for framing only; it is not considered proof of acceptance.

Every write is bounded and performed once. Replies have fixed expected sizes and timeouts; failures close the connection without retry. The helper returns no key or raw reply payload in its final report. A successful status reply sets `sessionRoundTripVerified`, while `machineReady` and `canSendJob` remain false. Status flags are not yet a validated job preflight. The diagnostic accepts no arbitrary commands, motion, tool settings, mat loading or cut jobs.

## Remaining work

1. Verify the fresh session/status exchange from Mantis on the physical Explore 3.
2. Establish job/geometry units, origin, bounds, tool state and acceptance/completion responses; document and validate abort behavior.
3. Implement and observe an original bounded tool-free job, followed by measured pen and cut validation.
4. Resolve public key provisioning and the release gates before shipping native job sending.
