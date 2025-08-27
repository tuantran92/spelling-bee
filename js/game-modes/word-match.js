// js/game-modes/word-match.js
// Word Match – ghép TỪ ↔ NGHĨA. Mỗi cặp có 1 màu riêng; line uốn lượn trong gutter,
// có "cap" nối thẳng vào chấm tròn ở cạnh mỗi ô.

import { state, setState } from '../state.js';
import { shuffleArray, playSound } from '../utils.js';
import { updateWordLevel } from '../data.js';

function currentList() {
  const list = (state.filteredVocabList && state.filteredVocabList.length > 0)
    ? state.filteredVocabList
    : (state.vocabList || []);
  return list.filter(x => x && x.word && x.meaning);
}

function pickBatch(n = 6) {
  const list = shuffleArray([...currentList()]);
  return list.slice(0, Math.min(n, list.length));
}

/** Bảng màu “an toàn” trên nền tối, tuần tự đa dạng */
function buildColorPalette(count) {
  const base = [
    '#22d3ee', '#a78bfa', '#34d399', '#60a5fa',
    '#f59e0b', '#fb7185', '#10b981', '#f472b6',
    '#f97316', '#84cc16', '#38bdf8', '#c084fc',
  ];
  if (count <= base.length) return base.slice(0, count);
  const extra = [];
  for (let i = 0; i < count - base.length; i++) {
    const hue = Math.round((360 / (count - base.length + 1)) * (i + 1));
    extra.push(`hsl(${hue} 85% 55%)`);
  }
  return base.concat(extra);
}

// ===== Đường chính trong gutter + "cap" nối thẳng vào chấm tròn (anchor) =====
function layoutLines() {
  const svgBack  = document.getElementById('word-match-lines');        // dưới grid
  const svgFront = document.getElementById('word-match-lines-front');  // trên grid (vẽ cap)
  const board = document.getElementById('word-match-board');
  const leftWrap  = document.getElementById('wm-left');
  const rightWrap = document.getElementById('wm-right');
  if (!svgBack || !svgFront || !board || !leftWrap || !rightWrap || !state.wordMatchGame) return;

  const isSingleCol = window.matchMedia('(max-width: 767px)').matches;
  if (isSingleCol) { svgBack.innerHTML = ''; svgFront.innerHTML = ''; return; }

  const rect = board.getBoundingClientRect();
  [svgBack, svgFront].forEach(svg => {
    svg.setAttribute('width',  String(rect.width));
    svg.setAttribute('height', String(rect.height));
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  });

  // mép gutter (sát mép cột, chừa 2px cho đẹp)
  const EDGE_PAD = 2;
  const l = leftWrap.getBoundingClientRect();
  const r = rightWrap.getBoundingClientRect();
  const xL = (l.right - rect.left) + EDGE_PAD;
  const xR = (r.left  - rect.left) - EDGE_PAD;
  const gutterW = Math.max(0, xR - xL);

  // layer dưới: đường chính (bị clip để không đè chữ)
  svgBack.innerHTML = `
    <defs>
      <filter id="wm-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="wm-clip">
        <rect x="${xL}" y="0" width="${gutterW}" height="${rect.height}" rx="16" ry="16"/>
      </clipPath>
    </defs>
  `;
  svgFront.innerHTML = ''; // layer trên: chỉ vẽ cap đến anchor, không clip

  const { pairs, solved, colorMap } = state.wordMatchGame;

  const center = (el) => {
    const b = el.getBoundingClientRect();
    return { x: (b.left - rect.left) + b.width/2, y: (b.top - rect.top) + b.height/2 };
  };

  const laneBuckets = new Map();
  const strokeW = window.innerWidth >= 1280 ? 3.0 : 2.6;

  pairs.forEach((p, idx) => {
    if (!solved.has(p.id)) return;

    // lấy đúng anchor 2 bên
    const leftAnchor  = board.querySelector(`.wm-anchor-right[data-id="${p.id}"]`);
    const rightAnchor = board.querySelector(`.wm-anchor-left[data-id="${p.id}"]`);
    if (!leftAnchor || !rightAnchor) return;

    const A = center(leftAnchor);   // điểm thật của chấm trái
    const B = center(rightAnchor);  // điểm thật của chấm phải

    // lane theo midpoint để tách làn
    const bucketKey = Math.round(((A.y + B.y) / 2) / 18);
    const used = laneBuckets.get(bucketKey) || 0;
    laneBuckets.set(bucketKey, used + 1);
    const laneOffset = (used - 0.5) * 12;

    // đường CHÍNH: chỉ vẽ trong gutter (x chạy xL -> xR)
    const dx = (xR - xL), dy = (B.y - A.y);
    const L  = Math.hypot(dx, dy);
    const steps = Math.max(6, Math.round(L / 80));
    const waves = Math.max(1, Math.round(dx / 120));
    const amp   = 9 + Math.min(5, Math.abs(laneOffset) / 2);
    const phase = (idx % 2) * Math.PI / 2;

    let d = `M ${xL} ${A.y + laneOffset}`;
    let px = xL, py = A.y + laneOffset;
    for (let s = 1; s <= steps; s++) {
      const t  = s / steps;
      const x  = xL + dx * t;
      const by = (A.y + dy * t) + laneOffset;
      const y  = by + Math.sin(t * Math.PI * 2 * waves + phase) * amp;
      const cx = (px + x) / 2, cy = (py + y) / 2;
      d += ` Q ${cx} ${cy} ${x} ${y}`;
      px = x; py = y;
    }

    const color = colorMap[p.id] || '#34d399';

    // path chính (dưới)
    const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mainPath.setAttribute('d', d);
    mainPath.setAttribute('stroke', color);
    mainPath.setAttribute('stroke-width', String(strokeW));
    mainPath.setAttribute('stroke-linecap', 'round');
    mainPath.setAttribute('opacity', '0.95');
    mainPath.setAttribute('fill', 'none');
    mainPath.setAttribute('filter', 'url(#wm-glow)');
    mainPath.setAttribute('clip-path', 'url(#wm-clip)');
    svgBack.appendChild(mainPath);

    // “cap” TRÊN cùng: nối từ anchor → mép gutter
    const mkCap = (x1, y1, x2, y2) => {
      const cap = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cap.setAttribute('x1', x1); cap.setAttribute('y1', y1);
      cap.setAttribute('x2', x2); cap.setAttribute('y2', y2);
      cap.setAttribute('stroke', color);
      cap.setAttribute('stroke-width', String(strokeW));
      cap.setAttribute('stroke-linecap', 'round');
      cap.setAttribute('filter', 'url(#wm-glow)');
      return cap;
    };
    svgFront.appendChild(mkCap(A.x, A.y, xL, A.y + laneOffset)); // trái: anchor -> xL
    svgFront.appendChild(mkCap(xR, B.y + laneOffset, B.x, B.y)); // phải: xR -> anchor
  });
}

