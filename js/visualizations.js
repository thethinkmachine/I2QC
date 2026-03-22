/* ============================================================
   QUANTUM NOTES — VISUALIZATIONS.JS
   All canvas-based interactive visualizations
   ============================================================ */

/* ─────────────────────────────────────────────
   WEEK 1: Quantum Interference Visualizer
   Shows probability amplitudes constructively /
   destructively interfering
───────────────────────────────────────────── */
function initInterferenceViz(canvasId, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  let alpha = opts.alpha || Math.PI / 4;
  let animId = null;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight || 260;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const n = 200;
    const amp1 = 1.0;
    const amp2 = 1.0;

    // Background
    ctx.fillStyle = '#0d1424';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1f3155';
    ctx.lineWidth = 1;
    for (let y = 0; y <= H; y += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Wave 1 (ψ₁)
    ctx.beginPath();
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * W;
      const phase = (i / n) * Math.PI * 4;
      const y = H/2 - amp1 * (H/5) * Math.cos(phase);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Wave 2 (ψ₂) — phase shifted by alpha
    ctx.beginPath();
    ctx.strokeStyle = '#9b5de5';
    ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * W;
      const phase = (i / n) * Math.PI * 4 + alpha;
      const y = H/2 - amp2 * (H/5) * Math.cos(phase);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Superposition
    ctx.beginPath();
    ctx.strokeStyle = '#f4c430';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1.0;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * W;
      const phase = (i / n) * Math.PI * 4;
      const y1 = amp1 * Math.cos(phase);
      const y2 = amp2 * Math.cos(phase + alpha);
      const sum = y1 + y2;
      const py = H/2 - sum * (H/5);
      i === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py);
    }
    ctx.stroke();

    // Labels
    ctx.globalAlpha = 1;
    ctx.font = '13px JetBrains Mono, monospace';
    const labelX = 10;
    ctx.fillStyle = '#00d4ff'; ctx.fillText('ψ₁', labelX, 20);
    ctx.fillStyle = '#9b5de5'; ctx.fillText('ψ₂', labelX, 38);
    ctx.fillStyle = '#f4c430'; ctx.fillText('ψ₁ + ψ₂', labelX, 56);

    // Phase label
    const deg = Math.round((alpha / Math.PI) * 180);
    ctx.fillStyle = '#7a93b8';
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillText(`Δφ = ${deg}°`, W - 90, 20);

    // Interference type
    const intensity = Math.abs(2 * Math.cos(alpha / 2));
    const type = intensity > 1.5 ? 'Constructive' : intensity < 0.5 ? 'Destructive' : 'Partial';
    const col = intensity > 1.5 ? '#00e676' : intensity < 0.5 ? '#ff4f6e' : '#f4c430';
    ctx.fillStyle = col;
    ctx.fillText(type, W - 110, 38);
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    setAlpha: a => { alpha = a; draw(); },
    destroy: () => window.removeEventListener('resize', resize)
  };
}

