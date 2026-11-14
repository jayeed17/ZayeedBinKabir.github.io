(() => {
  const canvas = document.getElementById('hero-scene');
  const gl = canvas?.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return;

  const vertex = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0., 1.); }
  `;
  const fragment = `
    precision mediump float;
    uniform vec2 size, drift;
    uniform float angle, mobile;
    mat2 rotate(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

    float sculpture(vec3 point) {
      point.xz = rotate(.36 + angle) * point.xz;
      point.yz = rotate(.57) * point.yz;
      point.xy = rotate(-.47) * point.xy;
      float a = atan(point.z, point.x);
      float ridge = .12 * cos(3. * a);
      vec2 section = vec2(length(point.xz) - 1.23 - ridge, point.y - .23 * sin(2. * a));
      section = rotate(1.5 * a) * section;
      return (length(section * vec2(1., 1.35)) - .36 - .06 * sin(3. * a)) * .67;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / size;
      vec2 center = mix(vec2(.77, .52), vec2(.64, .73), mobile);
      vec2 p = (uv - center) * vec2(size.x / size.y, 1.) - drift;
      vec3 ray = normalize(vec3(p * mix(2.05, 2.9, mobile), -1.));
      vec3 camera = vec3(0., 0., 4.4);
      float travel = 0.;
      float distanceToSurface = 1.;
      vec3 at;
      for (int i = 0; i < 64; i++) {
        at = camera + ray * travel;
        distanceToSurface = sculpture(at);
        if (distanceToSurface < .002 || travel > 8.) break;
        travel += distanceToSurface;
      }

      vec3 color = vec3(.029, .041, .071) + vec3(.16, .16, .29) * exp(-5. * dot(p, p));
      if (distanceToSurface < .002 && travel < 8.) {
        vec2 offset = vec2(.004, 0.);
        vec3 normal = normalize(vec3(
          sculpture(at + offset.xyy) - sculpture(at - offset.xyy),
          sculpture(at + offset.yxy) - sculpture(at - offset.yxy),
          sculpture(at + offset.yyx) - sculpture(at - offset.yyx)
        ));
        vec3 light = normalize(vec3(-.5, .8, .45));
        vec3 fill = normalize(vec3(.8, -.35, .35));
        float key = max(dot(normal, light), 0.);
        float rim = pow(1. - max(dot(normal, -ray), 0.), 2.7);
        float gloss = pow(max(dot(normal, normalize(light - ray)), 0.), 20.);
        color = vec3(.085, .1, .23) + key * vec3(.30, .34, .64);
        color += max(dot(normal, fill), 0.) * vec3(.44, .17, .16);
        color += gloss * vec3(.73, .74, .82) + rim * vec3(.31, .35, .61);
      }
      gl_FragColor = vec4(color, 1.);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  }

  const shaders = [compile(gl.VERTEX_SHADER, vertex), compile(gl.FRAGMENT_SHADER, fragment)];
  if (shaders.includes(null)) return;
  const program = gl.createProgram();
  shaders.forEach((shader) => gl.attachShader(program, shader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = Object.fromEntries(['size', 'angle', 'mobile', 'drift'].map((name) => [name, gl.getUniformLocation(program, name)]));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = canvas.closest('.hero');
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;
  let visible = false;

  function draw(time) {
    const width = Math.min(900, Math.max(1, hero.clientWidth));
    const height = Math.max(1, Math.round(width * hero.clientHeight / Math.max(1, hero.clientWidth)));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    gl.uniform2f(uniforms.size, width, height);
    gl.uniform1f(uniforms.mobile, hero.clientWidth <= 760 ? 1 : 0);
    gl.uniform1f(uniforms.angle, motion.matches ? 0 : .22 * Math.sin(time / 3200) + pointerX * .15);
    gl.uniform2f(uniforms.drift, motion.matches ? 0 : pointerX * .045, motion.matches ? 0 : pointerY * .035);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.hidden = false;
    frame = visible && !motion.matches ? requestAnimationFrame(draw) : 0;
  }

  function refresh() {
    if (frame) cancelAnimationFrame(frame);
    draw(performance.now());
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) refresh();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }).observe(hero);
  new ResizeObserver(refresh).observe(hero);
  motion.addEventListener('change', refresh);

  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || motion.matches) return;
    const bounds = hero.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width - .5;
    pointerY = .5 - (event.clientY - bounds.top) / bounds.height;
  });
  hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
})();
