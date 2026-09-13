import type { Object3D, Material, Texture, Mesh, SkinnedMesh } from 'three';

type ModelRuntime = {
  dispose: () => void;
  setVisible: (value: boolean) => void;
};

/** Release shared mesh resources once, including GLTFLoader-owned ImageBitmaps. */
function disposeObjects(roots: Object3D[]) {
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const bitmaps = new Set<ImageBitmap>();
  const skeletons = new Set<SkinnedMesh['skeleton']>();
  for (const root of roots) {
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) {
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          materials.add(material);
          for (const value of Object.values(material)) {
            if (value && typeof value === 'object' && 'isTexture' in value)
              textures.add(value as Texture);
          }
        }
      }
      const skinned = object as SkinnedMesh;
      if (skinned.isSkinnedMesh) skeletons.add(skinned.skeleton);
    });
  }
  for (const texture of textures) {
    const images = Array.isArray(texture.image)
      ? texture.image
      : [texture.image];
    for (const image of images) {
      if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap)
        bitmaps.add(image);
    }
    texture.dispose();
  }
  for (const bitmap of bitmaps) bitmap.close();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
}

async function createModel(
  host: HTMLElement,
  signal: AbortSignal,
  reportError: (message: string) => void,
): Promise<ModelRuntime> {
  // Importing the custom element is cheap; GPU code arrives only near the viewport.
  const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/controls/OrbitControls.js'),
  ]);
  signal.throwIfAborted();
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const viewport = host.querySelector<HTMLElement>('.alk-model-viewport')!;
  const context = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
  });
  if (!context)
    throw new Error(
      '3D is unavailable in this browser. Use the static view or download the model.',
    );

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  // Ordinary scrolling belongs to the containing article; zoom is deliberate.
  canvas.style.touchAction = 'pan-y';
  controls.autoRotateSpeed = 1;
  const events = new AbortController();
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (!event.shiftKey) event.stopImmediatePropagation();
    },
    { capture: true, passive: true, signal: events.signal },
  );
  const roots: Object3D[] = [scene];
  let frame = 0;
  let previousTime = 0;
  let visible = false;
  let disposed = false;
  let ready = false;
  let radius = 1;
  let resizeObserver: ResizeObserver | undefined;

  const requestRender = () => {
    if (disposed || !ready || !visible || document.hidden || frame) return;
    frame = requestAnimationFrame(render);
  };
  const render = (time: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    if (controls.autoRotate)
      controls.update(
        previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0,
      );
    previousTime = time;
    renderer.render(scene, camera);
    if (controls.autoRotate) requestRender();
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    pause();
    events.abort();
    resizeObserver?.disconnect();
    controls.dispose();
    disposeObjects(roots);
    renderer.dispose();
    renderer.forceContextLoss();
    // A bfcache restoration or reconnect needs a fresh context, not the deliberately lost one.
    if (canvas.parentNode === viewport)
      canvas.replaceWith(canvas.cloneNode(false));
  };
  signal.addEventListener('abort', dispose, { once: true });
  const fitDistance = () => {
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    return (radius / Math.sin(Math.min(vertical, horizontal))) * 1.12;
  };
  const preset = (view: string) => {
    const direction =
      view === 'top'
        ? new THREE.Vector3(0, 1, 0.001)
        : view === 'front'
          ? new THREE.Vector3(0, 0.04, 1)
          : new THREE.Vector3(3, 2.1, 3);
    camera.position.copy(direction.normalize().multiplyScalar(fitDistance()));
    controls.target.set(0, 0, 0);
    controls.update();
    requestRender();
  };
  const updateTheme = () => {
    const style = getComputedStyle(viewport);
    renderer.setClearColor(new THREE.Color(style.backgroundColor));
    // Only our explicitly tagged fixture materials adopt UI inks; other assets retain their colors.
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.material) return;
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        if (material.userData.foreground && 'color' in material) {
          (material.color as InstanceType<typeof THREE.Color>).set(style.color);
        }
        const ink = material.userData.ink;
        if (
          typeof ink === 'string' &&
          /^[a-z]+$/.test(ink) &&
          'color' in material
        ) {
          const color = style.getPropertyValue(`--alk-ink-${ink}`).trim();
          if (color)
            (material.color as InstanceType<typeof THREE.Color>).set(color);
        }
      }
    });
    requestRender();
  };

  try {
    const url = new URL(host.dataset.src!, document.baseURI);
    const response = await fetch(url, { signal });
    if (!response.ok)
      throw new Error(
        `The model could not be loaded (HTTP ${response.status}). Download the original to inspect it.`,
      );
    const buffer = await response.arrayBuffer();
    signal.throwIfAborted();
    const gltf = await new GLTFLoader().parseAsync(
      buffer,
      new URL('.', url).href,
    );
    // Parsing textures may finish after a removal; clean these late arrivals as well.
    if (signal.aborted || disposed) {
      disposeObjects(gltf.scenes);
      signal.throwIfAborted();
      throw new Error('Model view was closed.');
    }
    roots.push(...gltf.scenes);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    if (box.isEmpty())
      throw new Error(
        'This file has no visible model geometry. Download the original to inspect it.',
      );
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    radius = box.getBoundingSphere(new THREE.Sphere()).radius;
    if (!Number.isFinite(radius) || radius <= 0)
      throw new Error('The model has invalid or empty bounds.');
    gltf.scene.position.sub(center);
    scene.add(gltf.scene);
    camera.near = radius / 1000;
    camera.far = radius * 100;
    controls.minDistance = radius * 1.15;
    controls.maxDistance = radius * 18;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6c6a75, 2.6));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(radius * 3, radius * 4, radius * 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.4);
    rim.position.set(-radius * 4, radius, -radius * 2);
    scene.add(rim);
    const grid = new THREE.GridHelper(radius * 5, 20, 0x858585, 0x858585);
    grid.position.y = -size.y / 2 - radius * 0.1;
    for (const material of Array.isArray(grid.material)
      ? grid.material
      : [grid.material]) {
      material.transparent = true;
      material.opacity = 0.24;
      material.depthWrite = false;
      material.userData.foreground = true;
    }
    scene.add(grid);

    let triangles = 0;
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh)
        triangles +=
          (mesh.geometry.index?.count ??
            mesh.geometry.getAttribute('position')?.count ??
            0) / 3;
    });
    const status = host.querySelector<HTMLElement>('.alk-model-status')!;
    status.textContent = `${Math.round(triangles).toLocaleString()} triangles`;
    for (const control of host.querySelectorAll<
      HTMLButtonElement | HTMLInputElement
    >('button, input'))
      control.disabled = false;
    const spin = host.querySelector<HTMLInputElement>('[data-spin]')!;
    const wireframe = host.querySelector<HTMLInputElement>('[data-wireframe]')!;
    spin.checked = false;
    wireframe.checked = false;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const setSpin = () => {
      controls.autoRotate = spin.checked;
      previousTime = 0;
      requestRender();
    };
    spin.addEventListener('change', setSpin, { signal: events.signal });
    reducedMotion.addEventListener(
      'change',
      () => {
        if (reducedMotion.matches) {
          spin.checked = false;
          setSpin();
        }
      },
      { signal: events.signal },
    );
    wireframe.addEventListener(
      'change',
      () => {
        gltf.scene.traverse((object) => {
          const mesh = object as Mesh;
          if (!mesh.material) return;
          for (const material of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]) {
            if ('wireframe' in material) {
              material.wireframe = wireframe.checked;
              material.needsUpdate = true;
            }
          }
        });
        requestRender();
      },
      { signal: events.signal },
    );
    for (const button of host.querySelectorAll<HTMLButtonElement>(
      '[data-view]',
    ))
      button.addEventListener('click', () => preset(button.dataset.view!), {
        signal: events.signal,
      });
    canvas.addEventListener(
      'keydown',
      (event) => {
        const offset = camera.position.clone().sub(controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        switch (event.key) {
          case 'ArrowLeft':
            spherical.theta -= 0.14;
            break;
          case 'ArrowRight':
            spherical.theta += 0.14;
            break;
          case 'ArrowUp':
            spherical.phi -= 0.14;
            break;
          case 'ArrowDown':
            spherical.phi += 0.14;
            break;
          case '+':
          case '=':
            spherical.radius *= 0.9;
            break;
          case '-':
          case '_':
            spherical.radius *= 1.1;
            break;
          case 'Home':
            event.preventDefault();
            preset('perspective');
            return;
          default:
            return;
        }
        event.preventDefault();
        spherical.makeSafe();
        spherical.radius = THREE.MathUtils.clamp(
          spherical.radius,
          controls.minDistance,
          controls.maxDistance,
        );
        camera.position
          .copy(controls.target)
          .add(new THREE.Vector3().setFromSpherical(spherical));
        controls.update();
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        reportError(
          'The 3D graphics context was lost. Reload to retry, or download the model.',
        );
      },
      { signal: events.signal },
    );
    controls.addEventListener('change', requestRender);
    window.addEventListener('alk:theme-change', updateTheme, {
      signal: events.signal,
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener(
      'change',
      updateTheme,
      { signal: events.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) pause();
        else requestRender();
      },
      { signal: events.signal },
    );
    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (!width || !height) return;
      const previousAspect = camera.aspect;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (previousAspect !== camera.aspect) preset('perspective');
      requestRender();
    };
    ready = true;
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();
    preset('perspective');
    updateTheme();
    return {
      dispose,
      setVisible: (value) => {
        visible = value;
        if (value) requestRender();
        else pause();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

class ModelElement extends HTMLElement {
  private runtime?: ModelRuntime;
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
      { rootMargin: '0px', threshold: 0.01 },
    );
    this.observer.observe(this);
  }

  private async start() {
    const load = new AbortController();
    this.load = load;
    this.dataset.state = 'loading';
    this.querySelector<HTMLElement>('.alk-model-viewport')!.setAttribute(
      'aria-busy',
      'true',
    );
    this.querySelector<HTMLElement>('.alk-model-status')!.textContent =
      'Loading interactive geometry…';
    try {
      const runtime = await createModel(this, load.signal, (message) =>
        this.fail(message),
      );
      if (load.signal.aborted || !this.isConnected) {
        runtime.dispose();
        return;
      }
      this.runtime = runtime;
      this.dataset.state = 'ready';
      this.querySelector<HTMLElement>('.alk-model-viewport')!.setAttribute(
        'aria-busy',
        'false',
      );
      runtime.setVisible(this.visible);
    } catch (error) {
      if (load.signal.aborted) return;
      this.fail(
        error instanceof Error
          ? error.message
          : 'The interactive model could not be loaded. The original file is available below.',
      );
    }
  }

  private fail(message: string) {
    this.runtime?.dispose();
    this.runtime = undefined;
    this.dataset.state = 'error';
    this.querySelector<HTMLElement>('.alk-model-viewport')!.setAttribute(
      'aria-busy',
      'false',
    );
    this.querySelector<HTMLElement>('.alk-model-status')!.textContent = message;
    for (const control of this.querySelectorAll<
      HTMLButtonElement | HTMLInputElement
    >('button, input'))
      control.disabled = true;
  }

  private stop() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.load?.abort();
    this.load = undefined;
    this.runtime?.dispose();
    this.runtime = undefined;
    this.dataset.state = 'idle';
    this.querySelector<HTMLElement>('.alk-model-viewport')!.setAttribute(
      'aria-busy',
      'false',
    );
    this.querySelector<HTMLElement>('.alk-model-status')!.textContent =
      'Interactive view loads when visible.';
    for (const control of this.querySelectorAll<
      HTMLButtonElement | HTMLInputElement
    >('button, input'))
      control.disabled = true;
  }
}

if (!customElements.get('alk-model'))
  customElements.define('alk-model', ModelElement);
