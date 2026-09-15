// playwright-cli -s=presentation run-code --filename=scripts/check-slide-layouts-browser.mjs
async function checkSlideLayouts(page) {
  const base = await page.evaluate(() => location.origin);
  const reports = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const slugs = [
    'look-closer',
    'working-with-a-signal',
    'field-notebook',
    'interacting-with-the-field',
    'listening-to-the-fixture',
    'layout-sampler',
    'presenting-from-the-browser',
  ];
  for (const width of [1440, 1280, 1024, 390]) {
    await page.setViewportSize({
      width,
      height:
        width === 1440
          ? 900
          : width === 1280
            ? 720
            : width === 1024
              ? 768
              : 844,
    });
    for (const slug of slugs) {
      await page.goto(`${base}/slides/${slug}/`);
      await page.waitForFunction(
        () => document.querySelector('alk-slides')?.dataset.ready === 'true',
      );
      if (
        (await page.locator('alk-slides').getAttribute('data-view')) !== 'read'
      )
        throw new Error('Slide documents must begin in Read');
      if (width === 390) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 2,
        );
        if (overflow) throw new Error(`Reading page overflows: ${slug}`);
      }
      await page.locator('[data-slides-present]').click();
      await page.waitForFunction(
        () =>
          document.querySelector('alk-slides')?.dataset.view === 'present' &&
          document
            .querySelector('[data-slides-present]')
            ?.getAttribute('aria-pressed') === 'true',
      );
      const count = await page.locator('[data-alk-slide]').count();
      for (let index = 0; index < count; index++) {
        await page.locator('[data-slides-picker]').selectOption(String(index));
        await page.waitForFunction(
          (i) =>
            document
              .querySelectorAll('[data-alk-slide]')
              [i].classList.contains('present'),
          index,
        );
        await page.locator('[data-alk-slide].present').evaluate((slide) =>
          Promise.all(
            [...slide.querySelectorAll('img')].map((image) =>
              image.decode().catch((error) => {
                if (image.isConnected)
                  throw new Error(
                    `${image.currentSrc || image.src}: ${error.message}`,
                  );
              }),
            ),
          ),
        );
        await page.waitForFunction(() =>
          [
            ...document.querySelectorAll(
              '[data-alk-slide].present alk-chart,[data-alk-slide].present alk-model,[data-alk-slide].present alk-shader,[data-alk-slide].present alk-diagram',
            ),
          ].every((widget) =>
            ['ready', 'error'].includes(widget.dataset.state),
          ),
        );
        const report = await page
          .locator('[data-alk-slide].present')
          .evaluate((slide) => {
            const content = slide.querySelector('.alk-slide-content');
            const visuals = [
              ...slide.querySelectorAll('.alk-slide-visual'),
            ].map((visual) => {
              const r = visual.getBoundingClientRect();
              for (const child of visual.children) {
                const box = child.getBoundingClientRect();
                if (box.top < r.top - 2 || box.bottom > r.bottom + 2)
                  throw new Error('A figure exceeds its reserved slide area');
              }
              return { x: r.x, y: r.y, w: r.width, h: r.height };
            });
            return {
              layout: slide.dataset.layout,
              overflow: slide.dataset.overflow,
              height: content.clientHeight,
              scroll: content.scrollHeight,
              width: content.clientWidth,
              scrollWidth: content.scrollWidth,
              font: getComputedStyle(slide).fontSize,
              visuals,
            };
          });
        reports.push({ viewportWidth: width, slug, index, ...report });
        if (slug === 'field-notebook' && index > 0 && report.layout !== 'media')
          throw new Error(
            'Widget-only slides must infer media layout even when Astro injects scripts',
          );
        if (report.scrollWidth > report.width + 2)
          throw new Error(
            `Horizontal slide overflow: ${slug} ${index} at ${width}`,
          );
        if (report.scroll > report.height + 2)
          throw new Error(
            `Example content exceeds the slide: ${slug} ${index} at ${width}`,
          );
        if (report.visuals.length > 1 && report.layout === 'split') {
          for (let i = 1; i < report.visuals.length; i++)
            if (
              report.visuals[i].y <
              report.visuals[i - 1].y + report.visuals[i - 1].h - 2
            )
              throw new Error('Split visuals overlap');
        }
        if (index === 0 || (slug === 'layout-sampler' && index === 1))
          await page.screenshot({
            path: `.alkemist/presentation-${slug}-${width}-${index}.png`,
          });
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/slides/`);
  await page.locator('.slides-card img').evaluateAll((images) =>
    Promise.all(
      images.map((image) =>
        image.decode().catch((error) => {
          if (image.isConnected)
            throw new Error(
              `${image.currentSrc || image.src}: ${error.message}`,
            );
        }),
      ),
    ),
  );
  await page.screenshot({
    path: '.alkemist/presentation-library.png',
    fullPage: true,
  });
  if (errors.length) throw new Error(errors.join('; '));
  return reports;
}
