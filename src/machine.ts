import { bounds, materialGroups, validateProject, type Project } from "./model";
import { exportSvg } from "./io";

import catalog from "../shared/machines.json";
export const MACHINE_PROFILES = catalog;
export type MachineModel = keyof typeof catalog;
export const MODELS = Object.fromEntries(
  Object.entries(catalog).map(([id, p]) => [id, p.name]),
) as Record<MachineModel, string>;
export type UsbDevice = {
  id: string;
  name: string;
  vendorId: string;
  productId: string;
  modelHint: MachineModel | null;
  transport: "usb";
  ports: string[];
  windowsStatus: string;
  connection: "detected-only";
  canSend: false;
};
export type UsbScan = {
  status: "ok" | "error" | "unavailable";
  devices: UsbDevice[];
  warnings: string[];
  message?: string;
  scannedAt?: string;
};
export type Transport = "usb" | "bluetooth";
export type BluetoothConnection = {
  status: "disconnected" | "connecting" | "connected" | "error";
  deviceId: string | null;
  name: string | null;
  modelHint: MachineModel | null;
  transport: "bluetooth";
  protocol: "rfcomm";
  machineReady: false;
  canSend: false;
  bytesSent: 0;
  bytesReceived: number;
  message: string;
  connectedAt?: string;
  serviceUuid?: string;
  errorCode?: string | null;
};
export type BluetoothDevice = {
  id: string;
  name: string;
  modelHint: MachineModel | null;
  transport: "bluetooth";
  protocol: "classic";
  paired: boolean;
  remembered: boolean;
  windowsConnected: boolean;
  connection: "detected-only";
  canSend: false;
};
export type BluetoothScan = Omit<UsbScan, "devices"> & {
  radio: "on" | "off" | "disabled" | "absent" | "unknown";
  devices: BluetoothDevice[];
};
declare global {
  interface Window {
    hopperMachine?: {
      scanUsb(): Promise<UsbScan>;
      scanBluetooth(): Promise<BluetoothScan>;
      bluetoothStatus?(): Promise<BluetoothConnection>;
      connectBluetooth?(deviceId: string): Promise<BluetoothConnection>;
      disconnectBluetooth?(): Promise<BluetoothConnection>;
      openBluetoothSettings(): Promise<{ opened: boolean; message: string }>;
    };
  }
}
export type JobPreferences = {
  model: MachineModel;
  transport: Transport;
  material: string;
  passes: number;
  tool: "automatic" | "fine-point" | "pen" | "scoring";
};
export const DEFAULT_JOB: JobPreferences = {
  model: "maker-4",
  transport: "usb",
  material: "",
  passes: 1,
  tool: "automatic",
};
export const MACHINE_SETTINGS_KEY = "hopper.machine-preferences.v1";
export function validatePreferences(value: unknown): JobPreferences {
  if (!value || typeof value !== "object")
    throw new Error("Invalid machine preferences.");
  const p = value as JobPreferences;
  if (
    !Object.hasOwn(MODELS, p.model) ||
    (p.transport !== undefined &&
      !["usb", "bluetooth"].includes(p.transport)) ||
    typeof p.material !== "string" ||
    p.material.length > 120 ||
    !Number.isInteger(p.passes) ||
    p.passes < 1 ||
    p.passes > 20 ||
    !["automatic", "fine-point", "pen", "scoring"].includes(p.tool)
  )
    throw new Error("Invalid machine preferences.");
  return {
    model: p.model,
    transport: catalog[p.model].usb ? (p.transport ?? "usb") : "bluetooth",
    material: p.material.trim(),
    passes: p.passes,
    tool: p.tool,
  };
}
export function loadPreferences(): JobPreferences {
  try {
    return validatePreferences(
      JSON.parse(localStorage.getItem(MACHINE_SETTINGS_KEY) || "null"),
    );
  } catch {
    return { ...DEFAULT_JOB };
  }
}
export const toolNames = {
  "fine-point": "Fine-point blade",
  pen: "Pen",
  scoring: "Scoring tool",
} as const;
export function makeJobDraft(
  project: Project,
  preferences: JobPreferences,
  groupIndex: number,
  mirror: boolean,
) {
  validateProject(project);
  const setup = validatePreferences(preferences);
  const groups = materialGroups(project);
  if (
    !Number.isInteger(groupIndex) ||
    groupIndex < 0 ||
    groupIndex >= groups.length
  )
    throw new Error("Choose an artwork group to prepare.");
  if (typeof mirror !== "boolean") throw new Error("Invalid mirror setting.");
  const group = groups[groupIndex];
  const expectedTool =
    group.operation === "draw"
      ? "pen"
      : group.operation === "score"
        ? "scoring"
        : "fine-point";
  const tool = setup.tool === "automatic" ? expectedTool : setup.tool;
  const issues: { code: string; message: string; objectIds?: string[] }[] = [];
  if (
    setup.transport === "bluetooth" &&
    catalog[setup.model].bluetooth === "ble"
  )
    issues.push({
      code: "ble-not-implemented",
      message:
        "This model requires Bluetooth Low Energy. Mantis currently scans Bluetooth Classic only.",
    });
  if (
    setup.model === "joy" &&
    (group.operation === "score" || tool === "scoring")
  )
    issues.push({
      code: "scoring-unavailable",
      message:
        "This Joy model does not support scoring. Choose cut/draw artwork or a different machine.",
    });
  if (!setup.material)
    issues.push({
      code: "material-missing",
      message: "Name the material you plan to use.",
    });
  if (tool !== expectedTool)
    issues.push({
      code: "tool-mismatch",
      message: `${toolNames[tool]} does not match this ${group.operation} group.`,
    });
  const text = group.objects.filter((o) => o.type === "text");
  if (text.length)
    issues.push({
      code: "text-needs-outlines",
      message: `${text.length} text layer(s) need conversion to paths before a machine job can be compiled.`,
      objectIds: text.map((o) => o.id),
    });
  const imported = group.objects.filter((o) => o.type === "svg");
  if (imported.length)
    issues.push({
      code: "import-needs-path-validation",
      message:
        "Imported artwork needs path and operation validation before machine output.",
      objectIds: imported.map((o) => o.id),
    });
  const outside = group.objects.filter((o) => {
    const b = bounds([o]);
    return (
      b.x < 0 ||
      b.y < 0 ||
      b.x + b.width > project.width ||
      b.y + b.height > project.height
    );
  });
  if (outside.length)
    issues.push({
      code: "outside-canvas",
      message: `${outside.length} object box(es) extend outside the artwork canvas.`,
      objectIds: outside.map((o) => o.id),
    });
  issues.push({
    code: "toolpath-unverified",
    message:
      "Machine toolpaths, tool settings and usable machine area still need validation.",
  });
  issues.push({
    code: "adapter-unavailable",
    message: `Direct sending to ${MODELS[setup.model]} is not implemented. A verified stock-firmware adapter is required.`,
  });
  return {
    format: "hopper-job-draft" as const,
    version: 1 as const,
    status: "draft-only" as const,
    machineReady: false as const,
    projectName: project.name,
    target: {
      model: setup.model,
      transport: setup.transport,
      firmware: null,
      adapter: null,
    },
    setup: {
      material: setup.material,
      tool,
      passes: setup.passes,
      mirror,
      pressure: null,
      speed: null,
    },
    artwork: {
      groupKey: group.key,
      operation: group.operation,
      color: group.color,
      objectIds: group.objects.map((o) => o.id),
      objectCount: group.objects.length,
      canvasMm: {
        width: (project.width * 25.4) / 96,
        height: (project.height * 25.4) / 96,
      },
      svg: exportSvg(project, group.objects, mirror),
    },
    preflight: { sendAllowed: false as const, issues },
  };
}
export function usbReport(scan: UsbScan) {
  return {
    format: "hopper-usb-report",
    version: 1,
    scannedAt: scan.scannedAt || null,
    status: scan.status,
    message: scan.message,
    warnings: scan.warnings,
    devices: scan.devices.map(
      ({ vendorId, productId, modelHint, ports, windowsStatus }) => ({
        vendorId,
        productId,
        modelHint,
        ports,
        windowsStatus,
        deviceHandshake: "not-performed",
        canSend: false,
      }),
    ),
  };
}
export function bluetoothReport(scan: BluetoothScan) {
  return {
    format: "hopper-bluetooth-report",
    version: 1,
    scannedAt: scan.scannedAt || null,
    status: scan.status,
    radio: scan.radio,
    devices: scan.devices.map(
      ({ modelHint, protocol, paired, remembered, windowsConnected }) => ({
        modelHint,
        protocol,
        paired,
        remembered,
        windowsConnected,
        availability: "unknown",
        deviceHandshake: "not-performed",
        canSend: false,
      }),
    ),
  };
}
