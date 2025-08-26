// js/game-modes/mcq.js
// Trắc nghiệm – chọn nghĩa đúng cho từ (hoặc chọn từ đúng cho nghĩa)

import { state, setState } from '../state.js';
import { updateWordLevel } from '../data.js';
import { playSound, shuffleArray } from '../utils.js';

// timer để chuyển câu kế tiếp, giúp tránh race khi đổi màn
let MCQ_NEXT_TIMER = null;

function currentList() {
  return (state.filteredVocabList && state.filteredVocabList.length > 0)
    ? state.filteredVocabList
    : (state.vocabList || []);
}

function pickNextWord() {
  const list = currentList();
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// Tạo 4 lựa chọn: 1 đúng + 3 sai (không trùng)
function buildChoices(correctWord, mode = 'word-from-meaning') {
  const list = currentList().filter(w => w.word && w.word !== correctWord.word);
  const distractors = shuffleArray([...list]).slice(0, 3);

  if (mode === 'word-from-meaning') {
    // Hiện nghĩa, chọn từ Tiếng Anh
    const choices = shuffleArray([correctWord.word, ...distractors.map(d => d.word)]);
    return { prompt: correctWord.meaning || '(chưa có nghĩa)', choices, answer: correctWord.word, displayIsMeaning: true };
  } else {
    // Hiện từ, chọn nghĩa Tiếng Việt
    const choices = shuffleArray([correctWord.meaning, ...distractors.map(d => d.meaning || '(chưa có nghĩa)')]);
    return { prompt: correctWord.word, choices, answer: correctWord.meaning || '(chưa có nghĩa)', displayIsMeaning: false };
  }
}

function renderMcqScreen(container) {
  if (!container) return;
  const game = state.mcqGame;
  if (!game) return;

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-3">Trắc nghiệm</h2>
    <p class="text-gray-500 dark:text-gray-400 mb-4">${game.displayIsMeaning ? 'Chọn từ tiếng Anh đúng với nghĩa sau:' : 'Chọn nghĩa tiếng Việt đúng với từ sau:'}</p>

    <div class="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-4">
      <p id="mcq-prompt" class="text-xl font-semibold text-center">${game.prompt}</p>
    </div>

    <div id="mcq-choices" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>

    <div class="mt-4">
      <p id="mcq-result" class="h-6 text-lg font-medium"></p>
    </div>
  `;

  const choicesWrap = container.querySelector('#mcq-choices');
  choicesWrap.innerHTML = game.choices.map((c, i) => `
    <button
      data-index="${i}"
      class="mcq-choice bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-3 rounded-lg text-center transition">
      ${c}
    </button>
  `).join('');

  // Gắn sự kiện chọn đáp án
  choicesWrap.querySelectorAll('.mcq-choice').forEach(btn => {
    btn.onclick = () => {
      if (state.mcqGame.selectedIndex != null) return; // đã chọn rồi
      const idx = Number(btn.dataset.index);
      handleChoose(idx);
    };
  });
}

function handleChoose(index) {
  const container = document.getElementById('mcq-screen-content');
  if (!state.mcqGame || !container) return;

  setState({ mcqGame: { ...state.mcqGame, selectedIndex: index } });

  const { choices, answer, displayIsMeaning } = state.mcqGame;
  const chosen = choices[index];
  const correct = answer;

  const isCorrect = chosen === correct;
  playSound(isCorrect ? 'correct' : 'wrong');
  if (state.currentWord) updateWordLevel(state.currentWord, isCorrect);

  // Update UI
  const resultEl = container.querySelector('#mcq-result');
  if (isCorrect) {
    resultEl.textContent = '✅ Chính xác!';
    resultEl.className = 'h-6 text-lg font-medium text-green-500';
  } else {
    resultEl.textContent = `❌ Chưa đúng. Đáp án: ${correct}`;
    resultEl.className = 'h-6 text-lg font-medium text-red-500';
  }

  // Tô màu đáp án
  const buttons = container.querySelectorAll('.mcq-choice');
  buttons.forEach((b, i) => {
    b.classList.remove('hover:bg-violet-700');
    b.disabled = true;
    const txt = choices[i];
    if (txt === correct) {
      b.classList.remove('bg-violet-600');
      b.classList.add('bg-green-600');
    } else if (i === index) {
      b.classList.remove('bg-violet-600');
      b.classList.add('bg-red-600');
    } else {
      b.classList.add('opacity-70');
    }
  });

  // Clear timer cũ nếu có
  if (MCQ_NEXT_TIMER) {
    clearTimeout(MCQ_NEXT_TIMER);
    MCQ_NEXT_TIMER = null;
  }

  // Tự chuyển câu mới sau 1.2s (nếu vẫn đang ở màn MCQ)
  MCQ_NEXT_TIMER = setTimeout(() => {
    MCQ_NEXT_TIMER = null;
    const cont = document.getElementById('mcq-screen-content');
    const isHidden = cont && (cont.offsetParent === null || cont.classList?.contains('hidden'));
    if (!cont || isHidden) return;
    startMcq(cont);
  }, 1200);
}

// ====== PUBLIC API ======

export function startMcq(containerId) {
  const container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;

  if (!container) {
    console.debug('[MCQ] startMcq: container không tồn tại:', containerId);
    return;
  }

  const word = pickNextWord();
  if (!word) {
    container.innerHTML = `
      <h2 class="text-2xl font-semibold mb-4">Thông báo</h2>
      <p class="text-orange-500">Không có từ nào để học.</p>`;
    return;
  }

  setState({ currentWord: word });

  // Bạn có thể đổi mode tuỳ ý: 'word-from-meaning' (hiện nghĩa, chọn từ) hoặc 'meaning-from-word'
  const mode = 'word-from-meaning';
  const { prompt, choices, answer, displayIsMeaning } = buildChoices(word, mode);

  setState({
    mcqGame: {
      prompt, choices, answer, displayIsMeaning,
      selectedIndex: null
    }
  });

  renderMcqScreen(container);
}

export function checkMcq() {
  // Nếu bạn có nút “Kiểm tra” riêng, có thể gọi vào đây.
  // Ở bản này, chọn đáp án là chấm ngay nên không cần nút Check.
}
