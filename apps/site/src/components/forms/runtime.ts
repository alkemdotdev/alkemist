import { formColors } from './materials';
import type { BufferGeometry, Material, WebGLRenderTarget } from 'three';
import { allFormStudies } from './catalog';

type Runtime = { dispose(): void; setVisible(value: boolean): void };

async function mount(
  host: HTMLElement,
  signal: AbortSignal,
  fail: (message: string) => void,
): Promise<Runtime> {
  const [THREE, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/environments/RoomEnvironment.js'),
  ]);
  signal.throwIfAborted();
  const spec = allFormStudies
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  canvas.style.touchAction = 'pan-y';
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  const colors = formColors;
  let environmentMap: WebGLRenderTarget | undefined;
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
      group.position.y = object.position[1] + oscillate(0.19) * 0.008;
    });
  const point = new THREE.Vector3();
  const annotationNodes = [
    ...host.querySelectorAll<HTMLElement>('[data-annotation-label]'),
  ];
  const leaderNodes = [
    ...host.querySelectorAll<SVGPathElement>('[data-annotation-leader]'),
  ];
  const anchorNodes = [
    ...host.querySelectorAll<SVGCircleElement>('[data-annotation-anchor]'),
  ];
  const updateAnnotations = () => {
    const width = viewport.clientWidth,
      height = viewport.clientHeight;
    const occupied = { left: 38, right: 38 };
    const projected = (spec.annotations ?? [])
      .map((annotation, i) => {
        point.set(...annotation.point);
        if (annotation.object !== undefined)
          groups[annotation.object]?.localToWorld(point);
        point.project(camera);
        return {
          annotation,
          i,
          px: ((point.x + 1) * width) / 2,
          py: ((1 - point.y) * height) / 2,
        };
      })
      .sort(
        (a, b) =>
          a.py + a.annotation.offset[1] - (b.py + b.annotation.offset[1]),
      );
    for (const { annotation, i, px, py } of projected) {
      const label = annotationNodes[i];
      if (!label || !label.offsetHeight) continue;
      const side = annotation.offset[0] < 0 ? 'left' : 'right';
      const x = side === 'left' ? 10 : width - label.offsetWidth - 10;
      const y = Math.min(
        height - label.offsetHeight - 12,
        Math.max(occupied[side], py + annotation.offset[1]),
      );
      occupied[side] = y + label.offsetHeight + 14;
      label.style.transform = `translate(${x}px,${y}px)`;
      const endX = side === 'left' ? x + label.offsetWidth : x,
        endY = y + 11;
      leaderNodes[i]?.setAttribute(
        'd',
        `M${px},${py} L${(px + endX) / 2},${endY} L${endX},${endY}`,
      );
      anchorNodes[i]?.setAttribute('cx', String(px));
      anchorNodes[i]?.setAttribute('cy', String(py));
    }
  };
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
    updateAnnotations();
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
    environmentMap?.dispose();
    renderer.dispose();
    if (!context.isContextLost()) renderer.forceContextLoss();
    if (canvas.parentNode === viewport)
      canvas.replaceWith(canvas.cloneNode(false));
  };
  signal.addEventListener('abort', dispose, { once: true });
  try {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environmentMap = pmrem.fromScene(room);
      scene.environment = environmentMap.texture;
      scene.environmentIntensity = 0.8;
    } finally {
      room.dispose();
      pmrem.dispose();
    }
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
        if (surface.normals)
          geometry.setAttribute(
            'normal',
            new THREE.Float32BufferAttribute(surface.normals, 3),
          );
        else geometry.computeVertexNormals();
        if (surface.colorRamp) {
          const { axis, inks } = surface.colorRamp;
          const ramp = inks.map((ink) => new THREE.Color(colors[ink]));
          const position = geometry.getAttribute('position');
          let lo = Infinity,
            hi = -Infinity;
          for (let i = 0; i < position.count; i++) {
            const value = surface.positions[i * 3 + axis]!;
            lo = Math.min(lo, value);
            hi = Math.max(hi, value);
          }
          const color = new THREE.Color();
          const values = new Float32Array(position.count * 3);
          for (let i = 0; i < position.count; i++) {
            const t =
              ((surface.positions[i * 3 + axis]! - lo) / (hi - lo || 1)) *
              (ramp.length - 1);
            const index = Math.min(Math.floor(t), ramp.length - 2);
            color.copy(ramp[index]!).lerp(ramp[index + 1]!, t - index);
            color.toArray(values, i * 3);
          }
          geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
        }
        const opacity = surface.opacity ?? 1;
        const material = new THREE.MeshStandardMaterial({
          color: surface.colorRamp ? 0xffffff : colors[surface.ink],
          vertexColors: !!surface.colorRamp,
          side: THREE.DoubleSide,
          roughness: surface.roughness ?? 0.36,
          metalness: surface.metalness ?? 0.65,
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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x71809c, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(-3, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc9e4ff, 1.3);
    rim.position.set(5, -1, -3);
    scene.add(rim);
    // Fit the actual vertices. Rotated local bounding boxes waste most of a
    // curved specimen's frame, especially when the object has deep folds.
    scene.updateMatrixWorld(true);
    const fitPoints: number[] = [];
    for (const group of groups) {
      for (const child of group.children) {
        const position = (
          child as InstanceType<typeof THREE.Mesh>
        ).geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) {
          point
            .fromBufferAttribute(position, i)
            .applyMatrix4(group.matrixWorld);
          fitPoints.push(point.x, point.y, point.z);
        }
      }
    }
    const fitDistance = () => {
      const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
      const vertical = Math.tan(halfAngle) * 0.78;
      const horizontal = vertical * camera.aspect;
      let distance = 0;
      for (let i = 0; i < fitPoints.length; i += 3) {
        distance = Math.max(
          distance,
          fitPoints[i + 2]! + Math.abs(fitPoints[i]!) / horizontal,
          fitPoints[i + 2]! + Math.abs(fitPoints[i + 1]!) / vertical,
        );
      }
      return distance;
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
    host
      .querySelectorAll<HTMLButtonElement>('[data-form-zoom]')
      .forEach((button) => {
        button.disabled = false;
        button.addEventListener(
          'click',
          () => {
            motion(false);
            const distance = fitDistance();
            camera.position.setLength(
              THREE.MathUtils.clamp(
                camera.position.length() *
                  (button.dataset.formZoom === 'in' ? 0.85 : 1 / 0.85),
                distance * 0.6,
                distance * 1.4,
              ),
            );
            controls.update();
            requestRender();
          },
          { signal: events.signal },
        );
      });
    host
      .closest('form-studies')
      ?.addEventListener('form-details-change', requestRender, {
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
