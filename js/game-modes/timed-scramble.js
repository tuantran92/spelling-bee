// js/game-modes/timed-scramble.js
// Start + chọn thời gian 1–5', slot cố định, auto-next,
// >50% trợ giúp không tính điểm, khóa UI khi hết giờ, cộng điểm vào BXH,
// Ô nhập đáp án 1 dòng, rộng tối đa; bỏ nút Xóa lùi & Xóa hết.

import { state, setState } from '../state.js';
import { updateWordLevel, recordDailyActivity, saveUserData, fetchWordData } from '../data.js';
import { playSound } from '../utils.js';
import { updateDashboard } from '../ui.js';

let TICK = null;
let ticking = false;   // đang chạy phiên
let frozen  = true;    // khóa tương tác trước khi bắt đầu
let sessionCorrect = 0; // đếm số từ đúng trong phiên

// ===== lấy list theo CHỦ ĐỀ đang chọn =====
function pickList() {
  const list = (state.filteredVocabList && state.filteredVocabList.length)
    ? state.filteredVocabList
    : state.vocabList;
  return Array.isArray(list) ? list : [];
}
function pickWord() {
  const list = pickList();
  if (!list.length) return null;
  const w = list[Math.floor(Math.random() * list.length)];
  return (w && w.word && w.word.length >= 2) ? w : pickWord();
}
function scramble(word) {
  const a = [...word];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.join('').toLowerCase() === word.toLowerCase() && new Set(a).size > 1) a.reverse();
  return a;
}

// ===== style helpers =====
const slotDashed = "inline-flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/70 dark:border-slate-600/70 h-11 md:h-12 px-4 min-w-[44px]";
const pillPurple = "inline-flex items-center justify-center px-4 py-2 rounded-2xl shadow-md bg-violet-600 text-white text-lg font-semibold tracking-wide hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-300";
const pillGreen  = "inline-flex items-center justify-center px-4 py-2 rounded-2xl shadow-md bg-emerald-700 text-white text-lg font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-emerald-300";

function lockControls(locked){
  frozen = locked;
  ['ts-hint-def','ts-suggest','ts-show-ans'].forEach(id=>{
    const b=document.getElementById(id); if(!b) return;
    b.disabled = locked; b.classList.toggle('opacity-50', locked); b.classList.toggle('cursor-not-allowed', locked);
  });
  document.querySelectorAll('#ts-available button, #ts-answer .ts-chip').forEach(b=>{
    b.disabled = locked; b.classList.toggle('opacity-50', locked); b.classList.toggle('cursor-not-allowed', locked);
  });
}

// ===== render giữ vị trí =====
function renderPool(){
  const pool = document.getElementById('ts-available');
  if(!pool) return;
  const { letters, chosen } = state._tsRound;

  pool.innerHTML = '';
  letters.forEach((ch, i) => {
    if (chosen.includes(i)) {
      const slot = document.createElement('div');
      slot.className = slotDashed;
      pool.appendChild(slot);
      return;
    }
    const b = document.createElement('button');
    b.className = pillPurple;
    b.textContent = ch;
    b.onclick = () => addIndex(i);
    b.disabled = !ticking || frozen;
    if (b.disabled) b.classList.add('opacity-50','cursor-not-allowed');
    pool.appendChild(b);
  });
}

function renderAnswer(){
  const ans = document.getElementById('ts-answer');
  if(!ans) return;
  const { letters, chosen } = state._tsRound;

  ans.innerHTML = '';
  for (let pos = 0; pos < letters.length; pos++){
    if (pos < chosen.length){
      const i = chosen[pos];
      const b = document.createElement('button');
      b.className = pillGreen + ' ts-chip shrink-0';
      b.textContent = letters[i];
      b.title = 'Bấm để trả chữ về dưới';
      b.onclick = () => removeAt(pos);
      b.disabled = !ticking || frozen;
      if (b.disabled) b.classList.add('opacity-50','cursor-not-allowed');
      ans.appendChild(b);
    } else {
      const slot = document.createElement('div');
      slot.className = slotDashed + ' shrink-0';
      ans.appendChild(slot);
    }
  }
}

function answerString(){
  const { letters, chosen } = state._tsRound;
  return chosen.map(i => letters[i]).join('');
}
const setCorrectText = () => {
  const el = document.getElementById('ts-correct');
  if (el) el.textContent = String(sessionCorrect);
};

// ===== hint =====
async function ensureHints(){
  const w = state.currentWord;
  if(!w) return;
  if (!w.definition || !w.meaning){
    try{
      const fresh = await fetchWordData(w.word);
      if (fresh) setState({ currentWord: { ...w, ...fresh } });
    }catch{}
  }
  const def = document.getElementById('ts-def');
  if (def) def.textContent = state.currentWord.definition || '(chưa có định nghĩa)';
}

