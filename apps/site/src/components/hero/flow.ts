import { ALK_INKS } from '@alkemist/ui/palette';

const VERTEX = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// A site-owned art study, not the public AlkShader component's API.
const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_phase;
uniform int u_composition;
uniform vec3 u_paper;
uniform vec3 u_inks[8];
out vec4 outColor;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (gl_FragCoord.xy / u_resolution - 0.5) * 2.0;
  p.x *= max(aspect, 1.25);
  float t = u_phase;
  float field;
  float envelope;
  float colorShift;

  if (u_composition == 0) {
    // Domain-warped parallel contours: a ribbon with broad, unmarked margins.
    vec2 q = p;
    q.x += 0.25 * sin(q.y * 2.8 + t * 0.23);
    float spine = 0.32 * sin(q.x * 1.65 + t * 0.3)
                + 0.11 * sin(q.x * 3.0 - t * 0.17);
    float width = 0.40 + 0.15 * cos(q.x * 1.25 - t * 0.11);
    field = (q.y - spine) / width;
    field += 0.19 * sin(q.x * 2.1 + field * 2.4 + t * 0.16);
    envelope = 1.0 - smoothstep(0.95, 1.01, abs(field));
    colorShift = 0.0;
  } else if (u_composition == 1) {
    // A warped annulus: twisting lobes surround a deliberate empty centre.
    vec2 q = p;
    q.x *= 0.66;
    float angle = atan(q.y, q.x);
    float radius = length(q);
    float wobble = 0.12 * sin(angle * 3.0 + t * 0.3)
                 + 0.06 * cos(angle * 5.0 - t * 0.19);
    field = (radius - 0.66 - wobble) / 0.29;
    envelope = 1.0 - smoothstep(0.93, 1.01, abs(field));
    colorShift = 0.0;
  } else {
    // Smooth scalar height field; a finite level interval reveals two islands.
    vec2 q = p * vec2(0.85, 1.0);
    q += 0.14 * vec2(sin(q.y * 2.4 + t * 0.13), cos(q.x * 2.1 - t * 0.17));
    float hillA = exp(-dot(q - vec2(-0.65, 0.12), q - vec2(-0.65, 0.12)) * 2.1);
    float hillB = exp(-dot(q - vec2(0.78, -0.16), q - vec2(0.78, -0.16)) * 2.8);
    field = (hillA + hillB - 0.50) * 2.6;
    envelope = smoothstep(-0.90, -0.86, field) * (1.0 - smoothstep(0.95, 1.01, field));
    colorShift = 1.0;
  }

  // Fine paper channels separate 64 contour lines into eight fixed ink groups.
  float bands = (field + 1.0) * 32.0;
  float cell = abs(fract(bands) - 0.5);
  float aa = clamp(fwidth(bands), 0.008, 0.3);
  float contour = 1.0 - smoothstep(0.31 - aa, 0.31 + aa, cell);
  int ink = int(mod(clamp(floor((field + 1.0) * 4.0), 0.0, 7.0) + colorShift, 8.0));
  outColor = vec4(mix(u_paper, u_inks[ink], contour * envelope), 1.0);
}`;

type FlowRuntime = {
  dispose: () => void;
  setVisible: (visible: boolean) => void;
};

function mountFlow(
  host: HTMLElement,
  fail: (message: string) => void,
): FlowRuntime {
  const art = host.querySelector<HTMLElement>('.hero-flow-art')!;
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const status = host.querySelector<HTMLElement>('[role="status"]')!;
  const play = host.querySelector<HTMLButtonElement>('[data-play]')!;
  const composition =
    host.querySelector<HTMLSelectElement>('[data-composition]')!;
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl)
    throw new Error(
      'WebGL 2 is unavailable. The static ribbon study is shown instead.',
    );
  const shaders: WebGLShader[] = [];
  const events = new AbortController();
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let resizeObserver: ResizeObserver | undefined;
  let themeObserver: MutationObserver | undefined;
  let disposed = false;
  let visible = false;
  let playing = false;
  let phase = 0;
  let previous = 0;
  let frame = 0;
  let compilerNotes = false;
  const stopFrame = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stopFrame();
    events.abort();
    resizeObserver?.disconnect();
    themeObserver?.disconnect();
    if (program) gl.deleteProgram(program);
    if (vao) gl.deleteVertexArray(vao);
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    if (canvas.parentNode === art) canvas.replaceWith(canvas.cloneNode(false));
  };
  const compile = (kind: number, source: string) => {
    const shader = gl.createShader(kind);
    if (!shader)
      throw new Error('The browser could not allocate the flow shader.');
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const diagnostic = gl.getShaderInfoLog(shader)?.trim();
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(
        `Flow shader compilation failed: ${diagnostic || 'No compiler detail was provided.'}`,
      );
    if (diagnostic) {
      compilerNotes = true;
      console.warn('Flow hero compiler note:', diagnostic);
    }
    return shader;
  };

  try {
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    program = gl.createProgram();
    if (!program)
      throw new Error('The browser could not allocate the flow program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        `Flow shader linking failed: ${gl.getProgramInfoLog(program) || 'No linker detail was provided.'}`,
      );
    vao = gl.createVertexArray();
    if (!vao)
      throw new Error('The browser could not allocate the flow geometry.');
    gl.bindVertexArray(vao);
    gl.useProgram(program);
    const uniform = (name: string) => {
      const location = gl.getUniformLocation(program!, name);
      if (location === null)
        throw new Error(`Flow uniform ${name} is unavailable.`);
      return location;
    };
    const resolutionUniform = uniform('u_resolution');
    const phaseUniform = uniform('u_phase');
    const compositionUniform = uniform('u_composition');
    const paperUniform = uniform('u_paper');
    const inksUniform = uniform('u_inks[0]');
    gl.uniform3fv(
      inksUniform,
      ALK_INKS.flatMap(({ hex }) =>
        [1, 3, 5].map(
          (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
        ),
      ),
    );
    const requestRender = () => {
      if (!disposed && visible && !document.hidden && !frame)
        frame = requestAnimationFrame(render);
    };
    const render = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      if (playing && previous)
        phase += Math.min((time - previous) / 1000, 0.05);
      previous = time;
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform1f(phaseUniform, phase);
      gl.uniform1i(compositionUniform, Number(composition.value));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (playing) requestRender();
    };
    const updateStatus = () => {
      play.innerHTML = `${playing ? 'Pause flow' : 'Play flow'} <span aria-hidden="true">${playing ? 'Ⅱ' : '↗'}</span>`;
      play.setAttribute('aria-pressed', String(playing));
      status.textContent = `${composition.selectedOptions[0].text} · ${playing ? 'motion on' : 'still frame'} · live shader${compilerNotes ? ' · compiler notes in console' : ''}`;
      const descriptions = [
        'Colored contours form a flowing ribbon across the board.',
        'Colored contours wrap a three-lobed vortex with an open centre.',
        'Colored contours trace two organic islands in a smooth mathematical field.',
      ];
      canvas.setAttribute(
        'aria-label',
        `Generative ink art, rendered live. ${descriptions[Number(composition.value)]} Use the controls below to choose a composition or play the motion.`,
      );
    };
    const theme = () => {
      if (disposed) return;
      const color = getComputedStyle(art)
        .backgroundColor.match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
      if (!color || color.length !== 3) {
        throw new Error(
          'The board color could not be resolved. The static ribbon study is shown instead.',
        );
      }
      gl.useProgram(program);
      gl.uniform3fv(
        paperUniform,
        color.map((channel) => channel / 255),
      );
      requestRender();
    };
    const updateTheme = () => {
      try {
        theme();
      } catch (error) {
        fail(
          error instanceof Error
            ? error.message
            : 'The board color could not be resolved. The static ribbon study is shown instead.',
        );
      }
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const limit = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
      const width = Math.max(
        1,
        Math.min(limit, Math.round(art.clientWidth * dpr)),
      );
      const height = Math.max(
        1,
        Math.min(limit, Math.round(art.clientHeight * dpr)),
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
    play.disabled = false;
    composition.disabled = false;
    play.addEventListener(
      'click',
      () => {
        playing = !playing;
        stopFrame();
        updateStatus();
        requestRender();
      },
      { signal: events.signal },
    );
    composition.addEventListener(
      'change',
      () => {
        phase = 0;
        previous = 0;
        updateStatus();
        requestRender();
      },
      { signal: events.signal },
    );
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener(
      'change',
      (event) => {
        if (event.matches) {
          playing = false;
          stopFrame();
          updateStatus();
          requestRender();
        }
      },
      { signal: events.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        stopFrame();
        if (!document.hidden) requestRender();
      },
      { signal: events.signal },
    );
    window.addEventListener('alk:theme-change', updateTheme, {
      signal: events.signal,
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener(
      'change',
      updateTheme,
      { signal: events.signal },
    );
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        fail(
          'The flow graphics context was lost. The static ribbon study is shown; reload to retry.',
        );
      },
      { signal: events.signal },
    );
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(art);
    themeObserver = new MutationObserver(updateTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-board', 'class', 'style'],
    });
    resize();
    theme();
    updateStatus();
    return {
      dispose,
      setVisible: (next) => {
        visible = next;
        if (next) requestRender();
        else stopFrame();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

class HeroFlowElement extends HTMLElement {
  private runtime?: FlowRuntime;
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
            this.runtime = mountFlow(this, (message) => this.fail(message));
            this.dataset.state = 'ready';
          } catch (error) {
            this.fail(
              error instanceof Error
                ? error.message
                : 'The flow field could not initialize. The static ribbon study is shown.',
            );
          }
        }
        this.runtime?.setVisible(visible);
      },
      { threshold: 0.01 },
    );
    this.observer.observe(this.querySelector('.hero-flow-art')!);
  }

  private fail(message: string) {
    this.runtime?.dispose();
    this.runtime = undefined;
    this.dataset.state = 'error';
    const play = this.querySelector<HTMLButtonElement>('[data-play]')!;
    play.innerHTML = 'Play flow <span aria-hidden="true">↗</span>';
    play.setAttribute('aria-pressed', 'false');
    this.querySelector<HTMLElement>('[role="status"]')!.textContent = message;
    this.setControlsDisabled(true);
  }

  private setControlsDisabled(disabled: boolean) {
    this.querySelectorAll<HTMLButtonElement | HTMLSelectElement>(
      'button, select',
    ).forEach((control) => {
      control.disabled = disabled;
    });
  }

  private stop() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.runtime?.dispose();
    this.runtime = undefined;
    this.dataset.state = 'idle';
    const play = this.querySelector<HTMLButtonElement>('[data-play]')!;
    play.innerHTML = 'Play flow <span aria-hidden="true">↗</span>';
    play.setAttribute('aria-pressed', 'false');
    this.querySelector<HTMLElement>('[role="status"]')!.textContent =
      'Static ribbon study · the live field loads when visible.';
    this.setControlsDisabled(true);
  }
}

if (!customElements.get('alk-hero-flow'))
  customElements.define('alk-hero-flow', HeroFlowElement);
