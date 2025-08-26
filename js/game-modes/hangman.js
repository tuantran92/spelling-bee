// js/game-modes/hangman.js
// Hangman – đoán chữ cái. Thêm hiệu ứng vui khi đoán sai.

import { state, setState } from '../state.js';
import { shuffleArray, playSound, speak } from '../utils.js';
import { updateWordLevel } from '../data.js';

function currentList() {
  const list = (state.filteredVocabList && state.filteredVocabList.length > 0)
    ? state.filteredVocabList
    : (state.vocabList || []);
  return list.filter(x => x && x.word);
}

function pickWord() {
  const list = currentList();
  if (!list.length) return null;
  return shuffleArray([...list])[0];
}

function maskedWord(word, guessedSet) {
  return word.split('').map(ch => {
    if (!/[a-z]/i.test(ch)) return ch;
    return guessedSet.has(ch.toLowerCase()) ? ch : '_';
  }).join(' ');
}

function renderKeyboard(containerId) {
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const wrap = document.getElementById('hangman-keys');
  if (!wrap) return;
  wrap.innerHTML = keys.map(k => `
    <button class="hm-key bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500
                   text-gray-900 dark:text-gray-100 font-bold py-2 px-3 rounded"
            data-k="${k}">${k}</button>
  `).join('');

  wrap.querySelectorAll('.hm-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-k');
      hangmanGuess(k, containerId);
    });
  });
}

// ------- FX helpers -------
function renderLives(wrong, maxWrong) {
  const lives = document.getElementById('hm-lives');
  if (!lives) return;
  let html = '';
  for (let i = 0; i < maxWrong; i++) {
    const filled = i < wrong;
    html += `<span class="inline-block w-2.5 h-2.5 rounded-full ${filled ? 'bg-rose-500' : 'bg-gray-400 dark:bg-gray-500'}"></span>`;
  }
  lives.innerHTML = html;

  const text = document.getElementById('hm-lives-text');
  if (text) text.textContent = `Sai: ${wrong}/${maxWrong}`;

  // Pop chấm mới vừa mất
  const dot = lives.children[wrong - 1];
  if (dot) {
    dot.classList.add('hm-pop');
    dot.addEventListener('animationend', () => dot.classList.remove('hm-pop'), { once: true });
  }
}

function spawnParticlesFrom(el, icons = ['❌','💥','⚡']) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 10;

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'hm-particle';
    span.textContent = icons[i % icons.length];
    span.style.left = `${cx}px`;
    span.style.top = `${cy}px`;

    // random quỹ đạo
    const dx = (Math.random() * 160 - 80).toFixed(0);     // -80..80
    const dy = (Math.random() * -140 - 40).toFixed(0);    // -40..-180
    span.style.setProperty('--dx', `${dx}px`);
    span.style.setProperty('--dy', `${dy}px`);

    document.body.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }
}

function triggerWrongFX(letter, newWrong) {
  const root = document.getElementById('hm-root');
  const panel = document.getElementById('hm-word-panel');
  const keyBtn = document.querySelector(`.hm-key[data-k="${letter.toUpperCase()}"]`);

  // Flash đỏ toàn board
  if (root) {
    root.classList.add('hm-flash');
    setTimeout(() => root.classList.remove('hm-flash'), 250);
  }

  // Rung ô chữ
  if (panel) {
    panel.classList.add('hm-shake');
    panel.addEventListener('animationend', () => panel.classList.remove('hm-shake'), { once: true });
  }

  // Particle burst từ phím
  if (keyBtn) spawnParticlesFrom(keyBtn);

  // Rung nhẹ thiết bị
  if (navigator.vibrate) { try { navigator.vibrate(80); } catch(_){} }
}

// (nhẹ nhàng) FX khi đúng
function triggerCorrectFX(letter) {
  const keyBtn = document.querySelector(`.hm-key[data-k="${letter.toUpperCase()}"]`);
  if (!keyBtn) return;
  keyBtn.classList.add('hm-pop');
  keyBtn.addEventListener('animationend', () => keyBtn.classList.remove('hm-pop'), { once: true });
}

