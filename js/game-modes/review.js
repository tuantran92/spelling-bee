// js/game-modes/review.js

import { state, setState } from '../state.js';
import { getReviewableWords, updateWordLevel } from '../data.js';
import { closeGameScreen } from '../ui.js';
import { playSound } from '../utils.js';

export function startReview(containerId) {
  const words = getReviewableWords();
  const screenEl = document.getElementById(containerId);
  if (!screenEl) return;

  if (!words.length) {
    screenEl.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Tuyệt vời!</h2><p>Bạn đã ôn hết các từ cần học trong hôm nay. 🎉</p>`;
    return;
  }

  setState({ reviewSession: { isActive: true, words, currentIndex: 0 } });
  renderReviewCard(containerId);
}

export function renderReviewCard(containerId) {
  const screenEl = document.getElementById(containerId);
  if (!screenEl) return;

  const { words, currentIndex } = state.reviewSession || {};
  if (!words || !words.length || currentIndex >= words.length) {
    finishReviewSession();
    return;
  }
  const word = words[currentIndex];

  screenEl.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Ôn tập Thông minh</h2>

    <div id="review-image-container"
         class="w-full h-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden ${word.imageUrl ? '' : 'hidden'}">
      <img id="review-image" src="${word.imageUrl || ''}" class="w-full h-full object-contain" alt="Vocabulary Image">
    </div>

    <div class="relative w-full h-56 md:h-64">
      <div id="review-card" class="absolute w-full h-full bg-cyan-600 rounded-xl flex flex-col items-center justify-center p-4 shadow-lg">
        <div class="text-center">
          <p class="font-bold text-white vocab-font-size-review">${word.word}</p>
          ${word.phonetic ? `<p class="text-lg text-cyan-100 font-mono mt-1">${word.phonetic}</p>` : ''}
          <p class="text-xl md:text-2xl text-cyan-200 mt-2 vocab-font-size">- ${word.meaning} -</p>
        </div>
        <button onclick="speakWord('${word.word}', event)" class="mt-4 bg-white/20 hover:bg-white/30 p-3 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      </div>
    </div>

    <div id="review-controls" class="mt-6 flex flex-col items-center gap-4">
      <p class="text-gray-500 dark:text-gray-400">Bạn có nhớ từ này không?</p>
      <div class="flex gap-4">
        <button onclick="handleReviewAnswer(false)" class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg shadow-md">Không nhớ</button>
        <button onclick="handleReviewAnswer(true)"  class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-md">Nhớ</button>
      </div>
      <p id="review-card-counter" class="text-gray-700 dark:text-gray-300 font-medium">${currentIndex + 1} / ${words.length}</p>
    </div>
  `;
}

export function handleReviewAnswer(isCorrect) {
  const { words, currentIndex } = state.reviewSession;
  const word = words[currentIndex];

  playSound(isCorrect ? 'correct' : 'wrong');
  updateWordLevel(word, isCorrect);

  // tránh double-click trong lúc chuyển câu
  const controls = document.getElementById('review-controls');
  if (controls) {
    controls.querySelectorAll('button').forEach(btn => btn.disabled = true);
    controls.style.opacity = '0.5';
  }

  setTimeout(() => {
    if (currentIndex + 1 < words.length) {
      setState({ reviewSession: { ...state.reviewSession, currentIndex: currentIndex + 1 } });
      renderReviewCard('review-screen-content');
    } else {
      finishReviewSession();
    }
  }, 1000);
}

function finishReviewSession() {
  setState({ reviewSession: { isActive: false, words: [], currentIndex: 0 } });
  alert("Hoàn thành! Bạn đã ôn tập xong các từ cho hôm nay.");
  closeGameScreen('review-screen');
}
