// Hero "data globe": a breathing point-cloud sphere, a wireframe core and
// an orbiting data ring. Falls back to the CSS orb if WebGL or the CDN fails.
const wrap = document.querySelector('.hero-canvas');
const canvas = document.getElementById('scene');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

try {
  const THREE = await import('./vendor/three.module.min.js');
  init(THREE);
} catch (err) {
  console.warn('3D hero disabled:', err);
}

function init(THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const world = new THREE.Group();
  scene.add(world);

  /* point-cloud sphere */
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
  const uniforms = { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() }, uPx: { value: renderer.getPixelRatio() } };
  const pm = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime; uniform vec2 uMouse; uniform float uPx;
      attribute float seed; varying float vGlow; varying float vDepth;
      // cheap 3D wave field
      float field(vec3 p) {
        return sin(p.x * 1.7 + uTime * .9) * cos(p.y * 1.9 - uTime * .7) * sin(p.z * 1.5 + uTime * .5);
      }
      void main() {
        vec3 n = normalize(position);
        float f = field(position + vec3(uMouse * .6, 0.));
        vec3 p = position + n * f * .32;
        vGlow = smoothstep(-.4, .9, f);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vDepth = smoothstep(-3.5, 2.5, mv.z + 9.);
        gl_PointSize = (2.2 + 3.2 * vGlow + seed * 1.4) * uPx * (8. / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vGlow; varying float vDepth;
      void main() {
        float d = length(gl_PointCoord - .5);
        if (d > .5) discard;
        float a = smoothstep(.5, 0., d);
        vec3 deep = vec3(.06, .45, .32);
        vec3 hot = vec3(.64, .97, .75);
        vec3 c = mix(deep, hot, vGlow);
        gl_FragColor = vec4(c, a * (.35 + .65 * vDepth) * (.7 + .5 * vGlow));
      }`,
  });
  const points = new THREE.Points(pg, pm);
  world.add(points);

  /* wireframe core */
  const core = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.25, 1)),
    new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending })
  );
  world.add(core);
  const coreGlow = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 3),
    new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending })
  );
  world.add(coreGlow);

  /* portrait inside the core: a camera-facing sprite, so the globe keeps spinning around it */
  const portrait = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: true }));
  portrait.scale.setScalar(2.15);
  portrait.renderOrder = -1;
  world.add(portrait);
  const photo = new Image();
  photo.onload = () => {
    const S = 512, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    // square crop centred on the face
    const side = Math.min(photo.width, photo.height * 0.8);
    const sx = (photo.width - side) / 2, sy = photo.height * 0.06;
    g.save();
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 14, 0, Math.PI * 2); g.clip();
    g.drawImage(photo, sx, sy, side, side, 0, 0, S, S);
    // soft green edge so it melts into the globe
    const v = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2);
    v.addColorStop(0, 'rgba(6,9,8,0)');
    v.addColorStop(0.82, 'rgba(6,9,8,0.18)');
    v.addColorStop(1, 'rgba(16,185,129,0.55)');
    g.fillStyle = v; g.fillRect(0, 0, S, S);
    g.restore();
    // rim
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 14, 0, Math.PI * 2);
    g.lineWidth = 5; g.strokeStyle = 'rgba(52,211,153,0.85)';
    g.shadowColor = '#34d399'; g.shadowBlur = 18; g.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    portrait.material.map = tex;
    portrait.material.needsUpdate = true;
    portrait.userData.ready = true;
  };
  photo.src = new URL('./portrait.webp', import.meta.url).href;

  /* orbit ring of data particles */
  const R = 420;
  const rp = new Float32Array(R * 3);
  for (let i = 0; i < R; i++) {
    const a = (i / R) * Math.PI * 2;
    const rad = 3.35 + (Math.random() - 0.5) * 0.35;
    rp.set([Math.cos(a) * rad, (Math.random() - 0.5) * 0.08, Math.sin(a) * rad], i * 3);
  }
  const ring = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rp, 3)),
    new THREE.PointsMaterial({ color: 0xa3f7bf, size: 0.035, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const ringGroup = new THREE.Group();
  ringGroup.rotation.set(1.15, 0.2, 0.35);
  ringGroup.add(ring);
  world.add(ringGroup);

  const ring2 = ring.clone();
  ring2.scale.setScalar(1.18);
  ring2.material = ring.material.clone();
  ring2.material.opacity = 0.35;
  const ringGroup2 = new THREE.Group();
  ringGroup2.rotation.set(-0.9, 0.5, -0.4);
  ringGroup2.add(ring2);
  world.add(ringGroup2);

  /* ambient dust */
  const D = 500;
  const dp = new Float32Array(D * 3);
  for (let i = 0; i < D; i++) dp.set([(Math.random() - 0.5) * 26, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10 - 3], i * 3);
  const dust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dp, 3)),
    new THREE.PointsMaterial({ color: 0x5d6e65, size: 0.03, transparent: true, opacity: 0.6, depthWrite: false })
  );
  scene.add(dust);

  /* layout + interaction */
  let mobile = false;
  const resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    mobile = w < 760;
    // phones: globe + portrait sit centred above the text instead of behind it
    const topY = Math.tan((camera.fov * Math.PI) / 360) * 9; // half-height of view at the globe's depth
    world.position.set(mobile ? 0 : 3.3, mobile ? topY - (topY * 2) * (190 / h) : 0, 0);
    world.scale.setScalar(mobile ? 0.6 : 1);
  };
  addEventListener('resize', resize);
  resize();

  const target = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    target.x = (e.clientX / innerWidth) * 2 - 1;
    target.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);

  const clock = new THREE.Clock();
  let mx = 0, my = 0;
  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = reduce ? 0 : clock.getElapsedTime();
    mx += (target.x - mx) * 0.04;
    my += (target.y - my) * 0.04;
    uniforms.uTime.value = t;
    uniforms.uMouse.value.set(mx, my);
    world.rotation.y = t * 0.08 + mx * 0.5;
    world.rotation.x = my * 0.3;
    core.rotation.y = -t * 0.25;
    core.rotation.z = t * 0.12;
    if (portrait.userData.ready && portrait.material.opacity < 1) portrait.material.opacity = Math.min(1, portrait.material.opacity + 0.02);
    portrait.scale.setScalar(2.15 + Math.sin(t * 1.2) * 0.03);
    ringGroup.rotation.y = t * 0.18;
    ringGroup2.rotation.y = -t * 0.11;
    dust.rotation.y = t * 0.01;
    const s = Math.min(scrollY / innerHeight, 1);
    camera.position.z = 9 + s * 3;
    camera.position.y = s * 1.2;
    renderer.render(scene, camera);
  };
  frame();
  wrap.classList.add('ready');
}
