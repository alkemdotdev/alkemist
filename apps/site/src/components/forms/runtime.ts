import { ALK_INKS } from '@alkemist/ui/palette';
import type { BufferGeometry, Material } from 'three';
import { formStudies } from './catalog';

type Runtime = { dispose(): void; setVisible(value: boolean): void };

async function mount(
  host: HTMLElement,
  signal: AbortSignal,
  fail: (message: string) => void,
): Promise<Runtime> {
  const [THREE, { OrbitControls }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
  ]);
  signal.throwIfAborted();
  const spec = formStudies
    .find((study) => study.id === host.dataset.form)!
    .make();
  const viewport = host.querySelector<HTMLElement>('.form-viewport')!;
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const play = host.querySelector<HTMLButtonElement>('[data-form-play]')!;
  const reset = host.querySelector<HTMLButtonElement>('[data-form-reset]')!;
  const status = host.querySelector<HTMLElement>('.form-status')!;
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context)
    throw new Error(
      'Interactive 3D is unavailable in this browser. The still composition is shown.',
    );
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  canvas.style.touchAction = 'pan-y';
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  const colors = Object.fromEntries(ALK_INKS.map(({ id, hex }) => [id, hex]));
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const events = new AbortController();
  const groups: InstanceType<typeof THREE.Group>[] = [];
  let frame = 0,
    previous = 0,
    elapsed = 0;
  let visible = false,
    disposed = false,
    playing = false;
  let resizeObserver: ResizeObserver | undefined;
  const stopFrames = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  };
  const requestRender = () => {
    if (!frame && !disposed && visible && !document.hidden)
      frame = requestAnimationFrame(render);
  };
  const pose = () =>
    groups.forEach((group, i) => {
      const object = spec.objects[i]!;
      const phase = object.phase ?? i * 1.6;
      const oscillate = (speed: number) =>
        Math.sin(elapsed * speed + phase) - Math.sin(phase);
      group.rotation.set(
        object.rotation[0] + object.sway[0] * oscillate(0.17),
        object.rotation[1] + object.sway[1] * oscillate(0.13),
        object.rotation[2] + object.sway[2] * oscillate(0.11),
      );
      group.position.y = object.position[1] + oscillate(0.19) * 0.025;
    });
  const render = (time: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    if (playing && previous && time - previous < 1000 / 30) {
      requestRender();
      return;
    }
    if (playing) {
      elapsed += previous ? Math.min((time - previous) / 1000, 0.1) : 0;
      pose();
    }
    previous = time;
    renderer.render(scene, camera);
    if (playing) requestRender();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stopFrames();
    events.abort();
    resizeObserver?.disconnect();
    controls.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    if (canvas.parentNode === viewport)
      canvas.replaceWith(canvas.cloneNode(false));
  };
  signal.addEventListener('abort', dispose, { once: true });
  try {
    for (const object of spec.objects) {
      const group = new THREE.Group();
      group.position.set(...object.position);
      group.rotation.set(...object.rotation);
      groups.push(group);
      scene.add(group);
      for (const surface of object.surfaces) {
        const geometry = new THREE.BufferGeometry();
        geometries.push(geometry);
        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(surface.positions, 3),
        );
        geometry.setIndex(surface.indices);
        geometry.computeVertexNormals();
        const opacity = surface.opacity ?? 1;
        const material = new THREE.MeshStandardMaterial({
          color: colors[surface.ink],
          side: THREE.DoubleSide,
          roughness: 0.62,
          metalness: 0.08,
          opacity,
          transparent: opacity < 1,
          depthWrite: opacity === 1,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        materials.push(material);
        group.add(new THREE.Mesh(geometry, material));
      }
      for (const line of object.lines) {
        const geometry = new THREE.BufferGeometry();
        geometries.push(geometry);
        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(line.points.flat(), 3),
        );
        const material = new THREE.LineBasicMaterial({
          color: colors[line.ink],
          opacity: line.opacity ?? 0.9,
          transparent: true,
          toneMapped: false,
        });
        materials.push(material);
        group.add(new THREE.Line(geometry, material));
      }
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x71809c, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-3, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.4);
    rim.position.set(5, -1, -3);
    scene.add(rim);
    const bounds = new THREE.Box3().setFromObject(scene);
    const fitDistance = () => {
      const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
      if (host.dataset.form === 'interference') {
        const halfWidth = Math.max(
          Math.abs(bounds.min.x),
          Math.abs(bounds.max.x),
        );
        const halfHeight = Math.max(
          Math.abs(bounds.min.y),
          Math.abs(bounds.max.y),
        );
        return (
          bounds.max.z +
          Math.max(
            halfWidth / (Math.tan(halfAngle) * camera.aspect),
            halfHeight / Math.tan(halfAngle),
          ) *
            1.2
        );
      }
      return (
        spec.radius /
        Math.sin(
          Math.min(halfAngle, Math.atan(Math.tan(halfAngle) * camera.aspect)),
        )
      );
    };
    const home = () => {
      elapsed = 0;
      pose();
      camera.position.set(0, 0, fitDistance());
      controls.target.set(0, 0, 0);
      controls.update();
      requestRender();
    };
    const motion = (value: boolean) => {
      playing = value;
      host.dataset.motion = value ? 'playing' : 'paused';
      play.textContent = value ? 'Pause motion' : 'Play motion';
      play.setAttribute('aria-pressed', String(value));
      status.textContent = value
        ? 'Slow motion is playing.'
        : 'Motion is paused.';
      previous = 0;
      requestRender();
    };
    play.addEventListener('click', () => motion(!playing), {
      signal: events.signal,
    });
    reset.addEventListener(
      'click',
      () => {
        motion(false);
        home();
      },
      { signal: events.signal },
    );
    canvas.addEventListener('pointerdown', () => motion(false), {
      signal: events.signal,
    });
    canvas.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Home') {
          event.preventDefault();
          motion(false);
          home();
          return;
        }
        if (
          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        motion(false);
        const spherical = new THREE.Spherical().setFromVector3(
          camera.position.clone().sub(controls.target),
        );
        if (event.key === 'ArrowLeft') spherical.theta -= 0.12;
        if (event.key === 'ArrowRight') spherical.theta += 0.12;
        if (event.key === 'ArrowUp') spherical.phi -= 0.12;
        if (event.key === 'ArrowDown') spherical.phi += 0.12;
        spherical.phi = THREE.MathUtils.clamp(
          spherical.phi,
          0.12,
          Math.PI - 0.12,
        );
        camera.position
          .copy(controls.target)
          .add(new THREE.Vector3().setFromSpherical(spherical));
        controls.update();
      },
      { signal: events.signal },
    );
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    reduced.addEventListener(
      'change',
      () => {
        if (reduced.matches) motion(false);
      },
      { signal: events.signal },
    );
    controls.addEventListener('change', requestRender);
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        fail(
          'The graphics context was lost. The still composition is shown; reload to try again.',
        );
      },
      { signal: events.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) stopFrames();
        else requestRender();
      },
      { signal: events.signal },
    );
    const resize = () => {
      const width = viewport.clientWidth,
        height = viewport.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.position.setLength(fitDistance());
      controls.update();
      requestRender();
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();
    home();
    play.disabled = false;
    reset.disabled = false;
    motion(!reduced.matches && host.dataset.motion !== 'paused');
    return {
      dispose,
      setVisible(value) {
        visible = value;
        if (value) requestRender();
        else stopFrames();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

class FormArt extends HTMLElement {
  private runtime?: Runtime;
  private load?: AbortController;
  private lifetime?: AbortController;
  private observer?: IntersectionObserver;
  private visible = false;
  connectedCallback() {
    if (this.lifetime) return;
    this.lifetime = new AbortController();
    window.addEventListener('pagehide', () => this.stop(), {
      signal: this.lifetime.signal,
    });
    window.addEventListener('pageshow', () => this.observe(), {
      signal: this.lifetime.signal,
    });
    this.observe();
  }
  disconnectedCallback() {
    this.lifetime?.abort();
    this.lifetime = undefined;
    this.stop();
  }
  private observe() {
    if (this.observer || !this.isConnected) return;
    this.observer = new IntersectionObserver(
      (entries) => {
        this.visible = entries[0]?.isIntersecting ?? false;
        this.runtime?.setVisible(this.visible);
        if (this.visible && !this.load && this.dataset.state !== 'error')
          void this.start();
      },
      { threshold: 0.01 },
    );
    this.observer.observe(this);
  }
  private async start() {
    const load = new AbortController();
    this.load = load;
    this.dataset.state = 'loading';
    this.querySelector('.form-viewport')!.setAttribute('aria-busy', 'true');
    try {
      const runtime = await mount(this, load.signal, (message) =>
        this.fail(message),
      );
      if (load.signal.aborted || !this.isConnected) {
        runtime.dispose();
        return;
      }
      this.runtime = runtime;
      this.dataset.state = 'ready';
      const canvas = this.querySelector<HTMLCanvasElement>('canvas')!;
      canvas.removeAttribute('inert');
      canvas.removeAttribute('aria-hidden');
      canvas.tabIndex = 0;
      this.querySelector('.form-viewport')!.setAttribute('aria-busy', 'false');
      runtime.setVisible(this.visible);
    } catch (error) {
      if (!load.signal.aborted)
        this.fail(
          error instanceof Error
            ? error.message
            : '3D could not load. The still composition is shown.',
        );
    }
  }
  private fail(message: string) {
    this.load?.abort();
    this.runtime = undefined;
    this.dataset.state = 'error';
    this.querySelector('.form-status')!.textContent = message;
    this.resetControls();
  }
  private resetControls() {
    const canvas = this.querySelector<HTMLCanvasElement>('canvas')!;
    canvas.setAttribute('inert', '');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.tabIndex = -1;
    this.querySelector('.form-viewport')!.setAttribute('aria-busy', 'false');
    const play = this.querySelector<HTMLButtonElement>('[data-form-play]')!;
    play.textContent = 'Play motion';
    play.setAttribute('aria-pressed', 'false');
    this.querySelectorAll<HTMLButtonElement>('button').forEach(
      (button) => (button.disabled = true),
    );
  }
  private stop() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.load?.abort();
    this.load = undefined;
    this.runtime = undefined;
    this.dataset.state = 'idle';
    this.resetControls();
  }
}
if (!customElements.get('form-art')) customElements.define('form-art', FormArt);
