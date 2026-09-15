export type Theme = 'system' | 'light' | 'dark';
export type ThemeStyle = 'default' | 'paper' | 'chalk' | 'blueprint';

export const THEME_STYLES = [
  { value: 'default', label: 'Neutral' },
  { value: 'paper', label: 'Paper' },
  { value: 'chalk', label: 'Chalk' },
  { value: 'blueprint', label: 'Blueprint' },
] as const satisfies ReadonlyArray<{ value: ThemeStyle; label: string }>;

const isTheme = (value: unknown): value is Theme =>
  value === 'system' || value === 'light' || value === 'dark';

export const isThemeStyle = (value: unknown): value is ThemeStyle =>
  value === 'default' ||
  value === 'paper' ||
  value === 'chalk' ||
  value === 'blueprint';

let initialized = false;

/** Read the preference seeded before paint by Layout. */
export function getTheme(): Theme {
  const value = document.documentElement.dataset.alkTheme;
  return isTheme(value) ? value : 'system';
}

/** Read the named style seeded before paint by Layout. */
export function getThemeStyle(): ThemeStyle {
  const value = document.documentElement.dataset.alkThemeStyle;
  return isThemeStyle(value) ? value : 'default';
}

function notifyThemeChange() {
  window.dispatchEvent(
    new CustomEvent('alk:theme-change', {
      detail: { theme: getTheme(), style: getThemeStyle() },
    }),
  );
}

function applyTheme(value: Theme, notify = true) {
  document.documentElement.dataset.alkTheme = value;
  document.documentElement.style.colorScheme =
    value === 'system' ? 'light dark' : value;
  if (notify) notifyThemeChange();
}

function applyThemeStyle(value: ThemeStyle, notify = true) {
  document.documentElement.dataset.alkThemeStyle = value;
  if (notify) notifyThemeChange();
}

export function setTheme(value: Theme) {
  if (!isTheme(value)) throw new TypeError(`Unknown Alkemist theme: ${value}`);
  try {
    localStorage.setItem('alk-theme', value);
  } catch {
    /* The preference remains usable when storage is disabled. */
  }
  applyTheme(value);
}

export function setThemeStyle(value: ThemeStyle) {
  if (!isThemeStyle(value))
    throw new TypeError(`Unknown Alkemist theme style: ${value}`);
  try {
    localStorage.setItem('alk-theme-style', value);
  } catch {
    /* The preference remains usable when storage is disabled. */
  }
  applyThemeStyle(value);
}

/** Initialize once without overwriting a preference applied by a page script. */
export function initTheme() {
  if (initialized) return;
  initialized = true;
  applyTheme(getTheme(), false);
  applyThemeStyle(getThemeStyle(), false);
  notifyThemeChange();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system');
  });
}
