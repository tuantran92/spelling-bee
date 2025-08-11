// js/ui.js

import { state, setState } from './state.js';
import * as game from './gameModes.js';
import * as vocabManager from './vocabManager.js';
import * as stats from './statistics.js';
import * as exam from './exam.js';
import * as achievements from './achievements.js';
import { saveUserData } from './data.js';

export const DOMElements = {
    profileSelectionContainer: document.getElementById('profile-selection-container'),
    profileListEl: document.getElementById('profile-list'),
    profileFeedbackEl: document.getElementById('profile-feedback'),
    loadingContainer: document.getElementById('loading-container'),
    mainAppContainer: document.getElementById('main-app-container'),
    mainMenu: document.getElementById('main-menu'),
    dashboard: document.getElementById('dashboard'),
    appScreensContainer: document.getElementById('app-screens'),
    vocabSourceEl: document.getElementById('vocab-source'),
    categoryFilterEl: document.getElementById('category-filter'),
    streakDisplayEl: document.getElementById('streak-display'),
    progressBarEl: document.getElementById('progress-bar'),
    userIdDisplayEl: document.getElementById('user-id-display'),
    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    profileToDeleteNameEl: document.getElementById('profile-to-delete-name'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
};

export function toggleControls() {
    const content = document.getElementById('collapsible-content');
    const arrow = document.getElementById('toggle-arrow');
    content.classList.toggle('hidden');
    arrow.classList.toggle('rotate-180');
}

export function updateDarkModeButton() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (!toggleBtn) return;
    const isDarkMode = document.documentElement.classList.contains('dark');
    if (isDarkMode) {
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clip-rule="evenodd" /></svg>
            <span>Chế độ Sáng</span>
        `;
    } else {
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
            <span>Chế độ Tối</span>
        `;
    }
}

export function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDarkMode = document.documentElement.classList.contains('dark');
    if (!state.appData.settings) {
        state.appData.settings = {};
    }
    state.appData.settings.darkMode = isDarkMode;
    saveUserData();
    updateDarkModeButton();
}

