// js/vocabManager.js

import { state, setState } from './state.js';
import { saveMasterVocab, importFromGoogleSheet as dataImport, fetchWordData, fetchWordImages, uploadImageViaCloudFunction  } from './data.js';
import { SRS_INTERVALS } from './config.js';

let tempWordData = null; // Biến tạm để giữ dữ liệu từ mới

const ITEMS_PER_PAGE = 30;
let currentLoadedCount = ITEMS_PER_PAGE;
let fullFilteredList = [];

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
        <div class="mt-6 border-t dark:border-gray-700 pt-4">
             <button onclick="importFromGoogleSheet()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Import từ Google Sheet</button>
             <div id="import-feedback" class="mt-2 h-5 text-sm text-center"></div>
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

export function openVocabForm(wordIndex = -1) {
    setState({ editingWordIndex: wordIndex });
    const isEditing = wordIndex > -1;
    const word = isEditing ? state.vocabList[wordIndex] : {};
    const modalContainer = document.getElementById('vocab-form-modal');
    modalContainer.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-auto relative">
             <button onclick="closeVocabForm()" class="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-2 z-10">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">${isEditing ? 'Sửa từ' : 'Thêm từ mới'}</h3>
            <div class="space-y-4">
                <input type="text" id="vocab-word" placeholder="Từ vựng (tiếng Anh)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" value="${word.word || ''}">
                <input type="text" id="vocab-meaning" placeholder="Nghĩa (tiếng Việt)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" value="${word.meaning || ''}">
                <input type="text" id="vocab-example" placeholder="Ví dụ (không bắt buộc)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" value="${word.example || ''}">
                <input type="text" id="vocab-category" placeholder="Chủ đề (không bắt buộc)" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600" value="${word.category || ''}">
                <select id="vocab-difficulty" class="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600">
                    <option value="easy" ${word.difficulty === 'easy' ? 'selected' : ''}>Dễ</option>
                    <option value="medium" ${!word.difficulty || word.difficulty === 'medium' ? 'selected' : ''}>Trung bình</option>
                    <option value="hard" ${word.difficulty === 'hard' ? 'selected' : ''}>Khó</option>
                </select>
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
}

export async function handleVocabSubmit() {
    const word = document.getElementById('vocab-word').value.trim().toLowerCase();
    const meaning = document.getElementById('vocab-meaning').value.trim();
    const feedbackEl = document.getElementById('vocab-form-feedback');

    if (!word || !meaning) {
        feedbackEl.textContent = "Từ vựng và nghĩa không được để trống.";
        return;
    }

    const originalEditingIndex = state.editingWordIndex;
    const isEditing = originalEditingIndex > -1;
    let existingWordIndex = state.vocabList.findIndex((v, i) => v.word === word && i !== originalEditingIndex);

    if (existingWordIndex > -1) {
        if (!confirm(`Từ "${word}" đã tồn tại. Bạn có muốn cập nhật nó với thông tin mới không?`)) {
            return; 
        }
        setState({ editingWordIndex: existingWordIndex });
    }

    feedbackEl.textContent = "Đang làm giàu dữ liệu...";
    setState({ imageSearchPage: 1, imageSearchTerm: word, tempImages: [] });

    const [apiData, images] = await Promise.all([
        fetchWordData(word),
        fetchWordImages(word, 1)
    ]);
    
    tempWordData = {
        word: word,
        meaning: meaning,
        phonetic: apiData?.phonetic || '',
        definition: apiData?.definition || '',
        example: document.getElementById('vocab-example').value.trim() || apiData?.example || '',
        partOfSpeech: apiData?.partOfSpeech || '',
        synonyms: apiData?.synonyms || [],
        category: document.getElementById('vocab-category').value.trim() || 'Chung',
        difficulty: document.getElementById('vocab-difficulty').value,
    };

    feedbackEl.textContent = "";
    closeVocabForm();

    if (images.length > 0) {
        openImagePickerModal(images);
    } else {
        saveNewWord();
    }
}

