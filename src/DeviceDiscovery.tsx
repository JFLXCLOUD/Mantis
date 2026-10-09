import { useEffect, useRef, useState } from "react";
import {
  Bluetooth,
  Usb,
  RefreshCw,
  Download,
  Check,
  Settings,
} from "lucide-react";
import { download } from "./io";
import {
  bluetoothReport,
  usbReport,
  MODELS,
  MACHINE_PROFILES,
  type BluetoothScan,
  type UsbScan,
  type MachineModel,
  type Transport,
  type BluetoothConnection,
} from "./machine";

// Remount on transport changes so a late USB result cannot replace Bluetooth results.
export function DeviceDiscovery({
  transport,
  model,
  connection,
  connect,
}: {
  transport: Transport;
  model: MachineModel;
  connection?: BluetoothConnection | null;
  connect?(deviceId: string): void;
}) {
  const [scan, setScan] = useState<UsbScan | BluetoothScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [opening, setOpening] = useState(false);
  const alive = useRef(false),
    running = useRef(false);
  const bluetooth = transport === "bluetooth";
  const needsBle = bluetooth && MACHINE_PROFILES[model].bluetooth === "ble";
  const label = bluetooth ? "Bluetooth" : "USB";
  const Icon = bluetooth ? Bluetooth : Usb;
  const native = Boolean(window.hopperMachine);
  async function refresh() {
    if (!window.hopperMachine || running.current || needsBle) return;
    running.current = true;
    setScanning(true);
    setScan(null);
    setSelected("");
    try {
      const result = await (bluetooth
        ? window.hopperMachine.scanBluetooth()
        : window.hopperMachine.scanUsb());
      if (alive.current) setScan(result);
    } catch {
      if (alive.current)
        setScan({
          status: "error",
          devices: [],
          warnings: [],
          message:
            "The desktop device service did not respond. Restart Mantis Studio and try again.",
        });
    } finally {
      running.current = false;
      if (alive.current) setScanning(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, []);
  async function openSettings() {
    if (!window.hopperMachine || opening) return;
    setOpening(true);
    try {
      const result = await window.hopperMachine.openBluetoothSettings();
      if (alive.current) setSettingsMessage(result.message);
    } catch {
      if (alive.current)
        setSettingsMessage(
          "Open Windows Settings > Bluetooth & devices manually.",
        );
    } finally {
      if (alive.current) setOpening(false);
    }
  }
  const device = scan?.devices.find((d) => d.id === selected);
  if (needsBle)
    return (
      <div className="machine-empty" role="status">
        <Bluetooth size={27} />
        <strong>Bluetooth Low Energy support is planned</strong>
        <p>
          {MODELS[model]} uses BLE. Do not manually pair this model in Windows
          settings. Mantis Studio's current scanner supports Bluetooth Classic
          only.
        </p>
        <p>
          {MACHINE_PROFILES[model].usb
            ? "Choose USB for device discovery, or save a job draft for later."
            : "You can save job drafts now; discovery and cutting for this model are not available yet."}
        </p>
      </div>
    );
  return (
    <>
      {bluetooth && (
        <div className="machine-pairing">
          <strong>Pair in Windows, then scan in Mantis Studio</strong>
          {"bluetoothAdapter" in MACHINE_PROFILES[model] && (
            <p>
              <strong>
                This model requires the separate Cricut Wireless Bluetooth
                Adapter.
              </strong>{" "}
              Without that adapter, use USB.
            </p>
          )}
          <ol>
            <li>Power on your {MODELS[model]} and keep it near this PC.</li>
            <li>
              In Windows Bluetooth settings, choose Add device → Bluetooth.
              Match the ID on your machine’s label.
            </li>
            <li>After pairing, return here and scan again.</li>
          </ol>
          <p>
            {(model === "maker-4" || model === "explore-4") &&
              "This model may first appear as “Bluetooth Device” or “Generic.” "}
            If it is missing, try Advanced Bluetooth device discovery in Windows
            11.
          </p>
          {model === "explore-air-2" && (
            <p>
              If Windows requests a pairing PIN for Explore Air 2, Cricut
              specifies 0000.
            </p>
          )}
          <button
            className="button secondary wide"
            disabled={!native || opening}
            onClick={() => void openSettings()}
          >
            <Settings size={15} /> Open Windows Bluetooth settings
          </button>
          {settingsMessage && <p role="status">{settingsMessage}</p>}
        </div>
      )}
      {!native ? (
        <div className="machine-empty">
          <Icon size={27} />
          <strong>Open Mantis Studio for Windows to scan {label}</strong>
          <p>
            The browser editor can prepare drafts. Device discovery is available
            in the desktop app.
          </p>
        </div>
      ) : (
        <>
          <button
            className="button secondary wide"
            disabled={scanning}
            onClick={() => void refresh()}
          >
            <RefreshCw
              size={15}
              className={scanning ? "machine-scanning" : ""}
            />
            {scanning ? `Scanning Windows ${label}…` : `Scan ${label} devices`}
          </button>
          <div aria-live="polite" className="machine-discovery">
            {scanning && (
              <p className="machine-small">
                Checking devices reported by Windows. This can take up to 25
                seconds.
              </p>
            )}
            {scan && "radio" in scan && (
              <p className="machine-radio">
                Bluetooth radio: <strong>{scan.radio}</strong>
              </p>
            )}
            {scan?.status === "ok" && !scan.devices.length && (
              <div className="machine-empty">
                <Icon size={27} />
                <strong>No Cricut {label} device detected</strong>
                <p>
                  {bluetooth
                    ? "Pair your machine in Windows and scan again. Generic devices are not identified as Cricut devices until Windows reports a recognizable name."
                    : "When your machine is available, power it on, connect its data USB port to this PC, and scan again."}
                </p>
              </div>
            )}
            {scan && scan.status !== "ok" && (
              <p className="machine-error" role="alert">
                {scan.message}
              </p>
            )}
            {scan?.devices.map((d) => (
              <button
                key={d.id}
                className={`machine-device ${selected === d.id ? "selected" : ""}`}
                aria-pressed={selected === d.id}
                onClick={() => setSelected(d.id)}
              >
                <Icon size={19} />
                <span>
                  <strong>{d.name}</strong>
                  {d.transport === "bluetooth" ? (
                    <>
                      <small>
                        {d.paired
                          ? "Paired in Windows"
                          : "Not paired in Windows"}{" "}
                        · Bluetooth Classic
                      </small>
                      <small>
                        {d.windowsConnected
                          ? "Windows link active; Mantis Studio readiness unknown"
                          : "Availability unknown; saved devices may be offline"}
                      </small>
                    </>
                  ) : (
                    <>
                      <small>
                        {d.windowsStatus === "OK"
                          ? "Detected by Windows"
                          : `Windows status: ${d.windowsStatus}`}{" "}
                        · {d.ports.join(", ") || "USB interface"}
                      </small>
                      <small>
                        VID {d.vendorId} · PID {d.productId}
                      </small>
                    </>
                  )}
                </span>
                {selected === d.id && <Check size={15} />}
              </button>
            ))}
            {device && (
              <p className="machine-small">
                Selected for inspection. Firmware and readiness are unknown; no
                device handshake has been performed.
              </p>
            )}
            {device?.transport === "bluetooth" &&
              device.modelHint === "explore-3" &&
              window.hopperMachine?.connectBluetooth && (
                <div className="machine-connect-action">
                  <button
                    className="button primary wide"
                    disabled={
                      !device.paired ||
                      model !== "explore-3" ||
                      connection?.status === "connecting" ||
                      connection?.status === "connected"
                    }
                    onClick={() => connect?.(device.id)}
                  >
                    <Bluetooth size={16} /> Connect Bluetooth data link
                  </button>
                  <p className="machine-small">
                    {!device.paired
                      ? "Pair this Explore 3 in Windows first."
                      : model !== "explore-3"
                        ? "Choose Cricut Explore 3 as the target model above."
                        : "Opens the paired device’s serial service. This sends no cutting or motion commands."}
                  </p>
                </div>
              )}
            {device?.modelHint && device.modelHint !== model && (
              <p className="machine-error" role="alert">
                The device name suggests {MODELS[device.modelHint]}. Check the
                model on its label before continuing.
              </p>
            )}
            {scan?.warnings.map((w) => (
              <p className="machine-small" key={w}>
                {w}
              </p>
            ))}
          </div>
          {scan && (
            <button
              className="machine-report"
              onClick={() =>
                download(
                  JSON.stringify(
                    "radio" in scan ? bluetoothReport(scan) : usbReport(scan),
                    null,
                    2,
                  ),
                  `mantis-${transport}-report.json`,
                  "application/json",
                )
              }
            >
              <Download size={13} /> Save {label} report
            </button>
          )}
        </>
      )}
      <p className="machine-footnote">
        {bluetooth
          ? "Bluetooth Classic discovery; Explore 3 also supports a data-link connection. Pairing and connecting do not enable cutting. Reports omit Bluetooth addresses and device names."
          : "USB discovery only. Reports omit device instance IDs and serial numbers."}
      </p>
    </>
  );
}
