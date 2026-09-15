// Run against a production preview with playwright-cli:
// playwright-cli -s=chart-exploration open http://127.0.0.1:4330/labs/themes-and-parameters/
// playwright-cli -s=chart-exploration run-code --filename=scripts/check-chart-exploration-browser.mjs --raw
async function checkChartExploration(page) {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const close = (actual, expected) =>
    actual.length === expected.length &&
    actual.every((value, index) => Math.abs(value - expected[index]) < 1e-8);
  const readDownload = async (download) => {
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(...chunk);
    return {
      bytes: chunks,
      text: chunks.map((value) => String.fromCharCode(value)).join(''),
    };
  };
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().endsWith('.csv')) requests.push(request.url());
  });
  const origin = await page.evaluate(() => location.origin);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${origin}/labs/themes-and-parameters/`);
  const chart = page.locator('#theme-chart');
  await chart.waitFor();
  await chart.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => document.querySelector('#theme-chart')?.dataset.state === 'ready',
  );
  const host = await chart.elementHandle();
  const mount = await chart.locator('.alk-chart-canvas > div').elementHandle();
  assert(mount && host, 'Chart did not mount a Vega view.');
  assert(
    !(await chart.locator('[data-chart-download-csv]').isDisabled()),
    'Prepared-data export remained disabled after the chart became ready.',
  );
  requests.length = 0;

  await chart.locator('.alk-chart-data-tools > summary').click();
  assert(
    await chart.locator('.alk-chart-table table').count(),
    'Prepared data table did not render.',
  );
  assert(
    await chart
      .locator('.alk-chart-table caption')
      .textContent()
      .then((text) => text?.includes('Prepared rows plotted')),
    'Table did not identify its prepared plotted rows.',
  );
  await chart.locator('[data-chart-table-next]').click();
  assert(
    await mount.evaluate(
      (element, chartHost) =>
        element === chartHost.querySelector('.alk-chart-canvas > div'),
      host,
    ),
    'Changing the data-table page remounted the Vega view.',
  );
  assert(requests.length === 0, 'Changing the data table refetched the CSV.');

  const initialDomain = await chart.evaluate((element) =>
    element.result.view.scale('x').domain(),
  );
  const zoomedDomain = await chart.evaluate(async (element) => {
    const view = element.result.view;
    const [start, end] = view.scale('x').domain();
    const domain = [start + (end - start) * 0.25, end - (end - start) * 0.25];
    view.signal('alk_window_time', domain);
    await view.runAsync();
    return view.scale('x').domain();
  });
  assert(
    !close(zoomedDomain, initialDomain),
    'Test zoom did not change x extent.',
  );
  await chart.locator('[data-parameter="grid"]').uncheck();
  await page.waitForFunction(
    () =>
      document.querySelector('#theme-chart')?.dataset.state === 'ready' &&
      document.querySelector('#theme-chart').getParameters().grid === false,
  );
  const preservedDomain = await chart.evaluate((element) =>
    element.result.view.scale('x').domain(),
  );
  assert(
    close(preservedDomain, zoomedDomain),
    'Changing a chart parameter discarded the current zoom extent.',
  );
  await chart.locator('[data-chart-reset]').click();
  await page.waitForFunction(
    () => document.querySelector('#theme-chart')?.dataset.state === 'ready',
  );
  const resetDomain = await chart.evaluate((element) =>
    element.result.view.scale('x').domain(),
  );
  assert(
    close(resetDomain, initialDomain),
    'Reset view retained the zoom extent.',
  );

  const retainedDomain = await chart.evaluate(async (element) => {
    const view = element.result.view;
    const [start, end] = view.scale('x').domain();
    const domain = [start + (end - start) * 0.2, end - (end - start) * 0.2];
    view.signal('alk_window_time', domain);
    await view.runAsync();
    return view.scale('x').domain();
  });
  await chart.locator('[data-parameter="zoom"]').uncheck();
  await page.waitForFunction(
    () =>
      document.querySelector('#theme-chart')?.dataset.state === 'ready' &&
      document.querySelector('#theme-chart').getParameters().zoom === false,
  );
  assert(
    close(
      await chart.evaluate((element) =>
        element.result.view.scale('x').domain(),
      ),
      retainedDomain,
    ),
    'Turning zoom and pan off reset the current extent.',
  );
  await chart.locator('[data-parameter="zoom"]').check();
  await page.waitForFunction(
    () =>
      document.querySelector('#theme-chart')?.dataset.state === 'ready' &&
      document.querySelector('#theme-chart').getParameters().zoom === true,
  );
  assert(
    close(
      await chart.evaluate((element) =>
        element.result.view.scale('x').domain(),
      ),
      retainedDomain,
    ),
    'Turning zoom and pan on did not retain the current extent.',
  );
  await chart.locator('[data-chart-reset]').click();
  await page.waitForFunction(
    () => document.querySelector('#theme-chart')?.dataset.state === 'ready',
  );
  assert(
    close(
      await chart.evaluate((element) =>
        element.result.view.scale('x').domain(),
      ),
      initialDomain,
    ),
    'Reset view did not discard the retained zoom extent.',
  );

  const csvDownload = page.waitForEvent('download');
  await chart.locator('[data-chart-download-csv]').click();
  const csv = await readDownload(await csvDownload);
  assert(
    csv.text.startsWith('time,position,velocity\r\n0,1,0\r\n'),
    'CSV export did not contain prepared headers and rows.',
  );
  const svgDownload = page.waitForEvent('download');
  await chart.locator('[data-chart-export="svg"]').click();
  const svg = await readDownload(await svgDownload);
  assert(svg.text.includes('<svg'), 'SVG export is not SVG content.');
  const pngDownload = page.waitForEvent('download');
  await chart.locator('[data-chart-export="png"]').click();
  const png = await readDownload(await pngDownload);
  assert(
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => png.bytes[index] === value,
    ),
    'PNG export is missing its PNG signature.',
  );

  await chart.evaluate((element) => {
    const view = element.result.view;
    let resolve;
    view.toSVG = () => new Promise((done) => (resolve = done));
    window.__resolveStaleChartExport = () => resolve('<svg/>');
  });
  await chart.locator('[data-chart-export="svg"]').click();
  await chart.evaluate((element) => element.setParameters({ grid: true }));
  await page.evaluate(() => window.__resolveStaleChartExport());
  await page.waitForFunction(
    () => document.querySelector('#theme-chart')?.dataset.state === 'ready',
  );
  assert(
    !(await chart.locator('.alk-chart-status').textContent()).includes(
      'exported',
    ),
    'A stale export overwrote the newer render status.',
  );
  await page.screenshot({ path: '.alkemist/chart-exploration-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const chart = document.querySelector('#theme-chart');
    const svg = chart?.querySelector('.alk-chart-canvas svg');
    return (
      chart?.dataset.state === 'ready' &&
      Number(svg?.getAttribute('width')) <= chart.clientWidth + 2
    );
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
    'Chart data controls overflow the phone viewport.',
  );
  await page.screenshot({ path: '.alkemist/chart-exploration-mobile.png' });

  await chart.evaluate((element) => {
    element.result.view.toSVG = () => new Promise(() => {});
  });
  await chart.locator('[data-chart-export="svg"]').click();
  await chart.evaluate((element) => element.remove());
  await page.waitForTimeout(50);
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return 'Chart exploration: prepared paginated table, zoom preservation/reset, verified CSV/SVG/PNG output, and stale-export cancellation.';
}
