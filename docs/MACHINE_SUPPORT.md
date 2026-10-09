# Cricut device coverage

Updated 8 October 2026. **No Cricut model can cut directly from Mantis Studio yet.** The catalog distinguishes a selectable planning profile, OS discovery and a future verified machine adapter. None of those stages implies the next one.

## Catalog in 0.6.0

| Family | Planning profiles | Discovery path |
| --- | --- | --- |
| Maker | Original Maker, Maker 3, Maker 4 | USB / Bluetooth Classic |
| Maker | Maker 5 | USB discovery; BLE implementation pending |
| Explore | Original Explore, Explore One | USB / Bluetooth Classic with separate Cricut Wireless Bluetooth Adapter |
| Explore | Explore Air, Explore Air 2, Explore 3, Explore 4 | USB / Bluetooth Classic |
| Explore | Explore 5 | USB discovery; BLE implementation pending |
| Joy | Joy, Joy Xtra | Bluetooth Classic only; no USB |
| Joy | Joy 2 | BLE implementation pending; no USB |
| Venture | Venture | USB / Bluetooth Classic |

All fifteen profiles can save draft preferences and export artwork/job drafts. The discovery paths describe implemented OS enumeration mechanisms, not successful tests on those cutters. The Explore 3 Bluetooth serial transport has now been tested on physical hardware; no other model transport has been validated. Known names are hints only; VID/PID, names, Windows pairing and radio state do not verify model identity or cutting compatibility.

The UI disables USB for Joy models and automatically chooses Bluetooth. BLE profiles do not invoke the Classic scanner or display manual Windows-pairing instructions. BLE-capable USB models can still use the USB discovery view. Existing Maker 3/4 preferences remain intact.

The user has confirmed an Explore 3. Version 0.6.0 can open, monitor and disconnect its advertised Bluetooth Serial Port service. No cutting commands are implemented. Original Explore, Explore One and Explore Air now have planning profiles and discovery name hints. Bluetooth on the original Explore/One requires the separate adapter, as documented in [Cricut Explore setup](https://help.cricut.com/hc/en-us/articles/26296804719511-Cricut-Explore-Air-2-Quick-Start-Guide). [Print Then Cut preparation](PRINT_THEN_CUT.md) is implemented; native registration and cutting remain pending. Personal, Create, Expression, Expression 2, Imagine and Mini require separate feasibility research rather than assumed modern protocol compatibility. Heat presses are outside this cutting-editor track. This is a scope boundary, not a claim that supporting them is impossible.

## Explore 3 transport milestone

Windows pairing was already complete. The earlier app only enumerated devices and never opened a data connection. A live uncached SDP query found a Serial Port service (UUID 00001101-0000-1000-8000-00805f9b34fb); opening that advertised endpoint succeeded. Mantis now offers Connect / Disconnect for paired Explore 3 candidates. Other families remain discovery-only. Firmware identity, device status commands and cut-job framing are unverified. A vendor-specific service was also advertised but was not interpreted or opened; the service and framing used for actual cut jobs are still unknown. A successful Serial Port connection does not resolve that protocol question.

## What must happen before any model is marked supported

1. Obtain an independently documented, redistributable stock-firmware protocol and record its provenance. The current discovery APIs do not provide a cutting protocol.
2. Implement separate discovery, transport, model capabilities and job compilation layers. Add BLE discovery/session handling independently of Bluetooth Classic. No automatic fallback to another model's protocol.
3. Verify identity, firmware, transport framing, acknowledgements, timeouts and disconnect behavior on the actual model.
4. Compile validated paths with explicit units, usable areas, clamp/tool compatibility, material settings and operation order. Do not treat canvas size or a draft tool label as a hardware capability.
5. Test bounded pen work, stop/pause/cancel and disconnect recovery before blade jobs. Never replay an interrupted job automatically.
6. Record model, firmware, Windows version, transport, tools and materials in a reproducible test matrix. Only verified combinations become eligible for sending.

Hardware order: the user's Maker 4 first, then Maker 3/original Maker and Explore models as hardware becomes available, then Joy/Joy Xtra and Venture. Maker 5, Explore 5 and Joy 2 need a BLE track in addition to any applicable USB work. Availability of hardware and protocol evidence can change this order.

## Implementation

`shared/machines.json` is the planning catalog. The renderer uses it for model labels and transport constraints; the main process uses it to reject unknown numbered model hints. `electron/devices/models.cjs` parses conservative friendly-name hints shared by USB and Classic discovery. Generic and unrecognized names stay unknown. Drafts always retain `machineReady: false`, `preflight.sendAllowed: false` and a missing-adapter issue.

Model-specific dimensions, material pressures and advanced tool support are intentionally not asserted by this catalog. Those belong in a sourced, tested capability definition for each future adapter.

## Primary sources

- [Cricut's current cutting-machine families](https://help.cricut.com/hc/en-us/categories/26803523885335-Cutting-Machines): model names and families.
- [Bluetooth and USB connection help](https://help.cricut.com/hc/en-us/articles/6581830148759-Bluetooth-and-USB-Connection-Help): model-dependent pairing, BLE guidance, Joy USB exclusion and older-model PIN guidance.
- [Maker 5 specifications](https://help.cricut.com/hc/en-us/articles/42865107739287-Cricut-Maker-5-specifications-and-requirements): BLE and USB-C.
- [Explore 5 quick start](https://help.cricut.com/hc/en-us/articles/36546544830615-Cricut-Explore-5-Quick-Start-Guide): BLE connection without system pairing and USB-C.
- [Joy 2 quick start](https://help.cricut.com/hc/en-us/articles/36545520180887-Cricut-Joy-2-Quick-Start-Guide): BLE without system pairing; original Joy does not score.
- [Joy Xtra quick start](https://help.cricut.com/hc/en-us/articles/26308155935895-Cricut-Joy-Xtra-Quick-Start-Guide): Bluetooth pairing workflow.
- [Venture quick start](https://help.cricut.com/hc/en-us/articles/15863937671319-Cricut-Venture-Quick-Start-Guide): USB and Bluetooth setup.

These are public product/setup references, not machine command specifications. No proprietary software, firmware or private service was used to implement the catalog.
