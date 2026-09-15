// playwright-cli -s=model-parameters run-code --filename=scripts/check-model-parameters-browser.mjs --raw
async function checkModelParameters(page) {
  const origin = await page.evaluate(() => location.origin);
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const requests = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().endsWith('/test/torus-knot.glb'))
      requests.push(request.url());
  });
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/labs/themes-and-parameters/`);
  const themeModel = page.locator('#theme-model');
  await themeModel.evaluate((element) => {
    element.style.width = '160px';
  });
  await themeModel.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => document.querySelector('#theme-model')?.dataset.state === 'ready',
  );
  const themeCanvas = await themeModel.locator('canvas').elementHandle();
  const themeRequests = requests.length;
  const capture = (target) =>
    target.evaluate((element) => {
      element.dispatchEvent(new Event('alk:before-capture'));
      return element.querySelector('canvas').toDataURL();
    });
  const perspectiveImage = await capture(themeModel);
  await themeModel.locator('[data-parameter="view"]').selectOption('top');
  const topImage = await capture(themeModel);
  assert(
    topImage !== perspectiveImage,
    'Changing the Model view did not change the rendered canvas',
  );
  await themeModel.locator('[data-parameter="wireframe"]').check();
  const wireframeImage = await capture(themeModel);
  assert(
    wireframeImage !== topImage,
    'Enabling Model wireframe did not change the rendered canvas',
  );
  assert(
    await themeModel.evaluate(
      (element) =>
        JSON.stringify(element.getParameters()) ===
        JSON.stringify({ view: 'top', wireframe: true }),
    ),
    'Shared Model parameter controls did not update the live view',
  );
  assert(
    await themeCanvas.evaluate(
      (element) =>
        element.isConnected &&
        element === document.querySelector('#theme-model canvas'),
    ),
    'Shared Model parameter controls replaced the canvas',
  );
  assert(
    requests.length === themeRequests,
    'Shared Model parameter controls refetched the GLB',
  );
  const rejectedThemePatch = await themeModel.evaluate((element) => {
    try {
      element.setParameters({ view: 'side' });
      return false;
    } catch {
      return true;
    }
  });
  assert(
    rejectedThemePatch,
    'Invalid shared Model parameter patch was accepted',
  );
  assert(
    (await capture(themeModel)) === wireframeImage,
    'Rejected Model parameter patch changed the rendered canvas',
  );
  await themeModel.evaluate((element) =>
    element.setParameters({ view: 'perspective', wireframe: false }),
  );
  assert(
    (await capture(themeModel)) === perspectiveImage,
    'Portrait initial Model framing differs from the same perspective reset',
  );
  await themeModel.locator('[data-parameter="view"]').selectOption('top');
  await themeModel.locator('[data-parameter="wireframe"]').check();
  await themeModel.screenshot({
    path: '.alkemist/model-parameters-narrow.png',
  });
  await themeModel.evaluate((element) => {
    element.style.width = '';
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await settle();
  await page.setViewportSize({ width: 390, height: 844 });
  await settle();
  assert(
    await themeCanvas.evaluate(
      (element) =>
        element.isConnected &&
        element === document.querySelector('#theme-model canvas'),
    ),
    'Viewport resizing replaced the Model canvas',
  );
  assert(
    await themeModel.evaluate(
      (element) =>
        JSON.stringify(element.getParameters()) ===
        JSON.stringify({ view: 'top', wireframe: true }),
    ),
    'Viewport resizing reset Model parameters',
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/slides/field-notebook/`);
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  await page.evaluate(() => {
    if (document.querySelector('alk-slides')?.dataset.view !== 'present')
      document.querySelector('[data-slides-present]')?.click();
  });
  await page.waitForFunction(
    () =>
      document.querySelector('alk-slides')?.dataset.view === 'present' &&
      document
        .querySelector('[data-slides-present]')
        ?.getAttribute('aria-pressed') === 'true',
  );
  const picker = page.locator('[data-slides-picker]');
  await picker.selectOption('2');
  const model = page.locator('#torus-model');
  await page.waitForFunction(
    () => document.querySelector('#torus-model')?.dataset.state === 'ready',
  );
  const canvas = await model.locator('canvas').elementHandle();
  const slideRequests = requests.length;
  await model.evaluate((element) =>
    element.setParameters({ view: 'top', wireframe: true }),
  );
  assert(
    await model.evaluate(
      (element) =>
        JSON.stringify(element.getParameters()) ===
        JSON.stringify({ view: 'top', wireframe: true }),
    ),
    'Programmatic Model parameters were not applied',
  );
  const options = model.locator('.alk-figure-options');
  await options.locator('summary').click();
  await model.locator('[data-view="front"]').click();
  assert(
    (await model.evaluate((element) => element.getParameters())).view ===
      'front',
    'Camera preset did not update Model parameters',
  );
  await model.locator('[data-wireframe]').uncheck();
  assert(
    (await model.evaluate((element) => element.getParameters())).wireframe ===
      false,
    'Wireframe control did not update Model parameters',
  );
  const rejected = await model.evaluate((element) => {
    const before = element.getParameters();
    try {
      element.setParameters({ view: 'side', wireframe: true });
      return false;
    } catch {
      return JSON.stringify(before) === JSON.stringify(element.getParameters());
    }
  });
  assert(rejected, 'Invalid Model patch was accepted or partially applied');
  await model.locator('[data-figure-focus]').click();
  await page.keyboard.press('Escape');
  const beforePresentationChange = await model.evaluate((element) =>
    element.getParameters(),
  );
  await page.locator('[data-slides-read]').click();
  await page.locator('[data-slides-present]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('alk-slides')?.dataset.view === 'present' &&
      document
        .querySelector('[data-slides-present]')
        ?.getAttribute('aria-pressed') === 'true',
  );
  assert(
    await canvas.evaluate(
      (element) =>
        element.isConnected &&
        element === document.querySelector('#torus-model canvas'),
    ),
    'Focus or presentation changes replaced the Model canvas',
  );
  assert(
    await model.evaluate(
      (element, expected) =>
        JSON.stringify(element.getParameters()) === JSON.stringify(expected),
      beforePresentationChange,
    ),
    'Read or Present reset Model parameters',
  );
  assert(
    requests.length === slideRequests,
    'Changing Model parameters refetched the GLB',
  );
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return {
    modelRequests: { theme: themeRequests, slides: slideRequests },
    parameters: await model.evaluate((element) => element.getParameters()),
  };
}
