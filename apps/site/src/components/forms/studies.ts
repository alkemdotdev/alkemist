import { formStudies, isFormId } from './catalog';
const storageKey = 'alkemist-four-forms-v1';
class FormStudies extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = 'true';
    const form = this.querySelector<HTMLFormElement>('form')!;
    const favorite =
      form.querySelector<HTMLSelectElement>('[name="favorite"]')!;
    const theme = document.querySelector<HTMLSelectElement>('#alk-theme')!;
    const feedback = form.querySelector<HTMLElement>('[data-copy-status]')!;
    const manual =
      form.querySelector<HTMLTextAreaElement>('[data-manual-copy]')!;
    const details = ['notes', 'captions'] as const;
    const checkbox = (name: string) =>
      form.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    let saved: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        saved = parsed;
    } catch {
      /* Storage is optional. */
    }
    if (isFormId(saved.favorite)) favorite.value = saved.favorite;
    const clear = () => {
      feedback.textContent = '';
      manual.hidden = true;
      manual.value = '';
    };
    const applyDetails = () =>
      details.forEach((name) => {
        this.dataset[name] = String(checkbox(name).checked);
      });
    const darkBoard = () =>
      theme.value === 'dark' ||
      (theme.value === 'system' &&
        matchMedia('(prefers-color-scheme: dark)').matches);
    const syncBoard = () => {
      const board = darkBoard() ? 'black' : 'white';
      form.querySelector<HTMLInputElement>(
        `[name="board"][value="${board}"]`,
      )!.checked = true;
    };
    const show = (value: string) => {
      const take = isFormId(value) ? value : 'compare';
      this.dataset.view = take;
      this.querySelector<HTMLElement>('[data-comparison]')!.hidden =
        take !== 'compare';
      this.querySelectorAll<HTMLElement>('[data-form-panel]').forEach(
        (panel) => (panel.hidden = panel.dataset.formPanel !== take),
      );
      this.querySelectorAll<HTMLAnchorElement>('[data-view-link]').forEach(
        (link) => {
          if (link.dataset.viewLink === take)
            link.setAttribute('aria-current', 'page');
          else link.removeAttribute('aria-current');
        },
      );
      this.querySelector<HTMLElement>(
        '[data-direction-description]',
      )!.textContent =
        formStudies.find((study) => study.id === take)?.description ??
        'Compare the silhouettes first, then open a study to see its scale, motion, and typography.';
      clear();
    };
    const readUrl = () => {
      const params = new URL(location.href).searchParams;
      show(params.get('take') ?? 'compare');
      details.forEach(
        (name) =>
          (checkbox(name).checked = params.has(name)
            ? params.get(name) !== '0'
            : saved[name] !== false),
      );
      const board = params.get('board');
      if (board === 'white' || board === 'black') {
        theme.value = board === 'white' ? 'light' : 'dark';
        theme.dispatchEvent(new Event('change'));
      }
      applyDetails();
      syncBoard();
    };
    const url = () => {
      const result = new URL(location.href);
      result.hash = '';
      result.searchParams.set('take', this.dataset.view ?? 'compare');
      details.forEach((name) =>
        result.searchParams.set(name, checkbox(name).checked ? '1' : '0'),
      );
      result.searchParams.set('board', darkBoard() ? 'black' : 'white');
      return result;
    };
    const save = () => {
      saved = {
        favorite: favorite.value,
        ...Object.fromEntries(
          details.map((name) => [name, checkbox(name).checked]),
        ),
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(saved));
      } catch {
        /* Current controls still work. */
      }
      history.replaceState(null, '', url());
      clear();
    };
    readUrl();
    this.querySelectorAll<HTMLAnchorElement>('[data-view-link]').forEach(
      (link) =>
        link.addEventListener('click', (event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.preventDefault();
          const openedCard = link.classList.contains('forms-card');
          show(link.dataset.viewLink!);
          if (openedCard) {
            const heading = this.querySelector<HTMLElement>(
              `[data-form-panel="${link.dataset.viewLink}"] h1`,
            )!;
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
          }
          history.pushState(null, '', url());
          this.scrollIntoView({ block: 'start', behavior: 'instant' });
        }),
    );
    form.addEventListener('submit', (event) => event.preventDefault());
    details.forEach((name) =>
      checkbox(name).addEventListener('change', () => {
        applyDetails();
        save();
      }),
    );
    favorite.addEventListener('change', save);
    form.querySelectorAll<HTMLInputElement>('[name="board"]').forEach((radio) =>
      radio.addEventListener('change', () => {
        theme.value = radio.value === 'black' ? 'dark' : 'light';
        theme.dispatchEvent(new Event('change'));
      }),
    );
    theme.addEventListener('change', () => {
      syncBoard();
      save();
    });
    window.addEventListener('alk:theme-change', syncBoard);
    window.addEventListener('popstate', readUrl);
    form
      .querySelector('[data-copy-direction]')!
      .addEventListener('click', async () => {
        const name =
          formStudies.find((study) => study.id === favorite.value)?.name ??
          'Still comparing';
        const text = `Alkemist opening: ${name}\nAnnotations: ${checkbox('notes').checked ? 'yes' : 'no'}\nCaptions: ${checkbox('captions').checked ? 'yes' : 'no'}\n${url().href}`;
        try {
          await navigator.clipboard.writeText(text);
          feedback.textContent =
            'Direction copied. Paste it into our conversation.';
        } catch {
          manual.value = text;
          manual.hidden = false;
          manual.focus();
          manual.select();
          feedback.textContent = 'Copy your direction from the field below.';
        }
      });
  }
}
if (!customElements.get('form-studies'))
  customElements.define('form-studies', FormStudies);