/* ─────────────────────────────────────────────
   WEEK 1: Quantum Gate Visualizer (circuit SVG)
───────────────────────────────────────────── */
function buildCircuitSVG(gates, nqubits, width = 700, lineSpacing = 60) {
  const height = (nqubits + 1) * lineSpacing;
  const gateW = 44, gateH = 36;
  const startX = 80, gateSpacing = 70;
  const colors = {
    H: '#00d4ff', X: '#ff4f6e', Y: '#9b5de5', Z: '#f4c430',
    S: '#ff9f43', T: '#00e676', CNOT: '#00d4ff', CZ: '#f4c430',
    SWAP: '#ff9f43', Toffoli: '#00e676', M: '#7a93b8'
  };

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" 
    xmlns="http://www.w3.org/2000/svg" style="font-family:'JetBrains Mono',monospace;background:#0d1424;border-radius:8px;">`;

  // Qubit lines
  for (let q = 0; q < nqubits; q++) {
    const y = lineSpacing + q * lineSpacing;
    svg += `<line x1="10" y1="${y}" x2="${width - 20}" y2="${y}" stroke="#1f3155" stroke-width="1.5"/>`;
    svg += `<text x="10" y="${y - 8}" fill="#7a93b8" font-size="11">q${q}</text>`;
    svg += `<text x="10" y="${y + 4}" fill="#3d5278" font-size="11">|0⟩</text>`;
  }

  // Gates
  gates.forEach((gate, gi) => {
    const x = startX + gi * gateSpacing;
    const col = colors[gate.type] || '#7a93b8';

    if (gate.type === 'CNOT') {
      const cy = lineSpacing + gate.control * lineSpacing;
      const ty = lineSpacing + gate.target  * lineSpacing;
      svg += `<line x1="${x}" y1="${cy}" x2="${x}" y2="${ty}" stroke="${col}" stroke-width="1.5"/>`;
      svg += `<circle cx="${x}" cy="${cy}" r="5" fill="${col}"/>`;
      svg += `<circle cx="${x}" cy="${ty}" r="14" fill="none" stroke="${col}" stroke-width="1.5"/>`;
      svg += `<line x1="${x}" y1="${ty - 14}" x2="${x}" y2="${ty + 14}" stroke="${col}" stroke-width="1.5"/>`;
      svg += `<line x1="${x - 14}" y1="${ty}" x2="${x + 14}" y2="${ty}" stroke="${col}" stroke-width="1.5"/>`;
    } else if (gate.type === 'SWAP') {
      const y1 = lineSpacing + gate.q1 * lineSpacing;
      const y2 = lineSpacing + gate.q2 * lineSpacing;
      svg += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${col}" stroke-width="1.5"/>`;
      const d = 8;
      svg += `<line x1="${x-d}" y1="${y1-d}" x2="${x+d}" y2="${y1+d}" stroke="${col}" stroke-width="2"/>`;
      svg += `<line x1="${x+d}" y1="${y1-d}" x2="${x-d}" y2="${y1+d}" stroke="${col}" stroke-width="2"/>`;
      svg += `<line x1="${x-d}" y1="${y2-d}" x2="${x+d}" y2="${y2+d}" stroke="${col}" stroke-width="2"/>`;
      svg += `<line x1="${x+d}" y1="${y2-d}" x2="${x-d}" y2="${y2+d}" stroke="${col}" stroke-width="2"/>`;
    } else if (gate.type === 'M') {
      const y = lineSpacing + gate.q * lineSpacing;
      svg += `<rect x="${x - gateW/2}" y="${y - gateH/2}" width="${gateW}" height="${gateH}" 
        rx="4" fill="#162035" stroke="#7a93b8" stroke-width="1.5"/>`;
      svg += `<text x="${x}" y="${y + 5}" fill="#7a93b8" font-size="14" text-anchor="middle">M</text>`;
    } else {
      // Single-qubit gate
      const targets = Array.isArray(gate.q) ? gate.q : [gate.q];
      targets.forEach(q => {
        const y = lineSpacing + q * lineSpacing;
        svg += `<rect x="${x - gateW/2}" y="${y - gateH/2}" width="${gateW}" height="${gateH}" 
          rx="4" fill="#162035" stroke="${col}" stroke-width="1.5"/>`;
        svg += `<text x="${x}" y="${y + 5}" fill="${col}" font-size="14" text-anchor="middle" font-weight="700">${gate.type}</text>`;
      });
    }
  });

  svg += '</svg>';
  return svg;
}

