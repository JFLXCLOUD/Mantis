import { useState } from "react";
import { Usb, Download, FileCheck2, Info, ArrowLeft } from "lucide-react";
import { DeviceDiscovery } from "./DeviceDiscovery";
import { useBluetoothConnection } from "./useBluetoothConnection";
import { materialGroups, type Project } from "./model";
import { download, exportSvg, filename } from "./io";
import {
  loadPreferences,
  makeJobDraft,
  MACHINE_SETTINGS_KEY,
  MODELS,
  MACHINE_PROFILES,
  toolNames,
  type JobPreferences,
} from "./machine";

export function MachineSetup({
  project,
  initialGroup,
  setGroup,
  mirror,
  setMirror,
  back,
}: {
  project: Project;
  initialGroup: number;
  setGroup(value: number): void;
  mirror: boolean;
  setMirror(value: boolean): void;
  back(): void;
}) {
  const [preferences, setPreferences] = useState(loadPreferences);
  const {
    connection,
    error: connectionError,
    connect,
    disconnect,
  } = useBluetoothConnection();
  const groups = materialGroups(project);
  const [groupIndex, setGroupIndex] = useState(
    Math.min(initialGroup, Math.max(0, groups.length - 1)),
  );
  const [saved, setSaved] = useState("Preferences stay on this device.");
  const [exported, setExported] = useState("");
  function change(patch: Partial<JobPreferences>) {
    const next = { ...preferences, ...patch };
    if (!MACHINE_PROFILES[next.model].usb) next.transport = "bluetooth";
    setPreferences(next);
    setExported("");
    try {
      localStorage.setItem(MACHINE_SETTINGS_KEY, JSON.stringify(next));
      setSaved("Preferences saved on this device.");
    } catch {
      setSaved(
        "Preferences could not be saved. Export a draft to keep this setup.",
      );
    }
  }
  const active = groups[groupIndex];
  const draft = active
    ? makeJobDraft(project, preferences, groupIndex, mirror)
    : null;
  return (
    <div className="machine-setup">
      <span className="eyebrow">FROM YOUR CANVAS TO YOUR MACHINE</span>
      <h2>Machine &amp; job setup</h2>
      <p className="machine-lede">
        Find your cutter and save the setup for your next project.
      </p>
      <div className="machine-stage-note">
        <Info size={18} />
        <p>
          <strong>
            Explore 3 can open a Bluetooth data link. Direct cutting is still in
            development.
          </strong>{" "}
          Pairing, a data connection, and a machine ready to cut are separate
          steps. Mantis can hold the Explore 3 Bluetooth link, but cannot yet
          query firmware, configure tools or send cuts.
        </p>
      </div>
      {connection && connection.status !== "disconnected" && (
        <div
          className={`machine-link ${connection.status}`}
          data-testid="bluetooth-connection"
        >
          <div role="status" aria-live="polite">
            <strong>
              {connection.status === "connected"
                ? "Bluetooth data link connected"
                : connection.status === "connecting"
                  ? "Connecting Bluetooth data link…"
                  : "Bluetooth connection interrupted"}
            </strong>
            <p>{connection.name || "Selected Explore 3"}</p>
            <p>{connection.message}</p>
            {connection.status === "connected" && (
              <small>
                RFCOMM serial service · 0 command bytes sent · Cutting
                unavailable
              </small>
            )}
            {connection.errorCode && (
              <small>Windows code: {connection.errorCode}</small>
            )}
          </div>
          {(connection.status === "connected" ||
            connection.status === "connecting") && (
            <button className="button secondary" onClick={disconnect}>
              {connection.status === "connecting"
                ? "Cancel connection"
                : "Disconnect Bluetooth"}
            </button>
          )}
        </div>
      )}
      {connectionError && (
        <p role="alert" className="machine-error">
          {connectionError}
        </p>
      )}
      <div className="machine-columns">
        <section className="machine-card">
          <div className="machine-card-heading">
            <h3>
              <Usb size={17} /> Your machine
            </h3>
            <span className="machine-pill">
              {preferences.transport === "usb" ? "USB" : "BLUETOOTH"}
            </span>
          </div>
          <label className="field-label">
            Target model
            <select
              aria-label="Target machine"
              value={preferences.model}
              onChange={(e) =>
                change({ model: e.target.value as JobPreferences["model"] })
              }
            >
              {["Maker", "Explore", "Joy", "Venture"].map((family) => (
                <optgroup key={family} label={family}>
                  {Object.entries(MACHINE_PROFILES)
                    .filter(([, p]) => p.family === family)
                    .map(([key, p]) => (
                      <option value={key} key={key}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="machine-small">
            This saves your model preference; it does not establish a machine
            connection.
          </p>
          <p className="machine-small">
            <strong>Planning profile · cutting not yet available</strong>
            <br />
            {MACHINE_PROFILES[preferences.model].usb ? "USB or " : ""}
            {MACHINE_PROFILES[preferences.model].bluetooth === "ble"
              ? "Bluetooth Low Energy (BLE)"
              : "Bluetooth Classic"}
            {!MACHINE_PROFILES[preferences.model].usb &&
              " only — no USB connection"}
            {"bluetoothAdapter" in MACHINE_PROFILES[preferences.model] &&
              " (separate Cricut Wireless Bluetooth Adapter required)"}
          </p>
          <div
            className="machine-transport"
            role="group"
            aria-label="Connection method"
          >
            <button
              disabled={!MACHINE_PROFILES[preferences.model].usb}
              aria-pressed={preferences.transport === "usb"}
              onClick={() => change({ transport: "usb" })}
            >
              USB
            </button>
            <button
              aria-pressed={preferences.transport === "bluetooth"}
              onClick={() => change({ transport: "bluetooth" })}
            >
              Bluetooth
            </button>
          </div>
          <DeviceDiscovery
            key={`${preferences.transport}-${MACHINE_PROFILES[preferences.model].bluetooth}`}
            transport={preferences.transport}
            model={preferences.model}
            connection={connection}
            connect={connect}
          />
        </section>
        <section className="machine-card">
          <div className="machine-card-heading">
            <h3>
              <FileCheck2 size={17} /> Job draft
            </h3>
            <span className="machine-pill">LOCAL</span>
          </div>
          <label className="field-label">
            Artwork group
            <select
              aria-label="Job artwork group"
              value={active ? groupIndex : ""}
              disabled={!groups.length}
              onChange={(e) => {
                setGroupIndex(Number(e.target.value));
                setGroup(Number(e.target.value));
                setExported("");
              }}
            >
              {groups.length ? (
                groups.map((g, i) => (
                  <option key={g.key} value={i}>
                    {i + 1}.{" "}
                    {g.objects[0].type === "svg"
                      ? "Imported artwork"
                      : `${g.operation} · ${g.color}`}{" "}
                    · {g.objects.length} layer
                    {g.objects.length === 1 ? "" : "s"}
                  </option>
                ))
              ) : (
                <option value="">No visible artwork</option>
              )}
            </select>
          </label>
          <label className="field-label">
            Material name
            <input
              aria-label="Job material"
              placeholder="e.g. removable vinyl"
              maxLength={120}
              value={preferences.material}
              onChange={(e) => change({ material: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field-label grow">
              Tool
              <select
                aria-label="Job tool"
                value={preferences.tool}
                onChange={(e) =>
                  change({ tool: e.target.value as JobPreferences["tool"] })
                }
              >
                <option value="automatic">Match artwork operation</option>
                {Object.entries(toolNames).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label machine-passes">
              Planned passes
              <select
                aria-label="Job passes"
                value={preferences.passes}
                onChange={(e) => change({ passes: Number(e.target.value) })}
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={mirror}
              onChange={(e) => {
                setMirror(e.target.checked);
                setExported("");
              }}
            />
            Mirror for iron-on
          </label>
          <div className="machine-job-summary">
            <span>Artwork canvas</span>
            <strong>
              {((project.width * 25.4) / 96).toFixed(1)} ×{" "}
              {((project.height * 25.4) / 96).toFixed(1)} mm
            </strong>
            {draft && (
              <>
                <span>Planned tool</span>
                <strong>{toolNames[draft.setup.tool]}</strong>
              </>
            )}
            <span>Pressure &amp; speed</span>
            <strong>Not configured</strong>
          </div>
          <p className="machine-small">
            Canvas size is not a verified machine cutting area. Tool, material
            and pass choices are draft notes; they do not change your machine.
          </p>
          <p className="machine-footnote" aria-live="polite">
            {saved}
          </p>
        </section>
      </div>
      <section className="machine-preflight">
        <h3>Before this can become a cut job</h3>
        {draft ? (
          <ul>
            {draft.preflight.issues.map((issue) => (
              <li key={issue.code}>{issue.message}</li>
            ))}
          </ul>
        ) : (
          <p>Add visible artwork to create a job draft.</p>
        )}
      </section>
      <div className="machine-actions">
        <button className="button quiet" onClick={back}>
          <ArrowLeft size={15} /> Artwork preview
        </button>
        <div>
          <button
            className="button secondary"
            disabled={!active}
            onClick={() => {
              download(
                exportSvg(project, active.objects, mirror),
                `${filename(project.name)}-group-${groupIndex + 1}.svg`,
                "image/svg+xml",
              );
              setExported(
                "SVG artwork exported. Verify it in your cutting software.",
              );
            }}
          >
            <Download size={15} /> Export SVG
          </button>
          <button
            className="button secondary"
            disabled={!draft}
            onClick={() => {
              if (!draft) return;
              download(
                JSON.stringify(draft, null, 2),
                `${filename(project.name)}-group-${groupIndex + 1}.hopperjob`,
                "application/json",
              );
              setExported(
                "Draft saved. This file has not been sent to a machine.",
              );
            }}
          >
            Save job draft
          </button>
          <button
            className="button primary"
            disabled
            aria-describedby="machine-send-reason"
          >
            Send cut job
          </button>
        </div>
      </div>
      <p id="machine-send-reason" className="machine-footnote">
        Sending is unavailable until a {MODELS[preferences.model]} adapter and
        physical-machine tests are complete.
      </p>
      {exported && (
        <p className="machine-exported" role="status">
          {exported}
        </p>
      )}
    </div>
  );
}
