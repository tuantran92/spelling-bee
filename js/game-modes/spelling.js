// js/game-modes/spelling.js
import { state, setState } from '../state.js';
import { updateWordLevel } from '../data.js';
import { playSound, levenshteinDistance, speak } from '../utils.js';

function getNextWord() {
  const list = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function startSpelling(containerId) {
  const container = document.getElementById(containerId);
  const newWord = getNextWord();
  if (!newWord) {
    container.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ nào để học. Hãy thêm từ mới trong tab "Từ vựng"!</p>`;
    return;
  }
  setState({ currentWord: newWord });

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Điền từ đúng</h2>
    <div class="relative">
      <p id="spelling-meaning" class="text-xl bg-gray-100 dark:bg-gray-700 p-4 rounded-lg vocab-font-size"></p>
      <button id="spelling-speak-btn" class="p-2 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white shadow-md absolute top-1/2 right-3 -translate-y-1/2" title="Nghe lại">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
      </button>
    </div>
    <div id="spelling-example" class="text-gray-500 dark:text-gray-400 italic my-4 h-5"></div>
    <input type="text" id="spelling-input"
      class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white vocab-font-size"
      placeholder="Nhập từ tiếng Anh.">
    <div class="mt-4">
      <button onclick="checkSpelling()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">Kiểm tra</button>
    </div>
    <p id="spelling-result" class="mt-4 h-6 text-lg font-medium"></p>
  `;

  document.getElementById('spelling-meaning').textContent = state.currentWord.meaning;
  document.getElementById('spelling-example').textContent = state.currentWord.example || '';
  document.getElementById('spelling-speak-btn').onclick = () => speak(state.currentWord.word);

  const inputEl = document.getElementById('spelling-input');
  inputEl.focus();
  inputEl.onkeydown = (e) => { if (e.key === 'Enter') checkSpelling(); };
  speak(newWord.word);
}

export function checkSpelling() {
  const userAnswer = document.getElementById('spelling-input').value.trim().toLowerCase();
  const resultEl = document.getElementById('spelling-result');
  if (!userAnswer) return;

  const correctAnswer = state.currentWord.word.toLowerCase();
  const isCorrect = userAnswer === correctAnswer;

  playSound(isCorrect ? 'correct' : 'wrong');
  updateWordLevel(state.currentWord, isCorrect);

  if (isCorrect) {
    resultEl.textContent = '✅ Chính xác!';
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
    setTimeout(() => startSpelling('spelling-screen-content'), 1500);
  } else {
    const distance = levenshteinDistance(userAnswer, correctAnswer);
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
    resultEl.textContent = distance <= 2 ? '🤔 Gần đúng rồi! Thử lại.' : `❌ Sai rồi! Đáp án: ${state.currentWord.word}`;
  }
}
