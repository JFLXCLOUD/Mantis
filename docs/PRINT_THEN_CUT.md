# Print Then Cut in Mantis Studio 0.5.0

**Implemented: artwork preparation, transparent PNG export and printable PDF proofs. Native sensor registration and machine cutting are not implemented.**

Open **Your creative toolkit → Print Then Cut**. Choose all visible Cut layers or the current selection, set the artwork width in inches, and choose Letter/A4 with portrait/landscape orientation. Hidden, Draw, Score and Guide layers are excluded. Original project layers stay editable; flattening happens only in the exported image.

- **Export print artwork (PNG):** transparent artwork rasterized at 300 dpi, with physical-resolution metadata. Proportions are preserved. A one-canvas-pixel transparent border avoids clipping antialiased edges. The reported dimensions include that border. Font appearance is baked into the image using installed fonts.
- **Export PDF proof:** centered artwork at the chosen physical size, with a half-inch page margin, proof labels and no sensor marks. Print using Actual size / 100%, without Fit to page. Oversized artwork blocks proof export instead of silently shrinking. This checks size and appearance; it is not a registered Cricut cut sheet.
- PNG limits: 8,192 pixels per side and 24 megapixels to bound memory use. Paper fit does not imply a machine-specific Print Then Cut area.

## Current cutting workflow

1. Upload the exported PNG into Design Space as Print Then Cut artwork.
2. Confirm its width using the dimension shown in Mantis; image-import scaling can differ. Review interior transparent openings and cut contours. Resize there if it exceeds the machine's printable area.
3. Use Design Space to generate sensor marks, bleed and placement and to print the registered sheet. Calibrate with the actual printer and machine, then cut there.

Original Joy cannot perform Print Then Cut; the chooser displays this limitation. Explore Air 2 and earlier should start with white matte materials. Explore generations remain separate hardware-validation targets. Mantis does not yet generate sticker offsets, bleed, independently editable print/cut contours, registration patterns or calibration jobs.

## Native implementation milestones

The user's physical **Explore 3** is confirmed and its Bluetooth data link is verified as of 0.6.0. The machine command protocol is still unimplemented. Native Print Then Cut remains a required feature, not replaced by the handoff:

1. Verify model, firmware and a publicly documented integration route; implement read-only identity/status.
2. Validate bounded pen movement, units, stop/cancel and recovery before blade operations.
3. Separate printable artwork from explicit cut contours; implement offsets/bleed and machine-specific page limits.
4. Implement a verified registration/sensor workflow and printer-to-machine calibration.
5. Test repeated sheets with measured position/scale/rotation error and disconnect recovery. Record hardware, firmware, printer, material and results before enabling native sending.

No physical printer, Explore or registered cut was tested for 0.5.0. Export checks validate files and pixels, not physical accuracy or Design Space import behavior.

## Public references

- [Cricut Print Then Cut workflow](https://help.cricut.com/hc/en-us/articles/360009387274-How-to-Print-Then-Cut-in-Design-Space): artwork flattening, printing, bleed and sensor-mark workflow.
- [Cricut calibration](https://help.cricut.com/hc/en-us/articles/360009424974-Calibrating-your-machine-for-Print-Then-Cut): calibration requires a printer and physical machine.
- [Cricut sensor-mark troubleshooting](https://help.cricut.com/hc/en-us/articles/360009426434-Machine-cannot-read-the-cut-sensor-marks): model-specific material and registration constraints.
- [Cricut sensor-light coverage](https://help.cricut.com/hc/en-us/articles/360009553673-Print-Then-Cut-Sensor-Light-Troubleshooting): Print Then Cut model coverage.

Only public user-facing documentation informed this workflow. No Cricut app code, assets or private protocol data were used.