/* ─────────────────────────────────────────────
   WEEK 2: Bell State Visualizer
───────────────────────────────────────────── */
function initBellViz(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;

  const bells = {
    'Φ⁺': { label: '|Φ⁺⟩ = (|00⟩ + |11⟩)/√2', states: ['00','11'], phases: [1,1], color: '#00d4ff' },
    'Φ⁻': { label: '|Φ⁻⟩ = (|00⟩ − |11⟩)/√2', states: ['00','11'], phases: [1,-1], color: '#9b5de5' },
    'Ψ⁺': { label: '|Ψ⁺⟩ = (|01⟩ + |10⟩)/√2', states: ['01','10'], phases: [1,1], color: '#00e676' },
    'Ψ⁻': { label: '|Ψ⁻⟩ = (|01⟩ − |10⟩)/√2', states: ['01','10'], phases: [1,-1], color: '#ff9f43' },
  };

  let current = 'Φ⁺';

  function render() {
    const b = bells[current];
    c.innerHTML = `
      <div style="text-align:center;margin-bottom:1rem;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:1.1rem;color:${b.color};margin-bottom:0.5rem;">${b.label}</div>
        <div style="color:#7a93b8;font-size:0.82rem;">Click an outcome to simulate collapse</div>
      </div>
      <div style="display:flex;justify-content:center;gap:1.5rem;flex-wrap:wrap;">
        ${['00','01','10','11'].map(s => {
          const active = b.states.includes(s);
          const phase = active ? b.phases[b.states.indexOf(s)] : 0;
          const prob = active ? 0.5 : 0;
          return `<div class="basis-card" data-state="${s}" style="
            background:${active ? '#162035' : '#0d1424'};
            border:1px solid ${active ? b.color : '#1f3155'};
            border-radius:8px;padding:1rem 1.5rem;text-align:center;
            cursor:${active ? 'pointer' : 'default'};
            transition:all 0.3s;
            opacity:${active ? 1 : 0.3};
          ">
            <div style="font-family:'JetBrains Mono',monospace;color:${active ? b.color : '#3d5278'};font-size:1.1rem;margin-bottom:0.4rem;">|${s}⟩</div>
            <div style="color:#7a93b8;font-size:0.78rem;">amp: ${phase !== 0 ? (phase > 0 ? '+' : '−') + '1/√2' : '0'}</div>
            <div style="margin-top:0.5rem;height:6px;background:#1f3155;border-radius:3px;overflow:hidden;">
              <div style="width:${prob*100}%;height:100%;background:${b.color};border-radius:3px;transition:width 0.5s;"></div>
            </div>
            <div style="color:#7a93b8;font-size:0.72rem;margin-top:0.25rem;">P = ${prob.toFixed(2)}</div>
          </div>`;
        }).join('')}
      </div>
      <div id="bell-result-${containerId}" style="text-align:center;margin-top:1rem;font-family:'JetBrains Mono',monospace;font-size:0.9rem;color:#7a93b8;min-height:1.5rem;"></div>
    `;

    c.querySelectorAll('.basis-card[data-state]').forEach(card => {
      const s = card.dataset.state;
      if (!b.states.includes(s)) return;
      card.addEventListener('click', () => {
        const result = document.getElementById(`bell-result-${containerId}`);
        const correlated = s === '00' ? '00' : s === '11' ? '11' : s === '01' ? '01' : '10';
        result.style.color = b.color;
        result.textContent = `Measured |${s}⟩ → Both qubits instantly determined! (Qubit 1: |${s[0]}⟩, Qubit 2: |${s[1]}⟩)`;
      });
    });
  }

  render();

  return {
    setState: s => { current = s; render(); }
  };
}