// Hiển thị trạng thái hoàn thành và mở nút "Bộ khác"
function finishSet() {
  const result = document.getElementById('word-match-result');
  if (result) {
    result.textContent = '🎉 Hoàn thành! Tuyệt vời!';
    result.className = 'h-6 text-lg font-semibold text-green-500';
  }
  const nextBtn = document.getElementById('word-match-next-btn');
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    nextBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700', 'text-white');
  }
}

// Cập nhật tiến độ: "X/Y cặp"
function updateProgress() {
  const el = document.getElementById('word-match-progress');
  if (!el || !state.wordMatchGame) return;
  const total = state.wordMatchGame.pairs.length;
  const done  = state.wordMatchGame.solved.size;
  el.textContent = `${done}/${total} cặp`;
}

// ===== Handlers =====
function attachHandlers(container) {
  const leftWrap  = container.querySelector('#wm-left');
  const rightWrap = container.querySelector('#wm-right');

  let selectedLeft  = null;
  let selectedRight = null;

  const clearSelection = () => {
    selectedLeft?.classList.remove('ring-2', 'ring-cyan-400');
    selectedRight?.classList.remove('ring-2', 'ring-cyan-400');
    selectedLeft = selectedRight = null;
  };

  const tryMatch = () => {
    if (!selectedLeft || !selectedRight) return;
    const leftId  = Number(selectedLeft.dataset.id);
    const rightId = Number(selectedRight.dataset.id);

    const { pairs, solved, colorMap } = state.wordMatchGame;

    if (leftId === rightId) {
      playSound('correct');
      solved.add(leftId);

      // màu riêng cho cặp
      const col = colorMap[leftId] || '#34d399';

      // Đổi nền 2 nút sang cùng màu và disable
      [selectedLeft, selectedRight].forEach(el => {
        el.classList.remove(
          'hover:bg-violet-700', 'hover:bg-teal-600',
          'hover:scale-[1.02]', 'bg-violet-600', 'bg-teal-500'
        );
        el.style.backgroundColor = col;
        el.style.color = '#ffffff';
        el.classList.add('cursor-default');
        el.disabled = true;
      });

      // Tô màu chấm tròn (anchor) 2 bên cho khớp với đường nối
      const leftDot  = container.querySelector(`.wm-anchor-right[data-id="${leftId}"]`);
      const rightDot = container.querySelector(`.wm-anchor-left[data-id="${leftId}"]`);
      if (leftDot)  leftDot.style.backgroundColor  = col;
      if (rightDot) rightDot.style.backgroundColor = col;

      // Cộng level
      const pair = pairs.find(p => p.id === leftId);
      if (pair?.wordObj) updateWordLevel(pair.wordObj, true);

      clearSelection();
      updateProgress();
      layoutLines();

      if (solved.size === pairs.length) finishSet();
    } else {
      playSound('wrong');
      [selectedLeft, selectedRight].forEach(el => {
        el.classList.add('animate-pulse');
        setTimeout(() => el.classList.remove('animate-pulse'), 200);
      });
      clearSelection();
    }
  };

  // Click bên trái
  leftWrap.querySelectorAll('.wm-left-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (selectedLeft === btn) {
        btn.classList.remove('ring-2', 'ring-cyan-400');
        selectedLeft = null;
      } else {
        selectedLeft?.classList.remove('ring-2', 'ring-cyan-400');
        selectedLeft = btn;
        btn.classList.add('ring-2', 'ring-cyan-400');
      }
      setTimeout(layoutLines, 0);
      tryMatch();
    });
  });

  // Click bên phải
  rightWrap.querySelectorAll('.wm-right-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (selectedRight === btn) {
        btn.classList.remove('ring-2', 'ring-cyan-400');
        selectedRight = null;
      } else {
        selectedRight?.classList.remove('ring-2', 'ring-cyan-400');
        selectedRight = btn;
        btn.classList.add('ring-2', 'ring-cyan-400');
      }
      setTimeout(layoutLines, 0);
      tryMatch();
    });
  });

  window.addEventListener('resize', layoutLines);
}

