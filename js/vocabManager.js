// js/vocabManager.js

import { state, setState } from './state.js';
import { saveMasterVocab, importFromGoogleSheet as dataImport, fetchWordData, fetchWordImages, uploadImageViaCloudFunction, uploadCustomImage } from './data.js';
import { SRS_INTERVALS } from './config.js';
import { showToast } from './ui.js';

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

    const searchTerm = document.getElementById('vocab-search-input').value.trim().toLowerCase();
    const categoryFilter = document.getElementById('vocab-list-category-filter').value;

    fullFilteredList = state.vocabList.filter(word => {
        const categoryMatch = categoryFilter === 'all' || (word.category || 'Chung') === categoryFilter;
        const searchMatch = !searchTerm || word.word.toLowerCase().includes(searchTerm) || word.meaning.toLowerCase().includes(searchTerm);
        return categoryMatch && searchMatch;
    });

    fullFilteredList.sort((a, b) => a.word.localeCompare(b.word));

    const itemsToDisplay = fullFilteredList.slice(0, currentLoadedCount);

    if (itemsToDisplay.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Không tìm thấy từ nào.</p>';
    } else {
        listContainer.innerHTML = itemsToDisplay.map(word => {
            const originalIndex = state.vocabList.findIndex(v => v.word === word.word);
            
            const difficultyClasses = {
                easy: 'border-l-4 border-green-500',
                medium: 'border-l-4 border-yellow-500',
                hard: 'border-l-4 border-red-500'
            };
            const difficultyClass = difficultyClasses[word.difficulty] || difficultyClasses.medium;

            return `
                <div id="vocab-item-${originalIndex}" class="p-3 bg-gray-100 dark:bg-gray-700/60 rounded-lg transition-colors duration-300 ${difficultyClass}">
                    <div class="flex justify-between items-start gap-3">
                        <div class="flex-shrink-0 w-16 h-16">
                            ${word.imageUrl ? 
                                `<img src="${word.imageUrl}" alt="${word.word}" class="w-full h-full object-cover rounded-md">` :
                                `<div class="w-full h-full bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center text-gray-400">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"></path></svg>
                                </div>`
                            }
                        </div>
                        
                        <div class="flex-grow">
                            <div class="flex items-center gap-2">
                                <p class="font-bold text-gray-900 dark:text-gray-100">${word.word}</p>
                                ${word.partOfSpeech ? `<span class="text-xs italic text-gray-500 dark:text-gray-400">(${word.partOfSpeech})</span>` : ''}
                            </div>
                            ${word.phonetic ? `<p class="text-sm text-indigo-500 dark:text-indigo-400 font-mono">${word.phonetic}</p>` : ''}
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${word.meaning}</p>
                            ${word.definition ? `<p class="text-sm text-gray-500 dark:text-gray-300 mt-1 italic">"${word.definition}"</p>` : ''}
                        </div>
                        <div class="flex flex-col items-center gap-2 flex-shrink-0">
                            <button onclick="showWordStats(${originalIndex})" class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" title="Chi tiết"><svg class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button>
                            <button onclick="editVocabWord(${originalIndex})" class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" title="Sửa"><svg class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                            <button onclick="deleteVocabWord(${originalIndex})" class="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full" title="Xóa"><svg class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                     <div class="flex items-center justify-between mt-2">
                        ${word.example ? `<p class="text-xs text-gray-500 dark:text-gray-500 italic pl-1 truncate max-w-[60%]">Vd: ${word.example}</p>`: '<div></div>'}
                        <select data-index="${originalIndex}" class="difficulty-select text-xs p-1 border rounded dark:bg-gray-600 dark:border-gray-500 focus:ring-1 focus:ring-indigo-500">
                            <option value="easy" ${word.difficulty === 'easy' ? 'selected' : ''}>Dễ</option>
                            <option value="medium" ${!word.difficulty || word.difficulty === 'medium' ? 'selected' : ''}>Trung bình</option>
                            <option value="hard" ${word.difficulty === 'hard' ? 'selected' : ''}>Khó</option>
                        </select>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadMoreContainer.innerHTML = '';
    if (currentLoadedCount < fullFilteredList.length) {
        loadMoreContainer.innerHTML = `
            <button id="load-more-btn" class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold py-2 px-6 rounded-lg">
                Tải thêm (${fullFilteredList.length - currentLoadedCount} từ nữa)
            </button>
        `;
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

export function openVocabForm(word = null) {
    setState({ editingWord: word });
    const modalContainer = document.getElementById('vocab-form-modal');
    const isEditing = !!word;

    modalContainer.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-lg mx-auto relative max-h-[90vh] overflow-y-auto">
            <button id="close-vocab-form-btn" class="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-2 z-10">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 id="vocab-form-title" class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4"></h3>
            <form id="vocab-form" class="space-y-4">
                <input type="text" name="word" placeholder="Từ vựng (tiếng Anh)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" required>
                <input type="text" name="meaning" placeholder="Nghĩa (tiếng Việt)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" required>
                <input type="text" name="example" placeholder="Câu ví dụ (không bắt buộc)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600">
                <input type="text" name="category" placeholder="Chủ đề (không bắt buộc)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600">
                
                <div class="mt-4">
                    <label for="image-search-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tìm ảnh minh họa</label>
                    <div class="mt-1 flex rounded-md shadow-sm">
                        <input type="text" id="image-search-input" class="flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="vd: happy cat">
                        <button type="button" id="search-image-btn" class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400">Tìm</button>
                    </div>
                </div>
                <div id="image-results-wrapper" class="mt-2 bg-gray-100 dark:bg-gray-900 rounded p-1">
                    <div id="image-search-results" class="grid grid-cols-3 gap-2 h-32 overflow-y-auto"></div>
                    <div id="image-load-more-container" class="text-center pt-2"></div>
                </div>

                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Hoặc tải lên ảnh của bạn</label>
                    <div class="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-gray-600">
                        <div id="custom-image-preview-container" class="text-center hidden">
                             <img id="custom-image-preview" src="#" alt="Xem trước ảnh" class="mx-auto h-24 object-contain">
                             <button type="button" id="remove-custom-image-btn" class="mt-2 text-sm text-red-500 hover:text-red-700">Xóa ảnh</button>
                        </div>
                        <div id="custom-image-upload-prompt" class="space-y-1 text-center">
                            <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                            <div class="flex text-sm text-gray-600 dark:text-gray-400">
                                <label for="custom-image-upload-input" class="relative cursor-pointer bg-white dark:bg-gray-900 rounded-md font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 focus-within:outline-none">
                                    <span>Tải lên một file</span>
                                    <input id="custom-image-upload-input" name="custom-image-upload-input" type="file" class="sr-only" accept="image/png, image/jpeg, image/gif, image/webp">
                                </label>
                                <p class="pl-1">hoặc kéo và thả</p>
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF, WEBP tối đa 2MB</p>
                        </div>
                    </div>
                </div>

                <p id="vocab-form-feedback" class="text-center text-sm mt-2 h-5"></p>
                <div class="flex gap-2 mt-4">
                     <button type="submit" id="vocab-form-submit-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"></button>
                </div>
            </form>
        </div>
    `;

    const form = document.getElementById('vocab-form');
    const searchBtn = document.getElementById('search-image-btn');
    const searchInput = document.getElementById('image-search-input');

    document.getElementById('vocab-form-title').textContent = isEditing ? 'Sửa từ' : 'Thêm từ mới';
    document.getElementById('vocab-form-submit-btn').textContent = isEditing ? 'Lưu thay đổi' : 'Thêm từ';
    form.word.value = word?.word || '';
    form.meaning.value = word?.meaning || '';
    form.example.value = word?.example || '';
    form.category.value = word?.category || '';
    form.word.readOnly = isEditing;
    searchInput.value = word?.word || '';
    
    searchBtn.addEventListener('click', () => {
        searchImages(searchInput.value, true); // true để reset
    });
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchImages(searchInput.value, true);
        }
    });

    document.getElementById('close-vocab-form-btn').addEventListener('click', closeVocabForm);
    form.addEventListener('submit', handleVocabFormSubmit);
    
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

