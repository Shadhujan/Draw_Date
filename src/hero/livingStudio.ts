// Original, code-built clay miniatures. No model downloads or external asset requests.
// Three.js is deliberately confined to this lazy-loaded decorative scene.
export function createLivingStudio(T: any, own: <R extends { dispose(): void }>(resource: R) => R) {
  const world = new T.Group();
  const sphere = own(new T.SphereGeometry(1, 32, 24));
  const material = (_name: string, color: number, roughness = .72) => {
    const value = own(new T.MeshStandardMaterial({ color, roughness }));
    return value;
  };
  const cream = material('cream', 0xffebcd);
  const caramel = material('caramel', 0xc78d62);
  const muzzle = material('muzzle', 0xffdcb7);
  const pink = material('pink', 0xe89ba9);
  const sage = material('sage', 0x93b69b);
  const dark = material('dark', 0x58362d, .4);
  const white = material('white', 0xfffcf1);
  const wood = material('wood', 0xd6a17d);
  const rim = material('rim', 0xf6d6c5);
  const wall = material('wall', 0xf5ded0);
  const leaf = material('leaf', 0x86a486);
  const gold = material('gold', 0xd8ad72, .35);
  const sky = own(new T.MeshBasicMaterial({ color: 0xffe4b0 }));
  const skyDay = new T.Color(0xffe4b0), skyNight = new T.Color(0x596780);
  const glow = own(new T.MeshBasicMaterial({ color: 0xfff1c7 }));
  const lampGlow = own(new T.MeshStandardMaterial({ color: 0xffe3ad, emissive: 0xffad4e, emissiveIntensity: .05, roughness: .5 }));

  // Fine, deterministic surface grain makes the bears feel soft instead of plastic.
  const grain = document.createElement('canvas');
  grain.width = grain.height = 128;
  const grainContext = grain.getContext('2d');
  if (grainContext) {
    const pixels = grainContext.createImageData(128, 128);
    let seed = 83;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const value = 155 + seed % 80;
      pixels.data.set([value, value, value, 255], i);
    }
    grainContext.putImageData(pixels, 0, 0);
  }
  const grainMap = own(new T.CanvasTexture(grain));
  grainMap.wrapS = grainMap.wrapT = T.RepeatWrapping;
  grainMap.repeat.set(5, 5);
  for (const value of [cream, caramel]) { value.bumpMap = grainMap; value.bumpScale = .022; }

  function ball(parent: any, mat: any, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) {
    const mesh = new T.Mesh(sphere, mat);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function cylinder(parent: any, mat: any, top: number, bottom: number, height: number, x: number, y: number, z: number, segments = 48) {
    const mesh = new T.Mesh(own(new T.CylinderGeometry(top, bottom, height, segments)), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function box(parent: any, mat: any, w: number, h: number, d: number, x: number, y: number, z: number) {
    const mesh = new T.Mesh(own(new T.BoxGeometry(w, h, d)), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function line(parent: any, mat: any, points: number[][], radius = .025) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    const mesh = new T.Mesh(own(new T.TubeGeometry(curve, 36, radius, 6, false)), mat);
    parent.add(mesh); return mesh;
  }
  function arch(parent: any, mat: any, w: number, h: number, depth: number, x: number, y: number, z: number) {
    const s = new T.Shape(); const r = w / 2;
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r);
    s.absarc(0, h - r, r, 0, Math.PI, false); s.lineTo(-r, 0);
    const geometry = own(new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 3, steps: 1, curveSegments: 36 }));
    const mesh = new T.Mesh(geometry, mat); mesh.position.set(x, y, z);
    mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const heartShape = new T.Shape();
  heartShape.moveTo(0, -.40);
  heartShape.bezierCurveTo(-.18, -.21, -.61, .10, -.46, .38);
  heartShape.bezierCurveTo(-.32, .65, -.05, .53, 0, .32);
  heartShape.bezierCurveTo(.06, .53, .34, .65, .47, .38);
  heartShape.bezierCurveTo(.61, .10, .18, -.21, 0, -.40);
  const heartGeometry = own(new T.ExtrudeGeometry(heartShape, { depth: .12, bevelEnabled: true, bevelThickness: .065, bevelSize: .055, bevelSegments: 3, steps: 1, curveSegments: 24 }));
  heartGeometry.center();
  const heartMaterial = own(new T.MeshPhysicalMaterial({ color: 0xeaa6b9, roughness: .24, clearcoat: 1, clearcoatRoughness: .15 }));
  function heart(parent: any, x: number, y: number, z: number, size: number) {
    const mesh = new T.Mesh(heartGeometry, heartMaterial);
    mesh.position.set(x, y, z); mesh.scale.setScalar(size); mesh.castShadow = true; parent.add(mesh); return mesh;
  }

  // A little open-front room on a scalloped keepsake base.
  cylinder(world, rim, 3.03, 2.9, .24, 0, -.15, 0, 96);
  cylinder(world, white, 2.94, 2.94, .08, 0, .01, 0, 96);
  for (let i = 0; i < 38; i++) {
    const a = i / 38 * Math.PI * 2;
    ball(world, rim, Math.cos(a) * 2.94, -.15, Math.sin(a) * 2.94, .12, .08, .12);
  }
  arch(world, wall, 5.7, 4.3, .16, 0, .03, -1.75);
  arch(world, gold, 2.0, 2.75, .075, -.40, 1.0, -1.53);
  arch(world, sky, 1.82, 2.59, .06, -.40, 1.08, -1.42);
  box(world, white, .055, 2.46, .08, -.40, 2.32, -1.30);
  box(world, white, 1.83, .055, .08, -.40, 2.06, -1.30);
  box(world, white, 2.22, .13, .38, -.40, 1.03, -1.29);
  // Soft curtain folds, suspended from a brass rod.
  const rod = cylinder(world, gold, .035, .035, 2.73, -.40, 3.58, -1.11);
  rod.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    ball(world, pink, -.40 + side * (1.0 + i * .09), 2.38, -1.10 + Math.sin(i) * .04, .12, 1.13, .095);
  }
  // Sun disk and a few small paper clouds beyond the window.
  ball(world, glow, -.9, 3.0, -1.29, .25, .25, .02);
  for (let i = 0; i < 3; i++) ball(world, white, .03 + i * .16, 2.75 + (i === 1 ? .07 : 0), -1.28, .17, .10, .02);

  const stars = new T.Group(); world.add(stars);
  for (let i = 0; i < 11; i++) {
    const x = -.40 + Math.sin(i * 5.17) * .70, y = 1.40 + ((i * .47) % 1.55);
    ball(stars, glow, x, y, -1.26, .018, .025, .012);
  }
  // A warm little floor lamp makes evening an actual lighting change.
  cylinder(world, gold, .025, .025, 1.95, -1.94, 1.02, -.52);
  cylinder(world, wood, .26, .29, .06, -1.94, .08, -.52);
  cylinder(world, lampGlow, .23, .43, .47, -1.94, 2.05, -.52);
  ball(world, glow, -1.94, 1.84, -.52, .10);

  // A framed tiny love letter and three books on the wall shelf.
  box(world, wood, .98, .09, .40, 1.60, 2.66, -1.32);
  const picture = new T.Group(); picture.position.set(1.56, 2.98, -1.46); picture.rotation.z = -.07;
  box(picture, white, .54, .64, .08, 0, 0, 0);
  box(picture, pink, .43, .52, .02, 0, 0, .055);
  const pictureHeart = heart(picture, 0, .03, .08, .21); pictureHeart.material = white;
  world.add(picture);
  for (let i = 0; i < 3; i++) box(world, [pink, sage, white][i], .11, .31 + i * .05, .21, 1.91 + i * .12, 2.85, -1.29);

  // The shared desk: warm rounded wood, stubby legs, and a gingham mat.
  const desk = new T.Group(); desk.position.set(0, 0, .97); world.add(desk);
  const top = cylinder(desk, wood, 1, 1, .16, 0, 1.10, 0, 64);
  top.scale.set(2.12, 1, .94);
  const topRim = cylinder(desk, muzzle, 1, 1, .035, 0, 1.195, 0, 64);
  topRim.scale.set(2.1, 1, .93);
  for (const x of [-1.43, 1.43]) for (const z of [-.45, .45]) cylinder(desk, wood, .11, .14, 1, x, .53, z);
  box(desk, pink, 2.7, .012, 1.25, -.14, 1.224, .06);
  for (let i = 0; i < 12; i++) box(desk, rim, .045, .006, 1.25, -1.39 + i * .228, 1.235, .06);
  for (let i = 0; i < 6; i++) box(desk, rim, 2.7, .006, .045, -.14, 1.237, -.56 + i * .24);
  const paper = box(desk, white, 1.62, .022, 1.08, -.1, 1.258, .12); paper.rotation.y = -.08;
  // A crayon heart draws itself on the paper. The pencil tip follows the line.
  const drawing = new T.Group(); drawing.position.set(-.1, 1.277, 1.1); drawing.rotation.x = -Math.PI / 2; world.add(drawing);
  const heartCurve = new T.CatmullRomCurve3([
    new T.Vector3(0, -.29, 0), new T.Vector3(-.43, .05, 0), new T.Vector3(-.34, .35, 0),
    new T.Vector3(-.09, .30, 0), new T.Vector3(0, .17, 0), new T.Vector3(.13, .34, 0),
    new T.Vector3(.38, .29, 0), new T.Vector3(.40, .05, 0), new T.Vector3(0, -.29, 0),
  ]);
  const drawingGeometry = own(new T.TubeGeometry(heartCurve, 120, .023, 6, false));
  const drawingInk = new T.Mesh(drawingGeometry, pink); drawing.add(drawingInk);
  const pencil = new T.Group(); world.add(pencil);
  cylinder(pencil, pink, .055, .055, .65, 0, .41, 0, 6);
  cylinder(pencil, muzzle, .055, 0, .16, 0, .005, 0, 6).rotation.z = Math.PI;
  cylinder(pencil, dark, .016, 0, .05, 0, -.09, 0, 6).rotation.z = Math.PI;
  cylinder(pencil, gold, .058, .058, .045, 0, .73, 0, 12);
  ball(pencil, pink, 0, .78, 0, .057, .06, .057);
  pencil.rotation.z = -.40;

  const bears: { body: any; head: any; eyes: any[]; arm: any; cheeks: any[]; x: number; tilt: number }[] = [];
  function bear(x: number, mat: any, accent: any, tilt: number) {
    const body = new T.Group(); body.position.set(x, .1, -.04); world.add(body);
    // Feet and belly peek out below the tabletop.
    ball(body, mat, -.31, .33, .40, .28, .24, .32);
    ball(body, mat, .31, .33, .40, .28, .24, .32);
    ball(body, mat, 0, .84, 0, .49, .65, .39);
    ball(body, muzzle, 0, .77, .34, .30, .36, .06);
    const head = new T.Group(); head.position.set(0, 1.78, 0); head.rotation.z = tilt; body.add(head);
    ball(head, mat, 0, 0, 0, .64, .60, .52);
    for (const side of [-1, 1]) {
      ball(head, mat, side * .46, .46, -.04, .245, .25, .17);
      ball(head, pink, side * .46, .46, .11, .145, .15, .035);
    }
    ball(head, muzzle, 0, -.16, .48, .27, .21, .075);
    const eyes = [-1, 1].map(side => {
      const eye = ball(head, dark, side * .245, .035, .475, .046, .062, .024);
      eye.userData.glint = ball(head, white, side * .245 - .012, .052, .497, .012);
      return eye;
    });
    const cheeks = [-1, 1].map(side => ball(head, pink, side * .38, -.12, .43, .115, .066, .027));
    ball(head, dark, 0, -.10, .565, .065, .045, .028);
    line(head, dark, [[0, -.12, .559], [0, -.21, .559], [-.07, -.24, .54], [-.11, -.19, .54]], .015);
    line(head, dark, [[0, -.21, .559], [.07, -.24, .54], [.11, -.19, .54]], .015);
    // Keep the cream bear's head clear; only the caramel bear wears a scarf.
    if (x > 0) {
      ball(body, accent, 0, 1.29, .28, .36, .10, .17);
      const scarf = box(body, accent, .16, .37, .055, .20, 1.1, .40); scarf.rotation.z = -.25;
    }
    ball(body, mat, x < 0 ? -.37 : .37, 1.0, .49, .22, .28, .23);
    const arm = new T.Group(); arm.position.set(x < 0 ? .34 : -.34, 1.10, .49); body.add(arm);
    ball(arm, mat, 0, 0, 0, .235, .22, .30);
    bears.push({ body, head, eyes, arm, cheeks, x, tilt });
  }
  bear(-.71, cream, pink, -.10); bear(.71, caramel, sage, .10);

  // A tiny cup of paintbrushes and a mug with a handle.
  cylinder(world, sage, .16, .135, .31, 1.57, 1.39, .91);
  for (let i = 0; i < 3; i++) {
    const brush = new T.Group(); brush.position.set(1.47 + i * .09, 1.5, .91); brush.rotation.z = (i - 1) * .17;
    cylinder(brush, wood, .021, .021, .59, 0, .20, 0, 8);
    cylinder(brush, gold, .034, .034, .10, 0, .52, 0, 8);
    ball(brush, [pink, sage, muzzle][i], 0, .62, 0, .039, .10, .039); world.add(brush);
  }
  cylinder(world, pink, .14, .12, .23, -1.55, 1.35, 1.1);
  cylinder(world, dark, .115, .115, .005, -1.55, 1.47, 1.1);
  const handle = new T.Mesh(own(new T.TorusGeometry(.10, .025, 8, 20)), pink);
  handle.position.set(-1.72, 1.36, 1.1); world.add(handle);

  // A potted heart-leaf plant and a soft floor cushion.
  cylinder(world, white, .29, .20, .48, 2.13, .28, -.51);
  cylinder(world, wood, .24, .24, .025, 2.13, .53, -.51);
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4;
    const x = 2.13 + Math.sin(angle) * .27, y = .85 + i * .13, z = -.51 + Math.cos(angle) * .20;
    line(world, leaf, [[2.13, .53, -.51], [2.13, y - .15, -.51], [x, y, z]], .018);
    const l = ball(world, leaf, x, y, z, .16, .09, .07); l.rotation.z = angle * .6;
  }
  const cushion = ball(world, sage, -1.85, .15, -.30, .55, .14, .45); cushion.rotation.y = .4;
  const mobile = new T.Group(); mobile.position.set(1.43, 3.95, -.45); world.add(mobile);
  line(mobile, gold, [[-.34, 0, 0], [0, .10, 0], [.34, 0, 0]], .018);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * .30, length = i === 1 ? .62 : .38;
    line(mobile, gold, [[x, 0, 0], [x, -length, 0]], .009);
    heart(mobile, x, -length - .10, 0, i === 1 ? .24 : .16);
  }
  const floaters = [heart(world, -1.62, 2.85, .30, .29), heart(world, 1.50, 2.45, .80, .20)];
  const burst = Array.from({ length: 9 }, (_, i) => heart(world, 0, 2, .8, .10 + i % 3 * .025));
  burst.forEach((mesh: any) => { mesh.visible = false; });
  let loveAt = -100;
  let currentTheme = '';
  let drawingProgress = -1;
  let lastProgress = 1;

  return {
    world,
    love(time: number) { loveAt = time; },
    theme(theme: 'rose' | 'sage', evening: number) {
      sky.color.copy(skyDay).lerp(skyNight, evening);
      lampGlow.emissiveIntensity = .05 + evening * 1.3;
      stars.visible = evening > .5;
      if (theme === currentTheme) return;
      currentTheme = theme;
      pink.color.setHex(theme === 'sage' ? 0xb1c6a5 : 0xe89ba9);
      wall.color.setHex(theme === 'sage' ? 0xe4e7d6 : 0xf5ded0);
      rim.color.setHex(theme === 'sage' ? 0xd3ddc5 : 0xf6d6c5);
      heartMaterial.color.setHex(theme === 'sage' ? 0xa9c6a2 : 0xeaa6b9);
    },
    update(time: number, px: number, py: number, moving: boolean) {
      const t = time;
      const age = moving ? time - loveAt : 100;
      const reaction = age >= 0 && age < 2.6 ? Math.sin(Math.min(age / 2.6, 1) * Math.PI) : 0;
      bears.forEach((bear, i) => {
        bear.body.position.y = .1 + Math.sin(t * 1.7 + i * .6) * .012 + reaction * .11;
        bear.head.rotation.z = bear.tilt + Math.sin(t * .65 + i) * .035 + (i ? -1 : 1) * reaction * .12;
        bear.head.rotation.y = px * .09;
        bear.head.rotation.x = py * .035;
        bear.arm.rotation.x = Math.sin(t * 2 + i) * .07 - reaction * .3;
        const blink = moving && (t + i * .43) % 5.6 < .13;
        bear.eyes.forEach(eye => { eye.scale.y = blink ? .009 : .062; eye.userData.glint.visible = !blink; });
        bear.cheeks.forEach(cheek => { cheek.scale.x = .115 + reaction * .035; });
      });
      const progress = moving ? Math.min(1, (t % 12) / 5.5) : lastProgress;
      lastProgress = progress;
      const indices = Math.floor(progress * 120) * 36;
      if (indices !== drawingProgress) { drawingGeometry.setDrawRange(0, indices); drawingProgress = indices; }
      const tip = heartCurve.getPoint(progress);
      pencil.position.set(tip.x - .1, 1.38 + (progress === 1 ? .12 : 0), 1.1 - tip.y);
      pencil.rotation.z = -.40 + Math.sin(t * 2) * .05;
      mobile.rotation.y = Math.sin(t * .5) * .22;
      mobile.rotation.z = Math.sin(t * .7) * .035;
      floaters.forEach((mesh: any, i: number) => { mesh.position.y = [2.85, 2.45][i] + Math.sin(t + i * 2) * .07; mesh.rotation.y = Math.sin(t * .6 + i) * .3; });
      burst.forEach((mesh: any, i: number) => {
        mesh.visible = age >= 0 && age < 2.6;
        if (!mesh.visible) return;
        const p = age / 2.6;
        mesh.position.set(Math.sin(i * 4.1) * p * 2, 1.7 + p * 2.5 + Math.cos(i * 2) * p * .4, .7 + Math.cos(i * 3) * p);
        mesh.scale.setScalar((.10 + i % 3 * .025) * Math.sin(p * Math.PI));
        mesh.rotation.set(p * .4, i + p, Math.sin(i) * p);
      });
    },
  };
}
