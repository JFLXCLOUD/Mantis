export type Theme = 'light' | 'dark' | 'system';
export type Preferences = { theme: Theme; automaticUpdates: boolean };
const KEY = 'mantis.preferences.v1';
export function loadPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { theme: ['light', 'dark', 'system'].includes(value?.theme) ? value.theme : 'system',
      automaticUpdates: typeof value?.automaticUpdates === 'boolean' ? value.automaticUpdates : true };
  } catch { return { theme: 'system', automaticUpdates: true }; }
}
export function savePreferences(value: Preferences) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
}
