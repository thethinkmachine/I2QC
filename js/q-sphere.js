/* ============================================================
   Q-SPHERE — Three.js Interactive Visualization
   Visualizes multi-qubit states up to 5 qubits.
   Features: raycast hover, glow, animated transitions,
   info panel, phase color wheel, drag to orbit.
   ============================================================ */

function initQSphere(containerId, initialQubits = 3) {
  const container = document.getElementById(containerId);
  if (!container || !window.THREE) return null;

  // ── DOM Wrapper ──
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.style.borderRadius = '12px';
  container.style.cursor = 'grab';

  const W = container.clientWidth || 600;
  const H = container.clientHeight || 450;

  // ── Scene / Camera / Renderer ──
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
  camera.position.set(4, 3, 4);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0xcce0ff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4488ff, 0.35);
  rim.position.set(-4, -3, -4);
  scene.add(rim);

  // ── Constants ──
  const SPHERE_R = 1.6;
  const MAX_DOT = 0.22;
  const MIN_DOT = 0.04;
  const ANIM_DURATION = 600; // ms

  // ── Helpers ──
  function hamming(k, n) {
    let w = 0;
    for (let i = 0; i < n; i++) if ((k >> i) & 1) w++;
    return w;
  }
  function toBin(k, n) {
    return '|' + k.toString(2).padStart(n, '0') + '⟩';
  }
  function phaseToHue(p) {
    return ((p + Math.PI) / (2 * Math.PI)) % 1.0;
  }
  function phaseColor(p) {
    return new THREE.Color().setHSL(phaseToHue(p), 0.95, 0.58);
  }
  function phaseCss(p) {
    const c = phaseColor(p);
    return '#' + c.getHexString();
  }

  // ── Groups ──
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);
  const dataGroup = new THREE.Group();
  scene.add(dataGroup);

  // ── State ──
  let nQ = initialQubits;
  let dots = [];       // { k, mesh, glow, line, label, pos, targetScale, curScale }
  let currentAmps = null;
  let hoveredIdx = -1;
  let selectedIdx = -1;
  let animStart = 0;

  // ──────────────────────────────────────────
  //  BUILD GLOBE STRUCTURE
  // ──────────────────────────────────────────
  function buildGlobe(n) {
    while (globeGroup.children.length) globeGroup.remove(globeGroup.children[0]);

    // Transparent sphere
    const sGeo = new THREE.SphereGeometry(SPHERE_R, 48, 32);
    const sMat = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      transparent: true,
      opacity: 0.12,
      shininess: 80,
    });
    globeGroup.add(new THREE.Mesh(sGeo, sMat));

    // Wireframe overlay
    const wGeo = new THREE.SphereGeometry(SPHERE_R * 1.002, 24, 16);
    const wMat = new THREE.MeshBasicMaterial({
      color: 0x1a3050,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    globeGroup.add(new THREE.Mesh(wGeo, wMat));

    // Latitude rings for each Hamming weight
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x2d5090, transparent: true, opacity: 0.35,
    });
    for (let w = 0; w <= n; w++) {
      const theta = n === 0 ? 0 : (Math.PI * w) / n;
      const y = SPHERE_R * Math.cos(theta);
      const r = SPHERE_R * Math.sin(theta);
      const pts = [];
      for (let i = 0; i <= 80; i++) {
        const a = (i / 80) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
      }
      globeGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts), ringMat
      ));
    }

    // Meridians
    const merMat = new THREE.LineBasicMaterial({
      color: 0x1a3050, transparent: true, opacity: 0.15,
    });
    for (let a = 0; a < Math.PI; a += Math.PI / 6) {
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const t = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          Math.cos(a) * Math.sin(t) * SPHERE_R,
          Math.cos(t) * SPHERE_R,
          Math.sin(a) * Math.sin(t) * SPHERE_R
        ));
      }
      globeGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts), merMat
      ));
    }

    // Axis labels
    const mkLbl = (text, pos, col, sz = 0.28) => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 64;
      const g = c.getContext('2d');
      g.font = 'bold 36px monospace';
      g.fillStyle = col;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 64, 32);
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
      );
      sp.position.set(...pos);
      sp.scale.set(sz, sz * 0.5, 1);
      return sp;
    };
    globeGroup.add(mkLbl('|0⟩ⁿ', [0, SPHERE_R + 0.3, 0], '#70b8ff'));
    globeGroup.add(mkLbl('|1⟩ⁿ', [0, -SPHERE_R - 0.3, 0], '#ff7088'));
  }

  // ──────────────────────────────────────────
  //  BUILD DATA NODES
  // ──────────────────────────────────────────
  function buildData(n) {
    nQ = n;
    while (dataGroup.children.length) dataGroup.remove(dataGroup.children[0]);
    dots = [];

    const N = 1 << n;
    const byWeight = {};
    for (let w = 0; w <= n; w++) byWeight[w] = [];
    for (let k = 0; k < N; k++) byWeight[hamming(k, n)].push(k);

    const dotGeo = new THREE.SphereGeometry(1, 20, 20);

    for (let k = 0; k < N; k++) {
      const w = hamming(k, n);
      const grp = byWeight[w];
      const idx = grp.indexOf(k);
      const theta = n === 0 ? 0 : (Math.PI * w) / n;
      const phi = grp.length > 0 ? (2 * Math.PI * idx) / grp.length : 0;

      const pos = new THREE.Vector3(
        SPHERE_R * Math.sin(theta) * Math.cos(phi),
        SPHERE_R * Math.cos(theta),
        SPHERE_R * Math.sin(theta) * Math.sin(phi)
      );

      // Main dot
      const mat = new THREE.MeshPhongMaterial({
        color: 0xffffff, transparent: true, opacity: 0.95,
        emissive: 0x000000, shininess: 100,
      });
      const mesh = new THREE.Mesh(dotGeo, mat);
      mesh.position.copy(pos);
      mesh.scale.set(0.001, 0.001, 0.001);
      mesh.userData = { idx: k };
      dataGroup.add(mesh);

      // Glow sprite
      const gc = document.createElement('canvas');
      gc.width = 64; gc.height = 64;
      const gctx = gc.getContext('2d');
      const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,0.6)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.15)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, 64, 64);
      const glowMat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(gc),
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Sprite(glowMat);
      glow.position.copy(pos);
      glow.scale.set(0.01, 0.01, 1);
      dataGroup.add(glow);

      // Line from center
      const lMat = new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, linewidth: 1,
      });
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), pos]),
        lMat
      );
      dataGroup.add(line);

      // Label sprite
      const lc = document.createElement('canvas');
      lc.width = 192; lc.height = 64;
      const lx = lc.getContext('2d');
      lx.font = n <= 3 ? 'bold 30px monospace' : 'bold 26px monospace';
      lx.fillStyle = '#b0c4de';
      lx.textAlign = 'center';
      lx.textBaseline = 'middle';
      lx.fillText(toBin(k, n), 96, 32);
      const lbl = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(lc),
          transparent: true, opacity: 0,
        })
      );
      const lScale = n <= 3 ? 0.55 : 0.45;
      lbl.scale.set(lScale, lScale * 0.33, 1);
      lbl.position.set(pos.x * 1.22, pos.y * 1.22, pos.z * 1.22);
      dataGroup.add(lbl);

      dots.push({
        k, mesh, glow, line, label: lbl, pos,
        targetScale: 0, curScale: 0,
        targetColor: new THREE.Color(0xffffff),
        curColor: new THREE.Color(0xffffff),
        mag: 0, phase: 0,
      });
    }
  }

  // ──────────────────────────────────────────
  //  SET STATE WITH ANIMATION
  // ──────────────────────────────────────────
  function setState(amplitudes) {
    const N = amplitudes.length;
    const rn = Math.round(Math.log2(N));
    if ((1 << rn) !== N) return;
    if (rn !== nQ) {
      buildGlobe(rn);
      buildData(rn);
    }
    currentAmps = amplitudes;
    animStart = performance.now();
    selectedIdx = -1;

    for (let i = 0; i < N; i++) {
      const { mag, phase } = amplitudes[i];
      const d = dots[i];
      d.mag = mag;
      d.phase = phase;
      const prob = mag * mag;
      d.targetScale = prob < 1e-5 ? 0 : MIN_DOT + (MAX_DOT - MIN_DOT) * mag;
      d.targetColor = phaseColor(phase);
    }
    updateInfoPanel(-1);
  }

  // ──────────────────────────────────────────
  //  INFO PANEL (HTML overlay)
  // ──────────────────────────────────────────
  const infoPanel = document.createElement('div');
  Object.assign(infoPanel.style, {
    position: 'absolute', top: '12px', left: '12px',
    background: 'rgba(10,18,35,0.88)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(100,150,220,0.2)',
    borderRadius: '10px', padding: '12px 16px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px', color: '#b0c8e8',
    minWidth: '190px', pointerEvents: 'none',
    transition: 'opacity 0.2s',
    lineHeight: '1.6',
  });
  infoPanel.innerHTML = '<div style="color:#6090c0;margin-bottom:4px;">Hover a node</div>';
  container.appendChild(infoPanel);

  function updateInfoPanel(idx) {
    if (idx < 0 || !currentAmps || idx >= currentAmps.length) {
      infoPanel.innerHTML = `<div style="color:#6090c0;margin-bottom:2px">n = ${nQ} qubits &middot; ${1 << nQ} states</div>
        <div style="color:#4a6a90;font-size:11px">Drag to rotate &middot; Hover nodes</div>`;
      return;
    }
    const d = dots[idx];
    const prob = (d.mag * d.mag * 100).toFixed(1);
    const phDeg = ((d.phase * 180) / Math.PI).toFixed(0);
    const col = phaseCss(d.phase);
    infoPanel.innerHTML = `
      <div style="color:#90b0d8;font-size:13px;font-weight:bold;margin-bottom:3px">${toBin(d.k, nQ)}</div>
      <div>Amplitude: <span style="color:#fff">${d.mag.toFixed(3)}</span></div>
      <div>Probability: <span style="color:#fff">${prob}%</span></div>
      <div>Phase: <span style="color:${col};font-weight:bold">${phDeg}°</span>
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};vertical-align:middle;margin-left:4px;box-shadow:0 0 6px ${col}"></span>
      </div>
      <div>Hamming wt: <span style="color:#fff">${hamming(d.k, nQ)}</span></div>`;
  }

  // ──────────────────────────────────────────
  //  PHASE LEGEND (HTML overlay)
  // ──────────────────────────────────────────
  const legend = document.createElement('div');
  Object.assign(legend.style, {
    position: 'absolute', bottom: '12px', right: '12px',
    background: 'rgba(10,18,35,0.85)', backdropFilter: 'blur(6px)',
    border: '1px solid rgba(100,150,220,0.15)', borderRadius: '8px',
    padding: '8px 12px', pointerEvents: 'none',
  });
  // Build gradient bar
  let gradStops = '';
  for (let i = 0; i <= 20; i++) {
    const h = (i / 20);
    const c = new THREE.Color().setHSL(h, 0.95, 0.58);
    gradStops += (i > 0 ? ',' : '') + '#' + c.getHexString();
  }
  legend.innerHTML = `
    <div style="font-family:sans-serif;font-size:11px;color:#8aa8cc;text-align:center;margin-bottom:4px">Phase →</div>
    <div style="height:12px;width:140px;border-radius:6px;background:linear-gradient(90deg,${gradStops})"></div>
    <div style="display:flex;justify-content:space-between;font-family:monospace;font-size:10px;color:#5a7a9a;margin-top:2px">
      <span>−π</span><span>0</span><span>+π</span>
    </div>`;
  container.appendChild(legend);

  // ──────────────────────────────────────────
  //  RAYCASTER (hover & click)
  // ──────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function getMousePos(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  renderer.domElement.addEventListener('mousemove', (e) => {
    if (isDown) return;
    getMousePos(e);
    raycaster.setFromCamera(mouse, camera);
    const meshes = dots.filter(d => d.curScale > 0.01).map(d => d.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const idx = hits[0].object.userData.idx;
      if (hoveredIdx !== idx) {
        hoveredIdx = idx;
        updateInfoPanel(idx);
        container.style.cursor = 'pointer';
      }
    } else {
      if (hoveredIdx !== -1) {
        hoveredIdx = -1;
        updateInfoPanel(selectedIdx);
        container.style.cursor = isDown ? 'grabbing' : 'grab';
      }
    }
  });

  renderer.domElement.addEventListener('click', (e) => {
    getMousePos(e);
    raycaster.setFromCamera(mouse, camera);
    const meshes = dots.filter(d => d.curScale > 0.01).map(d => d.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      selectedIdx = hits[0].object.userData.idx;
      updateInfoPanel(selectedIdx);
    } else {
      selectedIdx = -1;
      updateInfoPanel(-1);
    }
  });

  // ──────────────────────────────────────────
  //  ORBIT CONTROLS (drag)
  // ──────────────────────────────────────────
  let isDown = false, lastX = 0, lastY = 0;
  let rotX = 0.45, rotY = 0.7;
  const el = renderer.domElement;

  el.addEventListener('mousedown', (e) => {
    isDown = true; lastX = e.clientX; lastY = e.clientY;
    container.style.cursor = 'grabbing';
  });
  el.addEventListener('touchstart', (e) => {
    isDown = true;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  }, { passive: false });
  window.addEventListener('mouseup', () => {
    isDown = false;
    container.style.cursor = hoveredIdx >= 0 ? 'pointer' : 'grab';
  });
  window.addEventListener('touchend', () => { isDown = false; });

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX += (e.clientY - lastY) * 0.008;
    rotX = Math.max(-1.4, Math.min(1.4, rotX));
    lastX = e.clientX; lastY = e.clientY;
  });
  el.addEventListener('touchmove', (e) => {
    if (!isDown) return;
    rotY += (e.touches[0].clientX - lastX) * 0.008;
    rotX += (e.touches[0].clientY - lastY) * 0.008;
    rotX = Math.max(-1.4, Math.min(1.4, rotX));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  // Scroll zoom
  el.addEventListener('wheel', (e) => {
    zoomDist = Math.max(2.5, Math.min(8, zoomDist + e.deltaY * 0.003));
    e.preventDefault();
  }, { passive: false });
  let zoomDist = 5.0;

  // ── Resize ──
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight || w;
    if (w < 1 || h < 1) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // ──────────────────────────────────────────
  //  RENDER LOOP
  // ──────────────────────────────────────────
  let running = true;
  let isVisible = false;

  // Use IntersectionObserver to play/pause
  const io = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
  }, { threshold: 0.1 });
  io.observe(container);

  function animate() {
    if (!running) return;
    if (!isVisible) {
      // Just wait until visible
      requestAnimationFrame(animate);
      return;
    }
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - animStart) / ANIM_DURATION, 1);
    const ease = dt < 1 ? dt * dt * (3 - 2 * dt) : 1; // smoothstep

    // Camera orbit
    camera.position.x = zoomDist * Math.sin(rotY) * Math.cos(rotX);
    camera.position.y = zoomDist * Math.sin(rotX);
    camera.position.z = zoomDist * Math.cos(rotY) * Math.cos(rotX);
    camera.lookAt(0, 0, 0);

    // Animate dots
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];

      // Lerp scale
      d.curScale += (d.targetScale - d.curScale) * Math.min(ease, 0.15);
      const s = d.curScale;

      d.mesh.scale.set(s, s, s);
      d.mesh.material.color.lerp(d.targetColor, 0.12);

      // Emissive for hover/select
      const isHi = i === hoveredIdx || i === selectedIdx;
      const emT = isHi ? 0.5 : 0;
      const curEm = d.mesh.material.emissive.r;
      const newEm = curEm + (emT - curEm) * 0.15;
      d.mesh.material.emissive.setRGB(newEm, newEm, newEm);

      // Glow
      const gs = s * (isHi ? 4.5 : 2.8);
      d.glow.scale.set(gs, gs, 1);
      d.glow.material.opacity += ((s > 0.01 ? (isHi ? 0.5 : 0.25) : 0) - d.glow.material.opacity) * 0.12;
      d.glow.material.color = d.mesh.material.color.clone();

      // Line
      d.line.material.color.copy(d.mesh.material.color);
      d.line.material.opacity += ((s > 0.01 ? (isHi ? 0.5 : 0.2) : 0) - d.line.material.opacity) * 0.12;

      // Label
      const showLabel = s > 0.01 && (nQ <= 3 || isHi);
      d.label.material.opacity += ((showLabel ? 0.85 : 0) - d.label.material.opacity) * 0.12;
    }

    renderer.render(scene, camera);
  }

  // ──────────────────────────────────────────
  //  STATE GENERATORS
  // ──────────────────────────────────────────
  function genAmps(name, n) {
    const N = 1 << n;
    const amps = [];
    for (let i = 0; i < N; i++) amps.push({ mag: 0, phase: 0 });

    switch (name) {
      case '|0...0⟩':
        amps[0] = { mag: 1, phase: 0 };
        break;
      case '|1...1⟩':
        amps[N - 1] = { mag: 1, phase: 0 };
        break;
      case '|+⟩^n': {
        const m = 1 / Math.sqrt(N);
        for (let i = 0; i < N; i++) amps[i] = { mag: m, phase: 0 };
        break;
      }
      case '|-⟩^n': {
        const m = 1 / Math.sqrt(N);
        for (let i = 0; i < N; i++)
          amps[i] = { mag: m, phase: hamming(i, n) % 2 === 1 ? Math.PI : 0 };
        break;
      }
      case 'W State': {
        const ws = [];
        for (let i = 0; i < N; i++) if (hamming(i, n) === 1) ws.push(i);
        const m = 1 / Math.sqrt(ws.length);
        for (const i of ws) amps[i] = { mag: m, phase: 0 };
        break;
      }
      case 'GHZ State': {
        const m = 1 / Math.sqrt(2);
        amps[0] = { mag: m, phase: 0 };
        amps[N - 1] = { mag: m, phase: Math.PI * 0.6 };
        break;
      }
      case 'Fourier': {
        const m = 1 / Math.sqrt(N);
        for (let i = 0; i < N; i++)
          amps[i] = { mag: m, phase: (2 * Math.PI * i) / N };
        break;
      }
      case 'Random': {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          const v = Math.random();
          sum += v * v;
          amps[i] = { mag: v, phase: Math.random() * 2 * Math.PI - Math.PI };
        }
        const norm = Math.sqrt(sum);
        for (let i = 0; i < N; i++) amps[i].mag /= norm;
        break;
      }
      default:
        break;
    }
    return amps;
  }

  // ── Initial build ──
  buildGlobe(initialQubits);
  buildData(initialQubits);
  setState(genAmps('|+⟩^n', initialQubits));
  animate();

  // ── Public API ──
  return {
    setState,
    loadNamedState(name, n = nQ) {
      setState(genAmps(name, n));
    },
    destroy() {
      running = false;
      ro.disconnect();
      io.disconnect();
      try { container.removeChild(renderer.domElement); } catch (_) {}
      try { container.removeChild(infoPanel); } catch (_) {}
      try { container.removeChild(legend); } catch (_) {}
    },
  };
}