/* ─────────────────────────────────────────────
   WEEK 3: Grover's Algorithm Geometric Viz
   Shows the geometric rotation in the span{|a⟩,|s⟩}
───────────────────────────────────────────── */
function initGroverViz(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, cx, cy, R;

  let N = 8;      // database size
  let step = 0;
  let animId = null;

  function getAngles() {
    const theta = Math.asin(1 / Math.sqrt(N));  // initial angle from |e⟩
    const k = Math.round((Math.PI / 2 - theta) / (2 * theta)); // optimal iterations
    return { theta, k, curAngle: theta + step * 2 * theta };
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight || 340;
    cx = W / 2; cy = H / 2;
    R = Math.min(W, H) * 0.38;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1424';
    ctx.fillRect(0, 0, W, H);

    const { theta, k, curAngle } = getAngles();
    const totalAngle = curAngle;  // angle from |e⟩ axis
    const prob = Math.sin(totalAngle) ** 2;

    // Draw unit circle (quarter)
    ctx.strokeStyle = '#1f3155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI/2, 0);
    ctx.stroke();
    // close with lines
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R * 0.05, cy); ctx.lineTo(cx + R, cy); ctx.stroke();

    // |e⟩ axis (x-axis, horizontal = equal superposition of non-target)
    ctx.strokeStyle = '#3d5278'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    ctx.fillStyle = '#3d5278'; ctx.font = '14px JetBrains Mono';
    ctx.fillText('|e⟩', cx + R + 8, cy + 5);

    // |a⟩ axis (y-axis = target state)
    ctx.strokeStyle = '#00e676'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R); ctx.stroke();
    ctx.fillStyle = '#00e676';
    ctx.fillText('|a⟩', cx + 6, cy - R - 6);

    // Initial state vector |ψ₀⟩ = |s⟩ (uniform superposition)
    const initX = cx + R * Math.cos(totalAngle - theta + theta - totalAngle + theta);
    // Draw initial angle arc
    ctx.strokeStyle = '#1f3155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.22, -theta, 0); ctx.stroke();
    ctx.fillStyle = '#3d5278'; ctx.font = '11px JetBrains Mono';
    ctx.fillText('θ', cx + R * 0.25 + 4, cy + 4);

    // Draw current state vector
    const vx = R * Math.sin(totalAngle);   // projection on |a⟩
    const vy = R * Math.cos(totalAngle);   // projection on |e⟩

    // Dashed projections
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#f4c430'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + vy, cy - vx); ctx.lineTo(cx + vy, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + vy, cy - vx); ctx.lineTo(cx,      cy - vx); ctx.stroke();
    ctx.setLineDash([]);

    // State vector arrow
    ctx.strokeStyle = '#f4c430'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + vy, cy - vx); ctx.stroke();
    // Arrowhead
    const ang = Math.atan2(-(cy - vx - cy), (cx + vy - cx));
    ctx.fillStyle = '#f4c430';
    ctx.beginPath();
    ctx.moveTo(cx + vy, cy - vx);
    ctx.lineTo(cx + vy - 10 * Math.cos(ang - 0.4), cy - vx - 10 * Math.sin(ang - 0.4));
    ctx.lineTo(cx + vy - 10 * Math.cos(ang + 0.4), cy - vx - 10 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();

    // Probability amplitude label
    ctx.fillStyle = '#f4c430'; ctx.font = 'bold 13px JetBrains Mono';
    ctx.fillText('|ψ⟩', cx + vy / 2 + 5, cy - vx / 2 - 8);

    // Info panel
    const panelX = 12, panelY = 12;
    ctx.fillStyle = 'rgba(13,20,36,0.85)';
    ctx.fillRect(panelX, panelY, 200, 110);
    ctx.strokeStyle = '#1f3155'; ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, 200, 110);

    ctx.font = '11px JetBrains Mono';
    ctx.fillStyle = '#7a93b8'; ctx.fillText(`N = ${N}  (database size)`, panelX + 10, panelY + 22);
    ctx.fillStyle = '#00d4ff'; ctx.fillText(`Step: ${step} / ${k} optimal`, panelX + 10, panelY + 42);
    ctx.fillStyle = '#f4c430'; ctx.fillText(`Angle: ${(totalAngle * 180 / Math.PI).toFixed(1)}°`, panelX + 10, panelY + 62);
    ctx.fillStyle = '#00e676'; ctx.fillText(`P(success): ${(prob * 100).toFixed(1)}%`, panelX + 10, panelY + 82);
    ctx.fillStyle = prob > 0.9 ? '#00e676' : prob < 0.3 ? '#ff4f6e' : '#f4c430';
    ctx.fillText(prob > 0.9 ? '✓ Target found!' : 'Amplifying...', panelX + 10, panelY + 102);

    // Probability bar
    ctx.fillStyle = '#1f3155'; ctx.fillRect(12, H - 26, W - 24, 14);
    const barW = (W - 24) * prob;
    const grad = ctx.createLinearGradient(12, 0, 12 + barW, 0);
    grad.addColorStop(0, '#9b5de5'); grad.addColorStop(1, '#00e676');
    ctx.fillStyle = grad; ctx.fillRect(12, H - 26, barW, 14);
    ctx.strokeStyle = '#2a4070'; ctx.strokeRect(12, H - 26, W - 24, 14);
    ctx.fillStyle = '#fff'; ctx.font = '10px JetBrains Mono';
    ctx.fillText(`P(find target) = ${(prob * 100).toFixed(1)}%`, 16, H - 15);
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    setN: n => { N = n; step = 0; draw(); },
    step: () => {
      const { k } = getAngles();
      step = (step + 1) % (k + 1);
      draw();
    },
    reset: () => { step = 0; draw(); },
    setStep: s => { step = s; draw(); },
    getOptimalSteps: () => getAngles().k,
    destroy: () => window.removeEventListener('resize', resize)
  };
}

