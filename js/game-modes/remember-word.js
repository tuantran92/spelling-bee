// js/game-modes/remember-word.js  (ES module)

import { state, setState } from '../state.js';
import { scrambleWord, shuffleArray, playSound } from '../utils.js';
import { updateWordLevel } from '../data.js';

// Lấy từ kế tiếp trong danh sách hiện tại (giống getNextWord gốc)
function pickNextWord() {
  const list = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// Vẽ câu hỏi “Nhớ từ mới”
function renderNextRememberWordQuestion(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Xóa nền cũ của khung game (nếu có)
  const gameContainer = container.closest('.game-container');
  if (gameContainer) {
    gameContainer.style.backgroundImage = '';
    gameContainer.classList.remove('bg-cover', 'bg-center');
  }

  const gameList = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
  if (gameList.length < 1) {
    container.innerHTML =
      '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-red-500">Không có từ vựng nào để chơi.</p>';
    return;
  }

  const correctWordObj = pickNextWord();
  if (!correctWordObj) {
    container.innerHTML =
      '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-red-500">Không thể lấy từ tiếp theo.</p>';
    return;
  }

  setState({ currentWord: correctWordObj });
  const correctAnswer = correctWordObj.word;

  // Tạo 4 lựa chọn: 1 đúng + 3 biến thể xáo trộn từ đúng (giữ nguyên theo bản gốc)
  const options = [correctAnswer];
  while (options.length < 4) {
    const shuffled = scrambleWord(correctAnswer);
    if (!options.includes(shuffled)) {
      options.push(shuffled);
    }
  }
  const shuffledOptions = shuffleArray(options);

  const hasImage = !!correctWordObj.imageUrl;
  const imageHtml = hasImage
    ? `<div class="w-full h-48 md:h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6 overflow-hidden">
         <img src="${correctWordObj.imageUrl}" alt="Hình minh họa cho ${correctWordObj.word}" class="w-full h-full object-cover">
       </div>`
    : '';

  container.innerHTML = `
      <h2 class="text-2xl font-semibold mb-4">Từ nào dưới đây có nghĩa là:</h2>

      ${imageHtml}

      <div class="text-center font-bold bg-gray-100 dark:bg-gray-700 py-4 px-6 rounded-lg mb-6">
        <p class="vocab-font-size-mcq">${correctWordObj.meaning}</p>
      </div>

      <div id="remember-word-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${shuffledOptions
          .map(
            (opt) => `
            <button onclick="checkRememberWord(this, '${opt === correctAnswer}')" 
                    class="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors vocab-font-size">
              ${opt}
            </button>`
          )
          .join('')}
      </div>
      <p id="remember-word-result" class="mt-6 h-6 text-lg font-medium"></p>
    `;
}

// API export
export function startRememberWord(containerId) {
  renderNextRememberWordQuestion(containerId);
}

export function checkRememberWord(clickedButton, isCorrectStr) {
  const isCorrect = isCorrectStr === 'true';
  const resultEl = document.getElementById('remember-word-result');
  const optionsContainer = document.getElementById('remember-word-options');

  playSound(isCorrect ? 'correct' : 'wrong');
  updateWordLevel(state.currentWord, isCorrect);

  optionsContainer.querySelectorAll('button').forEach((btn) => {
    btn.disabled = true;
    const btnIsCorrect = btn.textContent.trim() === state.currentWord.word;
    if (btnIsCorrect) {
      btn.className = 'bg-green-500 text-white font-semibold py-3 px-4 rounded-lg vocab-font-size';
    } else {
      btn.classList.add('opacity-50');
    }
  });

  if (isCorrect) {
    resultEl.textContent = '✅ Chính xác!';
    clickedButton.className = 'bg-green-500 text-white font-semibold py-3 px-4 rounded-lg vocab-font-size';
    setTimeout(() => renderNextRememberWordQuestion('remember-word-screen-content'), 1500);
  } else {
    resultEl.textContent = `❌ Sai rồi! Đáp án đúng là "${state.currentWord.word}"`;
    clickedButton.className =
      'bg-red-500 text-white font-semibold py-3 px-4 rounded-lg cursor-not-allowed vocab-font-size';
    setTimeout(() => renderNextRememberWordQuestion('remember-word-screen-content'), 2500);
  }
}