export function populateScreenHTML() {
    DOMElements.mainMenu.innerHTML = `
        <button onclick="showScreen('spelling-screen')" class="btn-glowing bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">Đánh Vần</button>
        <button onclick="showScreen('reading-screen')" class="btn-glowing bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">Flashcard</button>
        <button onclick="showScreen('scramble-screen')" class="btn-glowing bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">Sắp Xếp Chữ</button>
        <button onclick="showScreen('mcq-screen')" class="btn-glowing bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">Trắc Nghiệm</button>
        <button onclick="showScreen('listening-screen')" class="btn-glowing bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">Luyện Nghe</button>
        <button onclick="showScreen('shuffle-screen')" class="btn-glowing bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">Xem Toàn Bộ</button>
        <button onclick="showScreen('pronunciation-screen')" class="btn-glowing bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">Luyện Phát Âm</button>
        <button onclick="showScreen('fill-blank-screen')" class="btn-glowing bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105">Điền Từ</button>
        <button onclick="showScreen('stats-screen')" class="btn-glowing bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md">Thống kê</button>
        <button onclick="showScreen('exam-screen')" class="btn-glowing bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-md">Luyện thi</button>
        <button onclick="showScreen('achievements-screen')" class="btn-glowing bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg shadow-md">Thành tựu</button>
    `;

    document.getElementById('spelling-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Điền từ đúng cho nghĩa sau:</h2><div class="flex justify-center items-center gap-4 mb-4"><p id="spelling-meaning" class="text-xl bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-gray-900 dark:text-gray-100"></p><button id="spelling-speak-btn" class="p-3 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white shadow-md" title="Nghe lại"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button></div><div id="spelling-example" class="text-gray-600 dark:text-gray-400 italic mb-4"></div><input type="text" id="spelling-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" placeholder="Nhập từ tiếng Anh..."><div class="mt-4"><button onclick="checkSpelling()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg mr-2">Kiểm tra</button><button onclick="startSpelling()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Từ khác</button></div><p id="spelling-result" class="mt-4 h-6 text-lg font-medium"></p>`;
    document.getElementById('reading-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Luyện Nghe & Phát Âm</h2><div class="perspective-1000"><div id="flashcard" class="flashcard relative w-full h-56 md:h-64 cursor-pointer" onclick="this.classList.toggle('is-flipped')"><div class="flashcard-inner relative w-full h-full"><div id="flashcard-front" class="flashcard-front absolute w-full h-full bg-teal-500 rounded-xl flex flex-col items-center justify-center p-4 shadow-lg"></div><div id="flashcard-back" class="flashcard-back absolute w-full h-full bg-teal-700 rounded-xl flex flex-col items-center justify-center p-4 shadow-lg"></div></div></div></div><div class="mt-6 flex justify-center items-center gap-4"><button onclick="changeFlashcard(-1)" class="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 p-3 rounded-full shadow-md"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button><span id="card-counter" class="text-gray-700 dark:text-gray-300 font-medium"></span><button onclick="changeFlashcard(1)" class="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 p-3 rounded-full shadow-md"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button></div><div id="reading-options" class="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label for="voice-select" class="block mb-1 text-sm font-medium text-gray-900 dark:text-gray-300">Giọng đọc:</label><select id="voice-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"></select></div><div><label for="rate-slider" class="block mb-1 text-sm font-medium text-gray-900 dark:text-gray-300">Tốc độ: <span id="rate-value">1.0</span>x</label><input id="rate-slider" type="range" min="0.5" max="2" step="0.1" value="1" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-500"></div></div></div>`;
    document.getElementById('shuffle-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Danh sách từ vựng</h2><div class="mb-4"><label for="shuffle-category-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Lọc theo chủ đề:</label><select id="shuffle-category-filter" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"></select></div><div class="text-sm text-gray-600 dark:text-gray-400 mb-4">Màu sắc thể hiện mức độ thành thạo: <span class="text-green-500">Tốt</span>, <span class="text-yellow-500">Đang học</span>, <span class="text-red-500">Cần ôn</span>.</div><ul id="vocab-list-display" class="space-y-2 max-h-80 overflow-y-auto"></ul>`;
    document.getElementById('scramble-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Sắp xếp các chữ cái sau:</h2><p class="text-gray-600 dark:text-gray-400 mb-4">Gợi ý: Từ này có nghĩa là "<span id="scramble-meaning" class="font-semibold"></span>"</p><div id="scrambled-word-display" class="flex justify-center items-center gap-2 my-6 flex-wrap"></div><input type="text" id="scramble-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white" placeholder="Nhập đáp án của bạn..."><div class="mt-4"><button onclick="checkScramble()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg mr-2">Kiểm tra</button><button onclick="startScramble()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Từ khác</button></div><p id="scramble-result" class="mt-4 h-6 text-lg font-medium"></p>`;
    document.getElementById('mcq-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Chọn nghĩa đúng cho từ sau:</h2><div class="flex justify-center items-center gap-4 mb-6"><p id="mcq-word" class="text-3xl font-bold bg-gray-100 dark:bg-gray-700 py-4 px-6 rounded-lg text-gray-900 dark:text-gray-100"></p><button id="mcq-speak-btn" class="p-3 bg-sky-500 hover:bg-sky-600 rounded-full text-white shadow-md" title="Nghe lại"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button></div><div id="mcq-options" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div><p id="mcq-result" class="mt-6 h-6 text-lg font-medium"></p>`;
    document.getElementById('listening-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Nghe và gõ lại từ bạn nghe được</h2><div class="my-6"><button onclick="speakWord(state.currentWord.word)" class="bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-full shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button></div><input type="text" id="listening-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-700 dark:text-white" placeholder="Nhập từ bạn nghe được..."><div class="mt-4"><button onclick="checkListening()" class="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-lg mr-2">Kiểm tra</button><button onclick="startListening()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Từ khác</button></div><p id="listening-result" class="mt-4 h-6 text-lg font-medium"></p>`;
    
    document.getElementById('settings-screen').innerHTML = `
        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Quản lý từ vựng</h2>
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
            <h3 id="vocab-form-title" class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Thêm từ mới</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" id="vocab-word" placeholder="Từ vựng (tiếng Anh)" class="p-2 border rounded dark:bg-gray-600 dark:border-gray-500">
                <input type="text" id="vocab-meaning" placeholder="Nghĩa (tiếng Việt)" class="p-2 border rounded dark:bg-gray-600 dark:border-gray-500">
                <input type="text" id="vocab-example" placeholder="Ví dụ" class="p-2 border rounded dark:bg-gray-600 dark:border-gray-500">
                <input type="text" id="vocab-category" placeholder="Chủ đề" class="p-2 border rounded dark:bg-gray-600 dark:border-gray-500 md:col-span-2">
                <select id="vocab-difficulty" class="p-2 border rounded dark:bg-gray-600 dark:border-gray-500">
                    <option value="easy">Dễ</option>
                    <option value="medium" selected>Trung bình</option>
                    <option value="hard">Khó</option>
                </select>
            </div>
            <div class="flex gap-2 mt-4">
                <button id="vocab-submit-btn" onclick="handleVocabSubmit()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Thêm từ</button>
                <button id="vocab-cancel-edit-btn" onclick="cancelVocabEdit()" class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hidden">Hủy</button>
            </div>
            <p id="vocab-form-feedback" class="text-red-500 text-sm mt-2 h-4"></p>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Import từ Google Sheet</h3>
            <div class="bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500 text-blue-700 dark:text-blue-200 p-4 rounded-lg mb-4 text-sm" role="alert">
                <p class="font-bold">Lưu ý:</p>
                <ul class="list-disc list-inside mt-1">
                    <li>Hành động này sẽ <strong class="text-red-500">ghi đè toàn bộ</strong> danh sách từ vựng chung.</li>
                    <li>Sheet cần có các cột: <strong>word</strong>, <strong>meaning</strong>, <strong>example</strong>, <strong>category</strong>, <strong>difficulty</strong>.</li>
                    <li>Sheet cần được chia sẻ với quyền <strong>"Anyone with the link" (Bất kỳ ai có đường liên kết)</strong>.</li>
                </ul>
            </div>
            <input type="url" id="gsheet-url" class="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500" placeholder="Dán link Google Sheet vào đây...">
            <button onclick="importFromGoogleSheet()" class="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Import và Ghi đè</button>
            <div id="import-feedback" class="mt-2 h-5 text-sm"></div>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 mt-6">Danh sách của bạn</h3>
        <div id="vocab-list-filter-container"></div> 
        <div id="vocab-management-list" class="space-y-2 max-h-80 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg"></div>
    `;

    document.getElementById('pronunciation-screen').innerHTML = `
        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Luyện Phát Âm</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Hãy đọc to từ sau đây:</p>
        <p id="pronunciation-word" class="text-4xl font-bold text-pink-500 mb-6"></p>
        <button id="pronunciation-record-btn" onclick="listenForPronunciation()" class="bg-red-500 hover:bg-red-600 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-lg transition-transform transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>
        <p id="pronunciation-status" class="mt-4 text-gray-500 h-5"></p>
        <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg min-h-[60px]">
            <p class="text-sm text-gray-500">Bạn đã nói:</p>
            <p id="pronunciation-transcript" class="text-lg font-medium text-gray-800 dark:text-gray-200"></p>
        </div>
        <p id="pronunciation-result" class="mt-4 h-6 text-lg font-medium"></p>
        <button onclick="startPronunciation()" class="mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Từ khác</button>
    `;

    document.getElementById('fill-blank-screen').innerHTML = `
        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Điền vào chỗ trống</h2>
        <div id="fill-blank-sentence" class="p-6 bg-gray-100 dark:bg-gray-700 rounded-lg text-lg md:text-xl text-gray-800 dark:text-gray-200 mb-6 leading-relaxed"></div>
        <input type="text" id="fill-blank-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white" placeholder="Nhập từ còn thiếu...">
        <div class="mt-4">
            <button onclick="checkFillBlank()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg mr-2">Kiểm tra</button>
            <button onclick="startFillBlank()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Câu khác</button>
        </div>
        <p id="fill-blank-result" class="mt-4 h-6 text-lg font-medium"></p>
    `;
}

export function showScreen(screenId) {
    const isMainMenu = screenId === 'main-menu';

    const controlsContainer = document.getElementById('toggle-controls-btn')?.parentElement;
    if (controlsContainer) {
        controlsContainer.style.display = isMainMenu ? 'block' : 'none';
    }

    DOMElements.mainMenu.style.display = isMainMenu ? 'grid' : 'none';
    DOMElements.appScreensContainer.classList.toggle('hidden', isMainMenu);
    
    document.querySelectorAll('.app-screen').forEach(s => s.classList.add('hidden'));
    const targetScreen = document.getElementById(screenId);
    if(targetScreen) {
        targetScreen.classList.remove('hidden');
        const screenInitializers = {
            'spelling-screen': game.startSpelling, 
            'reading-screen': game.startReading, 
            'shuffle-screen': game.startShuffle, 
            'scramble-screen': game.startScramble, 
            'mcq-screen': game.startMcq, 
            'listening-screen': game.startListening,
            'settings-screen': vocabManager.startSettings,
            'stats-screen': stats.renderStatisticsPage,
            'exam-screen': exam.setupExamScreen,
            'achievements-screen': achievements.renderAchievementsPage,
            'pronunciation-screen': game.startPronunciation,
            'fill-blank-screen': game.startFillBlank,
        };
        if (screenInitializers[screenId]) screenInitializers[screenId]();
    }
}

export function updateDashboard() {
    updateStreakDisplay();
    populateCategoryFilter();
    updateProgressBar();
    if (state.vocabList && state.vocabList.length > 0) {
        DOMElements.vocabSourceEl.textContent = `Bộ từ hiện tại: ${state.vocabList.length} từ`;
    } else {
        DOMElements.vocabSourceEl.innerHTML = `
            <span class="text-orange-500 font-semibold">Bộ từ vựng đang trống!</span> 
            <p class="text-sm text-gray-500 dark:text-gray-400">Vào "Quản lý từ vựng" để thêm từ hoặc import từ Google Sheet.</p>
        `;
    }
}

function updateStreakDisplay() {
    DOMElements.streakDisplayEl.innerHTML = `🔥 ${state.appData.streak || 0}`;
}

function updateProgressBar() {
    const totalWords = state.filteredVocabList.length;
    if (totalWords === 0) {
        DOMElements.progressBarEl.style.width = '0%';
        DOMElements.progressBarEl.textContent = '0%';
        return;
    }
    const learnedWords = state.filteredVocabList.filter(w => state.appData.progress[w.word]?.level > 0).length;
    const percentage = Math.round((learnedWords / totalWords) * 100);
    DOMElements.progressBarEl.style.width = `${percentage}%`;
    DOMElements.progressBarEl.textContent = `${percentage}%`;
}

function populateCategoryFilter() {
    const categories = [...new Set(state.vocabList.map(v => v.category || 'Chung'))];
    const currentCategory = DOMElements.categoryFilterEl.value;
    DOMElements.categoryFilterEl.innerHTML = '<option value="all">Tất cả chủ đề</option>';
    categories.sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        DOMElements.categoryFilterEl.appendChild(option);
    });
    if (currentCategory) DOMElements.categoryFilterEl.value = currentCategory;
    applyFilters();
}

export function applyFilters() {
    const selectedCategory = DOMElements.categoryFilterEl.value;
    const selectedDifficulty = document.getElementById('difficulty-filter').value;

    let filteredVocabList = [...state.vocabList];

    if (selectedCategory !== 'all') {
        filteredVocabList = filteredVocabList.filter(v => (v.category || 'Chung') === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
        filteredVocabList = filteredVocabList.filter(v => (v.difficulty || 'medium') === selectedDifficulty);
    }

    setState({ filteredVocabList });
    updateProgressBar();
}

export function showImportFeedback(message, type) {
    const feedbackEl = document.getElementById('import-feedback');
    feedbackEl.textContent = message;
    const colorClasses = {
        success: 'text-green-500',
        error: 'text-red-500',
        info: 'text-blue-500'
    };
    feedbackEl.className = `mt-2 h-5 text-sm ${colorClasses[type] || 'text-gray-500'}`;
}

export function cancelVocabEdit() {
    setState({ editingWordIndex: -1 });
    document.getElementById('vocab-form-title').textContent = "Thêm từ mới";
    document.getElementById('vocab-word').value = '';
    document.getElementById('vocab-meaning').value = '';
    document.getElementById('vocab-example').value = '';
    document.getElementById('vocab-category').value = '';
    document.getElementById('vocab-difficulty').value = 'medium';
    document.getElementById('vocab-form-feedback').textContent = '';
    document.getElementById('vocab-submit-btn').textContent = "Thêm từ";
    document.getElementById('vocab-cancel-edit-btn').classList.add('hidden');
}

export function setupVoiceOptions() {
    const synth = window.speechSynthesis;
    function populateVoiceList() {
        const voiceSelect = document.getElementById('voice-select');
        if (!voiceSelect) return;
        const currentVal = voiceSelect.value;
        const voices = synth.getVoices().filter(voice => voice.lang.startsWith('en'));
        setState({ availableVoices: voices });
        voiceSelect.innerHTML = '';
        if (state.availableVoices.length === 0) {
            voiceSelect.innerHTML = `<option value="">Không có giọng đọc tiếng Anh</option>`;
            return;
        }
        state.availableVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name; 
            voiceSelect.appendChild(option);
        });
        if(currentVal) voiceSelect.value = currentVal;
    }
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();
}