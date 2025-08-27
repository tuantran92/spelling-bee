// js/game-modes/reading.js
// Flashcard mode – ESM, không dùng onclick inline ngoài các nút Nhớ/Không nhớ (để tương thích HTML cũ)

import { state, setState } from '../state.js';
import { updateWordLevel } from '../data.js';
import { speak, playSound, shuffleArray } from '../utils.js';
import { openEtymologyPopup } from '../services/etymology.js'; // ⬅️ NEW

function currentList() {
  return (state.filteredVocabList && state.filteredVocabList.length > 0)
    ? state.filteredVocabList
    : (state.vocabList || []);
}

export function startReading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const list = (state.filteredVocabList && state.filteredVocabList.length > 0)
    ? state.filteredVocabList
    : (state.vocabList || []);

  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = `
      <h2 class="text-2xl font-semibold mb-4">Thông báo</h2>
      <p class="text-orange-500">Không có từ nào để học trong bộ lọc hiện tại.</p>`;
    return;
  }

  const flashcardList = (typeof shuffleArray === 'function') ? shuffleArray([...list]) : [...list];
  setState({ flashcardList, currentFlashcardIndex: 0 });

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Flashcard</h2>

    <div id="flashcard-container"
         class="w-full h-[60vh] max-h-[500px] rounded-2xl shadow-lg relative overflow-hidden
                flex flex-col justify-end cursor-pointer group transition-all duration-300
                bg-gray-800">

      <!-- ACTIONS TOP-RIGHT: 📜 Gốc từ -->
      <div class="absolute top-3 right-3 z-20 flex gap-2">
        <button id="flashcard-etymology-btn"
                class="backdrop-blur bg-black/50 hover:bg-black/60 text-white text-sm font-semibold
                       px-3 py-1.5 rounded-full shadow">
          📜 Gốc từ
          <span class="ml-1 opacity-70">(E)</span>
        </button>
      </div>

      <!-- Overlay gradient khi mở nghĩa -->
      <div id="flashcard-overlay"
           class="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t
                  from-black/40 via-black/20 to-transparent
                  opacity-0 pointer-events-none transition-opacity duration-300"
           style="display:none"></div>

      <div id="flashcard-text-content" class="relative p-4 md:p-6 text-white z-10 w-full">
        <div class="flex items-center gap-3">
          <p id="flashcard-word" class="font-bold text-4xl md:text-5xl"></p>
          <button id="flashcard-speak-btn"
                  class="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white"
                  title="Nghe phát âm (EN)">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
            </svg>
          </button>
        </div>

        <p id="flashcard-phonetic" class="text-lg text-white/70 font-mono mt-1"></p>

        <!-- Khu nghĩa/định nghĩa/ví dụ – ẩn mặc định, click thẻ để mở -->
        <div id="flashcard-details" class="transition-all duration-500 max-h-0 overflow-hidden">
          <hr class="border-gray-500 my-3">
          <div class="flex items-center gap-3">
            <p id="flashcard-meaning" class="text-2xl font-semibold mt-2 text-cyan-300"></p>
            <button id="flashcard-speak-meaning-btn"
                    class="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white mt-2"
                    title="Đọc tiếng Việt">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
              </svg>
            </button>
          </div>

          <p id="flashcard-definition" class="text-sm italic mt-2"></p>
          <p id="flashcard-example" class="text-sm italic mt-2"></p>
        </div>
      </div>
    </div>

    <div class="mt-6 flex items-center justify-between">
      <button onclick="handleFlashcardAnswer(false)" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg">Chưa nhớ</button>
      <span id="flashcard-counter" class="text-gray-500 dark:text-gray-400"></span>
      <button onclick="handleFlashcardAnswer(true)" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">Đã nhớ</button>
    </div>
  `;

  // bắt phím tắt cho Flashcard (E = Etymology)
  addReadingKeyListener();
  updateFlashcard();
}


/** cập nhật nội dung thẻ hiện tại */
function updateFlashcard() {
  const { flashcardList = [], currentFlashcardIndex = 0 } = state;
  const container = document.getElementById('reading-screen-content');
  const cardContainer = document.getElementById('flashcard-container');
  if (!container || !cardContainer) return;

  if (flashcardList.length === 0) {
    container.innerHTML = `
      <h2 class="text-2xl font-semibold mb-4">Thông báo</h2>
      <p class="text-orange-500">Không có từ nào để học.</p>`;
    return;
  }

  if (currentFlashcardIndex >= flashcardList.length) {
    container.innerHTML = `
      <h2 class="text-2xl font-semibold mb-4">Hoàn thành!</h2>
      <p>Bạn đã học xong hết các thẻ.</p>
      <button onclick="startReading('reading-screen-content')"
              class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Học lại</button>`;
    return;
  }

  const word = flashcardList[currentFlashcardIndex];
  setState({ currentWord: word });

  const txt = document.getElementById('flashcard-text-content');
  const overlayEl = document.getElementById('flashcard-overlay');
  const detailsEl = document.getElementById('flashcard-details');

  // reset hiển thị – ẩn nghĩa, ẩn overlay
  detailsEl.style.maxHeight = '0px';
  if (overlayEl) {
    overlayEl.classList.add('opacity-0');
    overlayEl.style.display = 'none';
  }

  // ảnh nền
  if (word.imageUrl) {
    cardContainer.style.backgroundImage = `url('${word.imageUrl}')`;
    cardContainer.style.backgroundSize = 'cover';
    cardContainer.style.backgroundPosition = 'center';
    cardContainer.style.backgroundColor = '';
    txt.classList.remove('items-center', 'text-center');
  } else {
    cardContainer.style.backgroundImage = 'none';
    cardContainer.style.backgroundColor = '#374151';
    txt.classList.add('items-center', 'text-center');
  }

  // nội dung
  const wordEl = document.getElementById('flashcard-word');
  const phoEl  = document.getElementById('flashcard-phonetic');
  const meaEl  = document.getElementById('flashcard-meaning');
  const defEl  = document.getElementById('flashcard-definition');
  const exEl   = document.getElementById('flashcard-example');
  const cntEl  = document.getElementById('flashcard-counter');

  wordEl.textContent = word.word || '';
  phoEl.textContent  = word.phonetic || '';
  meaEl.textContent  = word.meaning || '';
  defEl.textContent  = word.definition ? `"${word.definition}"` : '';
  exEl.textContent   = word.example ? `Vd: ${word.example}` : '';
  cntEl.textContent  = `${currentFlashcardIndex + 1} / ${flashcardList.length}`;

  // đọc EN
  const speakBtn = document.getElementById('flashcard-speak-btn');
  if (speakBtn) speakBtn.onclick = (e) => { e.stopPropagation(); speak(word.word, 'en-US'); };

  // 📜 Gốc từ
  const etyBtn = document.getElementById('flashcard-etymology-btn');
  if (etyBtn) etyBtn.onclick = (e) => {
    e.stopPropagation();
    openEtymologyPopup(word.word);
  };

  // đọc nghĩa VI
  const speakMeaningBtn = document.getElementById('flashcard-speak-meaning-btn');
  if (speakMeaningBtn) speakMeaningBtn.onclick = (e) => { e.stopPropagation(); speak(word.meaning || '', 'vi-VN'); };

  // click vào từ → đọc EN
  if (wordEl) wordEl.onclick = (e) => { e.stopPropagation(); speak(word.word, 'en-US'); };

  // click toàn thẻ → mở/đóng nghĩa + overlay
  cardContainer.onclick = () => {
    const isOpen = detailsEl.style.maxHeight && detailsEl.style.maxHeight !== '0px';
    if (isOpen) {
      detailsEl.style.maxHeight = '0px';
      if (overlayEl) {
        overlayEl.classList.add('opacity-0');
        setTimeout(() => { if (overlayEl) overlayEl.style.display = 'none'; }, 300);
      }
    } else {
      detailsEl.style.maxHeight = detailsEl.scrollHeight + 'px';
      if (overlayEl && word.imageUrl) {
        overlayEl.style.display = 'block';
        overlayEl.classList.remove('opacity-0');
      }
    }
  };

  // tự đọc từ khi xuất hiện thẻ
  speak(word.word, 'en-US');
}

/** Xuất PUBLIC API: xử lý Nhớ/Không nhớ (được re-export ở gameModes.js) */
export function handleFlashcardAnswer(remembered) {
  const { flashcardList = [], currentFlashcardIndex = 0 } = state;
  if (flashcardList.length === 0) return;

  const word = flashcardList[currentFlashcardIndex];
  updateWordLevel(word, !!remembered);
  playSound(remembered ? 'correct' : 'wrong');

  // hiệu ứng chuyển thẻ
  const card = document.getElementById('flashcard-container');
  if (card) {
    card.style.transition = 'transform .3s ease, opacity .3s ease';
    card.style.transform  = remembered ? 'translateX(100%)' : 'translateX(-100%)';
    card.style.opacity    = '0';
  }

  setTimeout(() => {
    if (card) {
      card.style.transition = 'none';
      card.style.transform  = 'translateX(0)';
      card.style.opacity    = '1';
    }
    setState({ currentFlashcardIndex: currentFlashcardIndex + 1 });
    updateFlashcard();
  }, 300);
}

let READING_KEY_HANDLER = null;
function addReadingKeyListener() {
  if (READING_KEY_HANDLER) {
    window.removeEventListener('keydown', READING_KEY_HANDLER);
  }
  READING_KEY_HANDLER = (e) => {
    // chỉ hoạt động khi flashcard đang mở
    if (!document.getElementById('flashcard-container')) return;
    const key = e.key.toLowerCase();
    if (key === 'e') {
      e.preventDefault();
      const w = state.currentWord?.word || '';
      if (w) openEtymologyPopup(w);
    }
  };
  window.addEventListener('keydown', READING_KEY_HANDLER);
}
