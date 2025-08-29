// js/ui/game-screen.js
import * as game from '../gameModes.js';
import * as exam from '../exam.js';
import { setState } from '../state.js';

export function showGameScreen(screenId) {
  const container = document.getElementById('game-screen-container');
  if (!container) return;

  const gameScreenEl = document.createElement('div');
  gameScreenEl.id = screenId;
  gameScreenEl.className = 'game-screen active';
  gameScreenEl.innerHTML = `
    <div class="game-container bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-4 md:p-6 relative text-center">
      <button onclick="closeGameScreen('${screenId}')" class="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-2 z-10">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
      <div id="${screenId}-content"></div>
    </div>
  `;
  container.appendChild(gameScreenEl);

  const init = {
    'suggestion-screen':   game.startSuggestionMode,
    'review-screen':       game.renderReviewCard,
    'spelling-screen':     game.startSpelling,
    'reading-screen':      game.startReading,
    'scramble-screen':     game.startScramble,
    'timed-scramble-screen': game.startTimedScramble,
    'mcq-screen':          game.startMcq,
    'listening-screen':    game.startListening,
    'exam-screen':         exam.setupExamScreen,
    'pronunciation-screen':game.startPronunciation,
    'fill-blank-screen':   game.startFillBlank,
    'remember-word-screen':game.startRememberWord,
    'word-match-screen':  game.startWordMatch,
    'hangman-screen':     game.startHangman,

  };
  if (init[screenId]) init[screenId](`${screenId}-content`);
}

export function closeGameScreen(screenId) {
  document.getElementById(screenId)?.remove();
  if (screenId === 'fill-blank-screen') {
    setState({ fillBlankSession: { isActive: false, words: [], currentIndex: 0 } });
  }
}
