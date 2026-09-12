import { postListLayouts, type PostListLayout } from './post-list-helpers';

class PostListElement extends HTMLElement {
  private select?: HTMLSelectElement;
  private changeLayout = () => {
    const layout = this.select?.value;
    if (!layout || !postListLayouts.includes(layout as PostListLayout)) return;
    this.dataset.layout = layout;
  };

  connectedCallback() {
    if (this.dataset.enhanced === 'true') return;
    this.select =
      this.querySelector<HTMLSelectElement>('[data-post-list-layout]') ??
      undefined;
    if (this.select) this.select.value = this.dataset.layout ?? 'rows';
    this.select?.addEventListener('change', this.changeLayout);
    this.dataset.enhanced = 'true';
  }

  disconnectedCallback() {
    this.select?.removeEventListener('change', this.changeLayout);
    this.select = undefined;
    delete this.dataset.enhanced;
  }
}

if (!customElements.get('alk-post-list'))
  customElements.define('alk-post-list', PostListElement);
