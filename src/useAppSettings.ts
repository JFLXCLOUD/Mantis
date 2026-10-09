import { useCallback, useEffect, useRef, useState } from 'react';
import { applyTheme, loadPreferences, savePreferences, type Preferences } from './preferences';

export type UpdateResult = {
  status: 'no-release' | 'current' | 'available' | 'error';
  currentVersion: string; latestVersion?: string; checkedAt?: string; message: string;
};
declare global {
  interface Window {
    mantisUpdates?: { check: () => Promise<UpdateResult>; openReleases: () => Promise<{ opened: boolean }> };
  }
}
const LAST_CHECK = 'mantis.updates.last-check.v1';
const DAY = 24 * 60 * 60 * 1000;
function lastCheck() {
  try { const n = Number(localStorage.getItem(LAST_CHECK)); return Number.isFinite(n) && n <= Date.now() ? n : 0; }
  catch { return 0; }
}
export function useAppSettings() {
  const [preferences, setPreferences] = useState(loadPreferences);
  const [storageError, setStorageError] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [checking, setChecking] = useState(false);
  const inFlight = useRef(false);
  const lastAttempt = useRef(lastCheck());
  const [openError, setOpenError] = useState(false);
  const updatePreferences = (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next); setStorageError(!savePreferences(next));
  };
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyTheme(preferences.theme);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [preferences.theme]);
  const check = useCallback(async () => {
    if (!window.mantisUpdates || inFlight.current) return;
    inFlight.current = true; setChecking(true); setOpenError(false);
    try { setResult(await window.mantisUpdates.check()); }
    catch { setResult({ status: 'error', currentVersion: '', message: 'Could not check for updates. Please try again.' }); }
    finally {
      lastAttempt.current = Date.now();
      try { localStorage.setItem(LAST_CHECK, String(lastAttempt.current)); } catch { /* Keep current-session timing. */ }
      inFlight.current = false; setChecking(false);
    }
  }, []);
  useEffect(() => {
    if (!preferences.automaticUpdates || !window.mantisUpdates) return;
    const due = () => { if (Date.now() - lastAttempt.current >= DAY) void check(); };
    const startup = window.setTimeout(due, 2500);
    const timer = window.setInterval(due, 60 * 60 * 1000);
    return () => { window.clearTimeout(startup); window.clearInterval(timer); };
  }, [preferences.automaticUpdates, check]);
  const openReleases = async () => {
    try { setOpenError(!(await window.mantisUpdates?.openReleases())?.opened); }
    catch { setOpenError(true); }
  };
  return { preferences, updatePreferences, storageError, result, checking, check, openReleases, openError };
}
