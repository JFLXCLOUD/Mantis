import { Monitor, Moon, Sun, RefreshCw, ArrowUpRight, CheckCircle2, Download } from 'lucide-react';
import { version } from '../package.json';
import type { useAppSettings } from './useAppSettings';
export function AppSettings({ settings }: { settings: ReturnType<typeof useAppSettings> }) {
  const { preferences, updatePreferences, storageError, result, checking, check, openReleases, openError } = settings;
  return <>
    <span className="eyebrow">MAKE YOURSELF AT HOME</span>
    <h2>Settings</h2>
    <p className="settings-lede">A workspace that feels like yours.</p>
    <section className="settings-section" aria-labelledby="appearance-heading">
      <h3 id="appearance-heading">Appearance</h3>
      <p>Choose a look for your workspace. Artwork and print colors stay true.</p>
      <div className="theme-choices" role="group" aria-label="Appearance">
        {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'Follow Windows', Monitor]] as const).map(([value, label, Icon]) =>
          <button key={value} aria-pressed={preferences.theme === value} onClick={() => updatePreferences({ theme: value })}>
            <span className={`theme-sample theme-sample-${value}`} aria-hidden="true"><i /><i /><i /></span>
            <span><Icon size={16} />{label}</span>
          </button>)}
      </div>
    </section>
    <section className="settings-section" aria-labelledby="updates-heading">
      <div className="settings-heading"><h3 id="updates-heading">Updates</h3><span className="version-badge">Version {version}</span></div>
      <p>Keep up with new Mantis Studio releases on GitHub.</p>
      <label className="settings-toggle">
        <span><strong>Automatically check for updates</strong><small>Check at startup and daily while open. Downloads are always your choice.</small></span>
        <input type="checkbox" checked={preferences.automaticUpdates} onChange={(e) => updatePreferences({ automaticUpdates: e.target.checked })} />
      </label>
      <div className={`update-result ${result?.status || ''}`} role="status" aria-live="polite">
        {result?.status === 'available' ? <Download size={19} /> : <CheckCircle2 size={19} />}
        <div><strong>{checking ? 'Checking GitHub…' : result?.message || 'Ready when you are.'}</strong>
          <small>{result?.checkedAt ? `Last checked ${new Date(result.checkedAt).toLocaleString()}` : 'Stable releases only. Your projects stay on this device.'}</small></div>
      </div>
      {!window.mantisUpdates && <p className="settings-footnote">Update checks are available in the Windows desktop app.</p>}
      <div className="settings-actions">
        <button className="button secondary" disabled={checking || !window.mantisUpdates} onClick={() => void check()}><RefreshCw size={15} className={checking ? 'machine-scanning' : ''} />{checking ? 'Checking…' : 'Check for updates'}</button>
        {window.mantisUpdates ? <button className={`button ${result?.status === 'available' ? 'primary' : 'quiet'}`} onClick={() => void openReleases()}>{result?.status === 'available' ? 'View update on GitHub' : 'GitHub releases'}<ArrowUpRight size={15} /></button>
          : <a className="button quiet" href="https://github.com/JFLXCLOUD/Mantis/releases" target="_blank" rel="noreferrer">GitHub releases<ArrowUpRight size={15} /></a>}
      </div>
      {openError && <p role="alert" className="settings-error">Could not open your browser. Visit github.com/JFLXCLOUD/Mantis/releases.</p>}
    </section>
    {storageError && <p role="alert" className="settings-error">Your preference changed for this session, but could not be saved.</p>}
  </>;
}