export function closeVocabForm() {
    const modalContainer = document.getElementById('vocab-form-modal');
    modalContainer.classList.add('hidden');
    modalContainer.classList.remove('flex');
    modalContainer.innerHTML = '';
    setState({ editingWord: null });
}

async function searchImages(term, isNewSearch = false) {
    if (!term) return;

    if (isNewSearch) {
        currentImagePage = 1;
        currentImageSearchTerm = term;
        document.getElementById('image-search-results').innerHTML = '';
    } else {
        currentImagePage++;
    }

    const resultsContainer = document.getElementById('image-search-results');
    const loadMoreContainer = document.getElementById('image-load-more-container');
    const tempLoaderId = `loader-${Date.now()}`;
    loadMoreContainer.innerHTML = `<div id="${tempLoaderId}" class="loader mx-auto"></div>`;

    const images = await fetchWordImages(currentImageSearchTerm, currentImagePage);
    
    document.getElementById(tempLoaderId)?.remove();

    if (!images || images.length === 0) {
        if (currentImagePage === 1) {
            resultsContainer.innerHTML = '<p class="text-center text-gray-500 col-span-3">Không tìm thấy ảnh nào.</p>';
        }
        loadMoreContainer.innerHTML = '<p class="text-xs text-gray-400">Đã tải hết ảnh.</p>';
        return;
    }

    images.forEach(img => {
        const imgElement = document.createElement('img');
        imgElement.src = img.url;
        imgElement.dataset.url = img.url;
        imgElement.className = "image-result w-full h-20 object-cover rounded cursor-pointer hover:opacity-75";
        imgElement.addEventListener('click', () => {
            document.querySelectorAll('.image-result').forEach(i => i.classList.remove('selected', 'ring-4', 'ring-indigo-500'));
            imgElement.classList.add('selected', 'ring-4', 'ring-indigo-500');
            document.getElementById('remove-custom-image-btn').click();
        });
        resultsContainer.appendChild(imgElement);
    });

    loadMoreContainer.innerHTML = `<button type="button" id="load-more-images-btn" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Tải thêm</button>`;
    document.getElementById('load-more-images-btn').onclick = () => searchImages(currentImageSearchTerm, false);
}

