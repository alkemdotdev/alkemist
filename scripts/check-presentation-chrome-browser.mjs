// playwright-cli -s=presentation-chrome open http://127.0.0.1:4330/slides/
// playwright-cli -s=presentation-chrome run-code --filename=scripts/check-presentation-chrome-browser.mjs --raw
async function checkPresentationChrome(page) {
  const origin = await page.evaluate(() => location.origin);
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__alkemistFullscreenRequests = 0;
    const original = Element.prototype.requestFullscreen;
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      value(...args) {
        window.__alkemistFullscreenRequests++;
        return original?.apply(this, args);
      },
    });
  });
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
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
  const chrome = page.locator('[data-slides-chrome]');
  const visibleChrome = () =>
    page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '.alk-slides-toolbar, .alk-slides-navigation',
        ),
      ].every((element) => !element.hidden),
    );
  const hiddenChrome = () =>
    page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '.alk-slides-toolbar, .alk-slides-navigation',
        ),
      ].every((element) => element.hidden),
    );
  const geometry = () =>
    page.evaluate(() => {
      const root = document.querySelector('alk-slides');
      const viewport = root?.querySelector('.alk-slides-viewport');
      if (!root || !viewport) throw new Error('Presentation stage missing');
      const rootRect = root.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      return { rootRect, viewportRect, width: innerWidth, height: innerHeight };
    });
  const assertStageFillsRoot = async (label) => {
    const rects = await geometry();
    for (const key of ['x', 'y', 'width', 'height'])
      assert(
        Math.abs(rects.rootRect[key] - rects.viewportRect[key]) < 1,
        `${label}: viewport does not reach the ${key} edge of its root`,
      );
  };
  const decodeImages = () =>
    page.locator('img').evaluateAll((images) =>
      Promise.all(
        images.map((image) =>
          image.decode().catch((error) => {
            if (image.isConnected) throw error;
          }),
        ),
      ),
    );

  for (const viewport of [
    { width: 1440, height: 900, name: 'desktop' },
    { width: 390, height: 844, name: 'mobile' },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${origin}/slides/field-notebook/`);
    await page.waitForFunction(
      () => document.querySelector('alk-slides')?.dataset.ready === 'true',
    );
    assert(
      await page.evaluate(() => location.hash === ''),
      `${viewport.name}: default slide URL has a hash`,
    );
    await present();
    assert(
      (await chrome.getAttribute('aria-expanded')) === 'false' &&
        (await hiddenChrome()),
      `${viewport.name}: Present exposed controls by default`,
    );
    await assertStageFillsRoot(viewport.name);
    assert(
      (await page.evaluate(() => window.__alkemistFullscreenRequests)) === 0 &&
        (await page.evaluate(() => !document.fullscreenElement)),
      `${viewport.name}: entering Present requested fullscreen`,
    );
    await decodeImages();
    await page.screenshot({
      path: `.alkemist/presentation-chrome-${viewport.name}.png`,
    });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/slides/field-notebook/`);
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  await present();
  const closedGeometry = await geometry();
  await chrome.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-slides-chrome]')
        ?.getAttribute('aria-expanded') === 'true',
  );
  assert(await visibleChrome(), 'Chrome button did not show both control bars');
  const openGeometry = await geometry();
  for (const key of ['x', 'y', 'width', 'height'])
    assert(
      Math.abs(
        closedGeometry.viewportRect[key] - openGeometry.viewportRect[key],
      ) < 1,
      `Opening controls resized the stage ${key}`,
    );
  await page.locator('[data-slides-picker]').selectOption('1');
  await page.waitForFunction(
    () => document.querySelector('#signal-chart')?.dataset.state === 'ready',
  );
  const chart = await page.locator('#signal-chart').elementHandle();
  const chartSurface = await page
    .locator('#signal-chart canvas, #signal-chart svg')
    .first()
    .elementHandle();
  await page.locator('.alk-slides-viewport').focus();
  await page.keyboard.press('c');
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-slides-chrome]')
        ?.getAttribute('aria-expanded') === 'false',
  );
  assert(await hiddenChrome(), 'C did not hide presentation controls');
  await page.keyboard.press('c');
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-slides-chrome]')
        ?.getAttribute('aria-expanded') === 'true',
  );
  assert(await visibleChrome(), 'C did not reopen presentation controls');
  assert(
    await chart.evaluate(
      (element) => element === document.querySelector('#signal-chart'),
    ),
    'Opening controls replaced a live widget',
  );
  assert(
    await chartSurface.evaluate(
      (element) =>
        element ===
        document.querySelector('#signal-chart canvas, #signal-chart svg'),
    ),
    'Opening controls replaced the live widget surface',
  );
  assert(
    await chrome.evaluate((element) => element === document.activeElement),
    'C did not focus the chrome toggle when opening controls',
  );
  await page.keyboard.press('Tab');
  if (
    !(await page
      .locator('[data-slides-read]')
      .evaluate((element) => element === document.activeElement))
  ) {
    await chrome.focus();
    await page.keyboard.press('Alt+Tab');
  }
  assert(
    await page
      .locator('[data-slides-read]')
      .evaluate((element) => element === document.activeElement),
    'Tab from chrome did not reach Back to reading',
  );
  await chrome.focus();
  await page.keyboard.press('c');
  assert(
    await page
      .locator('.alk-slides-viewport')
      .evaluate((element) => element === document.activeElement),
    'C did not return focus to the viewport when hiding controls',
  );
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(
    () => document.querySelector('[data-slides-picker]')?.value === '2',
  );
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(
    () => document.querySelector('[data-slides-picker]')?.value === '1',
  );
  await page.keyboard.press('c');
  await page.locator('[data-parameter="ink"]').focus();
  await page.keyboard.press('c');
  assert(
    (await chrome.getAttribute('aria-expanded')) === 'true',
    'Interactive input C shortcut toggled presentation controls',
  );
  await page.locator('[data-slides-read]').click();
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.view === 'read',
  );
  assert(
    (await chrome.getAttribute('aria-expanded')) === 'false' &&
      (await chrome.isHidden()) &&
      (await page.locator('.alk-slides-toolbar').isVisible()) &&
      (await page.locator('.alk-slides-navigation').isHidden()),
    'Back to reading did not restore the reading controls',
  );
  await present();
  assert(
    (await chrome.getAttribute('aria-expanded')) === 'false' &&
      (await hiddenChrome()),
    'Present after reading did not start with hidden controls',
  );
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  assert(
    (await page.locator('alk-slides').getAttribute('data-view')) ===
      'present' &&
      (await chrome.getAttribute('aria-expanded')) === 'false' &&
      (await hiddenChrome()),
    'A presentation hash did not restore with hidden chrome',
  );
  await chrome.click();
  await page.locator('[data-slides-read]').click();
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.view === 'read',
  );
  assert(
    await page.evaluate(() => !location.hash.startsWith('#/')),
    'Back to reading retained a presentation hash',
  );

  const touchContext = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
  const touchPage = await touchContext.newPage();
  try {
    await touchPage.goto(`${origin}/slides/field-notebook/`);
    await touchPage.waitForFunction(
      () => document.querySelector('alk-slides')?.dataset.ready === 'true',
    );
    await touchPage.locator('[data-slides-present]').click();
    await touchPage.waitForFunction(
      () => document.querySelector('alk-slides')?.dataset.view === 'present',
    );
    const touchChrome = touchPage.locator('[data-slides-chrome]');
    assert(
      (await touchChrome.getAttribute('aria-expanded')) === 'false',
      'Touch presentation exposed controls by default',
    );
    const box = await touchChrome.boundingBox();
    assert(box, 'Touch presentation chrome has no hit target');
    await touchPage.touchscreen.tap(
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    await touchPage.waitForFunction(
      () =>
        document
          .querySelector('[data-slides-chrome]')
          ?.getAttribute('aria-expanded') === 'true',
    );
    await touchPage
      .locator('img')
      .evaluateAll((images) =>
        Promise.all(
          images.map((image) => image.decode().catch(() => undefined)),
        ),
      );
    await touchPage.screenshot({
      path: '.alkemist/presentation-chrome-mobile-touch.png',
    });
  } finally {
    await touchContext.close();
  }
  await settle();
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return {
    checks: [
      'desktop and mobile default-hidden chrome',
      'edge-to-edge stage and no automatic fullscreen',
      'click, C, and touch chrome toggles without stage resize',
      'focus order, live widget identity, and interactive key preservation',
      'Read resets chrome, re-entering Present stays clean, and touch opens chrome',
    ],
  };
}
