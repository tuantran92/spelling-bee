// js/game-modes/word-match.js
// Word Match – ghép TỪ ↔ NGHĨA. Mỗi cặp có 1 màu riêng, ghép đúng đổi màu nền + vẽ đường nối ngoằn ngoèo.

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
    '#22d3ee', // cyan-400
    '#a78bfa', // violet-400
    '#34d399', // emerald-400
    '#60a5fa', // blue-400
    '#f59e0b', // amber-500
    '#fb7185', // rose-400
    '#10b981', // emerald-500
    '#f472b6', // pink-400
    '#f97316', // orange-500
    '#84cc16', // lime-500
    '#38bdf8', // sky-400
    '#c084fc', // purple-400
  ];
  if (count <= base.length) return base.slice(0, count);
  // nếu nhiều hơn, tiếp tục sinh bằng HSL
  const extra = [];
  for (let i = 0; i < count - base.length; i++) {
    const hue = Math.round((360 / (count - base.length + 1)) * (i + 1));
    extra.push(`hsl(${hue} 85% 55%)`);
  }
  return base.concat(extra);
}

// ===== Vẽ đường nối ngoằn ngoèo (SVG) =====
function layoutLines() {
  const svg = document.getElementById('word-match-lines');
  const board = document.getElementById('word-match-board');
  if (!svg || !board || !state.wordMatchGame) return;

  // Ẩn line trên mobile (1 cột) cho gọn
  const isSingleCol = window.matchMedia('(max-width: 767px)').matches;
  if (isSingleCol) {
    svg.innerHTML = '';
    return;
  }

  const rect = board.getBoundingClientRect();
  svg.setAttribute('width', String(rect.width));
  svg.setAttribute('height', String(rect.height));
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

  // clear & defs (glow)
  svg.innerHTML = `
    <defs>
      <filter id="wm-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  `;

  const { pairs, solved, colorMap } = state.wordMatchGame;

  const centerOf = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - rect.left) + r.width / 2,
      y: (r.top  - rect.top)  + r.height / 2,
    };
  };

  // “làn” để giảm chồng chéo
  const laneBuckets = new Map();

  pairs.forEach((p, idx) => {
    if (!solved.has(p.id)) return;

    const leftEl  = document.querySelector(`.wm-left-item[data-id="${p.id}"]`);
    const rightEl = document.querySelector(`.wm-right-item[data-id="${p.id}"]`);
    if (!leftEl || !rightEl) return;

    const a = centerOf(leftEl);
    const b = centerOf(rightEl);

    const bucketKey = Math.round(((a.y + b.y) / 2) / 18);
    const used = laneBuckets.get(bucketKey) || 0;
    laneBuckets.set(bucketKey, used + 1);
    const laneOffset = (used - 0.5) * 12;

    const dx = b.x - a.x, dy = b.y - a.y;
    const L  = Math.hypot(dx, dy);
    const steps = Math.max(6, Math.round(L / 80));
    const waves = Math.max(1, Math.round(L / 160));
    const amp   = 10 + Math.min(6, Math.abs(laneOffset) / 2);
    const phase = (idx % 2) * Math.PI / 2;

    let d = `M ${a.x} ${a.y}`;
    let px = a.x, py = a.y;
    for (let s = 1; s <= steps; s++) {
      const t  = s / steps;
      const x  = a.x + dx * t;
      const by = a.y + dy * t + laneOffset;
      const y  = by + Math.sin(t * Math.PI * 2 * waves + phase) * amp;
      const cx = (px + x) / 2, cy = (py + y) / 2;
      d += ` Q ${cx} ${cy} ${x} ${y}`;
      px = x; py = y;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', colorMap[p.id] || '#34d399');
    path.setAttribute('stroke-width', window.innerWidth >= 768 ? '5.5' : '4.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '0.95');
    path.setAttribute('fill', 'none');
    path.setAttribute('filter', 'url(#wm-glow)');
    svg.appendChild(path);
  });
}

function updateProgress() {
  const el = document.getElementById('word-match-progress');
  if (!el || !state.wordMatchGame) return;
  const total = state.wordMatchGame.pairs.length;
  const done  = state.wordMatchGame.solved.size;
  el.textContent = `${done}/${total} cặp`;
}

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
  }
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

      // styling đúng: đổi nền sang màu của đường nối
      [selectedLeft, selectedRight].forEach(el => {
        el.classList.remove('hover:bg-violet-700','hover:bg-teal-600','hover:scale-[1.02]','bg-violet-600','bg-teal-500');
        el.style.backgroundColor = col;
        el.style.color = '#ffffff';
        el.classList.add('cursor-default');
        el.disabled = true;
      });

      // cập nhật level
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

  // tạo cặp (mỗi pair có id để đối chiếu)
  const pairs = batch.map((w, i) => ({ id: i + 1, word: w.word, meaning: w.meaning, wordObj: w }));
  const left  = shuffleArray([...pairs]);
  const right = shuffleArray([...pairs]);

  // gán màu duy nhất cho từng id
  const palette = buildColorPalette(pairs.length);
  const colorMap = {};
  pairs.forEach((p, i) => { colorMap[p.id] = palette[i % palette.length]; });

  setState({
    wordMatchGame: {
      pairs, left, right,
      solved: new Set(),
      colorMap
    }
  });

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-2">Nối từ (Word Match)</h2>
    <p class="text-gray-500 dark:text-gray-400 mb-4">Chạm chọn 1 từ và 1 nghĩa để ghép. Đúng sẽ tô màu riêng và vẽ đường nối.</p>

    <div class="flex items-center justify-between mb-2">
      <p id="word-match-progress" class="text-sm text-gray-500 dark:text-gray-400">0/${pairs.length} cặp</p>
      <div class="flex items-center gap-2">
        <button id="word-match-next-btn"
                class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed"
                disabled>Bộ khác</button>
      </div>
    </div>

    <div id="word-match-board"
         class="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden">

      <!-- Layer vẽ đường nối -->
      <svg id="word-match-lines" class="absolute inset-0 pointer-events-none hidden md:block"></svg>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-2 sm:p-4">
        <!-- LEFT COLUMN -->
        <div class="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 sm:p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 px-1">Từ</div>
          <div id="wm-left" class="mt-2 space-y-3">
            ${left.map(p => `
              <button
                class="wm-left-item w-full text-left bg-violet-600 hover:bg-violet-700 text-white font-semibold
                       h-12 md:h-14 px-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] focus:outline-none"
                data-id="${p.id}">
                ${p.word}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 sm:p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 px-1">Nghĩa</div>
          <div id="wm-right" class="mt-2 space-y-3">
            ${right.map(p => `
              <button
                class="wm-right-item w-full text-left bg-teal-500 hover:bg-teal-600 text-white font-semibold
                       h-12 md:h-14 px-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] focus:outline-none"
                data-id="${p.id}">
                ${p.meaning}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <p id="word-match-result" class="mt-3 h-6 text-lg font-medium"></p>
  `;

  attachHandlers(container);
  updateProgress();

  // Reflow để SVG có kích thước thật sau khi DOM render
  setTimeout(layoutLines, 0);

  // “Bộ khác”
  container.querySelector('#word-match-next-btn')?.addEventListener('click', () => {
    startWordMatch(containerId);
  });
}

// Optional: expose for inline (nếu HTML gọi trực tiếp)
if (typeof window !== 'undefined') {
  window.startWordMatch = startWordMatch;
}
