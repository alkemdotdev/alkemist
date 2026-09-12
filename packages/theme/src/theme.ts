export type Theme = 'system' | 'light' | 'dark';

const isTheme = (value: unknown): value is Theme =>
  value === 'system' || value === 'light' || value === 'dark';

let initialized = false;

/** Read the preference seeded before paint by Layout. */
export function getTheme(): Theme {
  const value = document.documentElement.dataset.alkTheme;
  return isTheme(value) ? value : 'system';
}

function applyTheme(value: Theme) {
  document.documentElement.dataset.alkTheme = value;
  document.documentElement.style.colorScheme =
    value === 'system' ? 'light dark' : value;
  window.dispatchEvent(new CustomEvent('alk:theme-change'));
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

/** Initialize once without overwriting a preference applied by a page script. */
export function initTheme() {
  if (initialized) return;
  initialized = true;
  applyTheme(getTheme());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system');
  });
}
