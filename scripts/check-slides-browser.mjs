// Run against a production preview, using the playwright-cli skill:
// playwright-cli -s=slides open http://127.0.0.1:4330/slides/
// playwright-cli -s=slides run-code --filename=scripts/check-slides-browser.mjs
// This is a function expression for the CLI's page fixture, not a Node program.
async function checkSlides(page) {
  const base = await page.evaluate(() => location.origin);
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const evidence = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  const present = async () => {
    await page.locator('[data-slides-present]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('alk-slides')?.dataset.view === 'present' &&
        document
          .querySelector('[data-slides-present]')
          ?.getAttribute('aria-pressed') === 'true',
    );
  };
  const openChrome = async () => {
    if (
      (await page.locator('alk-slides').getAttribute('data-view')) !== 'present'
    )
      return;
    const chrome = page.locator('[data-slides-chrome]');
    if ((await chrome.getAttribute('aria-expanded')) !== 'true')
      await chrome.click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-slides-chrome]')
          ?.getAttribute('aria-expanded') === 'true',
    );
  };
  const open = async (slug, { presenting = true } = {}) => {
    await page.goto(`${base}/slides/${slug}/`);
    await page.waitForFunction(
      () => document.querySelector('alk-slides')?.dataset.ready === 'true',
    );
    assert(
      (await page.locator('alk-slides').getAttribute('data-view')) === 'read',
      'Desktop slide documents must open in Read',
    );
    if (presenting) await present();
  };
  const choose = async (index) => {
    await openChrome();
    await page
      .getByLabel('Choose slide', { exact: true })
      .selectOption(String(index));
    await page.waitForFunction(
      (i) =>
        document.querySelector('[data-slides-picker]')?.value === String(i) &&
        document
          .querySelectorAll('[data-alk-slide]')
          [i]?.classList.contains('present'),
      index,
    );
  };
  const ready = async (selector) =>
    page.waitForFunction(
      (s) => document.querySelector(s)?.dataset.state === 'ready',
      selector,
    );
  const checkIds = async () =>
    assert(
      await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        return ids.length === new Set(ids).size;
      }),
      'Rendered page contains duplicate IDs',
    );
  await open('working-with-a-signal');
  await checkIds();
  assert(
    (await page.locator('[data-alk-slide]').count()) === 5,
    'Markdown deck should have five slides',
  );
  await choose(1);
  assert(
    (await page
      .locator('[data-alk-slide].present [data-footnotes]')
      .count()) === 1,
    'Footnotes belong on the referencing slide',
  );
  await page.locator('[data-footnote-ref]').click();
  assert(
    (await page.locator('[data-slides-picker]').inputValue()) === '1',
    'Footnote click changed slides',
  );
  await choose(4);
  await ready('alk-diagram');
  assert(
    (await page.locator('alk-diagram svg').count()) === 1,
    'Mermaid SVG missing',
  );
  await page.screenshot({ path: '.alkemist/slides-markdown-desktop.png' });
  evidence.push(
    'Markdown: five slides, local footnotes, unique IDs, Mermaid SVG',
  );

  await open('field-notebook');
  await checkIds();
  assert(
    (await page.locator('alk-model').getAttribute('data-state')) === 'idle',
    'Hidden model eagerly mounted',
  );
  await choose(1);
  await ready('alk-chart');
  assert(
    await page.locator('#signal-chart').getAttribute('aria-describedby'),
    'Figure note is not associated with its target',
  );
  await page.screenshot({ path: '.alkemist/slides-chart-desktop.png' });
  await choose(2);
  await ready('alk-model');
  await page.locator('alk-model canvas').press('ArrowRight');
  assert(
    (await page.locator('[data-slides-picker]').inputValue()) === '2',
    'Model keyboard controls advanced the presentation',
  );
  await page.screenshot({ path: '.alkemist/slides-model-desktop.png' });
  await page.evaluate(() => {
    window.__slidesCanvas = document.querySelector('alk-model canvas');
  });
  await page.locator('[data-slides-read]').click();
  await page.waitForFunction(
    () => document.querySelector('alk-slides').dataset.view === 'read',
  );
  await present();
  assert(
    await page.evaluate(
      () =>
        window.__slidesCanvas === document.querySelector('alk-model canvas'),
    ),
    'View switch remounted the model',
  );
  await choose(3);
  await ready('alk-shader');
  assert(
    (await page.locator('alk-model').getAttribute('data-alk-active')) ===
      'false',
    'Inactive model remained active',
  );
  assert(
    (await page
      .locator('[data-alk-slide].present .fragment.visible')
      .count()) === 0,
    'Step is initially revealed',
  );
  await page.locator('[data-slides-next]').click();
  assert(
    (await page
      .locator('[data-alk-slide].present .fragment.visible')
      .count()) === 1,
    'Next failed to reveal a step',
  );
  await page.locator('[data-slides-prev]').click();
  assert(
    (await page
      .locator('[data-alk-slide].present .fragment.visible')
      .count()) === 0,
    'Previous failed to hide a step',
  );
  await page.screenshot({ path: '.alkemist/slides-shader-desktop.png' });
  evidence.push(
    'Widgets: lazy model, annotation target, keyboard focus, preserved canvas, forward/backward steps',
  );

  await choose(0);
  await openChrome();
  await page.locator('[data-slides-tools] > summary').click();
  const popupPromise = page.waitForEvent('popup');
  await page.locator('[data-slides-notes]').click();
  const notes = await popupPromise;
  await notes.waitForSelector('.speaker-controls-notes .value');
  await notes.waitForFunction(() =>
    document
      .querySelector('.speaker-controls-notes .value')
      ?.textContent.includes('synthetic or geometric'),
  );
  await choose(2);
  await notes.waitForFunction(() => {
    const frame = document.querySelector('#current-slide iframe');
    return (
      frame?.contentDocument?.querySelector('[data-slides-picker]')?.value ===
      '2'
    );
  });
  await notes.screenshot({ path: '.alkemist/slides-speaker-view.png' });
  await notes.close();
  evidence.push(
    'Presenter window: speaker text and current-slide preview synchronize',
  );

  await page.evaluate(() =>
    document.querySelector('alk-slides').preparePrint(),
  );
  assert(
    (await page.locator('alk-model [data-print-capture]').count()) === 1,
    'Model print capture missing',
  );
  assert(
    (await page.locator('alk-shader [data-print-capture]').count()) === 1,
    'Shader print capture missing',
  );
  const captures = await page
    .locator('[data-print-capture]')
    .evaluateAll((images) =>
      images.map((image) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, 64, 64);
        const pixels = context.getImageData(0, 0, 64, 64).data;
        const colors = new Set();
        for (let i = 0; i < pixels.length; i += 4)
          colors.add(
            `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`,
          );
        return colors.size;
      }),
    );
  assert(
    captures.every((colors) => colors > 20),
    'Print capture has a blank GPU framebuffer',
  );
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: '.alkemist/slides-print.png', fullPage: true });
  assert(
    (await page.locator('alk-model .alk-model-poster').isVisible()) === false,
    'Print shows both model poster and capture',
  );
  await page.emulateMedia({ media: 'screen' });
  evidence.push(
    'Print: current model/shader captures contain pixels; duplicate posters hidden',
  );

  // A page restored from the back-forward cache must restart once on pageshow,
  // never during pagehide after the model's own disposal listener has run.
  const unload = await page.evaluate(async () => {
    const originalFetch = window.fetch;
    let reloads = 0;
    window.fetch = (...args) => {
      if (String(args[0]).includes('torus-knot.glb')) reloads++;
      return originalFetch(...args);
    };
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    window.fetch = originalFetch;
    const state = document.querySelector('alk-model').dataset.state;
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    );
    return { reloads, state };
  });
  assert(
    unload.reloads === 0 && unload.state === 'idle',
    'Presentation teardown reactivated a disposed model',
  );
  await ready('alk-model');
  evidence.push(
    'Lifecycle: pagehide does not restart disposed models; pageshow restores them',
  );

  await open('listening-to-the-fixture');
  await choose(1);
  await page.locator('audio').evaluate(async (media) => {
    media.muted = true;
    await media.play();
  });
  await choose(2);
  assert(
    await page.locator('audio').evaluate((media) => media.paused),
    'Leaving audio slide failed to pause playback',
  );
  await page.locator('video').evaluate(async (media) => {
    media.muted = true;
    await media.play();
  });
  await choose(3);
  assert(
    await page.locator('video').evaluate((media) => media.paused),
    'Leaving video slide failed to pause playback',
  );
  await page.waitForFunction(
    () => document.querySelector('alk-midi')?.dataset.ready === 'true',
  );
  await page.locator('[data-midi-play]').click();
  await page.waitForFunction(
    () => document.querySelector('[data-midi-play]')?.textContent === 'Pause',
  );
  await choose(0);
  assert(
    (await page.locator('[data-midi-play]').textContent()) === 'Play',
    'Leaving MIDI slide failed to stop playback',
  );
  await choose(3);
  assert(
    (await page.locator('[data-midi-play]').textContent()) === 'Play',
    'Returning to MIDI slide resumed playback without user action',
  );
  await page.screenshot({ path: '.alkemist/slides-midi-desktop.png' });
  evidence.push(
    'Media: audio, video and MIDI pause on departure; MIDI does not auto-resume',
  );

  // Reproduce a hidden fragment whose layout rectangle already intersects.
  // Activation must render it even though IntersectionObserver sees no move.
  await page.evaluate(() => {
    const diagram = document.createElement('alk-diagram');
    diagram.id = 'diagram-activation-fixture';
    diagram.dataset.alkActive = 'false';
    diagram.style.cssText =
      'position:fixed;top:100px;left:20px;width:200px;visibility:hidden';
    const source = document.createElement('pre');
    source.textContent = 'flowchart LR\n A --> B';
    diagram.append(source);
    document.body.append(diagram);
  });
  await page.waitForTimeout(100);
  assert(
    (await page.locator('#diagram-activation-fixture svg').count()) === 0,
    'Inactive fragment rendered early',
  );
  await page.evaluate(() => {
    const diagram = document.querySelector('#diagram-activation-fixture');
    diagram.style.visibility = 'visible';
    diagram.dataset.alkActive = 'true';
    diagram.dispatchEvent(
      new CustomEvent('alk:presentation', { detail: { active: true } }),
    );
  });
  await ready('#diagram-activation-fixture');
  await page.evaluate(() =>
    document.querySelector('#diagram-activation-fixture').remove(),
  );
  evidence.push(
    'Diagram: a revealed fragment renders without a geometry change',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await open('working-with-a-signal', { presenting: false });
  assert(
    (await page.locator('alk-slides').getAttribute('data-view')) === 'read',
    'Mobile did not default to reading',
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    'Mobile page overflows horizontally',
  );
  await page.locator('alk-diagram').scrollIntoViewIfNeeded();
  await ready('alk-diagram');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: '.alkemist/slides-mobile.png',
    fullPage: true,
  });
  evidence.push('Mobile: 390px reading mode without horizontal page overflow');

  const nojsContext = await page
    .context()
    .browser()
    .newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
  const nojs = await nojsContext.newPage();
  await nojs.goto(`${base}/slides/field-notebook/`);
  assert(
    (await nojs.locator('[data-alk-slide]').count()) === 4,
    'No-JavaScript slide content missing',
  );
  assert(
    (await nojs.locator('[data-slides-controls]').first().isVisible()) ===
      false,
    'No-JavaScript controls are misleadingly active',
  );
  assert(
    await nojs.locator('[data-alk-step]').first().isVisible(),
    'No-JavaScript steps are hidden',
  );
  await nojs.screenshot({ path: '.alkemist/slides-nojs.png', fullPage: true });
  await nojsContext.close();
  evidence.push(
    'No JavaScript: all four MDX slides and static content remain readable',
  );
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return { base, browser: page.context().browser().version(), evidence };
}
