import { getTheme, setTheme } from '@alkemdotdev/alkemist-theme';

type HeroTake = 'sculpture' | 'flow' | 'surface';
const validTake = (value: unknown): value is HeroTake =>
  ['sculpture', 'flow', 'surface'].includes(String(value));
const preferenceKey = 'alkemist-hero-studies-v1';
const detailNames = ['notes', 'captions', 'example'] as const;

class HeroStudies extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = 'true';
    const form = this.querySelector<HTMLFormElement>('form')!;
    const select = form.querySelector<HTMLSelectElement>('[name="take"]')!;
    const comments =
      form.querySelector<HTMLTextAreaElement>('[name="comments"]')!;
    const status = form.querySelector<HTMLElement>('[data-choice-status]')!;
    const manual =
      form.querySelector<HTMLTextAreaElement>('[data-manual-copy]')!;
    const descriptions: { id: HeroTake; name: string; description: string }[] =
      JSON.parse(this.dataset.directions ?? '[]');
    const checkbox = (name: string) =>
      form.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    const clearFeedback = () => {
      status.textContent = '';
      manual.hidden = true;
      manual.value = '';
    };
    const show = (take: HeroTake) => {
      this.dataset.take = take;
      select.value = take;
      this.querySelectorAll<HTMLElement>('[data-hero-panel]').forEach(
        (panel) => {
          panel.hidden = panel.dataset.heroPanel !== take;
        },
      );
      this.querySelectorAll<HTMLButtonElement>('[data-take-button]').forEach(
        (button) =>
          button.setAttribute(
            'aria-pressed',
            String(button.dataset.takeButton === take),
          ),
      );
      form.querySelector<HTMLElement>(
        '[data-choice-description]',
      )!.textContent =
        descriptions.find((item) => item.id === take)?.description ?? '';
      clearFeedback();
    };
    const applyDetails = () =>
      detailNames.forEach((name) => {
        this.dataset[name] = String(checkbox(name).checked);
      });
    let saved: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(preferenceKey) ?? '{}',
      );
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        saved = parsed as Record<string, unknown>;
    } catch {
      /* Browser storage is optional. */
    }
    comments.value =
      typeof saved.comments === 'string' ? saved.comments.slice(0, 4000) : '';
    detailNames.forEach((name) => {
      if (typeof saved[name] === 'boolean')
        checkbox(name).checked = saved[name];
    });
    let readingUrl = false;
    const readUrl = () => {
      const params = new URL(location.href).searchParams;
      const take = params.get('take');
      show(
        validTake(take)
          ? take
          : validTake(saved.take)
            ? saved.take
            : 'sculpture',
      );
      detailNames.forEach((name) => {
        if (params.has(name)) checkbox(name).checked = params.get(name) !== '0';
      });
      const board = params.get('board');
      if (board === 'white' || board === 'black') {
        readingUrl = true;
        try {
          setTheme(board === 'white' ? 'light' : 'dark');
        } finally {
          readingUrl = false;
        }
      }
      applyDetails();
    };
    readUrl();
    const state = () => ({
      version: 1,
      take: select.value,
      ...Object.fromEntries(
        detailNames.map((name) => [name, checkbox(name).checked]),
      ),
      comments: comments.value,
    });
    const shareUrl = () => {
      const url = new URL(location.href);
      url.hash = '';
      url.searchParams.set('take', select.value);
      detailNames.forEach((name) =>
        url.searchParams.set(name, checkbox(name).checked ? '1' : '0'),
      );
      const theme = getTheme();
      if (theme === 'light' || theme === 'dark')
        url.searchParams.set('board', theme === 'light' ? 'white' : 'black');
      else url.searchParams.delete('board');
      return url;
    };
    const save = () => {
      try {
        localStorage.setItem(preferenceKey, JSON.stringify(state()));
      } catch {
        /* The current session still works. */
      }
      const url = shareUrl();
      url.hash = location.hash;
      history.replaceState(null, '', url);
      clearFeedback();
    };
    this.querySelectorAll<HTMLButtonElement>('[data-take-button]').forEach(
      (button) =>
        button.addEventListener('click', () => {
          if (validTake(button.dataset.takeButton)) {
            show(button.dataset.takeButton);
            save();
          }
        }),
    );
    form.addEventListener('submit', (event) => event.preventDefault());
    select.addEventListener('change', () => {
      if (validTake(select.value)) {
        show(select.value);
        save();
      }
    });
    detailNames.forEach((name) =>
      checkbox(name).addEventListener('change', () => {
        applyDetails();
        save();
      }),
    );
    comments.addEventListener('input', save);
    let previousTheme = getTheme();
    window.addEventListener('alk:theme-change', () => {
      const theme = getTheme();
      if (!readingUrl && theme !== previousTheme) save();
      previousTheme = theme;
    });
    window.addEventListener('popstate', readUrl);
    const selectionText = () =>
      [
        `Alkemist opening: ${descriptions.find((item) => item.id === select.value)?.name ?? select.value}`,
        ...detailNames.map(
          (name) =>
            `${form.querySelector(`[name="${name}"]`)?.parentElement?.textContent?.trim()}: ${checkbox(name).checked ? 'yes' : 'no'}`,
        ),
        comments.value.trim() ? `Notes: ${comments.value.trim()}` : '',
        shareUrl().href,
      ]
        .filter(Boolean)
        .join('\n');
    form
      .querySelector('[data-copy-choice]')!
      .addEventListener('click', async () => {
        const text = selectionText();
        try {
          await navigator.clipboard.writeText(text);
          status.textContent =
            'Direction copied. Paste it into our conversation.';
        } catch {
          manual.value = text;
          manual.hidden = false;
          manual.focus();
          manual.select();
          status.textContent =
            'Copy is unavailable. Your selection is ready to copy below.';
        }
      });
    form
      .querySelector('[data-download-choice]')!
      .addEventListener('click', () => {
        const url = URL.createObjectURL(
          new Blob(
            [
              JSON.stringify({ ...state(), url: shareUrl().href }, null, 2) +
                '\n',
            ],
            { type: 'application/json' },
          ),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = 'alkemist-hero-direction.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = 'Choices downloaded.';
      });
  }
}
if (!customElements.get('hero-studies'))
  customElements.define('hero-studies', HeroStudies);