// ===== round control =====
function newRound(){
  if (frozen) return;
  const w = pickWord();
  if(!w){
    const c = document.getElementById('ts-content');
    if (c) c.innerHTML = `<p class="text-orange-500">Không còn từ phù hợp với chủ đề/bộ lọc hiện tại.</p>`;
    return;
  }
  setState({ currentWord: w });

  state._tsRound = {
    letters: scramble(w.word),
    chosen : [],
    helpCount: 0
  };

  renderPool(); renderAnswer();
  const footer = document.getElementById('ts-footer');
  if (footer) footer.textContent = 'Hãy sắp xếp đúng thứ tự!';
  void ensureHints();
}

function maybeAutoCheck(){
  const { letters, chosen, helpCount } = state._tsRound;
  if (chosen.length !== letters.length) return;

  const guess  = answerString().toLowerCase();
  const target = state.currentWord.word.toLowerCase();

  if (guess === target){
    const disqualified = (helpCount * 2) > letters.length; // >50% ký tự trợ giúp
    if (!disqualified){
      sessionCorrect += 1;
      setCorrectText();
      try{
        recordDailyActivity?.('words', 1);
        saveUserData?.();
        updateDashboard?.();
      }catch{}
    }
    try{ playSound('correct'); }catch{}
    updateWordLevel(state.currentWord, true);

    const footer = document.getElementById('ts-footer');
    if (footer) footer.textContent = disqualified
      ? 'Đúng nhưng đã dùng trợ giúp >50% ký tự, KHÔNG tính điểm.'
      : 'Chính xác! Tạo từ mới…';

    setTimeout(newRound, 300);
  } else {
    try{ playSound('wrong'); }catch{}
    const ansBox = document.getElementById('ts-answer');
    if (ansBox){ ansBox.classList.remove('shake'); void ansBox.offsetWidth; ansBox.classList.add('shake'); }
    const footer = document.getElementById('ts-footer');
    if (footer) footer.textContent = 'Chưa đúng, thử lại nhé!';
  }
}

// chọn / bỏ
function addIndex(i){
  if (!ticking || frozen) return;
  const r = state._tsRound;
  if (r.chosen.includes(i)) return;
  r.chosen.push(i);
  renderAnswer(); renderPool();
  maybeAutoCheck();
}
function removeAt(pos){
  if (!ticking || frozen) return;
  const r = state._tsRound;
  if (pos < 0 || pos >= r.chosen.length) return;
  r.chosen.splice(pos,1);
  renderAnswer(); renderPool();
}

// ===== gợi ý & đáp án =====
function suggestOne(){
  if (!ticking || frozen) return;
  const r = state._tsRound;
  const pos = r.chosen.length;
  const want = state.currentWord.word[pos]?.toLowerCase();
  const idx = r.letters.findIndex((ch, i) => !r.chosen.includes(i) && ch.toLowerCase() === want);
  if (idx !== -1){
    r.helpCount += 1; // đã giúp 1 ký tự
    addIndex(idx);
    const footer = document.getElementById('ts-footer');
    if (footer) footer.textContent = 'Đã gợi ý 1 ký tự.';
  }
}
function revealAnswer(){
  if (!ticking || frozen) return;
  const r = state._tsRound;
  r.chosen = [...r.letters.keys()];
  renderAnswer(); renderPool();
  const footer = document.getElementById('ts-footer');
  if (footer) footer.textContent = `Đáp án: ${state.currentWord.word}`;
  setTimeout(newRound, 900);
}