export async function handleVocabFormSubmit(event) {
    event.preventDefault();
    const form = document.getElementById('vocab-form');
    const feedbackEl = document.getElementById('vocab-form-feedback');
    const word = form.word.value.trim().toLowerCase();
    const meaning = form.meaning.value.trim();

    if (!word || !meaning) {
        feedbackEl.textContent = "Từ vựng và nghĩa không được để trống.";
        return;
    }

    const isEditing = !!state.editingWord;
    const existingWord = state.vocabList.find(v => v.word === word);
    if (existingWord && (!isEditing || existingWord.word !== state.editingWord.word)) {
        feedbackEl.textContent = `Từ "${word}" đã tồn tại.`;
        return;
    }

    feedbackEl.textContent = 'Đang xử lý...';
    let imageUrl = form.querySelector('.image-result.selected')?.dataset.url || state.editingWord?.imageUrl || null;

    if (form.customImageFile) {
        feedbackEl.textContent = 'Đang tải ảnh lên...';
        try {
            imageUrl = await uploadCustomImage(form.customImageFile, state.selectedProfileId);
        } catch (error) {
            feedbackEl.textContent = 'Tải ảnh thất bại.';
            return;
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
        imageUrl: imageUrl,
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
    handleFilterChange();
    showToast(isEditing ? 'Đã cập nhật từ!' : 'Đã thêm từ mới!', 'success');
}

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

export async function importFromGoogleSheet() {
    const result = await dataImport();
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
        handleFilterChange();
    }
}

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