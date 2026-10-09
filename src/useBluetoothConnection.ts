import { useEffect, useRef, useState } from "react";
import type { BluetoothConnection } from "./machine";
export function useBluetoothConnection() {
  const [connection, setConnection] = useState<BluetoothConnection | null>(
    null,
  );
  const [error, setError] = useState("");
  const [serviceError, setServiceError] = useState("");
  const revision = useRef(0),
    alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const epoch = revision.current;
      try {
        const next = await window.hopperMachine?.bluetoothStatus?.();
        if (!cancelled && next && epoch === revision.current) {
          setConnection(next);
          setServiceError("");
        }
      } catch {
        if (!cancelled)
          setServiceError(
            "The Bluetooth connection service is unavailable. Restart Mantis Studio.",
          );
      }
      if (!cancelled) timer = setTimeout(poll, 1000);
    }
    void poll();
    return () => {
      cancelled = true;
      alive.current = false;
      clearTimeout(timer);
    };
  }, []);
  async function change(deviceId?: string) {
    const epoch = ++revision.current;
    setError("");
    try {
      const next = deviceId
        ? await window.hopperMachine?.connectBluetooth?.(deviceId)
        : await window.hopperMachine?.disconnectBluetooth?.();
      if (alive.current && next && epoch === revision.current)
        setConnection(next);
    } catch (error) {
      if (alive.current && epoch === revision.current)
        setError((error as Error).message || "Bluetooth action failed.");
    }
  }
  return {
    connection,
    error: error || serviceError,
    connect: (id: string) => void change(id),
    disconnect: () => void change(),
  };
}
