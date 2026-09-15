/** Promote the existing figure into the browser's top layer without remounting it. */
export interface FigureFocus {
  open: () => void;
  close: (restoreFocus?: boolean) => void;
  destroy: () => void;
}

let active: FigureFocus | undefined;
const focusable =
  'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]';

export function bindFigureFocus(
  target: HTMLElement,
  trigger: HTMLButtonElement,
): FigureFocus {
  const events = new AbortController();
  const { signal } = events;
  let opened = false;
  let closing = false;
  let previousFocus: HTMLElement | null = null;
  let closeButton: HTMLButtonElement | undefined;
  const removal = new MutationObserver(() => {
    if (!target.isConnected) close(false);
  });
  let attributes: Map<string, string | null>;
  let inerted: Array<{ element: HTMLElement; inert: boolean }> = [];
  const label =
    target.querySelector('.alk-figure-title')?.textContent?.trim() ||
    target.getAttribute('aria-label') ||
    'Interactive figure';
  trigger.hidden = typeof target.showPopover !== 'function';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-label', `Focus figure: ${label}`);

  const close = (restoreFocus = true) => {
    if (!opened || closing) return;
    closing = true;
    opened = false;
    removal.disconnect();
    if (active === api) active = undefined;
    if (target.matches(':popover-open')) target.hidePopover();
    for (const [name, value] of attributes) {
      if (value === null) target.removeAttribute(name);
      else target.setAttribute(name, value);
    }
    closeButton?.remove();
    closeButton = undefined;
    inerted.forEach(({ element, inert }) => (element.inert = inert));
    inerted = [];
    closing = false;
    target.dispatchEvent(
      new CustomEvent('alk:focus-change', {
        bubbles: true,
        detail: { focused: false },
      }),
    );
    if (
      restoreFocus &&
      previousFocus?.isConnected &&
      !previousFocus.closest('[inert]')
    )
      previousFocus.focus({ preventScroll: true });
  };

  const open = () => {
    if (
      opened ||
      !target.isConnected ||
      trigger.hidden ||
      target.hasAttribute('popover')
    )
      return;
    active?.close(false);
    // Pointer activation does not focus buttons in every browser.
    previousFocus = trigger;
    attributes = new Map(
      [
        'popover',
        'role',
        'aria-label',
        'aria-modal',
        'tabindex',
        'data-alk-focused',
      ].map((name) => [name, target.getAttribute(name)]),
    );
    target.setAttribute('popover', 'manual');
    target.setAttribute('role', 'dialog');
    target.setAttribute('aria-modal', 'true');
    target.setAttribute('aria-label', label);
    target.tabIndex = -1;
    target.dataset.alkFocused = 'true';
    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'alk-focus-close';
    closeButton.textContent = 'Exit focus';
    closeButton.addEventListener('click', () => close());
    (target.querySelector('.alk-figure-heading') || target).append(closeButton);
    opened = true;
    active = api;
    try {
      target.showPopover();
      removal.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      // Inert siblings along the ancestry path, never the focused figure's ancestors.
      let branch: HTMLElement = target;
      while (branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (
            sibling !== branch &&
            sibling instanceof HTMLElement &&
            !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)
          ) {
            inerted.push({ element: sibling, inert: sibling.inert });
            sibling.inert = true;
          }
        }
        branch = branch.parentElement;
      }
      closeButton.focus({ preventScroll: true });
      target.dispatchEvent(
        new CustomEvent('alk:focus-change', {
          bubbles: true,
          detail: { focused: true },
        }),
      );
    } catch (error) {
      close();
      throw error;
    }
  };

  const api: FigureFocus = {
    open,
    close,
    destroy() {
      close(false);
      events.abort();
    },
  };
  trigger.addEventListener('click', open, { signal });
  target.addEventListener(
    'keydown',
    (event) => {
      if (!opened || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        const details = (event.target as Element).closest<HTMLDetailsElement>(
          'details[open]',
        );
        if (details && target.contains(details)) {
          details.open = false;
          details.querySelector('summary')?.focus();
        } else close();
      } else if (event.key === 'Tab') {
        const controls = [
          ...target.querySelectorAll<HTMLElement>(focusable),
        ].filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(':disabled') &&
            !element.closest('[inert]') &&
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility !== 'hidden',
        );
        const first = controls[0] || target;
        const last = controls.at(-1) || target;
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === target)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === target)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    { signal },
  );
  target.addEventListener(
    'toggle',
    (event) => {
      if (event.target === target && opened && !target.matches(':popover-open'))
        close();
    },
    { signal },
  );
  target.addEventListener(
    'alk:presentation',
    () => {
      if (target.dataset.alkActive === 'false') close(false);
    },
    { signal },
  );
  window.addEventListener('pagehide', () => close(false), { signal });
  window.addEventListener('beforeprint', () => close(false), { signal });
  return api;
}

/** Standalone pages opt in with Focus; Slides adds the same affordance automatically. */
export function addFigureFocus(target: HTMLElement): FigureFocus | undefined {
  const heading = target.querySelector('.alk-figure-heading');
  if (!heading || target.querySelector('[data-figure-focus]')) return;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'alk-figure-focus';
  trigger.dataset.figureFocus = '';
  trigger.textContent = 'Focus';
  heading.append(trigger);
  const binding = bindFigureFocus(target, trigger);
  return {
    ...binding,
    destroy() {
      binding.destroy();
      trigger.remove();
    },
  };
}
