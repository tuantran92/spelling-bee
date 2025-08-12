// js/vocabManager.js

import { state, setState } from './state.js';
import { saveMasterVocab, importFromGoogleSheet as dataImport } from './data.js';

// --- PHÂN TRANG ---
const ITEMS_PER_PAGE = 30; // Số lượng từ hiển thị mỗi lần tải
let currentLoadedCount = ITEMS_PER_PAGE;
let fullFilteredList = []; // Lưu trữ danh sách đã lọc đầy đủ

/**
 * Hiển thị giao diện quản lý từ vựng vào một container được chỉ định.
 * @param {string} containerId - ID của container để render nội dung vào.
 */
export function renderVocabManagementList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = ['all', ...new Set(state.vocabList.map(v => v.category || 'Chung'))];

    container.innerHTML = `
        <div class="flex flex-col md:flex-row gap-4 mb-4">
            <div class="flex-grow">
                 <label for="vocab-search-input" class="block text-sm font-medium text-gray-500 dark:text-gray-400">Tìm kiếm</label>
                 <input type="text" id="vocab-search-input" oninput="handleFilterChange()" placeholder="Nhập từ hoặc nghĩa..." class="mt-1 block w-full p-2 border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="flex-grow">
                <label for="vocab-list-category-filter" class="block text-sm font-medium text-gray-500 dark:text-gray-400">Chủ đề</label>
                <select id="vocab-list-category-filter" onchange="handleFilterChange()" class="mt-1 block w-full p-2 border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500">
                    ${categories.map(cat => `<option value="${cat}">${cat === 'all' ? 'Tất cả' : cat}</option>`).join('')}
                </select>
            </div>
        </div>
        <div id="vocab-list-display" class="space-y-2">
            </div>
        <div id="vocab-load-more-container" class="mt-6 text-center">
            </div>
        <div class="mt-6 border-t dark:border-gray-700 pt-4">
             <button onclick="importFromGoogleSheet()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Import từ Google Sheet</button>
             <div id="import-feedback" class="mt-2 h-5 text-sm text-center"></div>
        </div>
    `;

    handleFilterChange(); // Render danh sách lần đầu
}

/**
 * Được gọi khi người dùng thay đổi bộ lọc. Reset lại danh sách và hiển thị trang đầu tiên.
 */
window.handleFilterChange = () => {
    currentLoadedCount = ITEMS_PER_PAGE; // Reset lại số lượng
    filterAndDisplayVocab();
}

/**
 * Được gọi khi nhấn nút "Tải thêm".
 */
window.loadMoreVocab = () => {
    currentLoadedCount += ITEMS_PER_PAGE; // Tăng số lượng hiển thị
    filterAndDisplayVocab();
}

/**
 * Lọc danh sách gốc và chỉ hiển thị một phần (phân trang).
 */
function filterAndDisplayVocab() {
    const listContainer = document.getElementById('vocab-list-display');
    const loadMoreContainer = document.getElementById('vocab-load-more-container');
    if (!listContainer || !loadMoreContainer) return;

    const searchTerm = document.getElementById('vocab-search-input').value.trim().toLowerCase();
    const categoryFilter = document.getElementById('vocab-list-category-filter').value;

    // 1. Lọc để có danh sách đầy đủ
    fullFilteredList = state.vocabList.filter(word => {
        const categoryMatch = categoryFilter === 'all' || (word.category || 'Chung') === categoryFilter;
        const searchMatch = !searchTerm || word.word.toLowerCase().includes(searchTerm) || word.meaning.toLowerCase().includes(searchTerm);
        return categoryMatch && searchMatch;
    });

    // 2. Cắt danh sách để chỉ lấy phần cần hiển thị
    const itemsToDisplay = fullFilteredList.slice(0, currentLoadedCount);

    // 3. Render các từ trong danh sách đã cắt
    if (itemsToDisplay.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Không tìm thấy từ nào.</p>';
    } else {
        listContainer.innerHTML = itemsToDisplay.map(word => {
            const originalIndex = state.vocabList.findIndex(v => v.word === word.word);
            return `
                <div class="p-3 bg-gray-100 dark:bg-gray-700/60 rounded-lg">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-gray-900 dark:text-gray-100">${word.word}</p>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${word.meaning}</p>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <button onclick="editVocabWord(${originalIndex})" class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" title="Sửa"><svg class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                            <button onclick="deleteVocabWord(${originalIndex})" class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" title="Xóa"><svg class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                    ${word.example ? `<p class="text-xs text-gray-500 dark:text-gray-500 italic mt-1 pl-1">Vd: ${word.example}</p>`: ''}
                </div>
            `;
        }).join('');
    }

    // 4. Hiển thị nút "Tải thêm" nếu cần
    loadMoreContainer.innerHTML = '';
    if (currentLoadedCount < fullFilteredList.length) {
        loadMoreContainer.innerHTML = `
            <button onclick="loadMoreVocab()" class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold py-2 px-6 rounded-lg">
                Tải thêm (${fullFilteredList.length - currentLoadedCount} từ nữa)
            </button>
        `;
    }
}


