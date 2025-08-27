// js/vocabManager.js

import { state, setState } from './state.js';
import { saveMasterVocab, importFromGoogleSheet as dataImport, fetchWordData, fetchWordImages, uploadImageViaCloudFunction, uploadCustomImage } from './data.js';
import { SRS_INTERVALS } from './config.js';
import { showToast } from './ui.js';
import { auth } from './firebase.js';

const ITEMS_PER_PAGE = 30;
let currentLoadedCount = ITEMS_PER_PAGE;
let fullFilteredList = [];

// === START: BIẾN TOÀN CỤC CHO TÌM KIẾM ẢNH ===
let currentImageSearchTerm = '';
let currentImagePage = 1;
// === END: BIẾN TOÀN CỤC CHO TÌM KIẾM ẢNH ===

export function renderVocabManagementList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = ['all', ...new Set(state.vocabList.map(v => v.category || 'Chung'))];

    container.innerHTML = `
        <div class="flex flex-col md:flex-row gap-4 mb-4">
            <div class="flex-grow">
                 <label for="vocab-search-input" class="block text-sm font-medium text-gray-500 dark:text-gray-400">Tìm kiếm</label>
                 <input type="text" id="vocab-search-input" placeholder="Nhập từ hoặc nghĩa..." class="mt-1 block w-full p-2 border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="flex-grow">
                <label for="vocab-list-category-filter" class="block text-sm font-medium text-gray-500 dark:text-gray-400">Chủ đề</label>
                <select id="vocab-list-category-filter" class="mt-1 block w-full p-2 border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500">
                    ${categories.map(cat => `<option value="${cat}">${cat === 'all' ? 'Tất cả' : cat}</option>`).join('')}
                </select>
            </div>
        </div>
        <div id="vocab-list-display" class="space-y-2"></div>
        <div id="vocab-load-more-container" class="mt-6 text-center"></div>
        <div class="mt-6 border-t dark:border-gray-700 pt-4 flex flex-col md:flex-row gap-2">
            <button onclick="importFromGoogleSheet()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">Import từ Google Sheet</button>
            <button onclick="exportToCSV()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">Export ra Excel (CSV)</button>
        </div>
    `;

    document.getElementById('vocab-search-input').addEventListener('input', handleFilterChange);
    document.getElementById('vocab-list-category-filter').addEventListener('change', handleFilterChange);
    
    container.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'load-more-btn') {
            loadMoreVocab();
        }
    });

    container.addEventListener('change', (event) => {
        if (event.target && event.target.classList.contains('difficulty-select')) {
            const index = parseInt(event.target.dataset.index, 10);
            const newDifficulty = event.target.value;
            updateWordDifficulty(index, newDifficulty);
        }
    });

    handleFilterChange();
}

function handleFilterChange() {
    currentLoadedCount = ITEMS_PER_PAGE;
    filterAndDisplayVocab();
}

function loadMoreVocab() {
    currentLoadedCount += ITEMS_PER_PAGE;
    filterAndDisplayVocab();
}

