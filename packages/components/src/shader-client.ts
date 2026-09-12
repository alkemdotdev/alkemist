import { INKS } from '@alkemdotdev/alkemist-theme/palette';
import { interferenceFragment, vertexShader } from './shader-helpers';

type ShaderRuntime = {
  dispose: () => void;
  setVisible: (value: boolean) => void;
};

function mountShader(
  host: HTMLElement,
  onError: (message: string) => void,
): ShaderRuntime {
  const viewport = host.querySelector<HTMLElement>('.alk-shader-viewport')!;
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl)
    throw new Error(
      'WebGL 2 is unavailable. The static wave illustration is shown instead.',
    );
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let resizeObserver: ResizeObserver | undefined;
  const events = new AbortController();
  let disposed = false;
  let visible = false;
  let playing = false;
  let phase = 0;
  let previousTime = 0;
  let frame = 0;
  let compilerNotes = false;
  const pauseFrame = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    pauseFrame();
    events.abort();
    resizeObserver?.disconnect();
    if (program) gl.deleteProgram(program);
    if (vao) gl.deleteVertexArray(vao);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    if (canvas.parentNode === viewport)
      canvas.replaceWith(canvas.cloneNode(false));
  };
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader)
      throw new Error(
        'The browser could not allocate a shader. Reload to retry.',
      );
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const diagnostic = gl.getShaderInfoLog(shader)?.trim();
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(
        `Shader compilation failed: ${diagnostic || 'No compiler detail was provided.'}`,
      );
    if (diagnostic) {
      compilerNotes = true;
      console.warn('Shader compiler note:', diagnostic);
    }
    return shader;
  };

  try {
    const vertex = compile(gl.VERTEX_SHADER, vertexShader);
    const fragment = compile(gl.FRAGMENT_SHADER, interferenceFragment);
    program = gl.createProgram();
    if (!program)
      throw new Error('The browser could not allocate a shader program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        `Shader linking failed: ${gl.getProgramInfoLog(program) || 'No linker detail was provided.'}`,
      );
    vao = gl.createVertexArray();
    if (!vao) throw new Error('The browser could not allocate a vertex array.');
    gl.bindVertexArray(vao);
    gl.useProgram(program);
    const uniform = (name: string) => {
      const location = gl.getUniformLocation(program!, name);
      if (location === null)
        throw new Error(`Shader uniform ${name} is unavailable.`);
      return location;
    };
    const resolutionUniform = uniform('u_resolution');
    const phaseUniform = uniform('u_phase');
    const frequencyUniform = uniform('u_frequency');
    const angleUniform = uniform('u_angle');
    const paperUniform = uniform('u_paper');
    const inksUniform = uniform('u_inks[0]');
    const frequency = host.querySelector<HTMLInputElement>('[data-frequency]')!;
    const angle = host.querySelector<HTMLInputElement>('[data-angle]')!;
    const button = host.querySelector<HTMLButtonElement>('[data-play]')!;
    const status = host.querySelector<HTMLElement>('[role="status"]')!;
    const render = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      if (playing && previousTime)
        phase += Math.min((time - previousTime) / 1000, 0.05) * 0.8;
      previousTime = time;
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform1f(phaseUniform, phase);
      gl.uniform1f(frequencyUniform, Number(frequency.value));
      gl.uniform1f(angleUniform, (Number(angle.value) * Math.PI) / 180);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (playing) requestRender();
    };
    const requestRender = () => {
      if (!disposed && visible && !document.hidden && !frame)
        frame = requestAnimationFrame(render);
    };
    const updatePlay = () => {
      button.textContent = playing ? 'Pause waves' : 'Play waves';
      button.setAttribute('aria-pressed', String(playing));
      status.textContent = `${playing ? 'Playing' : 'Paused'} · GLSL fragment shader${compilerNotes ? ' · compiler notes in console' : ''}`;
      previousTime = 0;
      if (!playing) pauseFrame();
      requestRender();
    };
    const theme = () => {
      const style = getComputedStyle(viewport);
      // CSS supplies sRGB board and ink values; the framebuffer uses the same values.
      const paper = style.backgroundColor
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
      if (!paper || paper.length !== 3)
        throw new Error(
          'The current board background could not be resolved for the shader.',
        );
      gl.useProgram(program);
      gl.uniform3fv(
        paperUniform,
        paper.map((value) => value / 255),
      );
      const inks = INKS.flatMap((ink) => {
        const hex = ink.hex.replace('#', '');
        return [0, 2, 4].map(
          (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
        );
      });
      gl.uniform3fv(inksUniform, inks);
      requestRender();
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
      const width = Math.min(
        maxSize,
        Math.max(1, Math.round(viewport.clientWidth * dpr)),
      );
      const height = Math.min(
        maxSize,
        Math.max(1, Math.round(viewport.clientHeight * dpr)),
      );
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.uniform2f(resolutionUniform, width, height);
      requestRender();
    };
    for (const control of [frequency, angle, button]) control.disabled = false;
    frequency.addEventListener(
      'input',
      () => {
        host.querySelector<HTMLOutputElement>(
          '[data-frequency-output]',
        )!.value = Number(frequency.value).toFixed(1);
        requestRender();
      },
      { signal: events.signal },
    );
    angle.addEventListener(
      'input',
      () => {
        host.querySelector<HTMLOutputElement>('[data-angle-output]')!.value =
          `${Number(angle.value).toFixed(0)}°`;
        requestRender();
      },
      { signal: events.signal },
    );
    button.addEventListener(
      'click',
      () => {
        playing = !playing;
        updatePlay();
      },
      { signal: events.signal },
    );
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.addEventListener(
      'change',
      () => {
        if (reducedMotion.matches) {
          playing = false;
          updatePlay();
        }
      },
      { signal: events.signal },
    );
    window.addEventListener('alk:theme-change', theme, {
      signal: events.signal,
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener(
      'change',
      theme,
      { signal: events.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) pauseFrame();
        else requestRender();
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        onError(
          'The shader graphics context was lost. Reload to retry; the static illustration is available.',
        );
      },
      { signal: events.signal },
    );
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();
    theme();
    updatePlay();
    return {
      dispose,
      setVisible: (value) => {
        visible = value;
        if (value) requestRender();
        else pauseFrame();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

function registerShader() {
  class ShaderElement extends HTMLElement {
    private runtime?: ShaderRuntime;
    private observer?: IntersectionObserver;
    private events?: AbortController;

    connectedCallback() {
      if (this.events) return;
      this.events = new AbortController();
      window.addEventListener('pagehide', () => this.stop(), {
        signal: this.events.signal,
      });
      window.addEventListener('pageshow', () => this.observe(), {
        signal: this.events.signal,
      });
      this.observe();
    }
    disconnectedCallback() {
      this.events?.abort();
      this.events = undefined;
      this.stop();
    }
    private observe() {
      if (this.observer || !this.isConnected) return;
      this.observer = new IntersectionObserver(
        (entries) => {
          const visible = entries[0]?.isIntersecting ?? false;
          if (visible && !this.runtime && this.dataset.state !== 'error') {
            try {
              this.runtime = mountShader(this, (message) => this.fail(message));
              this.dataset.state = 'ready';
            } catch (error) {
              this.fail(
                error instanceof Error
                  ? error.message
                  : 'The shader could not be initialized.',
              );
            }
          }
          this.runtime?.setVisible(visible);
        },
        { threshold: 0.01 },
      );
      this.observer.observe(this);
    }
    private fail(message: string) {
      this.runtime?.dispose();
      this.runtime = undefined;
      this.dataset.state = 'error';
      this.querySelector<HTMLElement>('[role="status"]')!.textContent = message;
      for (const control of this.querySelectorAll<
        HTMLInputElement | HTMLButtonElement
      >('input, button'))
        control.disabled = true;
    }
    private stop() {
      this.observer?.disconnect();
      this.observer = undefined;
      this.runtime?.dispose();
      this.runtime = undefined;
      this.dataset.state = 'idle';
      const play = this.querySelector<HTMLButtonElement>('[data-play]')!;
      play.textContent = 'Play waves';
      play.setAttribute('aria-pressed', 'false');
      this.querySelector<HTMLElement>('[role="status"]')!.textContent =
        'Shader loads when visible. The static illustration remains available.';
      for (const control of this.querySelectorAll<
        HTMLInputElement | HTMLButtonElement
      >('input, button'))
        control.disabled = true;
    }
  }
  if (!customElements.get('alk-shader'))
    customElements.define('alk-shader', ShaderElement);
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined')
  registerShader();
