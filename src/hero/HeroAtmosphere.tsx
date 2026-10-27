import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { HeroCameraHandle, PaperPortal } from './entryMotion';

type Theme = 'rose' | 'sage';

/** Optional enhancement: one persistent renderer, including a still reduced-motion frame. */
export const HeroAtmosphere = forwardRef<HeroCameraHandle, { theme: Theme; moving: boolean; night: boolean; onReady: (ready: boolean) => void }>(function HeroAtmosphere({ theme, moving, night, onReady }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settings = useRef({ theme, moving, night });
  const refresh = useRef<() => void>(() => {});
  const readyCallback = useRef(onReady);
  const cameraActions = useRef<HeroCameraHandle>({ approachPaper: async () => null, resetCamera: () => {} });
  useImperativeHandle(ref, () => ({ approachPaper: () => cameraActions.current.approachPaper(), resetCamera: () => cameraActions.current.resetCamera() }), []);
  readyCallback.current = onReady;
  settings.current = { theme, moving, night };
  useEffect(() => { refresh.current(); }, [theme, moving, night]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    let disposed = false;
    let release = () => {};
    let finishApproach: ((paper: PaperPortal | null) => void) | null = null;
    async function start() {
      const [T, { RoomEnvironment }, { createLivingStudio }, { loadPlushBears }] = await Promise.all([
        import('three'), import('three/addons/environments/RoomEnvironment.js'), import('./livingStudio'), import('./loadPlushBears'),
      ]);
      if (disposed || !canvas || !host) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
      catch { return; }
      const resources = new Set<{ dispose(): void }>();
      const cleanups: (() => void)[] = [];
      function own<R extends { dispose(): void }>(resource: R): R {
        if (!resources.has(resource)) {
          if (disposed || released) resource.dispose();
          else resources.add(resource);
        }
        return resource;
      }
      const scene = new T.Scene();
      let failed = false;
      let released = false;
      release = () => {
        if (released) return;
        released = true;
        finishApproach?.(null); finishApproach = null;
        cameraActions.current = { approachPaper: async () => null, resetCamera: () => {} };
        renderer.setAnimationLoop(null);
        cleanups.forEach(cleanup => cleanup());
        scene.clear();
        resources.forEach(resource => resource.dispose());
        renderer.dispose();
        canvas.removeAttribute('data-ready');
        refresh.current = () => {};
      };
      const mobile = window.matchMedia('(max-width: 660px)').matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = .96;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.VSMShadowMap;
      // Static room shadows are baked once; tiny character motions don't need a second scene render each frame.
      renderer.shadowMap.autoUpdate = false;
      const room = own(new RoomEnvironment());
      const generator = own(new T.PMREMGenerator(renderer));
      const environment = own(generator.fromScene(room, .05));
      scene.environment = environment.texture;
      scene.environmentIntensity = .30;
      const ambient = new T.HemisphereLight(0xfff6e7, 0xc19687, 1.45); scene.add(ambient);
      const sunlight = new T.DirectionalLight(0xffe7c3, 2.8);
      sunlight.position.set(-3, 7, 5);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.set(1024, 1024);
      sunlight.shadow.camera.left = sunlight.shadow.camera.bottom = -5;
      sunlight.shadow.camera.right = sunlight.shadow.camera.top = 5;
      sunlight.shadow.radius = 4;
      sunlight.shadow.blurSamples = 8;
      sunlight.shadow.normalBias = .035;
      sunlight.shadow.bias = -.0002;
      scene.add(sunlight);
      cleanups.push(() => sunlight.shadow.dispose());
      const fill = new T.DirectionalLight(0xffc4d4, .75); fill.position.set(4, 3, 4); scene.add(fill);
      const lamplight = new T.PointLight(0xffc678, 0, 7, 2); lamplight.position.set(-1.6, 2.8, .15); scene.add(lamplight);
      const plushBears = await loadPlushBears(T, own);
      if (disposed) return;
      const studio = createLivingStudio(T, own, plushBears); scene.add(studio.world);
      const camera = new T.OrthographicCamera(-4, 4, 4, -4, .1, 40);
      camera.position.set(0, 4.35, 8.4); camera.lookAt(0, 1.8, 0);
      const homePosition = camera.position.clone(), homeUp = camera.up.clone();
      const homeTarget = new T.Vector3(0, 1.8, 0);
      const paperTarget = new T.Vector3(-.1, 1.27, 1.09);
      const paperPosition = new T.Vector3(-.1, 5.7, 1.10);
      const paperUp = new T.Vector3(0, 0, -1), lookTarget = homeTarget.clone();
      let approachStart: number | null = null, approach = 0;
      let view = 6.6, aspect = 1;
      let px = 0, py = 0, x = 0, y = 0, elapsed = 0, last = 0;
      let visible = false, contextLost = false;
      let width = 0, height = 0;
      let evening = settings.current.night ? 1 : 0;
      const render = (now: number, force = false) => {
        if (disposed || failed || contextLost || !width || !height) return;
        if (!force && now - last < (mobile ? 33 : 25)) return;
        const delta = Math.min((now - last) / 1000, .06); last = now;
        if (approachStart !== null) {
          const progress = settings.current.moving ? Math.min(1, (now - approachStart) / 2200) : 1;
          approach = (1 - Math.cos(Math.PI * progress)) / 2;
        }
        if (settings.current.moving) elapsed += delta;
        const smoothing = 1 - Math.exp(-3 * delta);
        x += ((settings.current.moving ? px : 0) - x) * smoothing;
        y += ((settings.current.moving ? py : 0) - y) * smoothing;
        studio.world.rotation.y = x * .13 * (1 - approach);
        studio.world.rotation.x = y * .025 * (1 - approach);
        camera.position.lerpVectors(homePosition, paperPosition, approach);
        camera.up.lerpVectors(homeUp, paperUp, approach).normalize();
        camera.lookAt(lookTarget.lerpVectors(homeTarget, paperTarget, approach));
        const paperZoom = Math.min(view * aspect / 1.62, view / 1.08) * .84;
        // Interpolate magnification proportionally, so the camera drifts in without a sudden zoom burst.
        camera.zoom = Math.pow(paperZoom, approach);
        camera.updateProjectionMatrix();
        evening += ((settings.current.night ? 1 : 0) - evening) * (settings.current.moving ? smoothing * 2 : 1);
        ambient.intensity = 1.45 - evening * .85;
        sunlight.intensity = 2.8 - evening * 2.3;
        lamplight.intensity = evening * 7;
        studio.theme(settings.current.theme, evening);
        studio.update(elapsed, x, y, settings.current.moving, approachStart !== null || approach > 0 ? approach : undefined);
        fill.color.setHex(settings.current.theme === 'sage' ? 0xd9ecd0 : 0xffc4d4);
        try { renderer.render(scene, camera); }
        catch {
          failed = true; renderer.setAnimationLoop(null);
          finishApproach?.(null); finishApproach = null;
          canvas.removeAttribute('data-ready'); readyCallback.current(false);
          return;
        }
        if (canvas.dataset.ready !== 'true') {
          canvas.dataset.ready = 'true';
          readyCallback.current(true);
        }
        if (approach >= 1 && finishApproach) {
          approachStart = null;
          const bounds = canvas.getBoundingClientRect();
          const corners = [[-.81, .012, -.54], [.81, .012, -.54], [.81, .012, .54], [-.81, .012, .54]].map(([cx, cy, cz]) => {
            const v = studio.paper.localToWorld(new T.Vector3(cx, cy, cz)).project(camera);
            return { x: bounds.left + (v.x + 1) * bounds.width / 2, y: bounds.top + (1 - v.y) * bounds.height / 2 };
          });
          const w = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
          const h = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
          const complete = finishApproach; finishApproach = null;
          complete({ left: corners[0].x, top: corners[0].y, width: w, height: h, rotation: Math.atan2(corners[1].y - corners[0].y, corners[1].x - corners[0].x) * 180 / Math.PI });
          if (!settings.current.moving) renderer.setAnimationLoop(null);
        }
      };
      const sync = () => {
        last = performance.now();
        const active = (visible || approachStart !== null) && !document.hidden && !contextLost && !failed;
        host.dataset.visible = active ? 'true' : 'false';
        renderer.setAnimationLoop(active && (settings.current.moving || approachStart !== null) ? render : null);
        if (active) render(performance.now(), true);
      };
      refresh.current = sync;
      const resize = () => {
        const bounds = host.getBoundingClientRect();
        width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
        aspect = width / height;
        view = Math.max(5.8, 6.6 / aspect);
        camera.left = -view * aspect / 2; camera.right = view * aspect / 2;
        camera.top = view / 2; camera.bottom = -view / 2; camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.shadowMap.needsUpdate = true;
        sync();
      };
      const observer = new ResizeObserver(resize); observer.observe(host);
      cleanups.push(() => observer.disconnect());
      resize();
      cameraActions.current = {
        approachPaper: () => new Promise((resolve) => {
          if (failed || contextLost || released || disposed || canvas.dataset.ready !== 'true') { resolve(null); return; }
          resize();
          finishApproach?.(null);
          finishApproach = resolve;
          approachStart = performance.now();
          sync();
        }),
        resetCamera: () => {
          finishApproach?.(null); finishApproach = null;
          approachStart = null; approach = 0;
          camera.zoom = 1; sync();
        },
      };
      const move = (event: PointerEvent) => {
        if (!settings.current.moving || event.pointerType === 'touch') return;
        const bounds = host.getBoundingClientRect();
        px = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
        py = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
      };
      const reset = () => { px = py = 0; };
      const love = () => {
        if (!settings.current.moving) return;
        studio.love(elapsed);
      };
      const visibility = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync(); });
      visibility.observe(host);
      const lost = (event: Event) => {
        // Required for the browser to attempt restoration. The illustration remains usable meanwhile.
        event.preventDefault(); contextLost = true; readyCallback.current(false);
        finishApproach?.(null); finishApproach = null; approachStart = null;
        canvas.removeAttribute('data-ready'); sync();
      };
      const restored = () => { contextLost = false; renderer.shadowMap.needsUpdate = true; sync(); };
      host.addEventListener('pointermove', move, { passive: true });
      host.addEventListener('pointerleave', reset);
      host.addEventListener('hero-love', love);
      document.addEventListener('visibilitychange', sync);
      canvas.addEventListener('webglcontextlost', lost);
      canvas.addEventListener('webglcontextrestored', restored);
      cleanups.push(() => {
        visibility.disconnect();
        host.removeEventListener('pointermove', move);
        host.removeEventListener('pointerleave', reset);
        host.removeEventListener('hero-love', love);
        document.removeEventListener('visibilitychange', sync);
        canvas.removeEventListener('webglcontextlost', lost);
        canvas.removeEventListener('webglcontextrestored', restored);
        host.removeAttribute('data-visible');
      });
    }
    const launch = () => { void start().catch(() => { release(); if (!disposed) readyCallback.current(false); }); };
    // Let the small startup animation finish before compiling the optional 3D scene.
    if (document.documentElement.hasAttribute('data-booting')) document.addEventListener('draw-date-startup-finished', launch, { once: true });
    else launch();
    return () => { disposed = true; document.removeEventListener('draw-date-startup-finished', launch); release(); };
  }, []);
  return <canvas className="hero-atmosphere" ref={canvasRef} aria-hidden="true" />;
});
