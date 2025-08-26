// js/game-modes/listening.js
import { state, setState } from '../state.js';
import { updateWordLevel } from '../data.js';
import { playSound, shuffleArray, speak } from '../utils.js';

// local helper (tránh import vòng)
function getNextWord() {
  const list = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function startListening(containerId) {
  const container = document.getElementById(containerId);
  const newWord = getNextWord();
  if (!newWord) {
    container.innerHTML = '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ nào để học.</p>';
    return;
  }
  setState({ currentWord: newWord });

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Nghe và gõ lại</h2>
    <div class="my-6">
      <button id="listening-speak-btn" class="bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-full shadow-lg">
        <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
      </button>
    </div>
    <input type="text" id="listening-input"
      class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-gray-700 vocab-font-size"
      placeholder="Nhập từ bạn nghe được.">
    <div class="mt-4">
      <button onclick="checkListening()" class="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-lg">Kiểm tra</button>
    </div>
    <p id="listening-result" class="mt-4 h-6 text-lg font-medium"></p>
  `;

  document.getElementById('listening-speak-btn').onclick = () => speak(state.currentWord.word);
  const inputEl = document.getElementById('listening-input');
  inputEl.focus();
  inputEl.onkeydown = (e) => { if (e.key === 'Enter') checkListening(); };
  speak(state.currentWord.word);
}

export function checkListening() {
  const userAnswer = document.getElementById('listening-input').value.trim().toLowerCase();
  const resultEl = document.getElementById('listening-result');
  if (!userAnswer) return;

  const correctAnswer = state.currentWord.word.toLowerCase();
  const isCorrect = userAnswer === correctAnswer;

  playSound(isCorrect ? 'correct' : 'wrong');
  updateWordLevel(state.currentWord, isCorrect);

  if (isCorrect) {
    resultEl.textContent = '✅ Chính xác!';
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
    setTimeout(() => startListening('listening-screen-content'), 1500);
  } else {
    resultEl.textContent = `❌ Sai rồi! Đáp án: "${state.currentWord.word}"`;
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
  }
}
