// playwright-cli -s=native run-code --filename=scripts/check-native-presentation-browser.mjs
async function checkNativePresentation(page) {
  const origin = await page.evaluate(() => location.origin);
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const evidence = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const open = async (target) => {
    await target.goto(`${origin}/slides/presenting-from-the-browser/`);
    await target.waitForFunction(
      () => document.querySelector('alk-slides')?.dataset.ready === 'true',
    );
  };
  const present = async (target) => {
    await target.locator('[data-slides-present]').click();
    await target.waitForFunction(
      () =>
        document.querySelector('alk-slides')?.dataset.view === 'present' &&
        document
          .querySelector('[data-slides-present]')
          ?.getAttribute('aria-pressed') === 'true',
    );
  };
  const choose = (target, index) =>
    target.locator('[data-slides-picker]').selectOption(String(index));
  const openTools = async (target) => {
    const tools = target.locator('[data-slides-tools]');
    if (!(await tools.evaluate((element) => element.open)))
      await tools.locator('summary').click();
    assert(
      await tools.evaluate((element) => element.open),
      'Tools did not open',
    );
  };
  const at = (target, index) =>
    target.waitForFunction(
      (i) =>
        document.querySelector('[data-slides-picker]')?.value === String(i),
      index,
    );
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  assert(
    (await page.locator('alk-slides').getAttribute('data-view')) === 'read',
    'Desktop slide documents must open in Read',
  );
  await present(page);
  await page.locator('[data-annotations-open]').click();
  await page.keyboard.press('Escape');
  assert(
    (await page.locator('[data-annotations-dialog]').isHidden()) &&
      (await page.locator('alk-slides').getAttribute('data-view')) ===
        'present',
    'Closing annotations left Present',
  );
  await page
    .locator('[data-alk-slide].present .alk-slide-copy p')
    .first()
    .evaluate((p) => {
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let text;
      while ((text = walker.nextNode()) && !text.textContent.trim()) {}
      if (!text) throw new Error('Missing selectable text');
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, text.textContent.length);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
  await page.locator('[data-annotations-open]').click();
  await page
    .getByLabel('Comment', { exact: true })
    .fill('Private receiver isolation fixture');
  await page.locator('[data-annotations-save]').click();
  await page.locator('[data-annotations-close]').click();
  await openTools(page);
  const popup = page.waitForEvent('popup');
  await page.locator('[data-slides-audience]').click();
  const audience = await popup;
  await audience.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  assert(
    (await audience.locator('alk-slides').getAttribute('data-view')) ===
      'present',
    'Audience must open in Present',
  );
  assert(
    await audience.evaluate(
      () =>
        document.querySelector('alk-annotations')?.dataset.disabled ===
          'receiver' &&
        !document
          .querySelector('[data-annotations-list]')
          ?.textContent?.includes('Private receiver isolation fixture') &&
        !CSS.highlights?.get('alk-annotation')?.size,
    ),
    'Audience loaded private reader annotations',
  );
  await choose(page, 1);
  await at(audience, 1);
  assert(
    await audience.locator('[data-slides-controls]').first().isHidden(),
    'Audience exposes speaker controls',
  );
  await audience.locator('.alk-slides-viewport').focus();
  await audience.keyboard.press('Escape');
  await audience.keyboard.press('ArrowRight');
  await choose(page, 2);
  await at(audience, 2);
  assert(
    (await audience.locator('alk-slides').getAttribute('data-view')) ===
      'present',
    'Audience escaped presentation',
  );
  await audience.reload();
  await at(audience, 2);
  await openTools(page);
  await page.locator('[data-slides-blackout]').click();
  await audience.waitForFunction(
    () => document.querySelector('alk-slides').dataset.blackout === 'true',
  );
  await page.locator('[data-slides-blackout-overlay]').click();
  await audience.waitForFunction(
    () => document.querySelector('alk-slides').dataset.blackout === 'false',
  );
  await audience.screenshot({ path: '.alkemist/native-audience.png' });
  await page.locator('[data-slides-read]').click();
  await audience
    .getByText('The presenter ended this session.', { exact: false })
    .waitFor();
  await present(page);
  await choose(page, 3);
  await at(audience, 3);
  await audience.close();
  await page.locator('[data-annotations-open]').click();
  for (const item of await page
    .locator('[data-annotations-list] li')
    .filter({ hasText: 'Private receiver isolation fixture' })
    .all())
    await item.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.locator('[data-annotations-close]').click();
  evidence.push(
    'Audience privacy: same-origin local reader notes and highlights are not loaded.',
  );
  evidence.push(
    'Real audience window: synchronized navigation/blackout, reload rejoin, Escape isolation, end/resume lifecycle.',
  );
  const capabilities = await page.evaluate(() => ({
    wake: Boolean(navigator.wakeLock),
    screens: 'getScreenDetails' in window,
    pip: 'documentPictureInPicture' in window,
    casting: 'PresentationRequest' in window,
    highlights: Boolean(CSS.highlights),
  }));
  evidence.push({ detected: capabilities });
  // Exercise the real browser request; this records a grant/denial, not physical sleep prevention.
  if (capabilities.wake) {
    await page.bringToFront();
    await openTools(page);
    await page.locator('[data-slides-awake]').click();
    await page.waitForFunction(() =>
      ['active', 'denied'].includes(
        document.querySelector('[data-slides-awake]').dataset.state,
      ),
    );
    evidence.push({
      realWakeLock: await page
        .locator('[data-slides-awake]')
        .getAttribute('data-state'),
    });
    await openTools(page);
    await page.locator('[data-slides-awake]').click();
  }
  // Isolated, deterministic API adapters test permission and late-completion paths.
  const probe = await page.context().newPage();
  probe.on('pageerror', (error) => errors.push(error.message));
  await probe.addInitScript(() => {
    window.__native = {
      deny: false,
      locks: [],
      screens: [],
      sent: [],
      requestedScreen: null,
    };
    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true,
      value: class {
        constructor() {
          throw new DOMException('Policy denied', 'SecurityError');
        }
      },
    });
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        async request() {
          if (window.__native.deny)
            throw new DOMException('Policy denied', 'NotAllowedError');
          const lock = new EventTarget();
          lock.released = false;
          lock.release = async () => {
            lock.released = true;
            lock.dispatchEvent(new Event('release'));
          };
          window.__native.locks.push(lock);
          return lock;
        },
      },
    });
    window.getScreenDetails = () =>
      new Promise((resolve, reject) => {
        window.__native.resolveScreen = () => {
          const details = new EventTarget();
          details.screens = [
            { label: 'Laptop', width: 1440, height: 900 },
            { label: 'Projector', width: 1920, height: 1080 },
          ];
          details.currentScreen = details.screens[0];
          window.__native.details = details;
          resolve(details);
        };
        window.__native.rejectScreen = reject;
      });
    HTMLElement.prototype.requestFullscreen = async function (options) {
      window.__native.requestedScreen = options?.screen?.label;
    };
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: {
        requestWindow: async () => {
          if (window.__native.deny)
            throw new DOMException('Denied', 'NotAllowedError');
          const view = window.open(
            'about:blank',
            '',
            'popup,width=460,height=560',
          );
          window.__native.pip = view;
          return view;
        },
      },
    });
    window.PresentationRequest = class {
      async start() {
        if (window.__native.deny)
          throw new DOMException('Cancelled', 'NotAllowedError');
        const c = new EventTarget();
        c.state = 'connected';
        c.send = (text) => window.__native.sent.push(JSON.parse(text));
        c.close = () => {
          c.state = 'closed';
          c.dispatchEvent(new Event('close'));
        };
        c.terminate = () => {
          c.state = 'terminated';
          c.dispatchEvent(new Event('terminate'));
        };
        window.__native.cast = c;
        return c;
      }
    };
  });
  await open(probe);
  assert(
    (await probe.locator('alk-slides').getAttribute('data-view')) === 'read',
    'Native adapter probe must open in Read',
  );
  await present(probe);
  await openTools(probe);
  const fallbackPromise = probe.waitForEvent('popup');
  await probe.locator('[data-slides-audience]').click();
  const fallback = await fallbackPromise;
  await choose(probe, 1);
  await at(fallback, 1);
  await fallback.close();
  evidence.push(
    'Denied BroadcastChannel: validated direct-window fallback still synchronizes.',
  );
  await openTools(probe);
  await probe.locator('[data-slides-screen]').click();
  await probe.locator('[data-slides-read]').click();
  await probe.evaluate(() => window.__native.resolveScreen());
  assert(
    !(await probe.locator('[data-slides-screen-dialog]').isVisible()),
    'Stale permission opened chooser after leaving Present',
  );
  await present(probe);
  await openTools(probe);
  await probe.locator('[data-slides-screen]').click();
  await probe.evaluate(() => window.__native.resolveScreen());
  await probe.keyboard.press('Escape');
  assert(
    (await probe.locator('[data-slides-screen-dialog]').isHidden()) &&
      (await probe.locator('alk-slides').getAttribute('data-view')) ===
        'present',
    'Closing screen chooser left Present',
  );
  await openTools(probe);
  await probe.locator('[data-slides-screen]').click();
  await probe.evaluate(() => window.__native.resolveScreen());
  await probe.getByRole('button', { name: 'Projector · 1920 × 1080' }).click();
  assert(
    (await probe.evaluate(() => window.__native.requestedScreen)) ===
      'Projector',
    'Screen selection failed',
  );
  await openTools(probe);
  await probe.locator('[data-slides-screen]').click();
  await probe.evaluate(() =>
    window.__native.rejectScreen(new DOMException('Denied', 'NotAllowedError')),
  );
  await probe
    .getByText('Display access was not granted.', { exact: false })
    .waitFor();
  await probe.evaluate(() => (window.__native.deny = true));
  await openTools(probe);
  await probe.locator('[data-slides-awake]').click();
  await probe.waitForFunction(
    () =>
      document.querySelector('[data-slides-awake]').dataset.state === 'denied',
  );
  await openTools(probe);
  await probe.locator('[data-slides-awake]').click();
  await openTools(probe);
  await probe.locator('[data-slides-floating]').click();
  await probe
    .getByText('Floating speaker notes could not open.', { exact: false })
    .waitFor();
  await openTools(probe);
  await probe.locator('[data-slides-cast]').click();
  await probe.getByText('No receiver connected.', { exact: false }).waitFor();
  await probe.evaluate(() => (window.__native.deny = false));
  await openTools(probe);
  await probe.locator('[data-slides-awake]').click();
  await probe.waitForFunction(
    () =>
      document.querySelector('[data-slides-awake]').dataset.state === 'active',
  );
  const pipPromise = probe.waitForEvent('popup');
  await openTools(probe);
  await probe.locator('[data-slides-floating]').click();
  const pip = await pipPromise;
  await pip.locator('[data-floating-title]').waitFor();
  await pip.getByRole('button', { name: 'Next', exact: true }).click();
  await at(probe, 2);
  assert(
    (await pip.locator('[data-floating-title]').textContent()) ===
      'A question can stay beside the words',
    'Floating title did not update',
  );
  await pip.screenshot({ path: '.alkemist/native-floating-adapter.png' });
  await openTools(probe);
  await probe.locator('[data-slides-cast]').click();
  await choose(probe, 3);
  assert(
    await probe.evaluate(() =>
      window.__native.sent.some(
        (m) => m.type === 'state' && m.slide === 3 && !('notes' in m),
      ),
    ),
    'Cast state missing or leaked notes',
  );
  await openTools(probe);
  await probe.locator('[data-slides-cast]').click();
  assert(
    (await probe.evaluate(() => window.__native.cast.state)) === 'terminated',
    'Stop casting did not terminate',
  );
  await probe.locator('[data-slides-read]').click();
  assert(
    await probe.evaluate(() =>
      window.__native.locks.every((lock) => lock.released),
    ),
    'Reading retained wake lock',
  );
  assert(pip.isClosed(), 'Leaving Present retained the floating window');
  await probe.close();
  evidence.push(
    'Simulated adapters: display selection/denial/late grant, wake denial/release, floating notes controls/cleanup, casting state/termination and no notes payload.',
  );
  const receiver = await page.context().newPage();
  receiver.on('pageerror', (error) => errors.push(error.message));
  await receiver.addInitScript(() => {
    const connection = new EventTarget();
    connection.state = 'connected';
    connection.send = (text) => {
      window.__receiverSent = text;
    };
    connection.close = () => {
      connection.state = 'closed';
      connection.dispatchEvent(new Event('close'));
    };
    window.__receiverConnection = connection;
    const list = new EventTarget();
    list.connections = [connection];
    Object.defineProperty(navigator, 'presentation', {
      configurable: true,
      value: { receiver: { connectionList: Promise.resolve(list) } },
    });
  });
  await receiver.goto(
    `${origin}/slides/presenting-from-the-browser/?alkCast=0123456789abcdef0123456789abcdef`,
  );
  await receiver.waitForFunction(
    () => document.querySelector('alk-slides')?.dataset.ready === 'true',
  );
  assert(
    (await receiver.locator('alk-slides').getAttribute('data-view')) ===
      'present',
    'Presentation API receiver must open in Present',
  );
  await receiver.evaluate(() => {
    window.__receiverConnection.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'state',
          version: 1,
          session: '0123456789abcdef0123456789abcdef',
          revision: 1,
          slide: 2,
          fragment: -1,
          blackout: true,
        }),
      }),
    );
  });
  await at(receiver, 2);
  await receiver.waitForFunction(
    () => document.querySelector('alk-slides').dataset.blackout === 'true',
  );
  await receiver.evaluate(() => window.__receiverConnection.close());
  await receiver.waitForFunction(
    () => document.querySelector('alk-slides').dataset.blackout === 'false',
  );
  await receiver
    .getByText('Receiver disconnected.', { exact: false })
    .waitFor();
  await receiver.close();
  evidence.push(
    'Simulated receiver: same-page deck reconstruction, validated incoming state, blackout and disconnect recovery.',
  );
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return evidence;
}