// ===== Timer =====
function stopSession(timeup){
  ticking = false; lockControls(true);
  if (TICK){ clearInterval(TICK); TICK = null; }
  const left = document.getElementById('ts-left'); if (left) left.textContent = '00:00';
  const footer = document.getElementById('ts-footer');
  if (footer) footer.textContent = timeup ? 'Hết giờ!' : 'Đã dừng.';
  // mở lại Start + Duration
  const startBtn = document.getElementById('ts-start');
  const dur = document.getElementById('ts-dur');
  if (startBtn) { startBtn.disabled = false; startBtn.classList.remove('opacity-60','cursor-not-allowed'); }
  if (dur) dur.disabled = false;
}
function startTimer(total){
  let left = total;
  const leftEl = document.getElementById('ts-left');
  const show = (s)=>{ const m=String(Math.floor(s/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); if(leftEl) leftEl.textContent=`${m}:${ss}`; };
  show(left);
  if (TICK) clearInterval(TICK);
  TICK = setInterval(()=>{
    if (!ticking) return;
    left -= 1; show(Math.max(left,0));
    if (left <= 0) { stopSession(true); }
  },1000);
}

// ===== Entry =====
export function startTimedScramble(container){
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;

  ticking = false; frozen = true; sessionCorrect = 0;

  el.innerHTML = `
    <div id="ts-content" class="space-y-4">
      <!-- Header: Thời gian + Bắt đầu -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-slate-600 dark:text-slate-300">Thời gian:</span>
          <select id="ts-dur" class="border rounded-lg px-2 py-1
              border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            <option value="60">1 phút</option>
            <option value="120" selected>2 phút</option>
            <option value="180">3 phút</option>
            <option value="240">4 phút</option>
            <option value="300">5 phút</option>
          </select>
        </div>
        <button id="ts-start"
          class="px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-500
                 focus:outline-none focus:ring-2 focus:ring-violet-300">Bắt đầu</button>
      </div>

      <!-- TIMER ở giữa + Đúng: X bên phải -->
      <div class="flex items-start justify-between">
        <div class="flex-1"></div>
        <div class="text-center">
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">Thời gian còn</div>
          <div id="ts-left" class="font-extrabold text-red-500 text-3xl md:text-4xl tracking-widest">--:--</div>
        </div>
        <div class="flex-1 flex justify-end text-sm text-slate-600 dark:text-slate-300 pt-2">
          Đúng: <span id="ts-correct" class="ml-1 font-semibold text-slate-900 dark:text-white">0</span>
        </div>
      </div>

      <!-- Ô trả lời: 1 dòng, rộng tối đa, cuộn ngang khi cần -->
      <div class="w-full mx-auto p-3 min-h-[68px]
                  border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
      <div id="ts-answer"
            class="w-full flex items-center justify-center gap-2 flex-nowrap overflow-x-auto"></div>
      </div>

      <!-- Hàng chữ nguồn -->
      <div id="ts-available" class="flex flex-wrap justify-center gap-3"></div>

      <p id="ts-footer" class="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">Bấm “Bắt đầu” để chơi.</p>
    </div>
  `;

  // expose handlers
  const startBtn = document.getElementById('ts-start');
  const dur = document.getElementById('ts-dur');
  document.getElementById('ts-suggest')?.remove(); // không còn từ bản trước
  // Nút hỗ trợ:
  // (giữ Hint định nghĩa & Gợi ý 1 ký tự)
  const btnRow = document.createElement('div');
  btnRow.className = "flex items-center justify-center gap-2";
  btnRow.innerHTML = `
    <button id="ts-hint-def"  class="px-3 py-1 rounded-lg border text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">Hint</button>
    <button id="ts-suggest"   class="px-3 py-1 rounded-lg border text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">Gợi ý</button>
    <button id="ts-show-ans"  class="px-3 py-1 rounded-lg text-sm border bg-amber-500/20 text-amber-800 border-amber-300 dark:bg-amber-400/20 dark:text-amber-200 dark:border-amber-400">Đáp án</button>
  `;
  document.getElementById('ts-content').insertBefore(btnRow, document.querySelector('#ts-content .w-full + #ts-available'));

  document.getElementById('ts-suggest').onclick = suggestOne;
  document.getElementById('ts-show-ans').onclick = revealAnswer;
  document.getElementById('ts-hint-def').onclick = ()=>{
    const box = document.getElementById('ts-hint-def-box');
    if (box) box.classList.toggle('hidden');
    ensureHints();
  };

  // vùng hint (ẩn mặc định)
  const hintHolder = document.createElement('div');
  hintHolder.id = 'ts-hint-def-box';
  hintHolder.className = 'hidden italic text-sm text-gray-500 dark:text-gray-400 text-center';
  hintHolder.innerHTML = `" <span id="ts-def" class="font-semibold"></span> "`;
  document.getElementById('ts-content').insertBefore(hintHolder, document.querySelector('#ts-content .w-full'));

  // render khung trống + khóa UI (trừ Start/Duration)
  state._tsRound = { letters: ['•','•','•','•'], chosen: [], helpCount: 0 };
  renderPool(); renderAnswer();
  lockControls(true);
  setCorrectText(); // hiển thị 0

  startBtn.onclick = () => {
    if (ticking) return;
    ticking = true; lockControls(false);
    startBtn.disabled = true; startBtn.classList.add('opacity-60','cursor-not-allowed');
    dur.disabled = true;

    // reset điểm hiển thị
    sessionCorrect = 0; setCorrectText();

    // tạo round thật & timer
    newRound();
    const total = parseInt(dur.value || '120', 10);
    startTimer(total);
  };
}
