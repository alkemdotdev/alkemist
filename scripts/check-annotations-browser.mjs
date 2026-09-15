// Run against a production preview with playwright-cli:
// playwright-cli -s=annotations open http://127.0.0.1:4330/labs/annotations/
// playwright-cli -s=annotations run-code --filename=scripts/check-annotations-browser.mjs
async function checkAnnotations(page) {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  const selectText = async (locator, length = 18) => {
    await locator.evaluate((element, selectedLength) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode()) && !node.textContent?.trim()) {}
      if (!node?.textContent?.trim()) throw new Error('No selectable text.');
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, Math.min(selectedLength, node.textContent.length));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, length);
  };
  const openDialog = async () => {
    await page.locator('[data-annotations-open]').click();
    await page
      .locator('[data-annotations-dialog]')
      .waitFor({ state: 'visible' });
  };
  const origin = await page.evaluate(() => location.origin);
  const exportPath = '.alkemist/annotations-export.json';

  await page.goto(`${origin}/labs/annotations/`);
  await page.waitForSelector('alk-annotations');
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('alkemist:annotations:')) localStorage.removeItem(key);
  });
  await page.reload();
  await page.waitForSelector('alk-annotations');
  const paper = page.locator('.annotation-paper');
  await selectText(paper.locator('p').first());
  await openDialog();
  await page.getByLabel('Comment').fill('Browser workflow note');
  await page.getByRole('button', { name: 'Save highlight' }).click();
  assert(
    await page.getByText('Browser workflow note').count(),
    'Saved note is not listed.',
  );
  await page
    .locator('[data-annotations-list] > li')
    .first()
    .getByRole('button', { name: 'Edit' })
    .click();
  await page
    .getByLabel('Edit annotation comment')
    .fill('Edited browser workflow note');
  await page.getByRole('button', { name: 'Save edit' }).click();
  assert(
    await page.getByText('Edited browser workflow note').count(),
    'Edited note was not saved.',
  );
  await page.screenshot({
    path: '/Users/cade/dev/alkemist/.alkemist/native-annotations-desktop.png',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: '/Users/cade/dev/alkemist/.alkemist/native-annotations-mobile.png',
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  assert(
    download.suggestedFilename() === 'annotations.json',
    'Unexpected export filename.',
  );
  await download.saveAs(exportPath);
  await page.getByRole('button', { name: 'Delete' }).click();
  assert(
    (await page.locator('[data-annotations-list] > li').count()) === 0,
    'Delete did not remove annotation.',
  );
  await page.locator('[data-annotations-import]').setInputFiles(exportPath);
  await page.getByText('Edited browser workflow note').waitFor();
  assert(
    await page.getByText('Edited browser workflow note').count(),
    'Import did not restore annotation.',
  );
  await page.evaluate(() => {
    window.__annotationTarget = undefined;
    document
      .querySelector('alk-annotations')
      ?.addEventListener('alk:annotation-target', (event) => {
        window.__annotationTarget = event.detail.element.textContent;
      });
  });
  await page.getByRole('button', { name: 'Go to' }).click();
  await page.waitForFunction(
    () => !document.querySelector('[data-annotations-dialog]')?.open,
  );
  assert(
    await page.evaluate(() => Boolean(window.__annotationTarget)),
    'Go to did not emit an annotation target.',
  );
  await page.reload();
  await page.waitForSelector('alk-annotations');
  await openDialog();
  assert(
    await page.getByText('Edited browser workflow note').count(),
    'Reload did not restore local annotation.',
  );

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('alkemist:annotations:'))
        throw new DOMException('Blocked', 'SecurityError');
      return original.call(this, key, value);
    };
  });
  await page.locator('[data-annotations-close]').click();
  await selectText(paper.locator('p').nth(1));
  await openDialog();
  await page.getByLabel('Comment').fill('Temporary fallback note');
  await page.getByRole('button', { name: 'Save highlight' }).click();
  assert(
    await page.getByText(/page session only/).count(),
    'Storage failure was not disclosed.',
  );

  await page.goto(`${origin}/slides/field-notebook/`);
  await page.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  assert(
    (await page.locator('alk-slides').getAttribute('data-view')) === 'read',
    'Slide documents must open in Read',
  );
  await page.locator('[data-slides-present]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('alk-slides')?.dataset.view === 'present' &&
      document
        .querySelector('[data-slides-present]')
        ?.getAttribute('aria-pressed') === 'true',
  );
  const presentText = page
    .locator('[data-alk-slide].present .alk-slide-copy p')
    .first();
  await selectText(presentText);
  await page.locator('alk-slides [data-annotations-open]').click();
  await page.getByLabel('Comment').fill('Slide-local note');
  await page.getByRole('button', { name: 'Save highlight' }).click();
  await page.locator('alk-slides [data-annotations-close]').click();
  await page.getByLabel('Choose slide').selectOption('1');
  await page.getByLabel('Choose slide').selectOption('0');
  await page.locator('alk-slides [data-annotations-open]').click();
  assert(
    await page.getByText('Slide-local note').count(),
    'Slide annotation did not survive section navigation.',
  );
  await page.locator('alk-slides [data-annotations-close]').click();
  await page.getByLabel('Choose slide').selectOption('1');
  await page.locator('alk-slides [data-annotations-open]').click();
  await page.getByRole('button', { name: 'Go to' }).click();
  await page.waitForFunction(
    () => document.querySelector('[data-slides-picker]')?.value === '0',
  );
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return 'Annotations: save/edit/reload/export/delete/import/go-to/fallback and a persisted slide annotation across section navigation.';
}