/* ─────────────────────────────────────────────
   WEEK 3: Deutsch-Jozsa Oracle Visualizer
───────────────────────────────────────────── */
function initDJViz(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;

  const oracles = {
    constant0: { label: 'f(x) = 0 (Constant)', type: 'constant', values: [0,0,0,0] },
    constant1: { label: 'f(x) = 1 (Constant)', type: 'constant', values: [1,1,1,1] },
    balanced1: { label: 'f(x) = x₀ (Balanced)', type: 'balanced', values: [0,1,0,1] },
    balanced2: { label: 'f(x) = x₁ (Balanced)', type: 'balanced', values: [0,0,1,1] },
  };

  let current = 'constant0';
  let running = false;

  function render(state = 'initial') {
    const o = oracles[current];
    const isConst = o.type === 'constant';

    const inputs = ['00','01','10','11'];
    c.innerHTML = `
      <div style="margin-bottom:1rem;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;color:#00d4ff;margin-bottom:0.5rem;">${o.label}</div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          ${inputs.map((inp, i) => `
            <div style="background:#162035;border:1px solid #1f3155;border-radius:6px;padding:0.5rem 0.75rem;text-align:center;min-width:60px;">
              <div style="font-family:'JetBrains Mono',monospace;color:#7a93b8;font-size:0.75rem;">f(${inp})</div>
              <div style="font-family:'JetBrains Mono',monospace;color:${o.values[i] ? '#ff9f43' : '#00d4ff'};font-size:1.1rem;font-weight:bold;">${o.values[i]}</div>
            </div>`).join('')}
        </div>
      </div>
      <div style="background:#162035;border:1px solid #1f3155;border-radius:8px;padding:1rem;font-family:'JetBrains Mono',monospace;font-size:0.82rem;">
        <div style="color:#7a93b8;margin-bottom:0.5rem;">Algorithm steps:</div>
        ${['1. Prepare |0⟩ⁿ|1⟩ ancilla',
           '2. Apply H⊗(n+1) → equal superposition',
           '3. Apply Oracle Uf (phase kickback)',
           '4. Apply H⊗n to query register',
           '5. Measure query register'].map((s,i) => `
          <div style="color:${state === 'done' || (state === 'step' + i) ? '#fff' : '#3d5278'};margin:0.2rem 0;
            ${state === 'step' + i ? 'color:#f4c430;' : ''}">
            ${s}
          </div>`).join('')}
        <div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #1f3155;color:${state === 'done' ? (isConst ? '#00d4ff' : '#00e676') : '#3d5278'};font-weight:bold;">
          Result: ${state === 'done' ? (isConst ? '|00...0⟩ → CONSTANT ✓' : 'Non-zero → BALANCED ✓') : '(run algorithm)'}
        </div>
      </div>
    `;
  }

  render();
  return {
    setOracle: o => { current = o; render(); },
    run: () => render('done')
  };
}

