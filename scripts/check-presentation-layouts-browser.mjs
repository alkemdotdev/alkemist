// playwright-cli -s=layout-workbench run-code --filename=scripts/check-presentation-layouts-browser.mjs --raw
async function checkPresentationLayouts(page) {
  const origin = await page.evaluate(() => location.origin);
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reports = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/labs/presentation-layouts/`);
    await page.waitForFunction(() =>
      [...document.querySelectorAll('alk-slides')].every(
        (e) => e.dataset.ready === 'true',
      ),
    );
    for (const kind of ['article', 'deck']) {
      const frame = page.locator(`#${kind}-example`);
      const section = frame.locator('[data-alk-slide]').first();
      await section.scrollIntoViewIfNeeded();
      const style = await section.evaluate((e) => {
        const s = getComputedStyle(e);
        return {
          padding: parseFloat(s.paddingLeft),
          border: parseFloat(s.borderLeftWidth),
          width: e.getBoundingClientRect().width,
        };
      });
      assert(
        kind === 'article'
          ? style.padding === 0 && style.border === 0
          : style.padding >= 22 && style.border === 1,
        `${kind} has the wrong reading surface`,
      );
      const content = await frame.locator('[data-alk-slide]').allTextContents();
      const chart = frame.locator('alk-chart');
      await chart.scrollIntoViewIfNeeded();
      await chart.locator('[data-parameter="ink"]').selectOption('teal');
      const host = await chart.elementHandle();
      await frame.locator('[data-slides-present]').click();
      await page.waitForFunction(
        (id) =>
          document
            .querySelector(`#${id} [data-slides-present]`)
            ?.getAttribute('aria-pressed') === 'true',
        `${kind}-example`,
      );
      assert(
        await chart.evaluate((e) => e.getParameters().ink === 'teal'),
        'Present reset chart parameters',
      );
      await frame.locator('[data-slides-picker]').selectOption('1');
      await chart.locator('[data-figure-focus]').click();
      await chart.locator('.alk-chart-data-tools > summary').click();
      await page.waitForFunction((id) => {
        const focused = document.querySelector(
          `#${id} [data-alk-focused="true"]`,
        );
        const canvas = focused?.querySelector('.alk-chart-canvas');
        return (
          focused && canvas && canvas.clientHeight < focused.clientHeight - 100
        );
      }, `${kind}-example`);
      await chart.locator('.alk-focus-close').click();
      await frame.locator('[data-slides-read]').click();
      await page.waitForFunction(
        (id) => document.getElementById(id)?.dataset.view === 'read',
        `${kind}-example`,
      );
      assert(
        await host.evaluate(
          (e) => e.isConnected && e.getParameters().ink === 'teal',
        ),
        'Read replaced the figure or its state',
      );
      const after = await frame.locator('[data-alk-slide]').allTextContents();
      // Titles and authored paragraphs retain their nodes; generated chart status can change.
      assert(content[0] === after[0], 'Presentation changed authored content');
      assert(
        await page.evaluate(() => location.hash === ''),
        'Embedded navigation changed host URL',
      );
      reports.push({ viewportWidth: width, kind, ...style });
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
      'Reading layout overflows viewport',
    );
  }
  // Every named style uses the same shared token contract, in both reading layouts.
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const style of ['default', 'paper', 'chalk', 'blueprint']) {
    await page.evaluate((style) => {
      document.documentElement.dataset.alkThemeStyle = style;
      window.dispatchEvent(new Event('alk:theme-change'));
    }, style);
    const tokens = await page.locator('#deck-example').evaluate((e) => ({
      paper: getComputedStyle(e).getPropertyValue('--alk-paper'),
      ink: getComputedStyle(e).getPropertyValue('--alk-ink'),
    }));
    assert(
      tokens.paper.trim() && tokens.ink.trim(),
      `Missing ${style} theme tokens`,
    );
  }
  assert(errors.length === 0, errors.join('\n'));
  return reports;
}