// ===== Public API =====
export function startWordMatch(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const batch = pickBatch(6);
  if (batch.length < 2) {
    container.innerHTML = `<h2 class="text-2xl font-semibold mb-2">Nối từ</h2>
      <p class="text-orange-500">Không đủ dữ liệu (cần tối thiểu 2 từ có nghĩa).</p>`;
    return;
  }

  const pairs = batch.map((w, i) => ({ id: i + 1, word: w.word, meaning: w.meaning, wordObj: w }));
  const left  = shuffleArray([...pairs]);
  const right = shuffleArray([...pairs]);

  // gán màu duy nhất cho từng id
  const palette = buildColorPalette(pairs.length);
  const colorMap = {}; pairs.forEach((p, i) => { colorMap[p.id] = palette[i % palette.length]; });

  setState({
    wordMatchGame: { pairs, left, right, solved: new Set(), colorMap }
  });

  container.innerHTML = `
  <h2 class="text-2xl font-semibold mb-2">Nối từ (Word Match)</h2>
  <p class="text-gray-500 dark:text-gray-400 mb-4">
    Chạm chọn 1 từ và 1 nghĩa để ghép. Đúng sẽ tô màu riêng và vẽ đường nối.
  </p>

  <div class="flex items-center justify-between mb-2">
    <p id="word-match-progress" class="text-sm text-gray-500 dark:text-gray-400">0/${pairs.length} cặp</p>
    <div class="flex items-center gap-2">
      <button id="word-match-next-btn"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed"
              disabled>Bộ khác</button>
    </div>
  </div>

  <div id="word-match-board" class="relative w-full max-w-6xl mx-auto rounded-2xl overflow-hidden">
    <!-- BACK: đường chính (trong gutter), nằm dưới -->
    <svg id="word-match-lines" class="absolute inset-0 pointer-events-none hidden md:block z-0"></svg>

    <!-- GRID 2 cột (ở giữa) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 p-3 sm:p-4 relative z-10">
      <!-- LEFT list -->
      <div class="bg-gray-100/0 dark:bg-transparent">
        <div id="wm-left" class="mt-2 space-y-3 md:max-w-[220px] md:mx-auto">
          ${left.map(p => `
            <button
              class="wm-left-item relative w-full text-left bg-violet-600 hover:bg-violet-700 text-white font-semibold
                     h-12 md:h-14 px-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] focus:outline-none"
              data-id="${p.id}">
              ${p.word}
              <span class="wm-anchor wm-anchor-right absolute top-1/2 -translate-y-1/2 -right-1.5
                           w-2.5 h-2.5 rounded-full bg-white/90 dark:bg-gray-200 shadow"
                    data-id="${p.id}"></span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- RIGHT list -->
      <div class="bg-gray-100/0 dark:bg-transparent">
        <div id="wm-right" class="mt-2 space-y-3 md:max-w-[220px] md:mx-auto">
          ${right.map(p => `
            <button
              class="wm-right-item relative w-full text-left bg-teal-500 hover:bg-teal-600 text-white font-semibold
                     h-12 md:h-14 px-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] focus:outline-none"
              data-id="${p.id}">
              ${p.meaning}
              <span class="wm-anchor wm-anchor-left absolute top-1/2 -translate-y-1/2 -left-1.5
                           w-2.5 h-2.5 rounded-full bg-white/90 dark:bg-gray-200 shadow"
                    data-id="${p.id}"></span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- FRONT: các “cap” ngắn chui vào ô, nằm trên cùng -->
    <svg id="word-match-lines-front" class="absolute inset-0 pointer-events-none hidden md:block z-20"></svg>
  </div>

  <p id="word-match-result" class="mt-3 h-6 text-lg font-medium"></p>
`;

  attachHandlers(container);
  updateProgress();
  setTimeout(layoutLines, 0);

  container.querySelector('#word-match-next-btn')?.addEventListener('click', () => {
    startWordMatch(containerId);
  });
}

if (typeof window !== 'undefined') {
  window.startWordMatch = startWordMatch;
}
