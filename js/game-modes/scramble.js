// js/game-modes/scramble.js  (ES module)

import { state, setState } from '../state.js';
import { scrambleWord, playSound, speak } from '../utils.js'; // ⬅️ thêm speak
import { updateWordLevel, fetchWordData } from '../data.js';

// timer cho lần load lại kế tiếp
let SCRAMBLE_NEXT_TIMER = null;

// Lấy từ tiếp theo từ danh sách hiện tại
function pickNextWord() {
  const list = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// Vẽ 2 hàng chữ cái: hàng chọn & hàng trả lời
function renderScrambleLetters() {
  const availableContainer = document.getElementById('scramble-available-container');
  const answerContainer = document.getElementById('scramble-answer-display');
  if (!availableContainer || !answerContainer) return;

  const { available, answer } = state.scrambleGame || { available: [], answer: [] };

  // Hàng dưới: nếu used => render ô trống cùng kích thước
  availableContainer.innerHTML = available.map(letter => {
    if (letter.used) {
      return `
        <div class="w-10 h-10 md:w-12 md:h-12 rounded-lg border-2 border-dashed 
                    border-gray-300 dark:border-gray-600"></div>
      `;
    }
    return `
      <button
        onclick="handleScrambleLetterClick(${letter.id})"
        class="bg-violet-600 hover:bg-violet-700 text-white text-2xl font-bold w-10 h-10 md:w-12 md:h-12
               flex items-center justify-center rounded-lg shadow-md vocab-font-size transition-all duration-150 hover:scale-110">
        ${letter.char}
      </button>
    `;
  }).join('');

  // Ô trả lời phía trên
  answerContainer.innerHTML = answer.map(letter => `
    <button
      onclick="handleAnswerLetterClick(${letter.id})"
      class="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100 text-2xl font-bold
             w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg shadow-md vocab-font-size
             transition-all duration-150 hover:scale-110">
      ${letter.char}
    </button>
  `).join('');
}

// ====== API xuất ra cho game ======

export function startScramble(containerId) {
  // Cho phép truyền id hoặc element
  const container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;

  // 🔒 Guard: nếu không tìm thấy container thì thoát êm (tránh lỗi null.innerHTML)
  if (!container) {
    console.debug('[Scramble] startScramble: container không tồn tại:', containerId);
    return;
  }

  const newWord = pickNextWord();
  if (!newWord || newWord.word.length < 2) {
    container.innerHTML = '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ phù hợp cho chế độ này.</p>';
    return;
  }

  setState({ currentWord: newWord });

  const scrambled = scrambleWord(state.currentWord.word);
  setState({
    scrambleGame: {
      // giữ vị trí gốc + cờ used để hiện ô trống
      available: scrambled.split('').map((char, index) => ({ char, id: index, used: false })),
      answer: []
    }
  });

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-2">Sắp xếp các chữ cái:</h2>

    <div class="h-auto flex flex-col items-center justify-center mb-4 gap-2">
      <div>
        <button id="scramble-hint-definition-btn" onclick="toggleScrambleHint('definition')"
          class="bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-md text-sm font-semibold">Hint</button>
        <button id="scramble-hint-meaning-btn" onclick="toggleScrambleHint('meaning')"
          class="ml-2 bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-md text-sm font-semibold">Gợi ý</button>
        <button onclick="showScrambleAnswer()"
          class="ml-2 bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white px-3 py-1 rounded-md text-sm font-semibold">Đáp án</button>
      </div>
      <div id="scramble-hint-container" class="mt-2 text-center h-auto min-h-[2rem]">
        <span id="scramble-hint-definition" class="hidden italic text-sm text-gray-500 dark:text-gray-400">
          "<span id="scramble-definition-content" class="font-semibold"></span>"
        </span>
        <span id="scramble-hint-meaning" class="hidden italic text-sm text-gray-500 dark:text-gray-400">
          Nghĩa: "<span id="scramble-meaning-content" class="font-semibold"></span>"
        </span>
      </div>
    </div>

    <div id="scramble-answer-container"
         class="w-full max-w-md mx-auto p-3 flex items-center justify-between min-h-[68px]
                border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mb-4">
      <div id="scramble-answer-display" class="flex justify-center items-center gap-2 flex-wrap"></div>
      <button title="Xóa lùi" onclick="handleScrambleBackspace()"
              class="ml-2 shrink-0 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500
                     text-gray-700 dark:text-gray-200 p-2 rounded-md">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.172 12.707l5.12 5.12A4 4 0 0011.121 19H19a2 2 0 002-2V7a2 2 0 00-2-2h-7.879a4 4 0 00-2.829 1.172l-5.12 5.12a1 1 0 000 1.415zM13.293 8.293a1 1 0 011.414 0L16 9.586l1.293-1.293a1 1 0 111.414 1.414L17.414 11l1.293 1.293a1 1 0 01-1.414 1.414L16 12.414l-1.293 1.293a1 1 0 01-1.414-1.414L14.586 11l-1.293-1.293a1 1 0 010-1.414z"/>
        </svg>
      </button>
    </div>

    <div id="scramble-available-container" class="flex flex-wrap justify-center gap-2"></div>

    <div class="mt-4">
      <button onclick="checkScramble()"
              class="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg">
        Kiểm tra
      </button>
    </div>
  `;

  renderScrambleLetters();
  void ensureHints();
}


export function checkScramble() {
  const resultElId = 'scramble-result';
  let resultEl = document.getElementById(resultElId);
  if (!resultEl) {
    const el = document.createElement('p');
    el.id = resultElId;
    el.className = 'mt-4 h-6 text-lg font-medium';
    document.getElementById('scramble-available-container')?.after(el);
  }
  resultEl = document.getElementById(resultElId);

  const { answer } = state.scrambleGame;
  const userAnswer = answer.map(l => l.char).join('').toLowerCase();
  const correct = state.currentWord?.word?.toLowerCase() || '';

  const isCorrect = userAnswer === correct;
  playSound(isCorrect ? 'correct' : 'wrong');
  updateWordLevel(state.currentWord, isCorrect);

  // 🔒 Clear timer cũ (nếu có) để tránh đua
  if (SCRAMBLE_NEXT_TIMER) {
    clearTimeout(SCRAMBLE_NEXT_TIMER);
    SCRAMBLE_NEXT_TIMER = null;
  }

  // Ẩn/hiện nút Tiếp tục
  let nextBtn = document.getElementById('scramble-next-btn');
  if (!nextBtn) {
    nextBtn = document.createElement('button');
    nextBtn.id = 'scramble-next-btn';
    nextBtn.textContent = 'Tiếp tục';
    nextBtn.className = 'mt-3 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg hidden';
    resultEl.after(nextBtn);
  }

  if (isCorrect) {
    resultEl.textContent = '✅ Chính xác!';
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';

    // 🔊 Đọc to từ vựng vừa sắp xếp đúng
    try { speak(state.currentWord.word, 'en-US'); } catch (e) {}

    // Hiện nút "Tiếp tục" (không tự chuyển nữa)
    nextBtn.classList.remove('hidden');
    nextBtn.disabled = false;
    nextBtn.onclick = () => {
      const container = document.getElementById('scramble-screen-content');
      if (!container) return;
      nextBtn.classList.add('hidden'); // ẩn để chuẩn bị câu mới
      startScramble(container);
    };

  } else {
    resultEl.textContent = `❌ Sai rồi! Đáp án: ${state.currentWord.word}`;
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';

    // Ẩn nút "Tiếp tục" khi sai
    nextBtn.classList.add('hidden');

    // Tự chuyển sau 1.2s như cũ
    SCRAMBLE_NEXT_TIMER = setTimeout(() => {
      SCRAMBLE_NEXT_TIMER = null;
      const container = document.getElementById('scramble-screen-content');
      const isHidden = container && (container.offsetParent === null || container.classList?.contains('hidden'));
      if (!container || isHidden) return;
      startScramble(container);
    }, 1200);
  }
}


// Bấm 1 chữ ở hàng dưới => chuyển sang ô trả lời (mất chỗ, để lại ô trống)
export function handleScrambleLetterClick(id) {
  const { available, answer } = state.scrambleGame;
  const slot = available.find(l => l.id === id);
  if (!slot || slot.used) return;
  slot.used = true;
  answer.push({ char: slot.char, id: slot.id });
  renderScrambleLetters();
}


// Bấm chữ trong ô trả lời => hoàn lại đúng vị trí cũ
export function handleAnswerLetterClick(id) {
  const { available, answer } = state.scrambleGame;
  const idx = answer.findIndex(l => l.id === id);
  if (idx === -1) return;
  answer.splice(idx, 1);
  const slot = available.find(l => l.id === id);
  if (slot) slot.used = false;
  renderScrambleLetters();
}


export function handleScrambleBackspace() {
  const { answer } = state.scrambleGame;
  if (answer.length > 0) {
    const last = answer[answer.length - 1];
    handleAnswerLetterClick(last.id);
  }
}


export async function toggleScrambleHint(which) {
  const defEl = document.getElementById('scramble-hint-definition');
  const meaEl = document.getElementById('scramble-hint-meaning');
  if (!defEl || !meaEl) return;

  if (which === 'definition') {
    defEl.classList.toggle('hidden');
    meaEl.classList.add('hidden');
  } else {
    meaEl.classList.toggle('hidden');
    defEl.classList.add('hidden');
  }

  await ensureHints();
}

export function showScrambleAnswer() {
  const word = state.currentWord?.word || '';
  const letters = word.split('').map((char, index) => ({ char, id: index }));
  const available = letters.map(({ char, id }) => ({ char, id, used: true }));
  setState({ scrambleGame: { available, answer: letters } });
  renderScrambleLetters();
}


// Tải nghĩa/định nghĩa nếu chưa có
async function ensureHints() {
  const wordObj = state.currentWord;
  if (!wordObj) return;

  if (!wordObj.definition || !wordObj.meaning) {
    try {
      const fresh = await fetchWordData(wordObj.word);
      if (fresh) {
        setState({ currentWord: { ...wordObj, ...fresh } });
      }
    } catch (e) {
      // im lặng nếu lỗi
      console.warn('fetchWordData error:', e);
    }
  }

  const def = document.getElementById('scramble-definition-content');
  const mea = document.getElementById('scramble-meaning-content');
  if (def) def.textContent = state.currentWord.definition || '(chưa có định nghĩa)';
  if (mea) mea.textContent = state.currentWord.meaning || '(chưa có nghĩa)';
}
