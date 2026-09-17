// Run against a production preview with playwright-cli:
// playwright-cli -s=presentation open http://127.0.0.1:4330/slides/
// playwright-cli -s=presentation run-code --filename=scripts/check-presentation-browser.mjs
// This is a function expression for the CLI page fixture, not a Node program.
async function checkPresentation(page) {
  const base = await page.evaluate(() => location.origin);
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/slides/field-notebook/`);
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  assert(
    (await page.locator('alk-slides').getAttribute('data-view')) === 'read',
    'Desktop slide documents must open in Read',
  );
  await page.locator('[data-slides-present]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('alk-slides')?.dataset.view === 'present' &&
      document
        .querySelector('[data-slides-present]')
        ?.getAttribute('aria-pressed') === 'true',
  );
  const root = page.locator('alk-slides');
  const openChrome = async () => {
    if ((await root.getAttribute('data-view')) !== 'present') return;
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
  const tools = page.locator('[data-slides-tools]');
  const toolsOpen = () => tools.evaluate((element) => element.open);
  const openTools = async () => {
    await openChrome();
    if (!(await toolsOpen())) await tools.locator('summary').click();
    assert(await toolsOpen(), 'Tools did not open');
  };
  const closeTools = async () => {
    if (await toolsOpen()) await tools.locator('summary').click();
    assert(!(await toolsOpen()), 'Tools did not close');
  };
  await page.keyboard.press('ArrowRight');
  assert(
    (await page.locator('[data-slides-picker]').inputValue()) === '1',
    'Presentation must accept navigation immediately on entry',
  );
  await page.keyboard.press('Home');
  await openChrome();
  await page
    .getByRole('button', { name: 'Slide overview', exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector('[data-slides-overview-dialog]')?.open,
  );
  assert(
    (await page.locator('[data-slides-overview-cards] button').count()) > 1,
    'Overview did not create selectable slide cards',
  );
  assert(
    !(
      await page.locator('[data-slides-overview-cards]').textContent()
    ).includes('synthetic or geometric'),
    'Overview leaked speaker notes',
  );
  assert(
    !(
      await page.locator('[data-slides-overview-cards]').textContent()
    ).includes('Original CSV'),
    'Overview included widget controls in its excerpt',
  );
  await page.locator('[data-slides-overview-cards] button').nth(1).click();
  await page.waitForFunction(() =>
    document.activeElement?.classList.contains('alk-slides-viewport'),
  );
  assert(
    (await page.locator('[data-slides-picker]').inputValue()) === '1',
    'Overview selection did not navigate',
  );
  await openTools();
  await page.getByRole('button', { name: 'Keyboard help' }).click();
  await page.waitForFunction(
    () => document.querySelector('[data-slides-help-dialog]')?.open,
  );
  await page.keyboard.press('Escape');
  await openTools();
  await page.locator('[data-slides-pointer]').click();
  assert(
    (await root.getAttribute('data-pointer')) === 'true',
    'Laser pointer did not enable',
  );
  await page.locator('[data-slides-blackout]').click();
  assert(
    (await root.getAttribute('data-blackout')) === 'true',
    'Blackout did not enable',
  );
  await page
    .getByRole('button', { name: 'Restore presentation', exact: true })
    .click();
  assert(
    (await root.getAttribute('data-blackout')) === 'false',
    'Blackout restore control did not disable blackout',
  );
  assert(
    await page
      .locator('.alk-slides-viewport')
      .evaluate((element) => document.activeElement === element),
    'Restoring blackout lost keyboard focus',
  );
  await openTools();
  await page.locator('[data-slides-timer]').click();
  assert(
    (await page.locator('[data-slides-timer]').getAttribute('aria-pressed')) ===
      'true',
    'Timed advance did not start',
  );
  await page.locator('[data-slides-timer]').click();
  await page.locator('.alk-slides-viewport').focus();
  const slideCount = await page.locator('[data-alk-slide]').count();
  await page.keyboard.press('End');
  assert(
    (await page.locator('[data-slides-picker]').inputValue()) ===
      String(slideCount - 1),
    'Viewport End shortcut did not navigate to the last slide',
  );
  await page.keyboard.press('Home');
  assert(
    (await page.locator('[data-slides-picker]').inputValue()) === '0',
    'Viewport Home shortcut did not navigate to the first slide',
  );
  await closeTools();
  await tools.locator('summary').focus();
  await page.keyboard.press('Space');
  assert(
    await page
      .locator('[data-slides-tools]')
      .evaluate((element) => element.open),
    'Tools must open with Space',
  );
  assert(
    (await page.locator('[data-slides-picker]').inputValue()) === '0',
    'Tools Space advanced the deck',
  );
  await page.locator('.alk-slides-viewport').focus();
  const shortcuts = await page
    .locator('.alk-slides-viewport')
    .evaluate((viewport) =>
      ['metaKey', 'ctrlKey', 'altKey'].map((modifier) => {
        const event = new KeyboardEvent('keydown', {
          key: 'p',
          [modifier]: true,
          bubbles: true,
          cancelable: true,
        });
        viewport.dispatchEvent(event);
        return !event.defaultPrevented;
      }),
    );
  assert(
    shortcuts.every(Boolean),
    'Browser modifier shortcuts were intercepted',
  );
  await openTools();
  for (const [aspect, ratio] of [
    ['16:9', 16 / 9],
    ['4:3', 4 / 3],
  ]) {
    const actual = await root.evaluate((element, aspect) => {
      element.dataset.aspect = aspect;
      const rect = element.querySelector('.slides').getBoundingClientRect();
      return rect.width / rect.height;
    }, aspect);
    assert(Math.abs(actual - ratio) < 0.01, `Incorrect ${aspect} stage`);
  }
  await root.evaluate((element) => {
    element.dataset.aspect = 'auto';
    element.style.setProperty('--alk-slide-foreground', 'rgb(200, 220, 240)');
    element.style.setProperty('--alk-slide-heading-font', 'monospace');
  });
  const custom = await page
    .locator('[data-alk-slide].present h1')
    .evaluate((heading) => ({
      color: getComputedStyle(heading).color,
      font: getComputedStyle(heading).fontFamily,
    }));
  assert(
    custom.color === 'rgb(200, 220, 240)' && custom.font === 'monospace',
    'Custom slide tokens were not applied',
  );
  await root.evaluate((element) => element.removeAttribute('style'));
  await openTools();
  await page.locator('[data-slides-timer-seconds]').selectOption('5');
  await page.locator('[data-slides-timer]').click();
  await page.waitForFunction(
    () => document.querySelector('[data-slides-picker]').value === '1',
    { timeout: 8000 },
  );
  await page.locator('[data-slides-read]').click();
  await page.waitForFunction(
    () => document.querySelector('alk-slides').dataset.view === 'read',
  );
  assert(
    (await page.locator('[data-slides-timer]').getAttribute('aria-pressed')) ===
      'false',
    'Read did not stop timed advance',
  );
  assert(
    await page.evaluate(
      () =>
        getComputedStyle(document.body).overflow !== 'hidden' &&
        !document.querySelector('header')?.inert,
    ),
    'Read did not restore host scrolling and interaction',
  );
  await page.locator('[data-slides-present]').click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('.alk-slides-viewport')
        ?.classList.contains('reveal') &&
      document
        .querySelector('[data-slides-present]')
        ?.getAttribute('aria-pressed') === 'true',
  );
  if (await page.evaluate(() => document.fullscreenEnabled)) {
    await openTools();
    await page.locator('[data-slides-fullscreen]').click();
    await page.waitForFunction(
      () => document.fullscreenElement?.tagName === 'ALK-SLIDES',
    );
    await openTools();
    await page.locator('[data-slides-fullscreen]').click();
    await page.waitForFunction(() => !document.fullscreenElement);
  }
  await openTools();
  await page.screenshot({ path: '.alkemist/presentation-controls.png' });
  return 'Presentation controls: overview, dialogs, pointer, blackout restore, timer, viewport keyboard navigation, aspect ratios, theme tokens, timed navigation, and fullscreen where available.';
}
