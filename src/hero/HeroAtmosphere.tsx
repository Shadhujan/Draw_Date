import { useEffect, useRef } from 'react';

type Theme = 'rose' | 'sage';

/**
 * Genuine Three.js particles, not a video overlay. Loaded only on the welcome
 * screen, with a CSS-only fallback when WebGL or motion is unavailable.
 */
export function HeroAtmosphere({ theme }: { theme: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let disposed = false;
    let release = () => {};

    async function start() {
      // The Three.js bundle is split from the main app and fetched only when needed.
      const THREE = await import('three');
      if (disposed || !canvas || !host) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch {
        // WebGL can be disabled by the browser or device; the static scene still works.
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 30);
      camera.position.z = 14;

      scene.add(new THREE.AmbientLight(0xffffff, 2.1));
      const sunlight = new THREE.PointLight(0xffe5d9, 55, 20);
      sunlight.position.set(-3, 5, 8);
      scene.add(sunlight);
      const bounce = new THREE.PointLight(theme === 'sage' ? 0xb1deba : 0xffa8cc, 24, 20);
      bounce.position.set(4, -3, 6);
      scene.add(bounce);

      const heartShape = new THREE.Shape();
      heartShape.moveTo(0, -0.35);
      heartShape.bezierCurveTo(-0.18, -0.16, -0.54, 0.10, -0.46, 0.38);
      heartShape.bezierCurveTo(-0.34, 0.72, -0.04, 0.53, 0, 0.35);
      heartShape.bezierCurveTo(0.05, 0.53, 0.38, 0.70, 0.48, 0.38);
      heartShape.bezierCurveTo(0.56, 0.10, 0.18, -0.20, 0, -0.35);
      const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
        depth: 0.11, bevelEnabled: true, bevelThickness: 0.055,
        bevelSize: 0.047, bevelSegments: 3, steps: 1, curveSegments: 15,
      });
      heartGeometry.center();

      const starShape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI / 5) - Math.PI / 2;
        const radius = i % 2 ? 0.20 : 0.54;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
      }
      starShape.closePath();
      const starGeometry = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.08, bevelEnabled: true, bevelThickness: 0.035,
        bevelSize: 0.035, bevelSegments: 2, steps: 1,
      });
      starGeometry.center();

      const heartMat = new THREE.MeshPhysicalMaterial({
        color: theme === 'sage' ? 0x9ebfa7 : 0xf3a6bd,
        roughness: 0.28, metalness: 0.03, clearcoat: 1, clearcoatRoughness: 0.16,
        transparent: true, opacity: 0.9, depthWrite: false,
      });
      const blushMat = new THREE.MeshPhysicalMaterial({
        color: theme === 'sage' ? 0xf2d6a3 : 0xf8c8a0,
        roughness: 0.35, clearcoat: 0.9, transparent: true, opacity: 0.87, depthWrite: false,
      });
      const pearlMat = new THREE.MeshPhysicalMaterial({
        color: 0xfff9eb, roughness: 0.28, metalness: 0.03,
        clearcoat: 1, transparent: true, opacity: 0.9, depthWrite: false,
      });

      // Fixed composition: away from the mascots' faces and the primary action.
      const composition = [
        [-0.36, 0.28, 0.31, 'heart', 0.2], [-0.19, 0.45, 0.18, 'star', 1.2],
        [0.40, 0.33, 0.24, 'heart', 2.4], [0.24, 0.48, 0.13, 'star', 3.0],
        [-0.47, -0.17, 0.18, 'star', 1.3], [0.47, -0.11, 0.19, 'heart', 4.3],
        [0.34, -0.40, 0.17, 'star', 2.5], [-0.30, -0.40, 0.20, 'heart', 0.8],
        [-0.05, 0.47, 0.12, 'star', 1.9], [0.45, 0.06, 0.13, 'star', 3.7],
        [-0.43, 0.05, 0.15, 'heart', 3.4], [0.10, -0.48, 0.12, 'star', 2.1],
      ] as const;
      const mobile = window.matchMedia('(max-width: 660px)').matches;
      const items = composition.filter((_, i) => !mobile || i < 8).map(([x, y, size, shape, phase], i) => {
        const mesh = new THREE.Mesh(
          shape === 'heart' ? heartGeometry : starGeometry,
          shape === 'heart' ? heartMat : (i % 2 ? blushMat : pearlMat),
        );
        mesh.position.z = -0.4 + (i % 4) * 0.4;
        mesh.scale.setScalar(size);
        scene.add(mesh);
        return { mesh, x, y, phase, baseSize: size };
      });

      let width = 1;
      let height = 6;
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
      resizeObserver.observe(host);
      resize();

      let pointerX = 0;
      let pointerY = 0;
      const move = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;
        const rect = host.getBoundingClientRect();
        pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      host.addEventListener('pointermove', move, { passive: true });
      const resetPointer = () => { pointerX = 0; pointerY = 0; };
      host.addEventListener('pointerleave', resetPointer);

      let visible = true;
      const visibility = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? false; });
      visibility.observe(host);
      let frame = 0;
      let prev = 0;
      const startedAt = performance.now();
      const render = (now: number) => {
        if (disposed) return;
        frame = requestAnimationFrame(render);
        if (!visible || document.hidden || now - prev < (mobile ? 33 : 16)) return;
        prev = now;
        const t = (now - startedAt) / 1000;
        items.forEach(({ mesh, x, y, phase, baseSize }, i) => {
          mesh.position.x = x * width + Math.sin(t * 0.49 + phase) * 0.10;
          mesh.position.y = y * height + Math.sin(t * 0.70 + phase) * 0.14;
          mesh.rotation.set(Math.sin(t * 0.5 + phase) * 0.16, Math.cos(t * 0.42 + phase) * 0.23, Math.sin(t * 0.35 + phase) * 0.17);
          const s = 1 + Math.sin(t * 1.1 + i) * 0.055;
          mesh.scale.setScalar(baseSize * s);
        });
        // Keep the depth motion extremely gentle so the welcome screen stays calm.
        scene.rotation.y += (pointerX * 0.075 - scene.rotation.y) * 0.035;
        scene.rotation.x += (-pointerY * 0.06 - scene.rotation.x) * 0.035;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(render);

      release = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        visibility.disconnect();
        host.removeEventListener('pointermove', move);
        host.removeEventListener('pointerleave', resetPointer);
        scene.clear();
        heartGeometry.dispose();
        starGeometry.dispose();
        heartMat.dispose();
        blushMat.dispose();
        pearlMat.dispose();
        renderer.dispose();
      };
    }

    void start().catch(() => { /* Optional enhancement; CSS fallback remains visible. */ });
    return () => { disposed = true; release(); };
  }, [theme]);

  return <canvas className="hero-atmosphere" ref={canvasRef} aria-hidden="true" />;
}
