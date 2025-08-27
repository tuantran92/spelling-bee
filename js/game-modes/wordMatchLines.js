// js/game-modes/wordMatchLines.js
// Vẽ đường ngoằn ngoèo bằng SVG. pairs: [{leftEl, rightEl, correct}, ...]

export function drawWavyMatchLines(wrapper, pairs) {
  if (!wrapper) return;

  // tạo SVG nếu chưa có
  let svg = wrapper.querySelector('#wm-links-svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'wm-links-svg');
    wrapper.style.position = 'relative';
    wrapper.appendChild(svg);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="wm-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" result="b"/><feMerge>
          <feMergeNode in="b"/><feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="wm-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0"  stop-color="#22d3ee"/>
        <stop offset="1"  stop-color="#6366f1"/>
      </linearGradient>
      <linearGradient id="wm-grad-green" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#10b981"/>
      </linearGradient>
      <linearGradient id="wm-grad-red" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#ef4444"/>
      </linearGradient>
    `;
    svg.appendChild(defs);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'wm-links-layer');
    svg.appendChild(g);

    // tự redraw khi container đổi size/scroll
    const ro = new ResizeObserver(() => drawWavyMatchLines(wrapper, pairs));
    ro.observe(wrapper);
    window.addEventListener('scroll', () => drawWavyMatchLines(wrapper, pairs), { passive: true });
  }

  // set viewport
  const layer = svg.querySelector('#wm-links-layer');
  layer.innerHTML = '';
  const rect = wrapper.getBoundingClientRect();
  svg.setAttribute('width', rect.width);
  svg.setAttribute('height', rect.height);
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

  // “làn” để hạn chế chồng chéo
  const laneBuckets = new Map(); // key -> count

  pairs.forEach((p, idx) => {
    const a = p.leftEl?.getBoundingClientRect?.();
    const b = p.rightEl?.getBoundingClientRect?.();
    if (!a || !b) return;

    const x1 = (a.left + a.right) / 2 - rect.left;
    const y1 = (a.top + a.bottom) / 2 - rect.top;
    const x2 = (b.left + b.right) / 2 - rect.left;
    const y2 = (b.top + b.bottom) / 2 - rect.top;

    const bucketKey = Math.round(((y1 + y2) / 2) / 18);
    const used = laneBuckets.get(bucketKey) || 0;
    laneBuckets.set(bucketKey, used + 1);
    const laneOffset = (used - 0.5) * 12; // đẩy line ra làn bên cạnh

    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    const steps = Math.max(6, Math.round(L / 80));
    const waves = Math.max(1, Math.round(L / 160));
    const amp = 10 + Math.min(6, Math.abs(laneOffset) / 2);
    const phase = (idx % 2) * Math.PI / 2;

    let d = `M ${x1} ${y1}`;
    let px = x1, py = y1;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = x1 + dx * t;
      const baseY = y1 + dy * t + laneOffset;
      const y = baseY + Math.sin(t * Math.PI * 2 * waves + phase) * amp;
      const cx = (px + x) / 2, cy = (py + y) / 2;
      d += ` Q ${cx} ${cy} ${x} ${y}`;
      px = x; py = y;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'wm-link');
    path.setAttribute('stroke', `url(#${p.correct ? 'wm-grad-green' : 'wm-grad'})`);
    layer.appendChild(path);
  });
}
