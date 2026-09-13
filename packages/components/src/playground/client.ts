import {
  playgroundSource,
  presetPlaygroundValues,
  resetPlaygroundValues,
  validatePlaygroundValues,
  type PlaygroundDefinition,
} from './helpers';

function parseControlValue(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): unknown {
  const type = input.dataset.controlType;
  if (type === 'boolean' && input instanceof HTMLInputElement)
    return input.checked;
  if (type === 'number')
    return input.value === '' ? Number.NaN : Number(input.value);
  if (type === 'json') {
    try {
      return JSON.parse(input.value);
    } catch {
      return Symbol('invalid-json');
    }
  }
  return input.value;
}

function hostTheme(): 'light' | 'dark' | 'system' {
  const theme = document.documentElement.dataset.alkTheme;
  return theme === 'light' || theme === 'dark' || theme === 'system'
    ? theme
    : 'system';
}

document
  .querySelectorAll<HTMLElement>('[data-alk-playground]')
  .forEach((root) => {
    const definition = JSON.parse(
      root.dataset.definition ?? '{}',
    ) as PlaygroundDefinition;
    const iframe = root.querySelector<HTMLIFrameElement>('iframe');
    const sourceHost = root.querySelector<HTMLElement>(
      '[data-playground-source-host]',
    );
    const status = root.querySelector<HTMLElement>('[data-playground-status]');
    if (!iframe || !sourceHost || !status) return;

    const previewOrigin = new URL(iframe.src, window.location.href).origin;
    const sameOriginPreview = previewOrigin === window.location.origin;
    const sourceLanguage = definition.importPath ? 'astro' : 'html';
    const sourceFilename = `${definition.id}.${definition.importPath ? 'astro' : 'html'}`;
    let candidate: Record<string, unknown> = resetPlaygroundValues(definition);
    let rawSource =
      sourceHost.querySelector('pre code')?.textContent ??
      playgroundSource(definition, resetPlaygroundValues(definition));
    let ready = false;
    let revision = 0;
    let sourceRevision = 0;
    let timer: number | undefined;
    let readyTimer: number | undefined;

    const report = (message: string, error = false) => {
      status.textContent = message;
      if (error) status.dataset.state = 'error';
      else delete status.dataset.state;
    };
    const sourceElement = () =>
      sourceHost.querySelector<HTMLElement>('pre code');
    const sourceFigure = () =>
      sourceHost.querySelector<HTMLElement>('.alk-code');
    const markSourceElement = () => {
      sourceElement()?.setAttribute('data-playground-source', '');
      sourceFigure()?.setAttribute(
        'data-alk-source',
        encodeURIComponent(rawSource),
      );
    };
    markSourceElement();
    const renderSource = async (source: string) => {
      rawSource = source;
      const renderRevision = ++sourceRevision;
      const code = sourceElement();
      if (code) code.textContent = rawSource;
      markSourceElement();
      try {
        const [{ renderCode }, { enhanceCode }] = await Promise.all([
          import('../content-renderers'),
          import('../code-copy'),
        ]);
        const html = await renderCode({
          code: rawSource,
          lang: sourceLanguage,
          title: sourceFilename,
          lineNumbers: false,
        });
        if (renderRevision !== sourceRevision) return;
        // renderCode returns escaped HAST for source text; it is never executed as preview markup.
        sourceHost.innerHTML = html;
        markSourceElement();
        enhanceCode(sourceHost);
      } catch {
        if (renderRevision === sourceRevision)
          report(
            'Could not highlight source. The current source remains available to copy.',
            true,
          );
      }
    };
    const syncControls = () =>
      root
        .querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >('[data-control]')
        .forEach((input) => {
          const value = candidate[input.name];
          if (input instanceof HTMLInputElement && input.type === 'checkbox')
            input.checked = value === true;
          else
            input.value =
              typeof value === 'string' ? value : JSON.stringify(value);
        });
    const showValidation = (
      validation: ReturnType<typeof validatePlaygroundValues>,
    ) =>
      root
        .querySelectorAll<HTMLElement>('[data-control-error]')
        .forEach((element) => {
          const error = validation.errors[element.dataset.controlError ?? ''];
          element.textContent = error ?? '';
          element.hidden = !error;
        });
    const update = () => {
      const updateRevision = ++revision;
      const validation = validatePlaygroundValues(definition, candidate);
      showValidation(validation);
      if (!validation.valid) {
        report('Fix the marked parameters before updating the preview.', true);
        return;
      }
      if (definition.importPath)
        void renderSource(playgroundSource(definition, validation.values));
      if (!sameOriginPreview) {
        report('Preview must use this page’s origin.', true);
        return;
      }
      if (!ready || iframe.contentWindow === null) return;
      iframe.contentWindow.postMessage(
        {
          type: 'alk:playground:update',
          id: definition.id,
          values: validation.values,
          theme: hostTheme(),
          revision: updateRevision,
        },
        previewOrigin,
      );
      report('Updating preview…');
    };
    const schedule = (debounced: boolean) => {
      window.clearTimeout(timer);
      if (debounced) timer = window.setTimeout(update, 180);
      else update();
    };

    root
      .querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >('[data-control]')
      .forEach((input) => {
        const changed = () => {
          candidate[input.name] = parseControlValue(input);
          schedule(
            ['text', 'textarea', 'json'].includes(
              input.dataset.controlType ?? '',
            ),
          );
        };
        input.addEventListener('input', changed);
        input.addEventListener('change', changed);
      });
    root
      .querySelectorAll<HTMLButtonElement>('[data-playground-preset]')
      .forEach((button) =>
        button.addEventListener('click', () => {
          const preset =
            definition.presets?.[Number(button.dataset.playgroundPreset)];
          if (!preset) return;
          candidate = presetPlaygroundValues(definition, preset);
          syncControls();
          schedule(false);
        }),
      );
    root
      .querySelector<HTMLButtonElement>('[data-playground-reset]')
      ?.addEventListener('click', () => {
        candidate = resetPlaygroundValues(definition);
        syncControls();
        schedule(false);
      });
    window.addEventListener('message', (event) => {
      if (
        event.origin !== previewOrigin ||
        event.source !== iframe.contentWindow
      )
        return;
      const message = event.data as {
        type?: string;
        id?: string;
        message?: string;
        source?: string;
        revision?: number;
        values?: Record<string, unknown>;
        height?: number;
      };
      if (message?.id !== definition.id) return;
      if (message.type === 'alk:playground:ready') {
        ready = true;
        window.clearTimeout(readyTimer);
        update();
        return;
      }
      if (message.revision !== revision) return;
      if (
        message.type === 'alk:playground:resize' &&
        root.classList.contains('alk-playground--focus') &&
        typeof message.height === 'number' &&
        Number.isFinite(message.height)
      ) {
        iframe.style.height = `${Math.min(1600, Math.max(240, Math.ceil(message.height)))}px`;
        return;
      }
      if (
        message.type === 'alk:playground:values' &&
        message.values &&
        typeof message.values === 'object' &&
        !Array.isArray(message.values)
      ) {
        candidate = { ...candidate, ...message.values };
        const validation = validatePlaygroundValues(definition, candidate);
        showValidation(validation);
        if (!validation.valid) {
          report('Preview supplied invalid parameters.', true);
          return;
        }
        candidate = validation.values;
        syncControls();
        if (definition.importPath)
          void renderSource(playgroundSource(definition, validation.values));
        report('Preview updated.');
        return;
      }
      if (message.type === 'alk:playground:rendered') {
        if (!definition.importPath && typeof message.source === 'string')
          void renderSource(message.source);
        report('Preview updated.');
      }
      if (message.type === 'alk:playground:error')
        report(
          message.message
            ? `Preview error: ${message.message}`
            : 'Preview reported an error.',
          true,
        );
    });
    iframe.addEventListener('load', () => {
      if (ready) return;
      report('Preview loaded. Waiting for its ready message.');
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(() => {
        if (!ready)
          report(
            'Preview did not identify itself. Check the frame for an error.',
            true,
          );
      }, 12_000);
    });
    update();
  });
