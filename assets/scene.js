// Full-page background: a parallax starfield that covers every section, plus
// the green data globe, which stays pinned behind the hero portrait card.
const wrap = document.querySelector('.bg-canvas');
const canvas = document.getElementById('scene');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (wrap && canvas) {
  try {
    const THREE = await import('./vendor/three.module.min.js');
    init(THREE);
  } catch (err) {
    console.warn('3D background disabled:', err);
  }
}

function init(THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const CAM_Z = 9;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);
  const px = { value: renderer.getPixelRatio() };

  /* ---------- starfield (whole page) ---------- */
  const STARS = 3200;
  const FIELD = { w: 34, h: 22, d: 16 };
  const sp = new Float32Array(STARS * 3);
  const ss = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    sp.set([(Math.random() - 0.5) * FIELD.w, (Math.random() - 0.5) * FIELD.h, -Math.random() * FIELD.d + 2], i * 3);
    ss[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute('seed', new THREE.BufferAttribute(ss, 1));
  const starUni = { uTime: { value: 0 }, uScroll: { value: 0 }, uMouse: { value: new THREE.Vector2() }, uH: { value: FIELD.h }, uPx: px };
  const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
    uniforms: starUni,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uScroll, uH, uPx; uniform vec2 uMouse;
      attribute float seed; varying float vTw; varying float vSeed;
      void main() {
        vec3 p = position;
        float depth = clamp((2.0 - p.z) / 16.0, 0.0, 1.0);
        float par = mix(1.0, 0.25, depth);
        p.y = mod(p.y + uScroll * par + uTime * 0.06 * par + uH * 0.5, uH) - uH * 0.5;
        p.xy += uMouse * par * 0.35;
        vTw = 0.55 + 0.45 * sin(uTime * (0.8 + seed * 2.2) + seed * 40.0);
        vSeed = seed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.3 + seed * 2.6) * uPx * (9.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vTw; varying float vSeed;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(vec3(0.62, 0.78, 0.71), vec3(0.64, 0.97, 0.75), step(0.82, vSeed));
        gl_FragColor = vec4(c, a * vTw);
      }`,
  }));
  scene.add(stars);

  /* ---------- the globe (pinned behind the hero photo) ---------- */
  const world = new THREE.Group();
  scene.add(world);

  const N = 2600;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    pos.set([Math.cos(t) * r * 2.4, y * 2.4, Math.sin(t) * r * 2.4], i * 3);
    seed[i] = Math.random();
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const uniforms = { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() }, uPx: px, uScale: { value: 1 } };
  const points = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime; uniform vec2 uMouse; uniform float uPx; uniform float uScale;
      attribute float seed; varying float vGlow; varying float vDepth;
      float field(vec3 p) {
        return sin(p.x * 1.7 + uTime * .9) * cos(p.y * 1.9 - uTime * .7) * sin(p.z * 1.5 + uTime * .5);
      }
      void main() {
        vec3 n = normalize(position);
        float f = field(position + vec3(uMouse * .6, 0.));
        vec3 p = position + n * f * .32;
        vGlow = smoothstep(-.4, .9, f);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vDepth = smoothstep(-3.5 * uScale, 2.5 * uScale, mv.z + 9.);
        gl_PointSize = (2.2 + 3.2 * vGlow + seed * 1.4) * uPx * uScale * (8. / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vGlow; varying float vDepth;
      void main() {
        float d = length(gl_PointCoord - .5);
        if (d > .5) discard;
        float a = smoothstep(.5, 0., d);
        vec3 c = mix(vec3(.06, .45, .32), vec3(.64, .97, .75), vGlow);
        gl_FragColor = vec4(c, a * (.35 + .65 * vDepth) * (.7 + .5 * vGlow));
      }`,
  }));
  world.add(points);

  const core = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.25, 1)),
    new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending })
  );
  world.add(core);
  world.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 3),
    new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending })
  ));

  const R = 420;
  const rp = new Float32Array(R * 3);
  for (let i = 0; i < R; i++) {
    const a = (i / R) * Math.PI * 2;
    const rad = 3.35 + (Math.random() - 0.5) * 0.35;
    rp.set([Math.cos(a) * rad, (Math.random() - 0.5) * 0.08, Math.sin(a) * rad], i * 3);
  }
  const ringMat = new THREE.PointsMaterial({ color: 0xa3f7bf, size: 0.035, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rp, 3)), ringMat);
  const ringGroup = new THREE.Group();
  ringGroup.rotation.set(1.15, 0.2, 0.35);
  ringGroup.add(ring);
  world.add(ringGroup);
  const ring2 = new THREE.Points(ring.geometry, ringMat.clone());
  ring2.scale.setScalar(1.18);
  ring2.material.opacity = 0.35;
  const ringGroup2 = new THREE.Group();
  ringGroup2.rotation.set(-0.9, 0.5, -0.4);
  ringGroup2.add(ring2);
  world.add(ringGroup2);

  /* ---------- pin the globe to the photo card ---------- */
  const anchor = document.getElementById('hero-photo');
  world.visible = !!anchor;
  let W = 1, H = 1, unitPerPx = 1;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    unitPerPx = (2 * Math.tan((camera.fov * Math.PI) / 360) * CAM_Z) / H;
  };
  addEventListener('resize', resize);
  resize();

  const placeGlobe = () => {
    if (!anchor) return;
    const card = anchor.querySelector('.hp-card') || anchor;
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    world.position.set((cx - W / 2) * unitPerPx, -(cy - H / 2) * unitPerPx, 0);
    const s = (r.height * 0.62 * unitPerPx) / 2.4;
    world.scale.setScalar(s);
    uniforms.uScale.value = s;
    world.visible = r.bottom > -H * 0.3 && r.top < H * 1.3;
  };

  /* ---------- input ---------- */
  const target = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    target.x = (e.clientX / innerWidth) * 2 - 1;
    target.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  const clock = new THREE.Clock();
  let mx = 0, my = 0;
  const frame = () => {
    requestAnimationFrame(frame);
    if (!running) return;
    const t = reduce ? 0 : clock.getElapsedTime();
    mx += (target.x - mx) * 0.04;
    my += (target.y - my) * 0.04;
    starUni.uTime.value = t;
    starUni.uScroll.value = scrollY * unitPerPx * 0.35;
    starUni.uMouse.value.set(-mx, my);
    uniforms.uTime.value = t;
    uniforms.uMouse.value.set(mx, my);
    placeGlobe();
    world.rotation.y = t * 0.08 + mx * 0.5;
    world.rotation.x = my * 0.3;
    core.rotation.y = -t * 0.25;
    core.rotation.z = t * 0.12;
    ringGroup.rotation.y = t * 0.18;
    ringGroup2.rotation.y = -t * 0.11;
    renderer.render(scene, camera);
  };
  frame();
  wrap.classList.add('ready');
}