function filterAndDisplayVocab() {
  const listContainer = document.getElementById('vocab-list-display');
  const loadMoreContainer = document.getElementById('vocab-load-more-container');
  if (!listContainer || !loadMoreContainer) return;

  // --- helpers
  const esc = (s) => (s == null ? '' : String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
  const normalize = (s) =>
    (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const diffLabel = (d) => (d === 'easy' ? 'Dễ' : d === 'hard' ? 'Khó' : 'Trung bình');

  // --- filters (CHỈ theo từ vựng)
  const rawSearch = (document.getElementById('vocab-search-input')?.value || '').trim();
  const searchTerm = normalize(rawSearch); // so khớp không dấu, không phân biệt hoa/thường
  const categoryFilter = document.getElementById('vocab-list-category-filter')?.value || 'all';

  fullFilteredList = (state.vocabList || []).filter(w => {
    const cat = (w.category || 'Chung');
    const categoryMatch = categoryFilter === 'all' || cat === categoryFilter;

    if (!searchTerm) return categoryMatch;

    // ====== CHỈ match theo word ======
    // Mặc định: match tuyệt đối. Nếu muốn match bắt đầu, đổi === thành .startsWith(searchTerm)
    const wordMatch = normalize(w.word).startsWith(searchTerm);
    return categoryMatch && wordMatch;
  });

  // sort theo chữ cái
  fullFilteredList.sort((a, b) =>
    (a.word || '').localeCompare(b.word || '', 'en', { sensitivity: 'base' }));

  // --- render page
  const items = fullFilteredList.slice(0, currentLoadedCount);

  if (items.length === 0) {
    listContainer.innerHTML = `
      <div class="text-gray-500 dark:text-gray-400 italic py-8 text-center">
        Không có mục nào khớp bộ lọc.
      </div>`;
  } else {
    listContainer.innerHTML = items.map(word => {
      const idx = state.vocabList.indexOf(word); // index gốc trong danh sách master
      const pos = esc(word.partOfSpeech || '');
      const pho = esc(word.phonetic || '');
      const img = esc(word.imageUrl || '');
      const diffClass =
        (word.difficulty === 'easy') ? 'border-l-4 border-green-500' :
        (word.difficulty === 'hard') ? 'border-l-4 border-red-500' :
                                       'border-l-4 border-yellow-500';

      return `
      <div id="vocab-item-${idx}"
           class="p-3 md:p-4 bg-gray-800/60 dark:bg-gray-800 text-gray-100 rounded-lg transition-colors duration-300 ${diffClass}">
        <div class="flex justify-between items-start gap-3">
          <!-- thumb -->
          <div class="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-700 grid place-items-center">
            ${img ? `<img src="${img}" alt="${esc(word.word)}" class="w-full h-full object-cover">`
                   : `<span class="text-xs text-gray-400">no image</span>`}
          </div>

          <!-- nội dung -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <div class="text-xl md:text-2xl font-bold truncate">${esc(word.word || '')}</div>
              ${pos ? `<div class="text-sm text-white/70">(${pos})</div>` : ''}
            </div>
            ${pho ? `<a class="text-sky-300 text-sm hover:underline">${pho}</a>` : ''}
            ${word.meaning ? `<div class="mt-1">${esc(word.meaning)}</div>` : ''}
            ${word.definition ? `<div class="mt-1 italic text-white/80">"${esc(word.definition)}"</div>` : ''}
            ${word.example ? `<div class="mt-1 italic text-gray-400">Vd: ${esc(word.example)}</div>` : ''}
          </div>

          <!-- actions -->
          <div class="flex flex-col items-center gap-2 flex-shrink-0">
            <button onclick="showWordStats(${idx})"
                    class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                    title="Chi tiết">
              <svg class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>

            <button onclick="openEtymologyPopup('${esc(word.word)}')"
                    class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                    title="Gốc từ (Etymology)">
              <svg class="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 6h7m-7 4h7m-7 4h5M6 4a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V8l-4-4H6z"/>
              </svg>
            </button>

            <button onclick="editVocabWord(${idx})"
                    class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                    title="Sửa">
              <svg class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"/>
              </svg>
            </button>

            <button onclick="deleteVocabWord(${idx})"
                    class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                    title="Xóa">
              <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>

            <select id="diff-${idx}"
                    class="mt-1 text-sm bg-gray-700 text-white rounded px-2 py-1"
                    onchange="updateWordDifficulty(${idx}, this.value)">
              <option value="easy"   ${word.difficulty === 'easy'   ? 'selected' : ''}>Dễ</option>
              <option value="medium" ${!word.difficulty || word.difficulty === 'medium' ? 'selected' : ''}>Trung bình</option>
              <option value="hard"   ${word.difficulty === 'hard'   ? 'selected' : ''}>Khó</option>
            </select>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // --- load more
  loadMoreContainer.innerHTML = '';
  if (currentLoadedCount < fullFilteredList.length) {
    loadMoreContainer.innerHTML = `
      <button id="load-more-btn"
              class="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500
                     font-semibold py-2 px-6 rounded-lg">
        Tải thêm (${fullFilteredList.length - currentLoadedCount} từ nữa)
      </button>`;
    document.getElementById('load-more-btn')?.addEventListener('click', () => {
      currentLoadedCount += ITEMS_PER_PAGE;
      filterAndDisplayVocab();
    });
  }
}



export function updateWordDifficulty(index, newDifficulty) {
    if (state.vocabList[index]) {
        state.vocabList[index].difficulty = newDifficulty;
        saveMasterVocab();
        const itemEl = document.getElementById(`vocab-item-${index}`);
        if (itemEl) {
            itemEl.classList.remove('border-green-500', 'border-yellow-500', 'border-red-500');
            const difficultyClass = {
                easy: 'border-green-500',
                hard: 'border-red-500'
            }[newDifficulty] || 'border-yellow-500';
            itemEl.classList.add(difficultyClass);
        }
    }
}

export function showWordStats(wordIndex) {
    const word = state.vocabList[wordIndex];
    const progress = state.appData.progress[word.word] || {};
    const modalContainer = document.getElementById('vocab-stats-modal');
    if (!word || !modalContainer) return;

    const nextReviewDate = progress.nextReview ? new Date(progress.nextReview) : null;
    const nextReviewString = nextReviewDate ? nextReviewDate.toLocaleString('vi-VN') : 'Chưa có';
    const isMastered = progress.level >= SRS_INTERVALS.length - 1;

    modalContainer.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-auto relative">
            <button onclick="closeWordStats()" class="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-2 z-10">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100">${word.word}</h3>
            <p class="text-indigo-500 dark:text-indigo-400 font-mono">${word.phonetic || ''}</p>
            <div class="mt-4 grid grid-cols-2 gap-4 text-center">
                <div class="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <p class="text-xs text-blue-800 dark:text-blue-200">Cấp độ SRS</p>
                    <p class="text-2xl font-bold">${isMastered ? 'Thành thạo' : progress.level || 0}</p>
                </div>
                <div class="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <p class="text-xs text-gray-600 dark:text-gray-300">Ôn tập tiếp theo</p>
                    <p class="font-semibold text-sm mt-1">${isMastered ? 'Không cần' : nextReviewString}</p>
                </div>
                <div class="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <p class="text-xs text-green-800 dark:text-green-200">Đúng</p>
                    <p class="text-2xl font-bold">${progress.correctAttempts || 0}</p>
                </div>
                <div class="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">
                    <p class="text-xs text-red-800 dark:text-red-200">Sai</p>
                    <p class="text-2xl font-bold">${progress.wrongAttempts || 0}</p>
                </div>
            </div>
            <div class="mt-4">
                <h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Lịch sử gần đây</h4>
                <ul class="space-y-1 text-xs">
                    ${(progress.history && progress.history.length > 0) ? [...progress.history].reverse().map(h => `
                        <li class="flex justify-between p-1 rounded ${h.action === 'correct' ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}">
                            <span>${new Date(h.date).toLocaleString('vi-VN')}</span>
                            <span class="font-mono">${h.levelChange}</span>
                        </li>
                    `).join('') : '<li class="text-center text-gray-500">Chưa có lịch sử.</li>'}
                </ul>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');
}

export function closeWordStats() {
    const modalContainer = document.getElementById('vocab-stats-modal');
    modalContainer.classList.add('hidden');
    modalContainer.innerHTML = '';
}

// ===================================================================
// START: THAY THẾ TOÀN BỘ HÀM NÀY
// ===================================================================
export function openVocabForm(word = null) {
    setState({ editingWord: word });
    const modalContainer = document.getElementById('vocab-form-modal');
    const isEditing = !!word;

    // Cập nhật HTML của modal để rộng hơn và có cấu trúc mới
    modalContainer.innerHTML = `
        <div id="vocab-modal-content-wrapper" class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl mx-auto relative max-h-[90vh] overflow-y-auto">
            <button id="close-vocab-form-btn" class="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-2 z-10">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 id="vocab-form-title" class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4"></h3>
            <form id="vocab-form" class="space-y-3">
                <div id="vocab-details-section" class="space-y-3">
                    <input type="text" name="word" placeholder="Từ vựng (tiếng Anh)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" required>
                    <input type="text" name="meaning" placeholder="Nghĩa (tiếng Việt)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" required>
                    <input type="text" name="example" placeholder="Câu ví dụ (không bắt buộc)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600">
                    <input type="text" name="category" placeholder="Chủ đề (không bắt buộc)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600">
                </div>

                <div class="relative flex py-2 items-center">
                    <div class="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <button type="button" id="toggle-details-btn" class="flex-shrink mx-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"></button>
                    <div class="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                <div class="pt-2">
                    <label for="image-search-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tìm ảnh minh họa</label>
                    <div class="mt-1 flex rounded-md shadow-sm">
                        <input type="text" id="image-search-input" class="flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600" placeholder="Tự động điền theo từ vựng ở trên">
                        <button type="button" id="search-image-btn" class="inline-flex items-center px-4 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm dark:bg-gray-800 dark:border-gray-600">Tìm</button>
                    </div>
                </div>

                <div id="image-results-wrapper" class="bg-gray-100 dark:bg-gray-900 rounded p-2">
                    <div id="image-search-results" class="grid grid-cols-3 gap-2 h-64 overflow-y-auto transition-all duration-300">
                         <p class="col-span-3 text-center text-gray-500 dark:text-gray-400 p-4">Nhập từ khóa và nhấn "Tìm" để xem ảnh.</p>
                    </div>
                    <div id="image-load-more-container" class="text-center pt-2"></div>
                </div>

                <div class="relative flex py-2 items-center">
                    <div class="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <button type="button" id="toggle-upload-btn" class="flex-shrink mx-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Hoặc tải ảnh của bạn</button>
                    <div class="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                <div id="custom-upload-section" class="hidden">
                     <div class="flex items-center justify-center w-full">
                        <label for="custom-image-upload-input" class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                            <div id="custom-image-preview-container" class="hidden p-2 text-center">
                                <img id="custom-image-preview" src="#" alt="Xem trước" class="mx-auto h-20 object-contain">
                                <button type="button" id="remove-custom-image-btn" class="mt-1 text-xs text-red-500 hover:text-red-700">Xóa ảnh</button>
                            </div>
                            <div id="custom-image-upload-prompt" class="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg class="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                <p class="mb-1 text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">Nhấn để chọn file</span></p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP (Tối đa 2MB)</p>
                            </div>
                            <input id="custom-image-upload-input" type="file" class="hidden" accept="image/png, image/jpeg, image/gif, image/webp" />
                        </label>
                    </div> 
                </div>

                <p id="vocab-form-feedback" class="text-center text-sm mt-2 h-5"></p>
                <div class="pt-2">
                     <button type="submit" id="vocab-form-submit-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"></button>
                </div>
            </form>
        </div>
    `;

    const form = document.getElementById('vocab-form');
    const contentWrapper = document.getElementById('vocab-modal-content-wrapper');
    const detailsSection = document.getElementById('vocab-details-section');
    const toggleDetailsBtn = document.getElementById('toggle-details-btn');

    document.getElementById('vocab-form-title').textContent = isEditing ? 'Sửa từ' : 'Thêm từ mới';
    document.getElementById('vocab-form-submit-btn').textContent = isEditing ? 'Lưu thay đổi' : 'Thêm từ';
    form.word.value = word?.word || '';
    form.meaning.value = word?.meaning || '';
    form.example.value = word?.example || '';
    form.category.value = word?.category || '';
    form.word.readOnly = isEditing;
    document.getElementById('image-search-input').value = word?.word || '';

    // LOGIC MỚI: Xử lý việc ẩn/hiện
    if (isEditing) {
        contentWrapper.classList.add('details-hidden');
        toggleDetailsBtn.textContent = 'Hiện thông tin từ vựng';
    } else {
        toggleDetailsBtn.textContent = 'Ẩn thông tin từ vựng';
    }

    toggleDetailsBtn.addEventListener('click', () => {
        const isHidden = contentWrapper.classList.toggle('details-hidden');
        toggleDetailsBtn.textContent = isHidden ? 'Hiện thông tin từ vựng' : 'Ẩn thông tin từ vựng';
    });
    // KẾT THÚC LOGIC MỚI

    document.getElementById('search-image-btn').addEventListener('click', () => {
        const searchTerm = document.getElementById('image-search-input').value || document.getElementById('vocab-form').word.value;
        searchImages(searchTerm, true);
    });

    document.getElementById('image-search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = e.target.value || document.getElementById('vocab-form').word.value;
            searchImages(searchTerm, true);
        }
    });

    document.getElementById('close-vocab-form-btn').addEventListener('click', closeVocabForm);
    form.addEventListener('submit', handleVocabFormSubmit);

    const toggleUploadBtn = document.getElementById('toggle-upload-btn');
    const uploadSection = document.getElementById('custom-upload-section');
    toggleUploadBtn.addEventListener('click', () => {
        const isHidden = uploadSection.classList.toggle('hidden');
        toggleUploadBtn.textContent = isHidden ? 'Hoặc tải ảnh của bạn' : 'Ẩn phần tải ảnh';
    });

    const customImageInput = document.getElementById('custom-image-upload-input');
    const previewContainer = document.getElementById('custom-image-preview-container');
    const previewImage = document.getElementById('custom-image-preview');
    const uploadPrompt = document.getElementById('custom-image-upload-prompt');
    const removeImageBtn = document.getElementById('remove-custom-image-btn');

    form.customImageFile = null;

    customImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 2 * 1024 * 1024) {
                 showToast("Lỗi: Kích thước ảnh không được vượt quá 2MB.", "error");
                 return;
            }
            form.customImageFile = file;
            previewImage.src = URL.createObjectURL(file);
            previewContainer.classList.remove('hidden');
            uploadPrompt.classList.add('hidden');
            document.querySelector('.image-result.selected')?.classList.remove('selected', 'ring-4', 'ring-indigo-500');
        }
    });
    removeImageBtn.addEventListener('click', () => {
        form.customImageFile = null;
        customImageInput.value = '';
        previewContainer.classList.add('hidden');
        uploadPrompt.classList.remove('hidden');
    });

    modalContainer.classList.remove('hidden');
    modalContainer.classList.add('flex');
}
// ===================================================================
// END: THAY THẾ TOÀN BỘ HÀM NÀY
// ===================================================================

export function closeVocabForm() {
    const modalContainer = document.getElementById('vocab-form-modal');
    modalContainer.classList.add('hidden');
    modalContainer.classList.remove('flex');
    modalContainer.innerHTML = '';
    setState({ editingWord: null });
}

// ===================================================================
// START: THAY THẾ TOÀN BỘ HÀM searchImages
// ===================================================================
async function searchImages(term, isNewSearch = false) {
    const searchBtn = document.getElementById('search-image-btn');
    const resultsContainer = document.getElementById('image-search-results');
    const loadMoreContainer = document.getElementById('image-load-more-container');

    if (!term) {
        showToast("Vui lòng nhập từ khóa để tìm ảnh.", "error");
        return;
    }

    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    }

    if (isNewSearch) {
        currentImagePage = 1;
        currentImageSearchTerm = term;
        resultsContainer.innerHTML = '';
    } else {
        currentImagePage++;
    }

    loadMoreContainer.innerHTML = `<div class="loader mx-auto"></div>`;

    try {
        const images = await fetchWordImages(currentImageSearchTerm, currentImagePage);

        if (isNewSearch) {
             resultsContainer.innerHTML = '';
        }

        if (!images || images.length === 0) {
            if (currentImagePage === 1) {
                resultsContainer.innerHTML = '<p class="col-span-3 text-center text-gray-500 dark:text-gray-400 p-4">Không tìm thấy ảnh nào.</p>';
            }
            loadMoreContainer.innerHTML = '<p class="text-xs text-gray-400">Đã tải hết ảnh.</p>';
            return;
        }

        images.forEach(img => {
            const imgElement = document.createElement('img');
            imgElement.src = img.url;
            // **FIX**: Sửa lại tên dataset cho đúng
            imgElement.dataset.imageUrl = img.url; 
            imgElement.alt = `Ảnh minh họa cho ${currentImageSearchTerm}`;
            imgElement.className = "image-result w-full h-full object-cover rounded cursor-pointer transition-transform duration-200 hover:scale-105";
            imgElement.addEventListener('click', () => {
                document.querySelectorAll('.image-result').forEach(i => i.classList.remove('selected', 'ring-4', 'ring-indigo-500'));
                imgElement.classList.add('selected', 'ring-4', 'ring-indigo-500');
                if (document.getElementById('remove-custom-image-btn')) {
                    document.getElementById('remove-custom-image-btn').click();
                }
            });
            resultsContainer.appendChild(imgElement);
        });

        if (images.length > 0) {
            loadMoreContainer.innerHTML = `<button type="button" id="load-more-images-btn" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Tải thêm</button>`;
            document.getElementById('load-more-images-btn').onclick = () => searchImages(currentImageSearchTerm, false);
        }

    } catch (error) {
        console.error("Lỗi khi tìm ảnh:", error);
        showToast("Có lỗi xảy ra khi tìm ảnh.", "error");
        resultsContainer.innerHTML = '<p class="col-span-3 text-center text-red-500 dark:text-red-400 p-4">Lỗi tải ảnh.</p>';
    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Tìm';
        }
    }
}
// ===================================================================
// END: THAY THẾ TOÀN BỘ HÀM searchImages
// ===================================================================

// ===================================================================
// START: THAY THẾ TOÀN BỘ HÀM handleVocabFormSubmit
// ===================================================================
export async function handleVocabFormSubmit(event) {
    event.preventDefault();
    const form = document.getElementById('vocab-form');
    const feedbackEl = document.getElementById('vocab-form-feedback');
    const submitBtn = document.getElementById('vocab-form-submit-btn');

    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xử lý...';
    feedbackEl.textContent = '';

    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("Không thể xác thực người dùng. Vui lòng đăng nhập lại.");
        }
        const userId = user.uid;

        const word = form.word.value.trim().toLowerCase();
        const meaning = form.meaning.value.trim();

        if (!word || !meaning) {
            throw new Error("Từ vựng và nghĩa không được để trống.");
        }

        const isEditing = !!state.editingWord;
        const existingWord = state.vocabList.find(v => v.word === word);
        if (existingWord && (!isEditing || existingWord.word !== state.editingWord.word)) {
            throw new Error(`Từ "${word}" đã tồn tại.`);
        }

        const selectedImageEl = form.querySelector('.image-result.selected');
        let finalImageUrl = state.editingWord?.imageUrl || null;

        if (form.customImageFile) {
            feedbackEl.textContent = 'Đang tải ảnh lên...';
            finalImageUrl = await uploadCustomImage(form.customImageFile, userId);
        } else if (selectedImageEl && selectedImageEl.dataset.imageUrl && selectedImageEl.dataset.imageUrl !== finalImageUrl) {
            const pixabayUrl = selectedImageEl.dataset.imageUrl;
            feedbackEl.textContent = 'Đang tối ưu và lưu ảnh...';

            finalImageUrl = await uploadImageViaCloudFunction(pixabayUrl, word);
            if (!finalImageUrl) {
                throw new Error("Tải ảnh lên Cloudinary thất bại.");
            }
        }

        const oldWordData = state.editingWord || {};
        const wordData = {
            word: word,
            meaning: meaning,
            example: form.example.value.trim(),
            category: form.category.value.trim() || 'Chung',
            difficulty: oldWordData.difficulty || 'medium',
            phonetic: oldWordData.phonetic || '',
            definition: oldWordData.definition || '',
            partOfSpeech: oldWordData.partOfSpeech || '',
            imageUrl: finalImageUrl,
        };

        feedbackEl.textContent = 'Đang làm giàu dữ liệu...';
        const apiData = await fetchWordData(word);
        if(apiData){
            wordData.phonetic = apiData.phonetic || wordData.phonetic;
            wordData.definition = apiData.definition || wordData.definition;
            wordData.example = wordData.example || apiData.example;
            wordData.partOfSpeech = apiData.partOfSpeech || wordData.partOfSpeech;
        }

        const newVocabList = [...state.vocabList];
        if (isEditing) {
            const index = state.vocabList.findIndex(v => v.word === state.editingWord.word);
            if (index > -1) {
                newVocabList[index] = { ...newVocabList[index], ...wordData };
            }
        } else {
            newVocabList.push(wordData);
            if (!state.appData.progress[word]) {
                state.appData.progress[word] = { level: 0, nextReview: new Date().toISOString(), wrongAttempts: 0, correctAttempts: 0, history: [] };
            }
        }

        setState({ vocabList: newVocabList });
        await saveMasterVocab();

        feedbackEl.textContent = '';
        closeVocabForm();
        filterAndDisplayVocab(); // Cập nhật lại danh sách
        showToast(isEditing ? 'Đã cập nhật từ!' : 'Đã thêm từ mới!', 'success');

    } catch (error) {
        console.error("Lỗi khi xử lý form:", error);
        showToast(error.message, 'error');
        feedbackEl.textContent = `Lỗi: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}
// ===================================================================
// END: THAY THẾ TOÀN BỘ HÀM handleVocabFormSubmit
// ===================================================================


export function editVocabWord(index) {
    const word = state.vocabList[index];
    openVocabForm(word);
}

export async function deleteVocabWord(index) {
    const wordToDelete = state.vocabList[index].word;
    if (confirm(`Bạn có chắc muốn xóa từ "${wordToDelete}"?`)) {
        state.vocabList.splice(index, 1);
        delete state.appData.progress[wordToDelete];
        await saveMasterVocab();
        handleFilterChange();
    }
}

// ---------------------------------------------------------------- //
// ----- BẮT ĐẦU THAY ĐỔI TẠI ĐÂY ----- //
// ---------------------------------------------------------------- //
export async function importFromGoogleSheet() {
    try {
        const result = await dataImport();
        
        if (result) {
            showToast(result.message, result.success ? 'success' : 'error');
            // Chỉ render lại UI nếu có từ mới được thêm vào
            if (result.success && result.addedCount > 0) {
                handleFilterChange();
            }
        } else {
            showToast('Có lỗi không xác định xảy ra.', 'error');
        }
    } catch (error) {
        console.error("Lỗi khi gọi importFromGoogleSheet trong vocabManager:", error);
        showToast('Import thất bại. Vui lòng xem console.', 'error');
    }
}
// ---------------------------------------------------------------- //
// ----- KẾT THÚC THAY ĐỔI ----- //
// ---------------------------------------------------------------- //

export function exportToCSV() {
    const vocabList = state.vocabList;
    if (vocabList.length === 0) {
        alert("Không có từ vựng nào để export.");
        return;
    }
    const headers = ['word', 'meaning', 'example', 'category', 'difficulty', 'phonetic', 'definition'];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + vocabList.map(item => {
        return headers.map(header => {
            let value = item[header] || '';
            let stringValue = String(value).replace(/"/g, '""');
            if (stringValue.includes(',')) {
                stringValue = `"${stringValue}"`;
            }
            return stringValue;
        }).join(",");
    }).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vocabulary_export.csv");
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);
    showToast('Đã bắt đầu tải file CSV!');
}