import type { BufferGeometry, Material } from 'three';
import { ALK_INKS } from '@alkemdotdev/alkemist-theme/palette';

export const SCULPTURE_INKS = ALK_INKS.map(({ hex }) => hex);
export const COMPANION_CENTER = [-2.6, 1.3, 0.6] as const;
const companionRadius = 0.27;
export const COMPANION_VERTICES: [number, number, number][] = [
  [companionRadius, 0, 0],
  [-companionRadius, 0, 0],
  [0, companionRadius, 0],
  [0, -companionRadius, 0],
  [0, 0, companionRadius],
  [0, 0, -companionRadius],
];
export const COMPANION_EDGES = [
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [2, 4],
  [2, 5],
  [3, 4],
  [3, 5],
];

/** A three-half-twist ribbon. Reversing v joins its ends at u = 2π. */
export function ribbonPoint(u: number, v: number): [number, number, number] {
  const radius = 1.85 + 0.92 * v * Math.cos(1.5 * u);
  return [
    radius * Math.cos(u),
    radius * Math.sin(u),
    0.92 * v * Math.sin(1.5 * u) + 0.14 * Math.sin(3 * u),
  ];
}

export function ribbonInk(index: number, count = 48) {
  // Mirror the palette across the strip so colors also join at the Möbius seam.
  const distance = Math.min(index, count - 1 - index) / (count / 2);
  return SCULPTURE_INKS[Math.min(7, Math.floor(distance * 8))]!;
}

type SculptureRuntime = {
  dispose: () => void;
  setVisible: (value: boolean) => void;
};

