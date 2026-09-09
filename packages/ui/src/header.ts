import { getTheme, initTheme, setTheme, type AlkTheme } from './theme';

const header = document.querySelector<HTMLElement>('.alk-header');
if (header) {
  const panels = [
    ...header.querySelectorAll<HTMLDetailsElement>('[data-header-panel]'),
  ];
  const mobile = header.querySelector<HTMLDetailsElement>('.alk-mobile-menu');
  const theme = header.querySelector<HTMLDetailsElement>('.alk-theme-menu');
  const trigger = theme?.querySelector<HTMLElement>('summary');
  const radios = [
    ...header.querySelectorAll<HTMLInputElement>('input[name="alk-theme"]'),
  ];
  const labels = { system: 'System', light: 'Whiteboard', dark: 'Blackboard' };
  const close = (panel: HTMLDetailsElement, restoreFocus = false) => {
    panel.open = false;
    if (restoreFocus) panel.querySelector('summary')?.focus();
  };
  const syncTheme = () => {
    const selected = getTheme();
    radios.forEach((input) => {
      input.checked = input.value === selected;
    });
    trigger?.setAttribute('title', `Color theme: ${labels[selected]}`);
    const label = trigger?.querySelector('[data-theme-label]');
    if (label) label.textContent = `Color theme: ${labels[selected]}`;
  };
  window.addEventListener('alk:theme-change', syncTheme);
  initTheme();
  syncTheme();
  if (theme) theme.hidden = false;
  radios.forEach((input) => {
    input.addEventListener('change', () => setTheme(input.value as AlkTheme));
    input.addEventListener('click', (event) => {
      // Arrow keys synthesize clicks on radios; keep that keyboard group open.
      if (theme && event.detail > 0) close(theme, true);
    });
  });
  panels.forEach((panel) => {
    panel.addEventListener('toggle', () => {
      if (panel.open)
        panels.forEach((other) => {
          if (other !== panel) close(other);
        });
    });
    panel
      .querySelectorAll('a')
      .forEach((link) => link.addEventListener('click', () => close(panel)));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    panels.forEach((panel) => {
      if (panel.open) close(panel, true);
    });
  });
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return;
    const target = event.target;
    panels.forEach((panel) => {
      if (panel.open && !panel.contains(target)) close(panel);
    });
  });
  document.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Node)) return;
    const target = event.target;
    panels.forEach((panel) => {
      if (panel.open && !panel.contains(target)) close(panel);
    });
  });
  matchMedia('(max-width: 650px)').addEventListener('change', (event) => {
    const active = document.activeElement;
    if (!event.matches && mobile?.open) {
      const hadFocus = active && mobile.contains(active);
      close(mobile);
      if (hadFocus)
        header.querySelector<HTMLAnchorElement>('.alk-desktop-nav a')?.focus();
    }
    const more = header.querySelector<HTMLDetailsElement>('.alk-more');
    if (event.matches && more?.open) {
      const hadFocus = active && more.contains(active);
      close(more);
      if (hadFocus) mobile?.querySelector('summary')?.focus();
    }
  });
}