// ------- Public API -------
export function startHangman(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pick = pickWord();
  if (!pick) {
    container.innerHTML = `<h2 class="text-2xl font-semibold mb-2">Đoán chữ (Hangman)</h2>
      <p class="text-orange-500">Không có dữ liệu từ vựng.</p>`;
    return;
  }
  setState({
    hangman: {
      wordObj: pick,
      word: (pick.word || '').toLowerCase(),
      guessed: new Set(),
      wrong: 0,
      maxWrong: 3,
      hintShown: false
    }
  });

  container.innerHTML = `
    <div id="hm-root" class="relative">
      <h2 class="text-2xl font-semibold mb-2">Đoán chữ (Hangman)</h2>

      <div id="hm-word-panel" class="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-3">
        <p id="hangman-word" class="text-3xl font-bold tracking-widest text-center vocab-font-size"></p>
      </div>

      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div id="hm-lives" class="flex items-center gap-1"></div>
          <span id="hm-lives-text" class="text-sm text-gray-500 dark:text-gray-400"></span>
        </div>
        <div class="flex items-center gap-2">
          <button id="hm-speak" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">🔊 Nghe từ</button>
          <button id="hm-hint"  class="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 font-bold py-2 px-4 rounded">💡 Gợi ý</button>
        </div>
      </div>

      <p id="hm-meaning" class="mb-2 text-center text-cyan-500 hidden"></p>

      <div id="hangman-keys" class="mt-1 grid grid-cols-10 gap-2"></div>

      <div class="mt-4 flex items-center justify-between">
        <p id="hm-result" class="h-6 text-lg font-medium"></p>
        <button id="hm-next" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded hidden">Từ khác</button>
      </div>
    </div>
  `;

  document.getElementById('hangman-word').textContent =
    maskedWord(state.hangman.word, state.hangman.guessed);
  renderKeyboard(containerId);
  renderLives(0, state.hangman.maxWrong);

  document.getElementById('hm-speak')?.addEventListener('click', () => {
    speak(state.hangman.wordObj.word, 'en-US');
  });
  document.getElementById('hm-hint')?.addEventListener('click', () => {
    const m = document.getElementById('hm-meaning');
    if (!state.hangman.hintShown) {
      m.textContent = `Nghĩa: ${state.hangman.wordObj.meaning || '(chưa có nghĩa)'}`;
      m.classList.remove('hidden');
      setState({ hangman: { ...state.hangman, hintShown: true } });
    } else {
      m.classList.add('hidden');
      setState({ hangman: { ...state.hangman, hintShown: false } });
    }
  });
  document.getElementById('hm-next')?.addEventListener('click', () => startHangman(containerId));

  speak(state.hangman.wordObj.word, 'en-US');
}

export function hangmanGuess(letter, containerId) {
  letter = String(letter || '').toLowerCase();
  if (!state.hangman || !/[a-z]/.test(letter)) return;

  const { word, guessed, wrong, maxWrong } = state.hangman;
  if (guessed.has(letter)) return;

  const newGuessed = new Set(guessed);
  newGuessed.add(letter);

  let newWrong = wrong;
  if (!word.includes(letter)) {
    newWrong += 1;
    playSound('wrong');
    setState({ hangman: { ...state.hangman, guessed: newGuessed, wrong: newWrong } });
    document.getElementById('hangman-word').textContent = maskedWord(word, newGuessed);
    renderLives(newWrong, maxWrong);
    const keyBtn = document.querySelector(`.hm-key[data-k="${letter.toUpperCase()}"]`);
    if (keyBtn) {
      keyBtn.disabled = true;
      keyBtn.classList.add('bg-red-500','text-white');
    }
    triggerWrongFX(letter, newWrong);
  } else {
    playSound('correct');
    setState({ hangman: { ...state.hangman, guessed: newGuessed, wrong: newWrong } });
    document.getElementById('hangman-word').textContent = maskedWord(word, newGuessed);
    const keyBtn = document.querySelector(`.hm-key[data-k="${letter.toUpperCase()}"]`);
    if (keyBtn) {
      keyBtn.disabled = true;
      keyBtn.classList.add('bg-green-500','text-white');
    }
    triggerCorrectFX(letter);
  }

  const solved = word.split('').every(ch => !/[a-z]/i.test(ch) || newGuessed.has(ch));
  const lose = newWrong >= maxWrong;

  if (solved || lose) {
    document.querySelectorAll('.hm-key').forEach(b => b.disabled = true);
    const result = document.getElementById('hm-result');
    const nextBtn = document.getElementById('hm-next');
    if (solved) {
      result.textContent = '🎉 Chính xác!';
      result.className = 'h-6 text-lg font-medium text-green-500';
      updateWordLevel(state.hangman.wordObj, true);
    } else {
      result.textContent = `💀 Thua rồi! Đáp án: ${state.hangman.wordObj.word}`;
      result.className = 'h-6 text-lg font-medium text-red-500';
      updateWordLevel(state.hangman.wordObj, false);
    }
    nextBtn?.classList.remove('hidden');
  }
}

// Global (nếu HTML gọi trực tiếp)
if (typeof window !== 'undefined') {
  window.startHangman = startHangman;
  window.hangmanGuess = hangmanGuess;
}
