# Independent implementation and provenance

## Working rule

Implement Mantis from independently written requirements, public documentation and documented interoperability findings. Do not copy proprietary implementation, bundled assets, icons, templates, fonts, marketing text, or source code into the project. Build an original visual identity and original artwork around familiar, general-purpose design concepts. The later device-analysis exception and its provenance are recorded below.

The first milestone was created from an empty directory. Its source, interface, logo, simple shape paths, and starter composition were written for Hopper. System fonts are referenced, not redistributed. No Cricut binaries, source code, extracted resources, credentials, private API traffic, or device protocol captures were used.

This records an independent implementation approach. It does **not** claim the stronger provenance of a formally separated specification team and implementation team, nor certify legal clearance. A future formal clean-room effort should maintain that separation and review contributions accordingly.

## Public sources consulted for initial workflow requirements

- Cricut Help Center, [Canvas screen — Design Space Guide](https://help.cricut.com/hc/en-us/articles/26751604105879-Canvas-screen-Design-Space-Guide): high-level canvas, layer, operation, and arrangement concepts.
- Cricut Help Center, [How to use Attach](https://help.cricut.com/hc/en-us/articles/360009380514-How-to-use-Attach-in-Design-Space): public description of preserving relative positions. Hopper grouping currently affects editing only; it is not a machine attachment system.
- Cricut Help Center, [How to upload images](https://help.cricut.com/hc/en-us/articles/360009556313-How-to-upload-images-into-Design-Space): public SVG/image workflow reference.
- Cricut Help Center, [Offset feature](https://help.cricut.com/hc/en-us/articles/360061650414-How-to-use-the-Offset-feature-in-Design-Space): a future capability reference. Offset is not implemented in this milestone.
- [Electron security documentation](https://www.electronjs.org/docs/latest/tutorial/security): desktop isolation guidance.
- [Vite getting started](https://vite.dev/guide/): build environment guidance.

Public documentation describes the intended experience, not implementation source. These links are recorded to make that distinction reviewable.

## Future interoperability work

The 0.5.0 vector tools use MIT-licensed [Paper.js core](https://paperjs.org/reference/pathitem/) for independent geometry operations. PDF proofs use MIT-licensed [jsPDF](https://github.com/parallax/jsPDF). Runtime dependency licenses, including transitive dependencies, are bundled in THIRD_PARTY_NOTICES.txt. Print Then Cut requirements and public Cricut sources are recorded in [the print workflow](PRINT_THEN_CUT.md). No Cricut registration marks or machine protocol were inferred from its private implementation.

Keep device research separate from the editor. Record the provenance and redistribution terms of any specification, sample, or library used. Do not accept leaked/proprietary code or resources. Work on user-owned or explicitly authorized hardware; do not bypass accounts or access controls. Do not describe a model as supported until a real test matrix demonstrates the relevant operations and safe stop behavior.

The [9 October 2026 UTC command investigation](research/EXPLORE3_PROTOCOL.md) used local Windows HCI observations of the user's own Explore 3 and user-operated Design Space connection. The user signed into their own account. Independently written diagnostics then tested one observed startup request with the user attending the machine. No Design Space source/binaries were inspected for implementation, no keys were extracted and no authentication was bypassed. Raw captures remain local and excluded from Git. This supplies behavioral evidence for the narrow request/response result, not a complete machine specification or a formally separated clean-room process.

Before making stronger compatibility or clean-room claims, review both the implementation evidence and the wording of the claim. Replacing the design workflow and replacing the machine transport are distinct milestones.

## Authorized local device-implementation analysis

After the fresh-connection capture, the hardware owner authorized local analysis of installed Design Space device components to resolve the command-session mechanism. The subsequent research inspected the native device component and bounded device-session/configuration data, including protocol key material. This work goes beyond the capture-only phase described above. It did not inspect account credentials or cloud traffic, modify Design Space, or publish proprietary implementation, disassembly, extracted configuration, assets or keys.

The independently written experimental codec is informed by that implementation analysis. It must not be represented as capture-only or formally separated clean-room work. The [encoding specification and validation](research/EXPLORE3_SESSION_ENCODING.md) distinguish verified offline results, synthetic public tests, local key dependencies and outstanding physical validation. All implementation-analysis artifacts and actual keys stay in ignored local research storage; the repository contains no key extractor or bundled device keys. Public key provisioning remains an unresolved release requirement.
