// js/game-modes/pronunciation.js
import { state, setState } from '../state.js';
import { updateWordLevel } from '../data.js';
import { playSound, speak } from '../utils.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

function getNextWord() {
  const list = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function startPronunciation(containerId) {
  const container = document.getElementById(containerId);
  if (!SpeechRecognition) {
    container.innerHTML = `<h2 class="text-xl font-semibold text-red-500">Lỗi Tương Thích</h2><p class="mt-2">Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói. Vui lòng dùng Chrome hoặc Edge mới nhất.</p>`;
    return;
  }
  const newWord = getNextWord();
  if (!newWord) {
    container.innerHTML = `<h2 class="text-xl font-semibold">Thông báo</h2><p class="mt-2 text-orange-500">Không có từ phù hợp.</p>`;
    return;
  }
  setState({ currentWord: newWord });

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Luyện Phát Âm</h2>
    <p class="mb-6">Đọc to từ sau đây:</p>
    <div class="text-center mb-6">
      <p id="pronunciation-word" class="font-bold text-pink-500 vocab-font-size-pronunciation">${newWord.word}</p>
      ${newWord.phonetic ? `<p class="text-lg text-pink-400 font-mono mt-1">${newWord.phonetic}</p>` : ''}
    </div>
    <div class="flex items-center justify-center gap-3">
      <button onclick="listenForPronunciation()" class="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg">Bắt đầu nói</button>
      <button onclick="speak('${newWord.word}')" class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-3 rounded-full" title="Nghe mẫu">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
      </button>
    </div>
    <p id="pronunciation-result" class="mt-4 h-6 text-lg font-medium"></p>
  `;
}

export function listenForPronunciation() {
  if (!SpeechRecognition) return;

  if (recognition) recognition.stop();
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const resultEl = document.getElementById('pronunciation-result');
  resultEl.textContent = '🎤 Đang nghe...';
  resultEl.className = 'mt-4 h-6 text-lg font-medium text-gray-500';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim();
    const isCorrect = transcript === state.currentWord.word.toLowerCase();

    playSound(isCorrect ? 'correct' : 'wrong');
    updateWordLevel(state.currentWord, isCorrect);

    if (isCorrect) {
      resultEl.textContent = `✅ Chuẩn! Bạn nói: "${transcript}"`;
      resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
      setTimeout(() => startPronunciation('pronunciation-screen-content'), 1500);
    } else {
      resultEl.textContent = `❌ Chưa đúng. Bạn nói: "${transcript}". Đáp án: "${state.currentWord.word}"`;
      resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
    }
  };

  recognition.onerror = () => {
    resultEl.textContent = '⚠️ Không nhận được âm thanh, thử lại nhé.';
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-yellow-500';
  };

  recognition.start();
}
