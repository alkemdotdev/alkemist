// Open a named playwright-cli session from the repository .alkemist/ directory.
// Run there: playwright-cli -s=alkemist-fields run-code --filename=../docs/art/capture-field-studies.cjs
// Start Astro on 4335 first. Copy the four PNGs into apps/site/src/assets/fields after
// the whole capture finishes, to avoid Astro hot reload interrupting the browser.
// Playwright CLI evaluates a function expression, without a trailing semicolon.
// prettier-ignore
async (page) => {
  const origin = 'http://127.0.0.1:4335';
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const take of ['flux', 'weave', 'vortex', 'knot']) {
    await page.goto(
      origin + '/labs/field-studies/?take=' + take + '&board=black',
    );
    const art = page.locator('form-art[data-form="' + take + '"]');
    await page
      .locator('form-art[data-form="' + take + '"][data-state="ready"]')
      .waitFor();
    await page.addStyleTag({
      content:
        'html,body{background:transparent!important}.form-viewport{background:none!important;border:0!important;width:1200px!important;height:900px!important;aspect-ratio:auto!important}[data-form-note],.form-apparatus,.forms-preview-copy{visibility:hidden!important}astro-dev-toolbar{display:none!important}',
    });
    await art.getByRole('button', { name: 'Reset view', exact: true }).click();
    await page.waitForTimeout(200);
    await art
      .locator('canvas')
      .screenshot({
        path: 'field-poster-' + take + '.png',
        omitBackground: true,
      });
  }
}
