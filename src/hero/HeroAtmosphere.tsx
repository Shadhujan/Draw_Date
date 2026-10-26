import { useEffect, useRef } from 'react';

type Theme = 'rose' | 'sage';

/** Optional, lazy-loaded Three.js scene. The HTML artwork always stands alone. */
export function HeroAtmosphere({ theme, moving }: { theme: Theme; moving: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host || !moving) return;
    let disposed = false;
    let release = () => {};

    async function start() {
      const [THREE, { RoomEnvironment }] = await Promise.all([
        import('three'), import('three/addons/environments/RoomEnvironment.js'),
      ]);
      if (disposed || !canvas || !host) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch { return; }

      const scene = new THREE.Scene();
      const resources: { dispose: () => void }[] = [];
      const cleanups: (() => void)[] = [];
      function own<T extends { dispose: () => void }>(resource: T): T {
        resources.push(resource);
        return resource;
      }
      // Register disposal before building the scene, including failed setup.
      release = () => {
        renderer.setAnimationLoop(null);
        cleanups.forEach((cleanup) => cleanup());
        scene.clear();
        resources.forEach((resource) => resource.dispose());
        renderer.dispose();
        canvas.removeAttribute('data-ready');
      };
      const mobile = window.matchMedia('(max-width: 660px)').matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      const roomLight = own(new RoomEnvironment());
      const environmentGenerator = own(new THREE.PMREMGenerator(renderer));
      const environment = own(environmentGenerator.fromScene(roomLight, 0.04));
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.65;
      const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 30);
      camera.position.z = 14;
      scene.add(new THREE.HemisphereLight(0xfff9ed, 0xc58e9a, 2.5));
      const sunlight = new THREE.PointLight(0xffe5c9, 48, 25);
      sunlight.position.set(-3, 5, 8);
      scene.add(sunlight);
      const bounce = new THREE.PointLight(theme === 'sage' ? 0xb1deba : 0xffb6d0, 22, 20);
      bounce.position.set(3, -1, 6);
      scene.add(bounce);

      const heartShape = new THREE.Shape();
      heartShape.moveTo(0, -0.35);
      heartShape.bezierCurveTo(-0.18, -0.16, -0.54, 0.10, -0.46, 0.38);
      heartShape.bezierCurveTo(-0.34, 0.72, -0.04, 0.53, 0, 0.35);
      heartShape.bezierCurveTo(0.05, 0.53, 0.38, 0.70, 0.48, 0.38);
      heartShape.bezierCurveTo(0.56, 0.10, 0.18, -0.20, 0, -0.35);
      const heartGeometry = own(new THREE.ExtrudeGeometry(heartShape, {
        depth: 0.16, bevelEnabled: true, bevelThickness: 0.10,
        bevelSize: 0.08, bevelSegments: 4, steps: 1, curveSegments: 18,
      }));
      heartGeometry.center();
      const starShape = new THREE.Shape();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const radius = i % 2 ? 0.11 : 0.44;
        if (!i) starShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        else starShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      starShape.closePath();
      const starGeometry = own(new THREE.ExtrudeGeometry(starShape, {
        depth: 0.05, bevelEnabled: true, bevelThickness: 0.025,
        bevelSize: 0.025, bevelSegments: 2, steps: 1,
      }));
      const heartMaterial = own(new THREE.MeshPhysicalMaterial({
        color: theme === 'sage' ? 0x9aba98 : 0xee97b4,
        roughness: 0.24, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.12,
      }));
      const peachMaterial = own(new THREE.MeshPhysicalMaterial({
        color: 0xf9c7ad, roughness: 0.3, clearcoat: 1,
      }));
      const starMaterial = own(new THREE.MeshStandardMaterial({
        color: 0xffecc0, emissive: 0xffcc83, emissiveIntensity: 0.4, roughness: 0.3,
      }));

      // Placed around the artwork; faces and the drawn heart stay unobstructed.
      const composition = [
        [-0.24, 0.31, 0.58, 'heart', 0.2], [0.10, 0.40, 0.22, 'star', 1.2],
        [0.40, 0.06, 0.18, 'star', 2.4], [-0.41, -0.09, 0.20, 'star', 3.0],
        [0.42, -0.26, 0.19, 'star', 1.3], [-0.36, -0.33, 0.25, 'heart', 4.3],
        [-0.06, 0.44, 0.12, 'star', 2.5], [0.25, -0.41, 0.15, 'star', 0.8],
      ] as const;
      const items = composition.filter((_, i) => !mobile || i < 6).map(([x, y, size, shape, phase], i) => {
        const mesh = new THREE.Mesh(shape === 'heart' ? heartGeometry : starGeometry,
          shape === 'star' ? starMaterial : i % 2 ? peachMaterial : heartMaterial);
        mesh.position.z = (i % 3) * 0.4;
        mesh.scale.setScalar(size);
        scene.add(mesh);
        return { mesh, x, y, size, phase };
      });

      // A single small sprite texture and one draw call for warm floating dust.
      const glow = document.createElement('canvas');
      glow.width = glow.height = 32;
      const context = glow.getContext('2d');
      if (context) {
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, '#fffdf0');
        gradient.addColorStop(0.15, '#fff2d8dd');
        gradient.addColorStop(1, '#fff2d800');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
      }
      const glowMap = own(new THREE.CanvasTexture(glow));
      const dustGeometry = own(new THREE.BufferGeometry());
      const dustCount = mobile ? 18 : 36;
      const positions = new Float32Array(dustCount * 3);
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const dustMaterial = own(new THREE.PointsMaterial({
        color: 0xfff1cf, size: 0.11, map: glowMap, transparent: true,
        opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      scene.add(new THREE.Points(dustGeometry, dustMaterial));
      const burst = Array.from({ length: mobile ? 7 : 11 }, (_, i) => {
        const mesh = new THREE.Mesh(heartGeometry, i % 2 ? peachMaterial : heartMaterial);
        mesh.visible = false;
        scene.add(mesh);
        return mesh;
      });

      let width = 6;
      const height = 6;
      const resize = () => {
        const bounds = host.getBoundingClientRect();
        width = Math.max(1, bounds.width / Math.max(bounds.height, 1) * height);
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
      };
      const resizeObserver = new ResizeObserver(resize);
      cleanups.push(() => resizeObserver.disconnect());
      resizeObserver.observe(host);
      resize();

      let pointerX = 0;
      let pointerY = 0;
      const move = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;
        const box = host.getBoundingClientRect();
        pointerX = ((event.clientX - box.left) / box.width - 0.5) * 2;
        pointerY = ((event.clientY - box.top) / box.height - 0.5) * 2;
      };
      const reset = () => { pointerX = 0; pointerY = 0; };
      host.addEventListener('pointermove', move, { passive: true });
      host.addEventListener('pointerleave', reset);
      cleanups.push(() => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', reset); });

      let elapsed = 0;
      let last = 0;
      let burstAt = -10;
      const love = () => { burstAt = elapsed; };
      host.addEventListener('hero-love', love);
      cleanups.push(() => host.removeEventListener('hero-love', love));
      const render = (now: number) => {
        if (disposed || now - last < (mobile ? 33 : 22)) return;
        const delta = Math.min((now - last) / 1000, 0.06);
        last = now;
        elapsed += delta;
        const t = elapsed;
        items.forEach(({ mesh, x, y, phase, size }) => {
          mesh.position.x = x * width + Math.sin(t * 0.45 + phase) * 0.07;
          mesh.position.y = y * height + Math.sin(t * 0.65 + phase) * 0.11;
          mesh.rotation.set(Math.sin(t * 0.45 + phase) * 0.13,
            Math.sin(t * 0.4 + phase) * 0.28, Math.sin(t * 0.3 + phase) * 0.16);
          mesh.scale.setScalar(size * (1 + Math.sin(t + phase) * 0.035));
        });
        for (let i = 0; i < dustCount; i++) {
          positions[i * 3] = Math.sin(i * 12.9) * width * 0.47 + Math.sin(t * 0.18 + i) * 0.09;
          positions[i * 3 + 1] = ((i * 0.73 + t * 0.07) % height) - height / 2;
          positions[i * 3 + 2] = -1;
        }
        dustGeometry.attributes.position.needsUpdate = true;
        const age = (t - burstAt) / 2.2;
        burst.forEach((mesh, i) => {
          mesh.visible = age >= 0 && age < 1;
          if (!mesh.visible) return;
          const spread = (i / (burst.length - 1) - 0.5) * 2;
          mesh.position.set(spread * age * width * 0.28, -0.3 + age * 2.5 + Math.sin(i * 2) * 0.2, 1.5);
          mesh.rotation.set(age * 0.3, Math.sin(i) * age, spread * age * 0.5);
          mesh.scale.setScalar((0.12 + i % 3 * 0.035) * Math.sin(age * Math.PI));
        });
        const smoothing = 1 - Math.exp(-3 * delta);
        scene.rotation.y += (pointerX * 0.055 - scene.rotation.y) * smoothing;
        scene.rotation.x += (-pointerY * 0.035 - scene.rotation.x) * smoothing;
        bounce.position.x += (pointerX * 2.5 - bounce.position.x) * smoothing;
        renderer.render(scene, camera);
        canvas.dataset.ready = 'true';
      };

      let visible = false;
      let contextLost = false;
      const syncPlayback = () => {
        last = performance.now();
        renderer.setAnimationLoop(!disposed && visible && !document.hidden && !contextLost ? render : null);
      };
      const visibility = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? false;
        host.dataset.visible = visible ? 'true' : 'false';
        syncPlayback();
      });
      visibility.observe(host);
      const onVisibility = () => {
        host.dataset.visible = !document.hidden && visible ? 'true' : 'false';
        syncPlayback();
      };
      const lost = () => { contextLost = true; syncPlayback(); };
      const restored = () => { contextLost = false; syncPlayback(); };
      document.addEventListener('visibilitychange', onVisibility);
      canvas.addEventListener('webglcontextlost', lost);
      canvas.addEventListener('webglcontextrestored', restored);
      cleanups.push(() => {
        visibility.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('webglcontextlost', lost);
        canvas.removeEventListener('webglcontextrestored', restored);
        host.removeAttribute('data-visible');
      });
    }

    void start().catch(() => { release(); });
    return () => { disposed = true; release(); };
  }, [theme, moving]);

  return <canvas className="hero-atmosphere" ref={canvasRef} aria-hidden="true" />;
}
