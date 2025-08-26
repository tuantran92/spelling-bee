// js/game-modes/fill-blank.js
import { state, setState } from '../state.js';
import { updateWordLevel } from '../data.js';
import { maskWord, playSound, speak } from '../utils.js';

function getNextWord() {
  const list = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function startFillBlank(containerId) {
  const container = document.getElementById(containerId);
  const wordObj = getNextWord();
  if (!wordObj) {
    container.innerHTML = '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ nào để học.</p>';
    return;
  }
  setState({ currentWord: wordObj });

  // Lấy câu ví dụ robust (nếu dataset của bạn dùng key khác)
  const example = wordObj.example || wordObj.exampleSentence || wordObj.sentence || '';

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-2">Điền vào chỗ trống</h2>

    <!-- Khung câu ví dụ + nhóm nút gợi ý -->
    <div class="relative bg-gray-200 dark:bg-gray-700 rounded-xl p-4">
      <div id="fill-blank-sentence" class="text-lg md:text-xl vocab-font-size text-gray-800 dark:text-gray-100"></div>

      <div class="absolute top-2 right-2 flex items-center gap-2">
        <button id="fill-blank-hint-definition-btn"
                onclick="toggleFillBlankHint('definition')"
                class="px-2 py-1 rounded-md text-xs font-semibold bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100">
          Hint
        </button>
        <button id="fill-blank-hint-meaning-btn"
                onclick="toggleFillBlankHint('meaning')"
                class="px-2 py-1 rounded-md text-xs font-semibold bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100">
          Gợi ý
        </button>
        <button onclick="translateFillBlankSentence()"
                class="px-2 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white">
          Dịch
        </button>
      </div>
    </div>

    <!-- Vùng hiển thị hint -->
    <div id="fill-blank-hint-container" class="mt-2 text-center min-h-[1.75rem]">
      <span id="fill-blank-hint-definition" class="hidden italic text-sm text-gray-500 dark:text-gray-400">
        "<span id="fill-blank-definition-content" class="font-semibold"></span>"
      </span>
      <span id="fill-blank-hint-meaning" class="hidden italic text-sm text-gray-500 dark:text-gray-400">
        Nghĩa: "<span id="fill-blank-meaning-content" class="font-semibold"></span>"
      </span>
      <span id="fill-blank-translation" class="hidden italic text-sm text-blue-500 dark:text-blue-400">
        Dịch: "<span id="fill-blank-translation-content" class="font-semibold"></span>"
      </span>
    </div>

    <!-- Input + nút -->
    <input type="text" id="fill-blank-input"
           class="w-full max-w-xs mx-auto mt-3 p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 vocab-font-size"
           placeholder="Nhập từ còn thiếu...">
    <div class="mt-4 flex gap-3">
      <button onclick="skipFillBlankQuestion()"
              class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Bỏ qua</button>
      <button onclick="checkFillBlank()"
              class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Kiểm tra</button>
    </div>
    <p id="fill-blank-result" class="mt-4 h-6 text-lg font-medium"></p>
  `;

  // Điền nội dung câu: thay từ đúng bằng mẫu “s - - t” có màu
  const sentenceEl = document.getElementById('fill-blank-sentence');
  sentenceEl.innerHTML = formatSentenceWithMask(example, wordObj.word);

  // Gắn dữ liệu gợi ý
  document.getElementById('fill-blank-meaning-content').textContent = wordObj.meaning || '';
  const defBtn = document.getElementById('fill-blank-hint-definition-btn');
  if (wordObj.definition) {
    document.getElementById('fill-blank-definition-content').textContent = wordObj.definition;
  } else {
    // nếu không có định nghĩa, disable “Hint”
    defBtn.disabled = true;
    defBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }

  const inputEl = document.getElementById('fill-blank-input');
  inputEl.focus();
  inputEl.onkeydown = (e) => { if (e.key === 'Enter') checkFillBlank(); };
}


export function toggleFillBlankHint(type) {
  const defEl = document.getElementById('fill-blank-hint-definition');
  const meanEl = document.getElementById('fill-blank-hint-meaning');
  const transEl = document.getElementById('fill-blank-translation');

  if (type === 'definition') defEl.classList.toggle('hidden');
  if (type === 'meaning') meanEl.classList.toggle('hidden');
  if (type === 'translation') transEl.classList.toggle('hidden');
}

export async function translateFillBlankSentence() {
  const transEl = document.getElementById('fill-blank-translation');
  const contentEl = document.getElementById('fill-blank-translation-content');
  try {
    transEl.classList.remove('hidden');
    contentEl.textContent = 'Đang dịch…';
    const text = state.currentWord.example || state.currentWord.meaning || state.currentWord.word;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    contentEl.textContent = (data?.[0]?.map(part => part[0]).join('')) || 'Không dịch được.';
  } catch {
    contentEl.textContent = 'Lỗi dịch, thử lại sau.';
  }
}

export function skipFillBlankQuestion() {
  startFillBlank('fill-blank-screen-content');
}

export function checkFillBlank() {
  const userAnswer = document.getElementById('fill-blank-input').value.trim().toLowerCase();
  const resultEl = document.getElementById('fill-blank-result');
  if (!userAnswer) return;

  const correct = state.currentWord.word.toLowerCase();
  const isCorrect = userAnswer === correct;

  playSound(isCorrect ? 'correct' : 'wrong');
  updateWordLevel(state.currentWord, isCorrect);

  if (isCorrect) {
    resultEl.textContent = '✅ Chính xác!';
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
    setTimeout(() => startFillBlank('fill-blank-screen-content'), 1500);
  } else {
    resultEl.textContent = `❌ Sai rồi! Đáp án: ${state.currentWord.word}`;
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
  }
}

// Hiển thị từ dưới dạng: s - - t (giữ chữ đầu/cuối, mask phần giữa bằng gạch có khoảng cách)
function maskWordForDisplay(word = '') {
  if (!word || word.length <= 2) return word;
  const first = word[0];
  const last  = word[word.length - 1];
  const middle = Array.from({ length: word.length - 2 }, () => '−').join(' ');
  // tô màu teal cho toàn cụm để nổi bật
  return `<span class="text-cyan-400 font-semibold">${first} ${middle} ${last}</span>`;
}

// Chèn mẫu đã mask vào câu ví dụ (nếu không có example thì hiển thị “… mask …”)
function formatSentenceWithMask(example = '', word = '') {
  const masked = maskWordForDisplay(word);
  if (!example || !example.trim()) {
    return `… ${masked} …`;
  }
  // thay thế từ (không phân biệt hoa/thường), giữ dấu câu xung quanh
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
  return example.replace(re, masked);
}

// escape regex utility
function escapeRegExp(s = '') {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
