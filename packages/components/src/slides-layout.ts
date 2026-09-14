const visualSelector =
  'img,picture,video,alk-chart,alk-model,alk-shader,alk-media,alk-midi,alk-diagram';
const layouts = new Set(['title', 'content', 'split', 'media', 'quote']);

/** Group existing nodes without cloning figures or changing reading order. */
export function prepareSlideLayouts(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>('.slides > [data-alk-slide]')
    .forEach((slide) => {
      if (slide.querySelector(':scope > .alk-slide-content')) return;
      const content = document.createElement('div');
      content.className = 'alk-slide-content';
      const body = document.createElement('div');
      body.className = 'alk-slide-body';
      const nodes = Array.from(slide.childNodes);
      const visible = Array.from(slide.children).filter(
        (node) =>
          !node.matches(
            '.notes,[data-alk-speaker-notes],script,style,link,template',
          ),
      );
      const heading = visible[0]?.matches('h1,h2,h3') ? visible[0] : undefined;
      const visuals = visible.filter((node) => {
        if (node.matches(visualSelector)) return true;
        // An ordinary Markdown image or linked image is a visual block. An
        // image embedded in a sentence remains prose, preserving its meaning.
        return (
          node.matches('p,figure') &&
          node.querySelector(visualSelector) &&
          !node.textContent?.trim()
        );
      });
      const other = visible.filter(
        (node) => node !== heading && !visuals.includes(node),
      );
      let layout = slide.dataset.layout;
      if (!layout || !layouts.has(layout)) {
        if (visuals.length === 1) {
          const prose = other.filter(
            (node) =>
              !node.matches('.alk-note,[data-footnotes],[data-alk-step]') &&
              Boolean(node.textContent?.trim()),
          );
          layout = prose.length > 0 ? 'split' : 'media';
        } else if (other.length === 1 && other[0]!.matches('blockquote'))
          layout = 'quote';
        else if (
          heading?.matches('h1') &&
          visible.length <= 3 &&
          !visuals.length &&
          (slide.textContent?.length ?? 0) < 320
        )
          layout = 'title';
        else layout = 'content';
      }
      slide.dataset.layout = layout;
      let copy: HTMLDivElement | undefined;
      let copyCount = 0;
      let visualCount = 0;
      for (const node of nodes) {
        if (node === heading) {
          heading.classList.add('alk-slide-heading');
          content.append(heading);
        } else if (
          node instanceof HTMLElement &&
          node.matches(
            '.notes,[data-alk-speaker-notes],script,style,link,template',
          )
        ) {
          // Reveal's speaker plugin still reads these from the same section.
          content.append(node);
        } else if (node instanceof Element && visuals.includes(node)) {
          const visual = document.createElement('div');
          visual.className = 'alk-slide-visual';
          visual.style.setProperty(
            '--alk-slide-visual-row',
            String(++visualCount),
          );
          visual.append(node);
          body.append(visual);
          copy = undefined;
        } else {
          if (!node.textContent?.trim() && node.nodeType === Node.TEXT_NODE)
            continue;
          if (!copy) {
            copy = document.createElement('div');
            copy.className = 'alk-slide-copy';
            body.append(copy);
            copyCount++;
          }
          copy.append(node);
        }
      }
      body.style.setProperty(
        '--alk-slide-copy-rows',
        String(visuals.length > 1 ? 1 : Math.max(1, copyCount)),
      );
      content.append(body);
      slide.append(content);
    });
}

/** Reflow first; gently reduce text only when it actually overflows. */
export function fitSlideContent(root: HTMLElement) {
  const presenting = root.dataset.view === 'present';
  root
    .querySelectorAll<HTMLElement>('.slides > [data-alk-slide]')
    .forEach((slide) => {
      if (presenting && !slide.classList.contains('present')) return;
      slide.style.removeProperty('--alk-slide-fit');
      delete slide.dataset.overflow;
      if (!presenting || !slide.clientHeight) return;
      const content = slide.querySelector<HTMLElement>(
        ':scope > .alk-slide-content',
      );
      if (!content) return;
      for (const fit of [1, 0.95, 0.9, 0.85, 0.8]) {
        slide.style.setProperty('--alk-slide-fit', String(fit));
        if (
          content.scrollHeight <= content.clientHeight + 2 &&
          content.scrollWidth <= content.clientWidth + 2
        )
          break;
      }
      const overflowing =
        content.scrollHeight > content.clientHeight + 2 ||
        content.scrollWidth > content.clientWidth + 2;
      // Oversized tables and long prose remain scrollable at a readable size.
      // Nothing is clipped or silently scaled down to illegible text.
      if (overflowing) slide.dataset.overflow = 'true';
    });
}
