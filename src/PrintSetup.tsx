import { useMemo, useState } from "react";
import { Download, Printer, Info } from "lucide-react";
import { type Project } from "./model";
import { download, filename } from "./io";
import { loadPreferences, MODELS, type MachineModel } from "./machine";
import {
  artworkBounds,
  PAPERS,
  printableObjects,
  printArtworkSvg,
  printLayout,
  printProof,
  rasterizeArtwork,
  type PaperSize,
} from "./printing";

export function PrintSetup({
  project,
  selectedIds,
}: {
  project: Project;
  selectedIds: string[];
}) {
  const [scope, setScope] = useState("all");
  const [model, setModel] = useState<MachineModel>(
    () => loadPreferences().model,
  );
  const [paper, setPaper] = useState<PaperSize>("letter");
  const [landscape, setLandscape] = useState(false);
  const objects = useMemo(
    () =>
      printableObjects(
        project.objects,
        scope === "selected" ? selectedIds : undefined,
      ),
    [project, scope, selectedIds],
  );
  const box = useMemo(() => artworkBounds(objects), [objects]);
  const [width, setWidth] = useState(() =>
    Math.min(6, box.width / 96).toFixed(3),
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const layout = printLayout(box, Number(width), paper, landscape);
  const supported = model !== "joy";
  async function save(proof: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const png = await rasterizeArtwork(objects, box, Number(width));
      const blob = proof
        ? await printProof(png, layout, paper, landscape)
        : png;
      download(
        blob,
        `${filename(project.name)}-${proof ? "print-proof.pdf" : "print-artwork.png"}`,
        blob.type,
      );
      setMessage(
        proof
          ? "PDF proof exported. Print at Actual size / 100%, without Fit to page."
          : `Transparent PNG exported at 300 dpi. Set its width to ${layout.width.toFixed(3)} in after importing into Design Space.`,
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="print-setup">
      <span className="eyebrow">COLOR FIRST. CUT NEXT.</span>
      <h2>Print Then Cut</h2>
      <p className="machine-lede">
        Prepare your colored artwork for stickers, labels and paper crafts.
      </p>
      <div className="machine-stage-note">
        <Info size={18} />
        <p>
          <strong>
            Artwork preparation is ready. Registered cutting in Mantis is still
            in development.
          </strong>{" "}
          Export artwork here, then use Design Space to add sensor marks, print
          and cut. The PDF is a size and color proof.
        </p>
      </div>
      <div className="print-columns">
        <section className="machine-card print-controls">
          <label className="field-label">
            Target machine
            <select
              aria-label="Print target machine"
              value={model}
              onChange={(e) => {
                setModel(e.target.value as MachineModel);
                setMessage("");
              }}
            >
              {Object.entries(MODELS).map(([id, name]) => (
                <option value={id} key={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {!supported && (
            <p className="machine-error" role="alert">
              The original Cricut Joy does not support Print Then Cut. Choose a
              compatible machine for the cutting step; you can still export
              artwork or a proof.
            </p>
          )}
          <label className="field-label">
            Artwork
            <select
              aria-label="Print artwork scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setMessage("");
              }}
            >
              <option value="all">All visible Cut layers</option>
              <option value="selected" disabled={!selectedIds.length}>
                Selected visible Cut layers
              </option>
            </select>
          </label>
          <p className="machine-small">
            {objects.length} layers flattened into one transparent image.
            Hidden, Draw, Score and Guide layers are excluded. Your project
            layers stay editable.
          </p>
          <label className="field-label">
            Artwork width (inches)
            <input
              aria-label="Print artwork width"
              type="number"
              min="0.01"
              max="27"
              step="0.01"
              value={width}
              onChange={(e) => {
                setWidth(e.target.value);
                setMessage("");
              }}
            />
          </label>
          <p className="machine-small">
            Height: {layout.exportable ? layout.height.toFixed(3) : "—"} in ·
            Proportions locked
            <br />
            {layout.exportable
              ? `${layout.pixelsWidth} × ${layout.pixelsHeight} pixels · 300 dpi`
              : "Enter a valid size, up to 8,192 pixels per side / 24 megapixels."}
          </p>
          <label className="field-label">
            Proof paper
            <select
              aria-label="Proof paper"
              value={paper}
              onChange={(e) => setPaper(e.target.value as PaperSize)}
            >
              {Object.entries(PAPERS).map(([id, p]) => (
                <option value={id} key={id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="print-check">
            <input
              type="checkbox"
              checked={landscape}
              onChange={(e) => setLandscape(e.target.checked)}
            />{" "}
            Landscape proof
          </label>
          {!layout.fits && objects.length > 0 && (
            <p className="machine-error">
              Artwork does not fit this proof page with ½-inch margins. Reduce
              its width or change paper orientation.
            </p>
          )}
          {!objects.length && (
            <p role="alert" className="machine-error">
              Choose at least one visible Cut layer to print.
            </p>
          )}
        </section>
        <section className="print-preview-column">
          <div
            className="print-paper"
            style={{
              aspectRatio: `${layout.pageWidth} / ${layout.pageHeight}`,
            }}
            aria-label="Print proof preview"
          >
            <span className="print-proof-label">ARTWORK PROOF</span>
            {objects.length > 0 && layout.exportable && (
              <div
                className="print-artwork"
                style={{
                  left: `${(layout.x / layout.pageWidth) * 100}%`,
                  top: `${(layout.y / layout.pageHeight) * 100}%`,
                  width: `${(layout.width / layout.pageWidth) * 100}%`,
                  height: `${(layout.height / layout.pageHeight) * 100}%`,
                }}
                dangerouslySetInnerHTML={{
                  __html: printArtworkSvg(objects, box, 100, 100),
                }}
              />
            )}
            <small>ACTUAL SIZE · NO REGISTRATION MARKS</small>
          </div>
          <p className="machine-small">
            Paper fit is a proof check. Design Space determines your machine’s
            registered printable area.
          </p>
        </section>
      </div>
      <div className="print-actions">
        <button
          className="button primary"
          disabled={busy || !objects.length || !layout.exportable}
          onClick={() => void save(false)}
        >
          <Download size={16} /> Export print artwork (PNG)
        </button>
        <button
          className="button secondary"
          disabled={
            busy || !objects.length || !layout.exportable || !layout.fits
          }
          onClick={() => void save(true)}
        >
          <Printer size={16} /> Export PDF proof
        </button>
      </div>
      <p className="machine-small" role="status" aria-live="polite">
        {busy
          ? "Preparing your artwork…"
          : message ||
            "Exports stay on your computer. No account is needed in Mantis Studio."}
      </p>
      <div className="print-handoff">
        <h3>
          {supported
            ? `Finish on your ${MODELS[model].replace("Cricut ", "")}`
            : "Choose a Print Then Cut machine to finish"}
        </h3>
        <ol>
          <li>
            Export the transparent PNG and upload it as Print Then Cut artwork
            in Design Space.
          </li>
          <li>
            Set the imported width to{" "}
            <strong>
              {layout.exportable
                ? `${layout.width.toFixed(3)} in`
                : "your chosen size"}
            </strong>
            . Review the cut contours and resize there if required.
          </li>
          <li>
            Use Design Space’s print step for sensor marks, bleed and placement.
            Calibrate there with your printer and machine, then cut.
          </li>
        </ol>
        <p>
          For Explore Air 2 and earlier, start with plain white matte material.
          Review transparent openings: they can become interior cut contours.
          Mantis does not yet add bleed, sticker offsets or editable print cut
          contours.
        </p>
      </div>
    </div>
  );
}
