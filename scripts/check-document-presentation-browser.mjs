// Run with playwright-cli against the built site, in Chromium and WebKit.
async function checkDocumentPresentation(page) {
  const origin = await page.evaluate(() => location.origin);
  const article = `${origin}/blog/one-document-two-views/`;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  const ready = () =>
    page.waitForFunction(
      () => document.querySelector('alk-slides')?.dataset.ready === 'true',
    );
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  const present = async () => {
    await page.locator('[data-slides-present]').click();
    await ready();
    assert(
      (await page.locator('alk-slides').getAttribute('data-view')) ===
        'present',
      'Present did not start',
    );
    await settle();
  };
  const read = async () => {
    await page.locator('[data-slides-read]').click();
    await page.waitForFunction(
      () => document.querySelector('alk-slides')?.dataset.view === 'read',
    );
    await settle();
  };
  const contents = async () => {
    await page.locator('[data-slides-tools] > summary').click();
    await page.locator('[data-slides-contents]').click();
    await page
      .locator('[data-slides-overview-dialog]')
      .waitFor({ state: 'visible' });
  };
  const evidence = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(article);
    await ready();
    assert(
      (await page.locator('alk-slides').getAttribute('data-view')) === 'read',
      `Default was not Read at ${width}`,
    );
    assert(
      await page.locator('.alk-slides-navigation').isHidden(),
      'Reading exposed presentation navigation',
    );
    const reading = await page.evaluate(() => {
      const button = document.querySelector('[data-slides-present]');
      return {
        height: document.documentElement.scrollHeight,
        width: document.documentElement.scrollWidth,
        target: button.getBoundingClientRect().height,
        primary:
          getComputedStyle(button).backgroundColor !== 'rgba(0, 0, 0, 0)',
        rules: document.querySelectorAll('hr[data-alk-presentation-break]')
          .length,
        footnotes: document.querySelectorAll('[data-footnotes]').length,
        headings: [...document.querySelectorAll('.slides h1,.slides h2')].map(
          (e) => e.textContent,
        ),
      };
    });
    assert(
      reading.height > 1500 && reading.width <= width,
      `Article did not form a responsive scrolling page: ${JSON.stringify(reading)}`,
    );
    assert(
      reading.target >= 44 && reading.primary,
      'Present needs a clear primary touch target',
    );
    assert(
      reading.rules === 1 && reading.footnotes === 1,
      'Read changed authored rules or duplicated footnotes',
    );
    await page.screenshot({ path: `.alkemist/document-read-${width}.png` });

    // Pin exact live nodes, including text and links, before changing the layout.
    const nodes = await page.evaluateHandle(() => [
      ...document.querySelectorAll(
        '.slides :is(h1,h2,h3,p,a,hr,img,alk-shader)',
      ),
    ]);
    await contents();
    assert(
      (await page.locator('[data-slides-overview-dialog] h2').textContent()) ===
        'Contents',
      'Read did not offer Contents',
    );
    await page.locator('[data-slides-overview-slide="3"]').click();
    await settle();
    const section = page.locator('#presentation-let-a-figure-stay-live');
    assert(
      await section.evaluate((e) => e.getBoundingClientRect().top < 200),
      'Contents did not scroll to its section',
    );
    await page.waitForFunction(
      () => document.querySelector('alk-shader')?.dataset.state === 'ready',
    );
    const field = page.locator('alk-shader');
    await field.evaluate((e) => e.setParameters({ frequency: 12, angle: 45 }));
    const text = await page.locator('.slides').textContent();
    const canvas = await field.locator('canvas').elementHandle();
    const before = await section.evaluate((e) => e.getBoundingClientRect().top);
    await present();
    assert(
      (await page.locator('.slides > .present').getAttribute('id')) ===
        'presentation-let-a-figure-stay-live',
      'Present ignored the reading position',
    );
    assert(
      await page.locator('hr[data-alk-presentation-break]').isHidden(),
      'Presentation displayed its boundary rule',
    );
    assert(
      (await field.evaluate((e) => e.getParameters().frequency)) === 12,
      'Present reset a live parameter',
    );
    if (width === 390)
      assert(
        await field.evaluate((e) => e.scrollHeight <= e.clientHeight + 2),
        'Mobile layout buried parameter controls inside a second scrolling figure',
      );
    assert(
      await nodes.evaluate((items) =>
        items.every(
          (e) => e.isConnected && document.querySelector('.slides').contains(e),
        ),
      ),
      'Present replaced document content',
    );
    assert(
      (await page.locator('.slides').textContent()) === text,
      'Present rewrote document text',
    );
    await page.screenshot({ path: `.alkemist/document-present-${width}.png` });
    await read();
    assert(
      Math.abs(
        (await section.evaluate((e) => e.getBoundingClientRect().top)) - before,
      ) < 3,
      'Read did not restore the same reading offset',
    );
    assert(
      await canvas.evaluate(
        (e) =>
          e.isConnected && e === document.querySelector('alk-shader canvas'),
      ),
      'Mode switching remounted the canvas',
    );
    assert(
      (await field.evaluate((e) => e.getParameters().angle)) === 45,
      'Read reset a parameter',
    );
    assert(
      await page
        .locator('[data-slides-present]')
        .evaluate((e) => e === document.activeElement),
      'Read did not return keyboard focus to Present',
    );
    assert(
      await page.locator('hr[data-alk-presentation-break]').isVisible(),
      'Read lost the authored rule',
    );

    // Forward navigation returns to the new section; ordinary footnotes work in both views.
    await present();
    await page.locator('[data-slides-picker]').selectOption('2');
    await page.locator('[data-footnote-ref]').click();
    await settle();
    assert(
      (await page.locator('.slides > .present').getAttribute('id')) ===
        'presentation-keep-the-document-accountable',
      'Present footnote did not navigate to its reference list',
    );
    await page.locator('[data-footnote-backref]').click();
    await settle();
    assert(
      (await page.locator('.slides > .present').getAttribute('id')) ===
        'presentation-begin-with-the-article',
      'Present footnote backlink did not return',
    );
    await read();
    assert(
      await page
        .locator('#presentation-begin-with-the-article')
        .evaluate(
          (e) =>
            e.getBoundingClientRect().bottom > 100 &&
            e.getBoundingClientRect().top < 200,
        ),
      'Read returned to the old section after slide navigation',
    );
    await page.locator('[data-footnote-ref]').click();
    await settle();
    assert(
      await page
        .locator('[data-footnotes]')
        .evaluate((e) => e.getBoundingClientRect().top < innerHeight),
      'Read footnote failed',
    );
    await page.locator('[data-footnote-backref]').click();
    await settle();
    assert(
      await page
        .locator('[data-footnote-ref]')
        .evaluate((e) => e.getBoundingClientRect().top < innerHeight),
      'Read backlink failed',
    );
    evidence.push({
      width,
      ...reading,
      sameNodes: true,
      sameCanvas: true,
      readingPosition: true,
      footnotes: true,
    });
    await nodes.dispose();
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${article}#let-a-figure-stay-live`);
  await ready();
  await settle();
  assert(
    (await page.locator('alk-slides').getAttribute('data-view')) === 'read',
    'Ordinary heading URL did not open Read',
  );
  await page.goto(`${article}#/presentation-let-a-figure-stay-live`);
  await ready();
  assert(
    (await page.locator('alk-slides').getAttribute('data-view')) === 'present',
    'Presentation URL did not retain its mode',
  );
  assert(
    (await page.locator('.slides > .present').getAttribute('id')) ===
      'presentation-let-a-figure-stay-live',
    'Presentation URL lost its section',
  );
  await read();
  assert(
    !(await page.evaluate(() => location.hash.startsWith('#/'))),
    'Read retained a presentation-mode URL',
  );
  await page.evaluate(() => {
    location.hash = '/presentation-begin-with-the-article';
  });
  await page.waitForFunction(
    () =>
      document.querySelector('alk-slides')?.dataset.view === 'present' &&
      document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  assert(
    (await page.locator('.slides > .present').getAttribute('id')) ===
      'presentation-begin-with-the-article',
    'A presentation link inside the loaded reader restored the old section instead',
  );
  await read();

  // The document remains usable while the optional engine loads or fails.
  const failureContext = await page.context().browser().newContext();
  const failurePage = await failureContext.newPage();
  let release;
  let requested = false;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await failurePage.route('**/_astro/reveal.*.js', async (route) => {
    requested = true;
    await gate;
    await route.abort('failed');
  });
  await failurePage.goto(article);
  await failurePage.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  assert(!requested, 'Read eagerly loaded the presentation engine');
  await failurePage.locator('[data-slides-present]').click();
  await failurePage.getByText('Opening…', { exact: true }).waitFor();
  assert(
    (await failurePage.locator('alk-slides').getAttribute('data-view')) ===
      'read',
    'Engine loading hid the readable document',
  );
  assert(
    await failurePage.locator('[data-slides-present]').isDisabled(),
    'Opening allowed duplicate starts',
  );
  release();
  await failurePage
    .getByText('The document remains readable.', { exact: false })
    .waitFor();
  assert(
    (await failurePage.locator('alk-slides').getAttribute('data-view')) ===
      'read' &&
      (await failurePage.locator('[data-slides-present]').isEnabled()),
    'Engine failure did not recover Read and its controls',
  );
  await failureContext.close();

  // SSR stays a complete readable document even without the enhancement.
  const context = await page
    .context()
    .browser()
    .newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
  const staticPage = await context.newPage();
  await staticPage.goto(article);
  assert(
    (await staticPage.locator('.slides h2').count()) >= 3,
    'No-JS output lost article headings',
  );
  assert(
    await staticPage.locator('[data-slides-controls]').first().isHidden(),
    'No-JS output exposed unusable controls',
  );
  assert(
    (await staticPage.locator('[data-footnotes]').count()) === 1,
    'No-JS footnotes missing',
  );
  assert(
    await staticPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'No-JS reader overflows horizontally',
  );
  await context.close();
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return { evidence, links: true, noJavaScript: true, errors };
}
