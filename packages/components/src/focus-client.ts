import { bindFigureFocus, type FigureFocus } from './figure-focus';

class FocusElement extends HTMLElement {
  private binding?: FigureFocus;
  private target?: HTMLElement;
  private observer?: MutationObserver;

  private bind = () => {
    const id = this.dataset.target;
    // Embedded decks own their ID namespace, including before Slides prepares it.
    const scope = this.closest('alk-slides') || document;
    const target = id
      ? scope.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
      : null;
    const button = this.querySelector<HTMLButtonElement>('button');
    if (target === this.target && this.binding) return;
    this.binding?.destroy();
    this.binding = undefined;
    this.target = target || undefined;
    if (button) button.hidden = true;
    if (target && button) this.binding = bindFigureFocus(target, button);
  };

  connectedCallback() {
    this.bind();
    this.observer = new MutationObserver(this.bind);
    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['id', 'data-target'],
    });
  }
  disconnectedCallback() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.binding?.destroy();
    this.binding = undefined;
    this.target = undefined;
  }
}
if (!customElements.get('alk-focus'))
  customElements.define('alk-focus', FocusElement);
