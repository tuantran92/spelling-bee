// File này chứa các hàm quản lý từ vựng (Thêm, Sửa, Xóa) trong màn hình Cài đặt.

import { state, setState } from './state.js';
import * as data from './data.js';
import { cancelVocabEdit } from './ui.js';

/**
 * Khởi tạo màn hình cài đặt (quản lý từ vựng).
 */
export function startSettings() {
    cancelVocabEdit();
    renderVocabManagementList();
}

/**
 * Hiển thị danh sách từ vựng trong trang quản lý.
 * ĐÃ SỬA: Thêm hiển thị nhãn độ khó.
 */
export function renderVocabManagementList() {
    const listContainer = document.getElementById('vocab-management-list');
    listContainer.innerHTML = '';
    if (state.vocabList.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-gray-500">Danh sách của bạn đang trống.</p>';
        return;
    }
    
    // Định nghĩa nhãn cho độ khó
    const difficulties = {
        easy: { text: 'Dễ', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
        medium: { text: 'Trung bình', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
        hard: { text: 'Khó', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
    };

    state.vocabList.forEach((word, index) => {
        const item = document.createElement('div');
        item.className = 'p-3 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-between';
        
        const difficultyInfo = difficulties[word.difficulty] || difficulties.medium;

        item.innerHTML = `
            <div>
                <div class="flex items-center gap-2">
                    <p class="font-bold text-gray-900 dark:text-gray-100">${word.word} - <span class="font-normal">${word.meaning}</span></p>
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full ${difficultyInfo.class}">${difficultyInfo.text}</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 italic">${word.example || ''}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="editVocabWord(${index})" class="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md" title="Sửa từ">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                </button>
                <button onclick="deleteVocabWord(${index})" class="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md" title="Xóa từ">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

/**
 * Xử lý việc thêm hoặc sửa một từ.
 * ĐÃ SỬA: Lấy và lưu giá trị độ khó.
 */
export async function handleVocabSubmit() {
    const wordInput = document.getElementById('vocab-word');
    const meaningInput = document.getElementById('vocab-meaning');
    const exampleInput = document.getElementById('vocab-example');
    const categoryInput = document.getElementById('vocab-category');
    const difficultyInput = document.getElementById('vocab-difficulty'); // Lấy element mới
    const feedbackEl = document.getElementById('vocab-form-feedback');

    const word = wordInput.value.trim().toLowerCase();
    const meaning = meaningInput.value.trim();

    if (!word || !meaning) {
        feedbackEl.textContent = "Từ vựng và nghĩa không được để trống.";
        return;
    }
    
    if (state.editingWordIndex === -1 && state.vocabList.some(v => v.word === word)) {
        feedbackEl.textContent = "Từ này đã tồn tại trong danh sách.";
        return;
    }

    const newWord = {
        word: word,
        meaning: meaning,
        example: exampleInput.value.trim(),
        category: categoryInput.value.trim() || 'Chung',
        difficulty: difficultyInput.value // Lưu độ khó
    };

    const newVocabList = [...state.vocabList];
    if (state.editingWordIndex > -1) {
        newVocabList[state.editingWordIndex] = newWord;
    } else {
        newVocabList.push(newWord);
    }
    setState({ vocabList: newVocabList });

    await data.saveUserData();
    renderVocabManagementList();
    cancelVocabEdit();
}

/**
 * Chuẩn bị form để sửa một từ.
 * ĐÃ SỬA: Đặt giá trị cho ô chọn độ khó khi sửa.
 */
export function editVocabWord(index) {
    setState({ editingWordIndex: index });
    const word = state.vocabList[index];

    document.getElementById('vocab-form-title').textContent = "Sửa từ";
    document.getElementById('vocab-word').value = word.word;
    document.getElementById('vocab-meaning').value = word.meaning;
    document.getElementById('vocab-example').value = word.example;
    document.getElementById('vocab-category').value = word.category;
    document.getElementById('vocab-difficulty').value = word.difficulty || 'medium'; // Đặt giá trị độ khó
    
    document.getElementById('vocab-submit-btn').textContent = "Lưu thay đổi";
    document.getElementById('vocab-cancel-edit-btn').classList.remove('hidden');
}

/**
 * Xóa một từ khỏi danh sách.
 * (Không thay đổi)
 */
export async function deleteVocabWord(index) {
    const wordToDelete = state.vocabList[index].word;
    if (confirm(`Bạn có chắc muốn xóa từ "${wordToDelete}"?`)) {
        const newVocabList = [...state.vocabList];
        newVocabList.splice(index, 1);
        
        const newProgress = { ...state.appData.progress };
        if (newProgress[wordToDelete]) {
            delete newProgress[wordToDelete];
        }
        
        setState({ 
            vocabList: newVocabList,
            appData: { ...state.appData, progress: newProgress }
        });

        await data.saveUserData();
        renderVocabManagementList();
    }
}