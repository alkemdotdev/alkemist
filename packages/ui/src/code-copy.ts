function enhanceCode() {
  document
    .querySelectorAll<HTMLButtonElement>('[data-alk-copy]')
    .forEach((button) => {
      button.hidden = false;
      if (button.dataset.alkReady) return;
      button.dataset.alkReady = 'true';
      button.addEventListener('click', async () => {
        const figure = button.closest('.alk-code');
        const code = figure?.querySelector('pre code');
        const status = figure?.querySelector<HTMLElement>(
          '[data-alk-copy-status]',
        );
        if (!code || !status) return;
        try {
          await navigator.clipboard.writeText(code.textContent ?? '');
          status.textContent = 'Code copied to clipboard.';
          button.textContent = 'Copied';
        } catch {
          // Selection remains useful when a browser or its permissions block the clipboard.
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(code);
          selection?.removeAllRanges();
          selection?.addRange(range);
          (figure?.querySelector('pre') as HTMLElement | null)?.focus();
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
document.addEventListener('astro:page-load', enhanceCode);
