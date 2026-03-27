/* ============================================================
   BLOCH SPHERE — Three.js Interactive Visualization
   ============================================================ */

function initBlochSphere(containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container || !window.THREE) return null;

  const W = container.clientWidth || 380;
  const H = container.clientHeight || 380;

  /* Scene / Camera / Renderer */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.set(2.5, 1.8, 2.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  /* Lighting */
  scene.add(new THREE.AmbientLight(0x334466, 1.0));
  const dLight = new THREE.DirectionalLight(0x7fbfff, 0.6);
  dLight.position.set(3, 5, 3);
  scene.add(dLight);

  /* Sphere wireframe */
  const sphereGeo = new THREE.SphereGeometry(1, 32, 24);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x1e2d47,
    wireframe: false,
    transparent: true,
    opacity: 0.15,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  /* Wireframe overlay */
  const wireGeo = new THREE.SphereGeometry(1.001, 20, 16);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x1f3155,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  scene.add(new THREE.Mesh(wireGeo, wireMat));

  /* Axes */
  function makeAxis(from, to, color) {
    const mat = new THREE.LineBasicMaterial({ color });
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from),
      new THREE.Vector3(...to),
    ]);
    return new THREE.Line(geo, mat);
  }
  scene.add(makeAxis([-1.5, 0, 0], [1.5, 0, 0], 0xff4f6e));
  scene.add(makeAxis([0, -1.5, 0], [0, 1.5, 0], 0x00e676));
  scene.add(makeAxis([0, 0, -1.5], [0, 0, 1.5], 0x00d4ff));

  /* Axis labels via sprites */
  function makeLabel(text, pos, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 40px serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(...pos);
    sprite.scale.set(0.25, 0.25, 1);
    return sprite;
  }
  scene.add(makeLabel('x', [1.7, 0, 0], '#ff4f6e'));
  scene.add(makeLabel('y', [0, 0, 1.7], '#00d4ff'));
  scene.add(makeLabel('z', [0, 1.7, 0], '#00e676'));
  scene.add(makeLabel('|0⟩', [0, 1.3, 0], '#ffffff'));
  scene.add(makeLabel('|1⟩', [0, -1.3, 0], '#aaaaaa'));

  /* State vector arrow */
  const arrowDir = new THREE.Vector3(0, 1, 0);
  const arrowHelper = new THREE.ArrowHelper(
    arrowDir,
    new THREE.Vector3(0, 0, 0),
    1,
    0xf4c430,
    0.2,
    0.1
  );
  scene.add(arrowHelper);

  /* Equator circle */
  const equatorPts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    equatorPts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  }
  const eqGeo = new THREE.BufferGeometry().setFromPoints(equatorPts);
  scene.add(
    new THREE.Line(
      eqGeo,
      new THREE.LineBasicMaterial({ color: 0x1f3155, transparent: true, opacity: 0.6 })
    )
  );

  /* Meridian circles */
  for (let angle = 0; angle < Math.PI; angle += Math.PI / 4) {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(Math.cos(angle) * Math.sin(a), Math.cos(a), Math.sin(angle) * Math.sin(a))
      );
    }
    const mGeo = new THREE.BufferGeometry().setFromPoints(pts);
    scene.add(
      new THREE.Line(
        mGeo,
        new THREE.LineBasicMaterial({ color: 0x162035, transparent: true, opacity: 0.5 })
      )
    );
  }

  /* State tracker line (from center to state) */
  const trackerMat = new THREE.LineBasicMaterial({
    color: 0xf4c430,
    transparent: true,
    opacity: 0.4,
    linewidth: 2,
  });
  let trackerLine = null;

  /* Current angles and radius */
  let theta = opts.theta || 0; // polar (0=|0⟩, π=|1⟩)
  let phi = opts.phi || 0; // azimuthal
  let r = opts.r !== undefined ? opts.r : 1; // radius (mixed state if < 1)

  function updateState(th, ph, rad = r) {
    theta = th;
    phi = ph;
    r = rad;
    const x = Math.sin(th) * Math.cos(ph);
    const z = Math.sin(th) * Math.sin(ph);
    const y = Math.cos(th);
    const dir = new THREE.Vector3(x, y, z).normalize();
    arrowHelper.setDirection(dir);
    // update arrow length, scaling the head size proportionally but ensuring it doesn't get too big or disappear
    const hl = Math.max(0.01, 0.2 * rad);
    const hw = Math.max(0.01, 0.1 * rad);
    arrowHelper.setLength(Math.max(0.001, rad), hl, hw);

    // update info if callback
    if (opts.onUpdate) opts.onUpdate(th, ph, rad);
  }

  updateState(theta, phi, r);

  /* Orbit controls (manual) */
  let isDown = false,
    lastX = 0,
    lastY = 0;
  let rotX = 0.3,
    rotY = 0.5;

  const el = renderer.domElement;
  el.addEventListener('mousedown', (e) => {
    isDown = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  el.addEventListener('touchstart', (e) => {
    isDown = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  });
  window.addEventListener('mouseup', () => (isDown = false));
  window.addEventListener('touchend', () => (isDown = false));

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    rotY += (e.clientX - lastX) * 0.012;
    rotX += (e.clientY - lastY) * 0.012;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  el.addEventListener(
    'touchmove',
    (e) => {
      if (!isDown) return;
      rotY += (e.touches[0].clientX - lastX) * 0.012;
      rotX += (e.touches[0].clientY - lastY) * 0.012;
      rotX = Math.max(-1.2, Math.min(1.2, rotX));
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      e.preventDefault();
    },
    { passive: false }
  );

  /* Resize */
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight || w;
    if (w === 0 || h === 0) return; // Wait to be visible
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /* Animation loop */
  let running = true;
  let isVisible = false;

  const io = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
  }, { threshold: 0.1 });
  io.observe(container);

  function animate() {
    if (!running) return;
    if (!isVisible) {
      requestAnimationFrame(animate);
      return;
    }
    requestAnimationFrame(animate);

    const r = 3.2;
    camera.position.x = r * Math.sin(rotY) * Math.cos(rotX);
    camera.position.y = r * Math.sin(rotX);
    camera.position.z = r * Math.cos(rotY) * Math.cos(rotX);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  animate();

  /* Public API */
  return {
    setTheta: (t) => updateState(t, phi, r),
    setPhi: (p) => updateState(theta, p, r),
    setR: (rad) => updateState(theta, phi, rad),
    setAngles: (t, p, rad = r) => updateState(t, p, rad),
    setState: (name) => {
      const states = {
        '|0⟩': [0, 0, 1],
        '|1⟩': [Math.PI, 0, 1],
        '|+⟩': [Math.PI / 2, 0, 1],
        '|-⟩': [Math.PI / 2, Math.PI, 1],
        '|i⟩': [Math.PI / 2, Math.PI / 2, 1],
        '|-i⟩': [Math.PI / 2, -Math.PI / 2, 1],
      };
      if (states[name]) updateState(...states[name]);
    },
    getTheta: () => theta,
    getPhi: () => phi,
    getR: () => r,
    destroy: () => {
      running = false;
      io.disconnect();
      ro.disconnect();
      container.removeChild(renderer.domElement);
    },
  };
}