/* ─────────────────────────────────────────────
   WEEK 4: VQA Cost Landscape
───────────────────────────────────────────── */
function initVQAViz(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  let theta1 = 1.0, theta2 = 0.5;
  let animId = null;
  let optimizing = false;
  let lr = 0.08;

  // Mock cost function with multiple local minima
  function cost(t1, t2) {
    return -0.5 * Math.cos(t1) * Math.cos(t2) - 0.3 * Math.cos(2*t1 - t2) + 0.1 * Math.sin(t1 + t2) + 0.5;
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight || 300;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw cost landscape as heatmap
    const res = 3;
    const rangeT = Math.PI * 2;
    for (let px = 0; px < W; px += res) {
      for (let py = 0; py < H; py += res) {
        const t1 = (px / W) * rangeT - Math.PI;
        const t2 = (py / H) * rangeT - Math.PI;
        const c = cost(t1, t2);
        const norm = (c + 0.1) / 1.2;
        const r = Math.round(lerp(0, 155, norm));
        const g = Math.round(lerp(93, 0, norm));
        const b = Math.round(lerp(229, 255, 1 - norm));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, res, res);
      }
    }

    // Contour lines (simplified — just a few iso-lines)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5;
    for (let lev = 0; lev <= 8; lev++) {
      ctx.beginPath();
      // Very rough contour approximation via strips
    }

    // Current point
    const px = ((theta1 + Math.PI) / (Math.PI * 2)) * W;
    const py = ((theta2 + Math.PI) / (Math.PI * 2)) * H;

    ctx.fillStyle = '#f4c430';
    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // Axes labels
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, H - 22, W, 22);
    ctx.fillStyle = '#7a93b8'; ctx.font = '11px JetBrains Mono';
    ctx.fillText(`θ₁ = ${theta1.toFixed(3)}   θ₂ = ${theta2.toFixed(3)}   C(θ) = ${cost(theta1, theta2).toFixed(4)}`, 10, H - 7);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function gradientStep() {
    const eps = 0.01;
    const g1 = (cost(theta1 + eps, theta2) - cost(theta1 - eps, theta2)) / (2 * eps);
    const g2 = (cost(theta1, theta2 + eps) - cost(theta1, theta2 - eps)) / (2 * eps);
    theta1 -= lr * g1;
    theta2 -= lr * g2;
    // Clamp
    theta1 = Math.max(-Math.PI, Math.min(Math.PI, theta1));
    theta2 = Math.max(-Math.PI, Math.min(Math.PI, theta2));
    draw();
  }

  window.addEventListener('resize', resize);
  resize();

  let optInterval = null;
  return {
    step: () => gradientStep(),
    startOptimize: () => {
      if (optInterval) return;
      optInterval = setInterval(gradientStep, 60);
    },
    stopOptimize: () => { clearInterval(optInterval); optInterval = null; },
    reset: () => {
      theta1 = (Math.random() * 2 - 1) * Math.PI;
      theta2 = (Math.random() * 2 - 1) * Math.PI;
      clearInterval(optInterval); optInterval = null;
      draw();
    },
    setLR: v => { lr = v; },
    destroy: () => { window.removeEventListener('resize', resize); clearInterval(optInterval); }
  };
}

