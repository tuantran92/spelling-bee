// js/ui.js

import { state, setState } from './state.js';
import * as game from './gameModes.js';
import * as vocabManager from './vocabManager.js';
import * as stats from './statistics.js';
import * as exam from './exam.js';
import * as achievements from './achievements.js';
import { getReviewableWords } from './data.js';


export function toggleControls() {
    const content = document.getElementById('collapsible-content');
    const arrow = document.getElementById('toggle-arrow');
    if (content && arrow) {
        content.classList.toggle('hidden');
        arrow.classList.toggle('rotate-180');
    }
}

export function updateDarkModeButton() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (!toggleBtn) return;
    const isDarkMode = document.documentElement.classList.contains('dark');
    toggleBtn.title = isDarkMode ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối";
    if (isDarkMode) {
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clip-rule="evenodd" /></svg>
        `;
    } else {
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
        `;
    }
}

export function toggleDarkMode() {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const newDarkModeState = !isCurrentlyDark;
    localStorage.setItem('darkMode', newDarkModeState);
    if (newDarkModeState) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateDarkModeButton();
}

export function populateScreenHTML() {
    const mainMenu = document.getElementById('main-menu');
    if (!mainMenu) {
        console.error("Main menu element not found!");
        return;
    }
    mainMenu.className = 'grid grid-cols-4 gap-3 md:gap-4';

    // SỬA ĐỔI: Thêm lại đầy đủ các nút chức năng đã mất
    mainMenu.innerHTML = `
        <button onclick="startSmartReview()" id="smart-review-btn" class="relative col-span-4 flex items-center justify-center gap-3 text-lg font-bold py-4 px-4 rounded-xl shadow-lg transition-transform transform hover:scale-105 bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <span>Ôn tập thông minh</span>
            <span id="review-count-badge" class="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center hidden">0</span>
        </button>

        <button onclick="startRandomMode()" class="col-span-4 flex items-center justify-center gap-3 text-lg font-bold py-4 px-4 rounded-xl shadow-lg transition-transform transform hover:scale-105 bg-gradient-to-r from-green-400 to-teal-500 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Học ngẫu nhiên</span>
        </button>

        <div class="col-span-4 text-center my-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">hoặc chọn một chế độ</span>
        </div>

        <button onclick="showScreen('spelling-screen')" class="col-span-2 flex flex-col items-center justify-center gap-2 p-4 rounded-xl shadow-md bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:-translate-y-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span class="font-semibold text-gray-800 dark:text-gray-200">Đánh Vần</span>
        </button>
        <button onclick="showScreen('reading-screen')" class="col-span-2 flex flex-col items-center justify-center gap-2 p-4 rounded-xl shadow-md bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:-translate-y-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span class="font-semibold text-gray-800 dark:text-gray-200">Flashcard</span>
        </button>
        
        <button onclick="showScreen('mcq-screen')" class="col-span-2 md:col-span-1 flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl shadow-md bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:-translate-y-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
            <span class="font-medium text-sm text-gray-700 dark:text-gray-300">Trắc Nghiệm</span>
        </button>
        <button onclick="showScreen('listening-screen')" class="col-span-2 md:col-span-1 flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl shadow-md bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:-translate-y-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            <span class="font-medium text-sm text-gray-700 dark:text-gray-300">Luyện Nghe</span>
        </button>
        <button onclick="showScreen('scramble-screen')" class="col-span-2 md:col-span-1 flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl shadow-md bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:-translate-y-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
            <span class="font-medium text-sm text-gray-700 dark:text-gray-300">Sắp Xếp Chữ</span>
        </button>
         <button onclick="showScreen('pronunciation-screen')" class="col-span-2 md:col-span-1 flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl shadow-md bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:-translate-y-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            <span class="font-medium text-sm text-gray-700 dark:text-gray-300">Phát Âm</span>
        </button>

        <button onclick="showScreen('stats-screen')" class="col-span-1 flex flex-col items-center justify-center pt-2 pb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span class="text-xs text-gray-600 dark:text-gray-400 mt-1">Thống kê</span>
        </button>
        <button onclick="showScreen('achievements-screen')" class="col-span-1 flex flex-col items-center justify-center pt-2 pb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v4m-2-2h4m5 4v4m-2-2h4M17 3l4 4M5 21l4-4M17 21l-4-4M3 17l4 4" /></svg>
            <span class="text-xs text-gray-600 dark:text-gray-400 mt-1">Thành tựu</span>
        </button>
        <button onclick="showScreen('exam-screen')" class="col-span-1 flex flex-col items-center justify-center pt-2 pb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-5.998 12.078 12.078 0 01.665-6.479L12 14z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-5.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
            <span class="text-xs text-gray-600 dark:text-gray-400 mt-1">Luyện thi</span>
        </button>
         <button onclick="showScreen('settings-screen')" class="col-span-1 flex flex-col items-center justify-center pt-2 pb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span class="text-xs text-gray-600 dark:text-gray-400 mt-1">Cài đặt</span>
        </button>
    `;

    if (!document.getElementById('review-screen')) {
        document.getElementById('app-screens').insertAdjacentHTML('beforeend', `<div id="review-screen" class="app-screen hidden text-center"></div>`);
    }

    document.getElementById('spelling-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Điền từ đúng cho nghĩa sau:</h2><div class="flex justify-center items-center gap-4 mb-4"><p id="spelling-meaning" class="text-xl bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-gray-900 dark:text-gray-100"></p><button id="spelling-speak-btn" class="p-3 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white shadow-md" title="Nghe lại"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button></div><div id="spelling-example" class="text-gray-600 dark:text-gray-400 italic mb-4"></div><input type="text" id="spelling-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" placeholder="Nhập từ tiếng Anh..."><div class="mt-4"><button onclick="checkSpelling()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg mr-2">Kiểm tra</button><button onclick="startSpelling()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Từ khác</button></div><p id="spelling-result" class="mt-4 h-6 text-lg font-medium"></p>`;
    document.getElementById('reading-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Flashcard</h2><div class="perspective-1000"><div id="flashcard" class="flashcard relative w-full h-56 md:h-64 cursor-pointer" onclick="this.classList.toggle('is-flipped')"><div class="flashcard-inner relative w-full h-full"><div id="flashcard-front" class="flashcard-front absolute w-full h-full bg-teal-500 rounded-xl flex flex-col items-center justify-center p-4 shadow-lg"></div><div id="flashcard-back" class="flashcard-back absolute w-full h-full bg-teal-700 rounded-xl flex flex-col items-center justify-center p-4 shadow-lg"></div></div></div></div><div class="mt-6 flex justify-center items-center gap-4"><button onclick="changeFlashcard(-1)" class="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 p-3 rounded-full shadow-md"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button><span id="card-counter" class="text-gray-700 dark:text-gray-300 font-medium"></span><button onclick="changeFlashcard(1)" class="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 p-3 rounded-full shadow-md"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button></div>`;
    document.getElementById('shuffle-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Danh sách từ vựng</h2><div class="mb-4"><label for="shuffle-category-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Lọc theo chủ đề:</label><select id="shuffle-category-filter" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"></select></div><div class="text-sm text-gray-600 dark:text-gray-400 mb-4">Màu sắc thể hiện mức độ thành thạo: <span class="text-green-500">Tốt</span>, <span class="text-yellow-500">Đang học</span>, <span class="text-red-500">Cần ôn</span>.</div><ul id="vocab-list-display" class="space-y-2 max-h-80 overflow-y-auto"></ul>`;
    document.getElementById('scramble-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Sắp xếp các chữ cái sau:</h2><p class="text-gray-600 dark:text-gray-400 mb-4">Gợi ý: Từ này có nghĩa là "<span id="scramble-meaning" class="font-semibold"></span>"</p><div id="scrambled-word-display" class="flex justify-center items-center gap-2 my-6 flex-wrap"></div><input type="text" id="scramble-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white" placeholder="Nhập đáp án của bạn..."><div class="mt-4"><button onclick="checkScramble()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg mr-2">Kiểm tra</button><button onclick="startScramble()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Từ khác</button></div><p id="scramble-result" class="mt-4 h-6 text-lg font-medium"></p>`;
    document.getElementById('mcq-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Chọn nghĩa đúng cho từ sau:</h2><div class="flex justify-center items-center gap-4 mb-6"><p id="mcq-word" class="text-3xl font-bold bg-gray-100 dark:bg-gray-700 py-4 px-6 rounded-lg text-gray-900 dark:text-gray-100"></p><button id="mcq-speak-btn" class="p-3 bg-sky-500 hover:bg-sky-600 rounded-full text-white shadow-md" title="Nghe lại"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button></div><div id="mcq-options" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div><p id="mcq-result" class="mt-6 h-6 text-lg font-medium"></p>`;
    document.getElementById('listening-screen').innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Nghe và gõ lại từ bạn nghe được</h2><div class="my-6"><button id="listening-speak-btn" class="bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-full shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button></div><input type="text" id="listening-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-700 dark:text-white" placeholder="Nhập từ bạn nghe được..."><div class="mt-4"><button onclick="checkListening()" class="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-lg mr-2">Kiểm tra</button><button onclick="startListening()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Từ khác</button></div><p id="listening-result" class="mt-4 h-6 text-lg font-medium"></p>`;
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
    
    const mainMenu = document.getElementById('main-menu');
    const appScreensContainer = document.getElementById('app-screens');

    if (mainMenu) mainMenu.style.display = isMainMenu ? 'grid' : 'none';
    if (appScreensContainer) appScreensContainer.classList.toggle('hidden', isMainMenu);
    
    document.querySelectorAll('.app-screen').forEach(s => s.classList.add('hidden'));
    const targetScreen = document.getElementById(screenId);
    if(targetScreen) {
        targetScreen.classList.remove('hidden');
        const screenInitializers = {
            'review-screen': game.renderReviewCard, // Chỉ render, không start lại
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
        if (screenInitializers[screenId]) {
            screenInitializers[screenId]();
        }
    }
}

export function updateReviewButton() {
    const badge = document.getElementById('review-count-badge');
    if (!badge) return;

    const count = getReviewableWords().length;
    badge.textContent = count;

    if (count > 0) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}


export function updateDashboard() {
    updateStreakDisplay();
    populateCategoryFilter();
    updateProgressBar();
    updateReviewButton(); 
    const vocabSourceEl = document.getElementById('vocab-source');
    if (vocabSourceEl) {
        if (state.vocabList && state.vocabList.length > 0) {
            vocabSourceEl.textContent = `Bộ từ hiện tại: ${state.vocabList.length} từ`;
        } else {
            vocabSourceEl.innerHTML = `
                <span class="text-orange-500 font-semibold">Bộ từ vựng đang trống!</span> 
                <p class="text-sm text-gray-500 dark:text-gray-400">Vào "Quản lý từ vựng" để thêm từ hoặc import từ Google Sheet.</p>
            `;
        }
    }
}

function updateStreakDisplay() {
    const streakDisplayEl = document.getElementById('streak-display');
    if (streakDisplayEl) streakDisplayEl.innerHTML = `🔥 ${state.appData.streak || 0}`;
}

function updateProgressBar() {
    const progressBarEl = document.getElementById('progress-bar');
    if (!progressBarEl) return;
    
    const totalWords = state.filteredVocabList.length;
    if (totalWords === 0) {
        progressBarEl.style.width = '0%';
        progressBarEl.textContent = '0%';
        return;
    }
    const learnedWords = state.filteredVocabList.filter(w => state.appData.progress[w.word]?.level > 0).length;
    const percentage = Math.round((learnedWords / totalWords) * 100);
    progressBarEl.style.width = `${percentage}%`;
    progressBarEl.textContent = `${percentage}%`;
}

function populateCategoryFilter() {
    const categoryFilterEl = document.getElementById('category-filter');
    if (!categoryFilterEl) return;

    const categories = [...new Set(state.vocabList.map(v => v.category || 'Chung'))];
    const currentCategory = categoryFilterEl.value;
    categoryFilterEl.innerHTML = '<option value="all">Tất cả chủ đề</option>';
    categories.sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilterEl.appendChild(option);
    });
    if (currentCategory) categoryFilterEl.value = currentCategory;
    applyFilters();
}

export function applyFilters() {
    const categoryFilterEl = document.getElementById('category-filter');
    const difficultyFilterEl = document.getElementById('difficulty-filter');
    if (!categoryFilterEl || !difficultyFilterEl) return;

    const selectedCategory = categoryFilterEl.value;
    const selectedDifficulty = difficultyFilterEl.value;

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
    if (feedbackEl) {
        feedbackEl.textContent = message;
        const colorClasses = {
            success: 'text-green-500',
            error: 'text-red-500',
            info: 'text-blue-500'
        };
        feedbackEl.className = `mt-2 h-5 text-sm ${colorClasses[type] || 'text-gray-500'}`;
    }
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