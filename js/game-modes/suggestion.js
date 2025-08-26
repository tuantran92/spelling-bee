// js/game-modes/suggestion.js

import { state, setState } from '../state.js';
import { updateWordLevel, updateAndCacheSuggestions } from '../data.js';

// Nói giống cơ chế cũ (ưu tiên voice chọn trong #voice-select, tốc độ theo #rate-slider)
function speakWordLikeOriginal(text) {
  try {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const u = new SpeechSynthesisUtterance(text);
    const rateEl = document.getElementById('rate-slider');
    if (rateEl) u.rate = parseFloat(rateEl.value) || 1;

    const voiceSelect = document.getElementById('voice-select');
    const voices = synth.getVoices();
    if (voiceSelect && voiceSelect.value) {
      const v = voices.find(v => v.name === voiceSelect.value);
      if (v) u.voice = v;
    } else {
      const en = voices.find(v => /en|US|UK/i.test(v.lang));
      if (en) u.voice = en;
    }
    synth.speak(u);
  } catch {}
}

function renderSuggestionCard() {
  const { words, currentIndex } = state.suggestionSession || {};
  const container = document.getElementById('suggestion-screen-content');
  if (!container || !words || words.length === 0) return;

  const word = words[currentIndex];

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Ôn theo gợi ý</h2>

    <div class="p-5 bg-gray-100 dark:bg-gray-700 rounded-xl">
      <p class="text-2xl font-bold text-gray-900 dark:text-white vocab-font-size">${word.word}</p>
      ${word.phonetic ? `<p class="text-lg text-indigo-500 dark:text-indigo-400 font-mono mt-1">${word.phonetic}</p>` : ''}
      <p class="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-2">${word.meaning || ''}</p>
      ${word.definition ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-3 italic">"${word.definition}"</p>` : ''}
      ${word.example ? `<p class="text-sm text-gray-500 mt-2"><b>Ví dụ:</b> ${word.example}</p>` : ''}
    </div>

    <div class="mt-6">
      <button onclick="nextSuggestionWord()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg">
        Từ tiếp theo
      </button>
    </div>
  `;

  speakWordLikeOriginal(word.word);
}

export function startSuggestionMode(containerId) {
  const container = document.getElementById(containerId);
  const suggestions = state.suggestions;
  if (!container) return;

  // reset phiên
  setState({ suggestionSession: { isActive: false, words: [], currentIndex: 0, listType: null } });

  if (!suggestions.difficult.length && !suggestions.new.length) {
    container.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Gợi ý</h2><p>Không có gợi ý nào vào lúc này. Hãy học thêm để hệ thống có dữ liệu nhé!</p>`;
    return;
  }

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Học theo gợi ý</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
      <div>
        <div class="p-4 bg-red-50 dark:bg-red-900/40 rounded-lg h-full">
          <h4 class="font-bold text-red-800 dark:text-red-300 mb-2">Từ khó cần ôn lại</h4>
          ${
            suggestions.difficult.length
              ? `<ul class="space-y-1">
                  ${suggestions.difficult.map((w, i) => `
                    <li>
                      <button onclick="startSuggestionSession('difficult', ${i})"
                              class="w-full text-left p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md">
                        <p class="font-medium vocab-font-size">${w.word}</p>
                        ${w.phonetic ? `<p class="text-sm text-indigo-500 dark:text-indigo-400 font-mono">${w.phonetic}</p>` : ''}
                      </button>
                    </li>`).join('')}
                 </ul>`
              : '<p class="text-sm text-gray-500">Không có từ khó nào.</p>'
          }
        </div>
      </div>

      <div>
        <div class="p-4 bg-green-50 dark:bg-green-900/40 rounded-lg h-full">
          <h4 class="font-bold text-green-800 dark:text-green-300 mb-2">Từ mới nên học</h4>
          ${
            suggestions.new.length
              ? `<ul class="space-y-1">
                  ${suggestions.new.map((w, i) => `
                    <li>
                      <button onclick="startSuggestionSession('new', ${i})"
                              class="w-full text-left p-2 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md">
                        <p class="font-medium vocab-font-size">${w.word}</p>
                        ${w.phonetic ? `<p class="text-sm text-indigo-500 dark:text-indigo-400 font-mono">${w.phonetic}</p>` : ''}
                      </button>
                    </li>`).join('')}
                 </ul>`
              : '<p class="text-sm text-gray-500">Không có từ mới nào.</p>'
          }
        </div>
      </div>
    </div>
  `;
}

export function startSuggestionSession(listType, startIndex) {
  const words = listType === 'difficult' ? state.suggestions.difficult : state.suggestions.new;
  setState({
    suggestionSession: { isActive: true, words, currentIndex: startIndex, listType }
  });
  renderSuggestionCard();
}

export function nextSuggestionWord() {
  const { words, currentIndex, listType } = state.suggestionSession;
  const word = words[currentIndex];

  // cập nhật tiến trình học
  updateWordLevel(word, true);

  // nếu là nhóm "từ khó", reset wrongAttempts sau khi đã nhớ
  if (listType === 'difficult' && state.appData.progress[word.word]) {
    state.appData.progress[word.word].wrongAttempts = 0;
  }

  if (currentIndex + 1 < words.length) {
    setState({ suggestionSession: { ...state.suggestionSession, currentIndex: currentIndex + 1 } });
    renderSuggestionCard();
  } else {
    // refresh gợi ý & hiển thị hoàn thành
    updateAndCacheSuggestions();

    const container = document.getElementById('suggestion-screen-content');
    if (container) {
      container.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Hoàn thành!</h2>
        <p>Bạn đã học xong các từ được gợi ý. Rất tốt!</p>
        <button onclick="startSuggestionMode('suggestion-screen-content')"
                class="mt-6 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg">
          Quay lại danh sách
        </button>
      `;
    }

    setState({ suggestionSession: { isActive: false, words: [], currentIndex: 0, listType: null } });
  }
}

// expose to global for inline onclick (defensive)
if (typeof window !== 'undefined') {
  window.startSuggestionMode = startSuggestionMode;
  window.startSuggestionSession = startSuggestionSession;
  window.nextSuggestionWord = nextSuggestionWord;
}
