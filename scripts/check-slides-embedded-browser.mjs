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
  return state;
}
