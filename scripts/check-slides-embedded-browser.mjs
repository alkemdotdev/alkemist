// Open /slides/embedded/ in the consumer retained by check:packages --keep.
// playwright-cli -s=embedded run-code --filename=scripts/check-slides-embedded-browser.mjs
async function checkEmbeddedSlides(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForFunction(() => {
    const decks = [...document.querySelectorAll('alk-slides')];
    return (
      decks.length === 2 && decks.every((deck) => deck.dataset.ready === 'true')
    );
  });
  const decks = page.locator('alk-slides');
  for (let index = 0; index < 2; index++) {
    const deck = decks.nth(index);
    await deck.locator('alk-focus button').click();
    if (!(await deck.locator('[data-alk-focused="true"]').count()))
      throw new Error(`Focus targeted another embedded instance: ${index}`);
    await page.keyboard.press('Escape');
  }
  for (let index = 0; index < 2; index++) {
    if ((await decks.nth(index).getAttribute('data-view')) !== 'read')
      throw new Error(`Embedded deck did not open in Read: ${index}`);
    await decks.nth(index).locator('[data-slides-present]').click();
  }
  await page.waitForFunction(() =>
    [...document.querySelectorAll('alk-slides')].every(
      (deck) =>
        deck.dataset.view === 'present' &&
        deck
          .querySelector('[data-slides-present]')
          ?.getAttribute('aria-pressed') === 'true',
    ),
  );
  // Present starts at each reading position; choose a known start before testing independent navigation.
  for (let index = 0; index < 2; index++)
    await decks.nth(index).locator('[data-slides-picker]').selectOption('0');
  await decks.nth(0).locator('[data-slides-next]').click();
  const state = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(
      (element) => element.id,
    );
    return {
      unique: ids.length === new Set(ids).size,
      positions: [...document.querySelectorAll('[data-slides-picker]')].map(
        (element) => element.value,
      ),
      hash: location.hash,
      brokenAria: [
        ...document.querySelectorAll('[aria-describedby],[aria-labelledby]'),
      ]
        .flatMap((element) =>
          (
            element.getAttribute('aria-describedby') ||
            element.getAttribute('aria-labelledby')
          ).split(/\s+/),
        )
        .filter((id) => !document.getElementById(id)),
    };
  });
  if (
    !state.unique ||
    state.positions.join(',') !== '1,0' ||
    state.hash ||
    state.brokenAria.length
  )
    throw new Error(JSON.stringify(state));
  await decks.nth(1).locator('[data-footnote-ref]').click();
  await page.screenshot({
    path: '.alkemist/slides-embedded.png',
    fullPage: true,
  });
  const origin = await page.evaluate(() => location.origin);
  await page.goto(`${origin}/presentation/`);
  await page.waitForFunction(() =>
    [...document.querySelectorAll('alk-slides')].every(
      (frame) => frame.dataset.ready === 'true',
    ),
  );
  const frames = page.locator('alk-slides');
  const layouts = await frames.evaluateAll((elements) =>
    elements.map((element) => element.dataset.layoutKind),
  );
  if (layouts.join(',') !== 'article,deck')
    throw new Error('Typed entries lost their distinct layouts');
  for (let index = 0; index < 2; index++) {
    const frame = frames.nth(index);
    await frame.locator('[data-slides-present]').click();
    await page.waitForFunction(
      (index) =>
        document
          .querySelectorAll('[data-slides-present]')
          [index].getAttribute('aria-pressed') === 'true',
      index,
    );
    if ((await frame.locator('[data-alk-slide].present').count()) !== 1)
      throw new Error('Typed Slide did not present');
    await frame.locator('[data-slides-read]').click();
  }
  return { ...state, layouts };
}