function openImagePickerModal(images) {
    const modalContainer = document.getElementById('image-picker-modal');
    modalContainer.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl mx-auto relative">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Chọn một hình ảnh cho "${tempWordData.word}"</h3>
            <div id="image-picker-grid" class="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                ${images.map((img, index) => `
                    <div class="cursor-pointer group" onclick="selectWordImage(${index})">
                        <img src="${img.url}" class="w-full h-32 object-cover rounded-lg group-hover:ring-4 ring-indigo-500 transition-all">
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 text-center" id="image-picker-footer">
                 <button id="load-more-images-btn" onclick="loadMoreImages()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Tải thêm</button>
                 <button onclick="skipImageSelection()" class="ml-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Bỏ qua / Giữ ảnh cũ</button>
            </div>
        </div>
    `;
    setState({ tempImages: images });
    modalContainer.classList.remove('hidden');
}

export async function loadMoreImages() {
    const loadMoreBtn = document.getElementById('load-more-images-btn');
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Đang tải...';

    const nextPage = state.imageSearchPage + 1;
    const newImages = await fetchWordImages(state.imageSearchTerm, nextPage);

    if (newImages.length > 0) {
        const grid = document.getElementById('image-picker-grid');
        const currentImageCount = state.tempImages.length;
        
        newImages.forEach((img, index) => {
            const newIndex = currentImageCount + index;
            const imgDiv = document.createElement('div');
            imgDiv.className = 'cursor-pointer group';
            imgDiv.setAttribute('onclick', `selectWordImage(${newIndex})`);
            imgDiv.innerHTML = `<img src="${img.url}" class="w-full h-32 object-cover rounded-lg group-hover:ring-4 ring-indigo-500 transition-all">`;
            grid.appendChild(imgDiv);
        });

        setState({ 
            tempImages: [...state.tempImages, ...newImages],
            imageSearchPage: nextPage 
        });

        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Tải thêm';
    } else {
        loadMoreBtn.textContent = 'Không còn ảnh';
    }
}


export async function selectWordImage(imageIndex) {
    const selectedImage = state.tempImages[imageIndex];
    if (tempWordData && selectedImage) {
        const modalContainer = document.getElementById('image-picker-modal');
        if(modalContainer) {
            modalContainer.innerHTML = `
                <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl mx-auto relative text-center">
                    <div class="loader mx-auto"></div>
                    <p class="mt-4 text-gray-600 dark:text-gray-300">Đang tải và lưu hình ảnh...</p>
                </div>`;
        }
        
        // Gọi hàm mới để tải ảnh qua Cloud Function
        const firebaseImageUrl = await uploadImageViaCloudFunction(selectedImage.url, tempWordData.word);

        if (firebaseImageUrl) {
            tempWordData.imageUrl = firebaseImageUrl;
            tempWordData.imageAuthor = ''; // Không cần lưu thông tin tác giả nữa
            tempWordData.imageAuthorLink = '';
        } else {
            alert("Không thể tải hình ảnh lên. Vui lòng thử lại hoặc chọn ảnh khác.");
            // Giữ lại ảnh cũ nếu đang sửa, hoặc để trống nếu thêm mới
            const oldWord = isEditing ? state.vocabList[state.editingWordIndex] : null;
            tempWordData.imageUrl = oldWord ? oldWord.imageUrl : '';
        }
    }
    await saveNewWord();
}

export function skipImageSelection() {
    saveNewWord();
}

async function saveNewWord() {
    const isEditing = state.editingWordIndex > -1;
    const newVocabList = [...state.vocabList];

    if (isEditing) {
        const oldWord = newVocabList[state.editingWordIndex];
        tempWordData.imageUrl = tempWordData.imageUrl || (oldWord ? oldWord.imageUrl : '') || '';
        tempWordData.imageAuthor = tempWordData.imageAuthor || (oldWord ? oldWord.imageAuthor : '') || '';
        tempWordData.imageAuthorLink = tempWordData.imageAuthorLink || (oldWord ? oldWord.imageAuthorLink : '') || '';
        newVocabList[state.editingWordIndex] = tempWordData;
    } else {
        newVocabList.push(tempWordData);
    }
    
    setState({ vocabList: newVocabList });
    await saveMasterVocab();
    
    tempWordData = null; 
    setState({ tempImages: [] });
    document.getElementById('image-picker-modal').classList.add('hidden');
    
    setState({ editingWordIndex: -1 });

    handleFilterChange();
}

export function editVocabWord(index) {
    openVocabForm(index);
}

export async function deleteVocabWord(index) {
    const wordToDelete = state.vocabList[index].word;
    if (confirm(`Bạn có chắc muốn xóa từ "${wordToDelete}"?`)) {
        state.vocabList.splice(index, 1);
        await saveMasterVocab();
        handleFilterChange();
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