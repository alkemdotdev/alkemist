export function enhanceCode(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLButtonElement>('[data-alk-copy]')
    .forEach((button) => {
      button.hidden = false;
      if (button.dataset.alkReady) return;
      button.dataset.alkReady = 'true';
      button.addEventListener('click', async () => {
        document
          .querySelectorAll<HTMLTextAreaElement>(
            'textarea[data-alk-code-selection]',
          )
          .forEach((selection) => selection.remove());
        const figure = button.closest<HTMLElement>('.alk-code');
        if (!figure) return;
        const encodedSource = figure.dataset.alkSource;
        const status = figure.querySelector<HTMLElement>(
          '[data-alk-copy-status]',
        );
        if (encodedSource === undefined || !status) return;
        const source = decodeURIComponent(encodedSource);
        try {
          await navigator.clipboard.writeText(source);
          status.textContent = 'Code copied to clipboard.';
          button.textContent = 'Copied';
        } catch {
          const selection = document.createElement('textarea');
          selection.value = source;
          selection.dataset.alkCodeSelection = 'true';
          selection.setAttribute('aria-label', 'Code source');
          selection.style.cssText =
            'position:fixed;inset:auto auto 0 0;width:1px;height:1px;opacity:0;';
          document.body.append(selection);
          selection.addEventListener('blur', () => selection.remove(), {
            once: true,
          });
          selection.focus();
          selection.select();
          status.textContent =
            'Clipboard unavailable. Code selected; use your browser’s Copy command.';
          button.textContent = 'Selected';
        }
        window.setTimeout(() => {
          button.textContent = 'Copy';
        }, 2400);
      });
    });
}

enhanceCode();
document.addEventListener('astro:page-load', () => enhanceCode());
