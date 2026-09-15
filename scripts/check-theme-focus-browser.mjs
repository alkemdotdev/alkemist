// playwright-cli -s=theme-focus run-code --filename=scripts/check-theme-focus-browser.mjs --raw
async function checkThemesAndFocus(page) {
  const origin = await page.evaluate(() => location.origin);
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const errors = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const csvRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().endsWith('/test/oscillation.csv'))
      csvRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/slides/interacting-with-the-field/`);
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  const root = page.locator('alk-slides');
  assert(
    (await root.getAttribute('data-view')) === 'read',
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
  const picker = page.locator('[data-slides-picker]');
  const tools = page.locator('[data-slides-tools]');
  const openTools = async () => {
    if (!(await tools.evaluate((element) => element.open)))
      await tools.locator('summary').click();
  };
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  await picker.selectOption('1');
  const field = page.locator('#live-field');
  await page.waitForFunction(
    () => document.querySelector('#live-field')?.dataset.state === 'ready',
  );
  const canvas = await field.locator('canvas').elementHandle();
  await field.locator('[data-frequency]').focus();
  await page.keyboard.press('ArrowRight');
  assert(
    (await picker.inputValue()) === '1',
    'A parameter arrow navigated the deck',
  );
  assert(
    (await field.evaluate((element) => element.getParameters())).frequency ===
      9.1,
    'Native range input did not update parameters',
  );
  await field.locator('[data-figure-focus]').click();
  await page.waitForFunction(() =>
    document.querySelector('#live-field')?.matches(':popover-open'),
  );
  await settle();
  assert(
    await field.evaluate(
      (element) => element.getBoundingClientRect().height > 800,
    ),
    'Focus did not enlarge the existing figure',
  );
  assert(
    await page
      .locator('.alk-slides-toolbar')
      .evaluate((element) => element.inert),
    'Focus did not inert background controls',
  );
  await field.locator('[data-angle]').focus();
  await page.keyboard.press('End');
  assert(
    (await field.evaluate((element) => element.getParameters())).angle === 180,
    'Range End did not update the field',
  );
  assert((await picker.inputValue()) === '1', 'Focused input changed slides');
  await field.locator('[data-play]').focus();
  await page.keyboard.press('Tab');
  assert(
    await field.evaluate((element) => element.contains(document.activeElement)),
    'Tab escaped the focused figure',
  );
  await page.screenshot({ path: '.alkemist/themes-focus-figure.png' });
  await page.keyboard.press('Escape');
  assert(
    !(await field.getAttribute('data-alk-focused')),
    'Escape did not exit focus',
  );
  assert(
    (await root.getAttribute('data-view')) === 'present',
    'Focus Escape left Present',
  );
  assert(
    await field
      .locator('[data-figure-focus]')
      .evaluate((element) => element === document.activeElement),
    'Focus did not return to its invoker',
  );
  assert(
    await canvas.evaluate(
      (element) =>
        element.isConnected &&
        element === document.querySelector('#live-field canvas'),
    ),
    'Focus replaced the live canvas',
  );
  await page.locator('[data-slides-read]').click();
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.view === 'read',
  );
  assert(
    (await field.evaluate((element) => element.getParameters())).angle === 180,
    'Read mode reset parameters',
  );
  await page.locator('[data-slides-present]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('alk-slides')?.dataset.view === 'present' &&
      document
        .querySelector('[data-slides-present]')
        ?.getAttribute('aria-pressed') === 'true',
  );
  await field.locator('[data-parameters-reset]').click();
  assert(
    (await field.evaluate((element) => element.getParameters())).frequency ===
      9,
    'Reset did not restore authored values',
  );
  const rejected = await field.evaluate((element) =>
    [
      { frequency: NaN },
      { frequency: 30 },
      { angle: 24.2 },
      { missing: 2 },
    ].every((patch) => {
      try {
        element.setParameters(patch);
        return false;
      } catch {
        return true;
      }
    }),
  );
  assert(rejected, 'Invalid programmatic parameter patch was accepted');

  await picker.selectOption('2');
  const chart = page.locator('#live-trace');
  await page.waitForFunction(
    () => document.querySelector('#live-trace')?.dataset.state === 'ready',
  );
  await chart.locator('[data-parameter="ink"]').selectOption('violet');
  await chart.locator('[data-parameter="grid"]').uncheck();
  await chart.locator('[data-parameter="zoom"]').uncheck();
  await chart.locator('[data-parameter="zoom"]').check();
  assert(
    (await chart.evaluate((element) => element.getParameters())).zoom === true,
    'Zoom could not be reenabled',
  );
  assert(csvRequests.length === 1, 'Parameter updates refetched the chart CSV');
  await chart.locator('[data-figure-focus]').click();
  await settle();
  await page.keyboard.press('Escape');
  assert(
    (await chart.evaluate((element) => element.getParameters())).ink ===
      'violet',
    'Chart focus reset its parameters',
  );

  await picker.selectOption('1');
  const styles = [];
  for (const theme of ['default', 'paper', 'chalk', 'blueprint']) {
    for (const mode of ['light', 'dark']) {
      await openTools();
      await page.locator('[data-slides-theme]').selectOption(theme);
      await page.locator('[data-slides-color-scheme]').selectOption(mode);
      const result = await root.evaluate((element) => {
        const computed = getComputedStyle(element);
        const color = (value) =>
          value
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              v /= 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        const fg = color(computed.color),
          bg = color(computed.backgroundColor);
        return {
          theme: element.dataset.alkThemeStyle,
          mode: computed.colorScheme,
          contrast: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
          background: computed.backgroundColor,
          pattern: getComputedStyle(
            element.querySelector('.alk-slides-viewport'),
          ).backgroundImage,
        };
      });
      assert(result.contrast >= 4.5, `${theme}/${mode} text contrast failed`);
      assert(
        theme !== 'blueprint' || result.pattern.includes('linear-gradient'),
        'Shared Blueprint grid is absent',
      );
      styles.push(result);
    }
  }
  await page.keyboard.press('Escape');
  assert(
    (await root.getAttribute('data-view')) === 'present',
    'Tools Escape left Present',
  );
  await settle();
  await page.screenshot({ path: '.alkemist/themes-focus-blueprint.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await settle();
  const overflow = await root.evaluate((element) =>
    [
      ...element.querySelectorAll(
        '.alk-slides-toolbar, .alk-slides-navigation',
      ),
    ].some((bar) => bar.scrollWidth > bar.clientWidth + 2),
  );
  assert(!overflow, 'Mobile presentation controls overflow');
  await page.screenshot({ path: '.alkemist/themes-focus-mobile.png' });
  await field.locator('[data-figure-focus]').click();
  await settle();
  await page.screenshot({ path: '.alkemist/themes-focus-mobile-figure.png' });
  assert(
    await field.locator('.alk-focus-close').isVisible(),
    'Mobile focus exit is not reachable',
  );
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/labs/themes-and-parameters/`);
  await page.locator('[data-choose-theme="paper"]').click();
  await page.reload();
  assert(
    (await page.locator('html').getAttribute('data-alk-theme-style')) ===
      'paper',
    'Site theme did not persist',
  );
  await page.locator('[data-choose-theme="blueprint"]').click();
  const standalone = page.locator('#theme-field');
  await page
    .getByRole('button', {
      name: 'Focus figure: Two-source interference',
      exact: true,
    })
    .click();
  await page.waitForFunction(() =>
    document.querySelector('#theme-field')?.matches(':popover-open'),
  );
  await page.keyboard.press('Escape');
  assert(
    !(await standalone.getAttribute('data-alk-focused')),
    'Standalone Focus did not close',
  );
  await page.screenshot({ path: '.alkemist/themes-focus-lab.png' });
  await page.locator('.alk-theme-menu > summary').click();
  await page.locator('input[name="alk-theme-style"][value="chalk"]').check();
  await page.locator('.alk-theme-menu > summary').click();
  await page.locator('input[name="alk-theme"][value="dark"]').check();
  assert(
    (await page.locator('html').getAttribute('data-alk-theme-style')) ===
      'chalk',
    'Header did not apply the shared style',
  );
  assert(
    (await page.locator('html').getAttribute('data-alk-theme')) === 'dark',
    'Header did not apply the independent color mode',
  );
  await page.evaluate(() => {
    const invoker = document.createElement('alk-focus');
    invoker.id = 'late-focus';
    invoker.dataset.target = 'late-figure';
    invoker.innerHTML = '<button hidden>Focus late figure</button>';
    document.querySelector('main').append(invoker);
  });
  assert(
    await page.locator('#late-focus button').isHidden(),
    'A missing target left a usable focus button',
  );
  await page.evaluate(() => {
    const target = document.createElement('div');
    target.id = 'late-figure';
    target.dataset.alkFocused = 'authored';
    target.innerHTML = '<h2>Late figure</h2><button>Inside figure</button>';
    document.querySelector('main').append(target);
  });
  await page.locator('#late-focus button').click();
  await page.keyboard.press('Escape');
  assert(
    (await page.locator('#late-figure').getAttribute('data-alk-focused')) ===
      'authored',
    'Focus did not restore authored attributes',
  );
  await page.locator('#late-focus button').click();
  await page.locator('#late-figure').evaluate((element) => element.remove());
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll('[inert]')].some(
        (element) => element.inert,
      ),
  );
  assert(
    await page.locator('#late-focus button').isHidden(),
    'Removed target left its trigger enabled',
  );
  await page.locator('#late-focus').evaluate((element) => element.remove());
  const fallback = await page.context().newPage();
  try {
    await fallback.addInitScript(() => {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', {
        value: undefined,
        configurable: true,
      });
    });
    await fallback.goto(`${origin}/labs/themes-and-parameters/`);
    await fallback.waitForFunction(
      () => document.querySelector('#theme-field')?.dataset.state === 'ready',
    );
    assert(
      await fallback.locator('alk-focus button').first().isHidden(),
      'Unsupported focus control was exposed',
    );
    assert(
      await fallback.locator('#theme-field [data-frequency]').isEnabled(),
      'Missing Popover disabled inline parameter input',
    );
  } finally {
    await fallback.close();
  }
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return {
    styles,
    csvRequests: csvRequests.length,
    checks: [
      'native parameter input and validation',
      'focus canvas identity and focus return',
      'inert background and contained Tab',
      'Read/Present state preservation',
      'chart zoom reenabling without refetch',
      'eight theme/color combinations',
      '390px controls and focus',
      'standalone focus and persistent site theme',
      'late and removed focus targets, exact attribute restoration',
      'header appearance controls and no-Popover inline fallback',
    ],
  };
}