/* ─────────────────────────────────────────────
   WEEK 4: QEC Syndrome Table
───────────────────────────────────────────── */
function initQECViz(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;

  let errorQubit = -1; // -1 = no error
  let logicalState = 0; // 0 or 1

  function encode(state) {
    // |0L⟩ = |000⟩, |1L⟩ = |111⟩
    return [state, state, state];
  }

  function applyError(qubits, q) {
    const err = [...qubits];
    if (q >= 0) err[q] = 1 - err[q];
    return err;
  }

  function syndrome(qubits) {
    const z1 = qubits[0] ^ qubits[1];
    const z2 = qubits[1] ^ qubits[2];
    return [z1, z2];
  }

  function diagnose(syn) {
    const s = syn[0] * 2 + syn[1];
    return ['No error', 'Error on q₂', 'Error on q₁', 'Error on q₀'][s];
  }

  function render() {
    const qubits = encode(logicalState);
    const withError = applyError(qubits, errorQubit);
    const syn = syndrome(withError);
    const diagnosis = diagnose(syn);
    const corrected = applyError(withError, errorQubit); // correct by flipping back

    c.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;font-family:'JetBrains Mono',monospace;font-size:0.82rem;">
        <div>
          <div style="color:#7a93b8;margin-bottom:0.5rem;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;">Logical State</div>
          <div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
            ${[0,1].map(s => `<button onclick="window.__qec_${containerId}.setLogical(${s})" style="
              padding:0.4rem 0.8rem;border-radius:6px;border:1px solid ${logicalState === s ? '#00d4ff' : '#1f3155'};
              background:${logicalState === s ? 'rgba(0,212,255,0.1)' : '#162035'};
              color:${logicalState === s ? '#00d4ff' : '#7a93b8'};cursor:pointer;font-family:inherit;">|${s}L⟩</button>`).join('')}
          </div>
          <div style="color:#7a93b8;margin-bottom:0.5rem;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;">Inject Error</div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            ${[-1,0,1,2].map(q => `<button onclick="window.__qec_${containerId}.setError(${q})" style="
              padding:0.35rem 0.7rem;border-radius:6px;border:1px solid ${errorQubit === q ? '#ff4f6e' : '#1f3155'};
              background:${errorQubit === q ? 'rgba(255,79,110,0.1)' : '#162035'};
              color:${errorQubit === q ? '#ff4f6e' : '#7a93b8'};cursor:pointer;font-family:inherit;font-size:0.75rem;">
              ${q === -1 ? 'None' : 'X on q' + q}</button>`).join('')}
          </div>
        </div>
        <div>
          <div style="color:#7a93b8;margin-bottom:0.75rem;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;">Physical Qubits</div>
          <div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
            ${withError.map((q, i) => `<div style="
              padding:0.5rem 0.9rem;border-radius:6px;text-align:center;
              background:${qubits[i] !== q ? 'rgba(255,79,110,0.12)' : '#162035'};
              border:1px solid ${qubits[i] !== q ? '#ff4f6e' : '#1f3155'};
              color:${qubits[i] !== q ? '#ff4f6e' : '#00d4ff'};">
              <div style="font-size:0.68rem;color:#3d5278;margin-bottom:0.2rem;">q${i}</div>
              <div style="font-size:1.1rem;font-weight:bold;">|${q}⟩</div>
              ${qubits[i] !== q ? '<div style="font-size:0.65rem;color:#ff4f6e;margin-top:0.2rem;">← X error</div>' : ''}
            </div>`).join('')}
          </div>
          <div style="color:#7a93b8;margin-bottom:0.4rem;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;">Syndromes</div>
          <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
            ${syn.map((s, i) => `<div style="padding:0.3rem 0.7rem;border-radius:6px;background:${s ? 'rgba(255,79,110,0.1)' : '#162035'};border:1px solid ${s ? '#ff4f6e' : '#1f3155'};color:${s ? '#ff4f6e' : '#7a93b8'};font-size:0.82rem;">Z${i+1}=${s}</div>`).join('')}
          </div>
          <div style="padding:0.5rem 0.75rem;border-radius:6px;background:rgba(0,230,118,0.08);border:1px solid rgba(0,230,118,0.3);color:#00e676;font-size:0.82rem;">
            Diagnosis: ${diagnosis}
          </div>
        </div>
      </div>
    `;
    window[`__qec_${containerId}`] = {
      setLogical: s => { logicalState = s; render(); },
      setError: q => { errorQubit = q; render(); }
    };
  }

  render();
}