async function mountSculpture(
  host: HTMLElement,
  signal: AbortSignal,
  fail: (message: string) => void,
): Promise<SculptureRuntime> {
  const [THREE, { OrbitControls }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
  ]);
  signal.throwIfAborted();
  const viewport = host.querySelector<HTMLElement>('.sculpture-viewport')!;
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const play = host.querySelector<HTMLButtonElement>('[data-sculpture-play]')!;
  const reset = host.querySelector<HTMLButtonElement>(
    '[data-sculpture-reset]',
  )!;
  const status = host.querySelector<HTMLElement>('.sculpture-status')!;
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!context)
    throw new Error('3D is unavailable here. The still illustration is shown.');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  // OrbitControls sets an inline `none`; leave vertical touch gestures for page scrolling.
  canvas.style.touchAction = 'pan-y';
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.enableZoom = false;
  controls.autoRotateSpeed = 0.2;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI - 0.12;
  const group = new THREE.Group();
  group.rotation.set(-0.32, 0.25, -0.26);
  scene.add(group);
  const companion = new THREE.Group();
  companion.position.set(...COMPANION_CENTER);
  scene.add(companion);
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const events = new AbortController();
  let frame = 0;
  let previousTime = 0;
  let motionTime = 0;
  let visible = false;
  let disposed = false;
  let resizeObserver: ResizeObserver | undefined;
  const pauseFrame = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };
  const requestRender = () => {
    if (disposed || !visible || document.hidden || frame) return;
    frame = requestAnimationFrame(render);
  };
  const render = (time: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    // Slow ambient motion needs only 30 painted frames per second. Manual input stays responsive.
    if (
      controls.autoRotate &&
      previousTime &&
      time - previousTime < 1000 / 30
    ) {
      requestRender();
      return;
    }
    if (controls.autoRotate) {
      const delta = previousTime
        ? Math.min((time - previousTime) / 1000, 0.1)
        : 0;
      motionTime += delta;
      controls.update(delta);
      companion.rotation.set(
        0.3 + motionTime * 0.025,
        0.2 + motionTime * 0.04,
        -0.15,
      );
      companion.position.y =
        COMPANION_CENTER[1] + Math.sin(motionTime * 0.22) * 0.055;
    }
    previousTime = time;
    renderer.render(scene, camera);
    if (controls.autoRotate) requestRender();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    pauseFrame();
    events.abort();
    resizeObserver?.disconnect();
    controls.dispose();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    if (canvas.parentNode === viewport)
      canvas.replaceWith(canvas.cloneNode(false));
  };
  signal.addEventListener('abort', dispose, { once: true });
  try {
    const companionGeometry = new THREE.BufferGeometry();
    companionGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        COMPANION_EDGES.flatMap((edge) =>
          edge.flatMap((index) => COMPANION_VERTICES[index]!),
        ),
        3,
      ),
    );
    const companionMaterial = new THREE.LineBasicMaterial({
      color: SCULPTURE_INKS[1],
      transparent: true,
      opacity: 0.65,
    });
    geometries.push(companionGeometry);
    materials.push(companionMaterial);
    companion.add(new THREE.LineSegments(companionGeometry, companionMaterial));
    companion.rotation.set(0.3, 0.2, -0.15);
    const strips = 48;
    const segments = 256;
    for (let strip = 0; strip < strips; strip++) {
      const positions: number[] = [];
      const indices: number[] = [];
      // Fine gaps expose the board between bands, like cut sheets of colored paper.
      const lower = -1 + (strip + 0.08) * (2 / strips);
      const upper = -1 + (strip + 0.92) * (2 / strips);
      for (let step = 0; step <= segments; step++) {
        const u = (step / segments) * Math.PI * 2;
        positions.push(...ribbonPoint(u, lower), ...ribbonPoint(u, upper));
        if (step < segments) {
          const a = step * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: ribbonInk(strip),
        side: THREE.DoubleSide,
        metalness: 0.12,
        roughness: 0.4,
      });
      geometries.push(geometry);
      materials.push(material);
      group.add(new THREE.Mesh(geometry, material));
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x748095, 2.7));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(4, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.8);
    rim.position.set(-4, -2, -5);
    scene.add(rim);
    const home = () => {
      const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
      const fitAngle = Math.min(
        halfAngle,
        Math.atan(Math.tan(halfAngle) * camera.aspect),
      );
      const distance = 3.3 / Math.sin(fitAngle);
      camera.position.copy(
        new THREE.Vector3(0.5, -0.8, 1.5).normalize().multiplyScalar(distance),
      );
      controls.target.set(0, 0, 0);
      controls.update();
      requestRender();
    };
    const updateMotion = (playing: boolean) => {
      controls.autoRotate = playing;
      host.dataset.motionPreference = playing ? 'playing' : 'paused';
      play.textContent = playing ? 'Pause motion' : 'Set in motion';
      play.setAttribute('aria-pressed', String(playing));
      status.textContent = playing
        ? 'Slow orbit and gentle companion drift are on.'
        : 'Motion is paused.';
      previousTime = 0;
      requestRender();
    };
    play.addEventListener('click', () => updateMotion(!controls.autoRotate), {
      signal: events.signal,
    });
    reset.addEventListener(
      'click',
      () => {
        updateMotion(false);
        home();
      },
      { signal: events.signal },
    );
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.addEventListener(
      'change',
      () => {
        if (reducedMotion.matches) updateMotion(false);
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Home') {
          event.preventDefault();
          updateMotion(false);
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
        updateMotion(false);
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
    canvas.addEventListener('pointerdown', () => updateMotion(false), {
      signal: events.signal,
    });
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        fail(
          '3D stopped because its graphics context was lost. The still illustration is shown; reload to retry.',
        );
      },
      { signal: events.signal },
    );
    controls.addEventListener('change', requestRender);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) pauseFrame();
        else requestRender();
      },
      { signal: events.signal },
    );
    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      home();
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();
    play.disabled = false;
    reset.disabled = false;
    updateMotion(
      !reducedMotion.matches && host.dataset.motionPreference !== 'paused',
    );
    return {
      dispose,
      setVisible(value) {
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

function registerSculpture() {
  class SculptureHeroElement extends HTMLElement {
    private runtime?: SculptureRuntime;
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
      this.querySelector('.sculpture-viewport')!.setAttribute(
        'aria-busy',
        'true',
      );
      try {
        const runtime = await mountSculpture(this, load.signal, (message) =>
          this.fail(message),
        );
        if (load.signal.aborted || !this.isConnected) {
          runtime.dispose();
          return;
        }
        this.runtime = runtime;
        this.dataset.state = 'ready';
        this.querySelector('.sculpture-viewport')!.setAttribute(
          'aria-busy',
          'false',
        );
        runtime.setVisible(this.visible);
      } catch (error) {
        if (!load.signal.aborted)
          this.fail(
            error instanceof Error
              ? error.message
              : '3D could not load. The still illustration is shown.',
          );
      }
    }
    private fail(message: string) {
      this.runtime?.dispose();
      this.runtime = undefined;
      this.dataset.state = 'error';
      this.querySelector('.sculpture-viewport')!.setAttribute(
        'aria-busy',
        'false',
      );
      this.querySelector('.sculpture-status')!.textContent = message;
      const play = this.querySelector<HTMLButtonElement>(
        '[data-sculpture-play]',
      )!;
      play.textContent = 'Set in motion';
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
      this.runtime?.dispose();
      this.runtime = undefined;
      this.dataset.state = 'idle';
      this.querySelector('.sculpture-viewport')!.setAttribute(
        'aria-busy',
        'false',
      );
      this.querySelector('.sculpture-status')!.textContent =
        'Interactive sculpture loads when visible.';
      const play = this.querySelector<HTMLButtonElement>(
        '[data-sculpture-play]',
      )!;
      play.textContent = 'Set in motion';
      play.setAttribute('aria-pressed', 'false');
      this.querySelectorAll<HTMLButtonElement>('button').forEach(
        (button) => (button.disabled = true),
      );
    }
  }
  if (!customElements.get('sculpture-hero'))
    customElements.define('sculpture-hero', SculptureHeroElement);
}

if (typeof window !== 'undefined') registerSculpture();