// CÁC HÀM CÒN LẠI GIỮ NGUYÊN
export function openVocabForm(wordIndex = -1) {
    setState({ editingWordIndex: wordIndex });
    const isEditing = wordIndex > -1;
    const word = isEditing ? state.vocabList[wordIndex] : {};

    const modalContainer = document.getElementById('vocab-form-modal');
    modalContainer.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-auto relative">
             <button onclick="closeVocabForm()" class="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-2 z-10">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 id="vocab-form-title" class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">${isEditing ? 'Sửa từ' : 'Thêm từ mới'}</h3>
            <div class="space-y-4">
                <input type="text" id="vocab-word" placeholder="Từ vựng (tiếng Anh)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" value="${word.word || ''}">
                <input type="text" id="vocab-meaning" placeholder="Nghĩa (tiếng Việt)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" value="${word.meaning || ''}">
                <input type="text" id="vocab-example" placeholder="Ví dụ (không bắt buộc)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" value="${word.example || ''}">
                <input type="text" id="vocab-category" placeholder="Chủ đề (không bắt buộc)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" value="${word.category || ''}">
            </div>
            <p id="vocab-form-feedback" class="text-red-500 text-sm mt-2 h-4"></p>
            <div class="flex gap-2 mt-4">
                 <button onclick="handleVocabSubmit()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">${isEditing ? 'Lưu thay đổi' : 'Thêm từ'}</button>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');
    modalContainer.classList.add('flex');
}

export function closeVocabForm() {
    const modalContainer = document.getElementById('vocab-form-modal');
    modalContainer.classList.add('hidden');
    modalContainer.classList.remove('flex');
    modalContainer.innerHTML = '';
    setState({ editingWordIndex: -1 });
}

export async function handleVocabSubmit() {
    const word = document.getElementById('vocab-word').value.trim().toLowerCase();
    const meaning = document.getElementById('vocab-meaning').value.trim();
    const feedbackEl = document.getElementById('vocab-form-feedback');

    if (!word || !meaning) {
        feedbackEl.textContent = "Từ vựng và nghĩa không được để trống.";
        return;
    }
    const isEditing = state.editingWordIndex > -1;
    const wordExists = state.vocabList.some((v, i) => v.word === word && i !== state.editingWordIndex);
    if (wordExists) {
        feedbackEl.textContent = "Từ này đã tồn tại.";
        return;
    }

    const newWord = {
        word: word,
        meaning: meaning,
        example: document.getElementById('vocab-example').value.trim(),
        category: document.getElementById('vocab-category').value.trim() || 'Chung',
        difficulty: 'medium'
    };

    const newVocabList = [...state.vocabList];
    if (isEditing) {
        newVocabList[state.editingWordIndex] = newWord;
    } else {
        newVocabList.push(newWord);
    }
    setState({ vocabList: newVocabList });

    await saveMasterVocab();
    handleFilterChange(); // Cập nhật lại danh sách có phân trang
    closeVocabForm();
}

export function editVocabWord(index) {
    openVocabForm(index);
}

export async function deleteVocabWord(index) {
    const wordToDelete = state.vocabList[index].word;
    if (confirm(`Bạn có chắc muốn xóa từ "${wordToDelete}"?`)) {
        state.vocabList.splice(index, 1);
        await saveMasterVocab();
        handleFilterChange(); // Cập nhật lại danh sách có phân trang
    }
}

export async function importFromGoogleSheet() {
    const result = await dataImport();
    const feedbackEl = document.getElementById('import-feedback');
    if (feedbackEl) {
        feedbackEl.textContent = result.message;
        feedbackEl.className = `mt-2 h-5 text-sm text-center ${result.success ? 'text-green-500' : 'text-red-500'}`;
    }
    if (result.success) {
        handleFilterChange();
    }
}