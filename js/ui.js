// js/ui.js

import { state, setState } from './state.js';
import * as game from './gameModes.js';
import * as vocabManager from './vocabManager.js';
import * as stats from './statistics.js';
import * as exam from './exam.js';
import * as achievements from './achievements.js';
import { getReviewableWords, saveUserData, updateAndCacheSuggestions } from './data.js';
import * as profile from './profile.js';

// ===================================================================
// TAB & SCREEN MANAGEMENT
// ===================================================================

/**
 * Hiển thị một tab chính và ẩn các tab khác.
 * @param {string} tabId - ID của tab cần hiển thị (e.g., 'home-tab').
 */
export function showTab(tabId) {
    // Ẩn tất cả nội dung của các tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Deactivate tất cả các nút tab
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Hiển thị tab được chọn
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Activate nút tab tương ứng
    const selectedButton = document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    // Cập nhật gợi ý khi người dùng quay lại tab "Học"
    if (tabId === 'home-tab') {
        updateAndCacheSuggestions();
    }
    
    // Render nội dung cho tab khi nó được hiển thị
    switch (tabId) {
        case 'home-tab':
            renderHomeTab();
            break;
        case 'vocab-tab':
            renderVocabTab();
            break;
        case 'progress-tab':
            renderProgressTab();
            break;
        case 'profile-tab':
            renderProfileTab();
            break;
    }
}


/**
 * Hiển thị một màn hình game dưới dạng modal/overlay.
 * @param {string} screenId - ID của màn hình game (e.g., 'spelling-screen').
 */
export function showGameScreen(screenId) {
    const container = document.getElementById('game-screen-container');
    if (!container) return;

    // Tạo một div mới cho màn hình game
    const gameScreenEl = document.createElement('div');
    gameScreenEl.id = screenId;
    gameScreenEl.className = 'game-screen active';
    gameScreenEl.innerHTML = `
        <div class="game-container bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-4 md:p-6 relative text-center">
            <button onclick="closeGameScreen('${screenId}')" class="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-2 z-10">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div id="${screenId}-content"></div>
        </div>
    `;
    container.appendChild(gameScreenEl);

    const screenInitializers = {
        'suggestion-screen': game.startSuggestionMode,
        'review-screen': game.renderReviewCard,
        'spelling-screen': game.startSpelling,
        'reading-screen': game.startReading,
        'scramble-screen': game.startScramble,
        'mcq-screen': game.startMcq,
        'listening-screen': game.startListening,
        'exam-screen': exam.setupExamScreen,
        'pronunciation-screen': game.startPronunciation,
        'fill-blank-screen': game.startFillBlank,
    };

    if (screenInitializers[screenId]) {
        screenInitializers[screenId](`${screenId}-content`);
    }
}

/**
 * Đóng màn hình game hiện tại.
 * @param {string} screenId - ID của màn hình game cần đóng.
 */
export function closeGameScreen(screenId) {
    const gameScreenEl = document.getElementById(screenId);
    if (gameScreenEl) {
        gameScreenEl.remove();
    }
}


// ===================================================================
// TAB CONTENT RENDERERS
// ===================================================================

/**
 * Render nội dung cho Tab "Học".
 */
export function renderHomeTab() {
    const container = document.getElementById('home-tab');
    if (!container) return;

    const profileName = state.appData.profileName || "Bạn";
    const streak = state.appData.streak || 0;
    const reviewCount = getReviewableWords().length;
    const { type, value } = state.appData.settings?.dailyGoal || { type: 'words', value: 20 };
    const { words, minutes } = state.appData.dailyProgress || { words: 0, minutes: 0 };
    const progressValue = type === 'words' ? words : Math.floor(minutes);
    const progressPercentage = value > 0 ? Math.min(100, (progressValue / value) * 100) : 0;

    container.innerHTML = `
        <header class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold">Chào, ${profileName}!</h1>
                <p class="text-gray-500 dark:text-gray-400">Sẵn sàng để học chưa?</p>
            </div>
            <div class="text-center">
                <div class="text-3xl">🔥</div>
                <div class="font-bold text-orange-500">${streak}</div>
            </div>
        </header>

        <div class="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg mb-8 cursor-pointer transform hover:scale-105 transition-transform" onclick="showGameScreen('review-screen')">
            <div class="flex justify-between items-start">
                <div>
                    <h2 class="text-xl font-bold">Ôn tập hôm nay</h2>
                    <p class="text-3xl font-bold mt-1">${reviewCount} từ</p>
                </div>
                <div class="bg-white/20 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </div>
            </div>
            <div class="mt-4">
                <p class="text-xs font-medium mb-1">Mục tiêu ngày: ${progressValue}/${value} ${type === 'words' ? 'từ' : 'phút'}</p>
                <div class="w-full bg-white/20 rounded-full h-2">
                    <div class="bg-white h-2 rounded-full" style="width: ${progressPercentage}%"></div>
                </div>
            </div>
        </div>

        <div>
            <h3 class="text-lg font-semibold mb-4">Luyện tập</h3>
            <div class="space-y-3">
                ${renderPracticeModeItem('Học theo gợi ý', 'Tập trung vào từ khó và từ mới', 'suggestion-screen', 'bg-purple-100 dark:bg-purple-800')}
                ${renderPracticeModeItem('Đánh Vần', 'Luyện kỹ năng viết đúng chính tả', 'spelling-screen')}
                ${renderPracticeModeItem('Flashcard', 'Học từ với thẻ ghi nhớ', 'reading-screen')}
                ${renderPracticeModeItem('Trắc Nghiệm', 'Chọn nghĩa đúng của từ', 'mcq-screen')}
                ${renderPracticeModeItem('Luyện Nghe', 'Nghe và gõ lại từ', 'listening-screen')}
                ${renderPracticeModeItem('Sắp Xếp Chữ', 'Tạo thành từ đúng', 'scramble-screen')}
                ${renderPracticeModeItem('Phát Âm', 'Kiểm tra phát âm của bạn', 'pronunciation-screen')}
                ${renderPracticeModeItem('Điền từ', 'Hoàn thành câu với từ đúng', 'fill-blank-screen')}
            </div>
        </div>
    `;
}

/**
 * Render nội dung cho Tab "Từ vựng".
 */
export function renderVocabTab() {
    const container = document.getElementById('vocab-tab');
    if (!container) return;
    container.innerHTML = `
        <header class="mb-4">
            <h1 class="text-2xl font-bold">Kho từ vựng</h1>
        </header>
        <div id="vocab-management-content"></div>
        <button onclick="openVocabForm()" class="fixed bottom-20 right-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-40">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        </button>
    `;
    vocabManager.renderVocabManagementList('vocab-management-content');
}

/**
 * Render nội dung cho Tab "Tiến độ".
 */
export function renderProgressTab() {
    const container = document.getElementById('progress-tab');
    if (!container) return;
    container.innerHTML = `
        <header class="mb-6">
            <h1 class="text-2xl font-bold">Tiến độ của bạn</h1>
        </header>
        <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button id="progress-sub-tab-stats" class="sub-tab-btn active-sub-tab px-4 py-2 font-semibold" onclick="showProgressSubTab('stats')">Tổng quan</button>
            <button id="progress-sub-tab-achievements" class="sub-tab-btn px-4 py-2 font-semibold" onclick="showProgressSubTab('achievements')">Thành tựu</button>
        </div>
        <div id="stats-sub-tab-content" class="sub-tab-content active"></div>
        <div id="achievements-sub-tab-content" class="sub-tab-content"></div>
    `;
    stats.renderStatisticsPage('stats-sub-tab-content');
    achievements.renderAchievementsPage('achievements-sub-tab-content');
    showProgressSubTab('stats');
}

/**
 * Render nội dung cho Tab "Hồ sơ".
 */
export function renderProfileTab() {
    const container = document.getElementById('profile-tab');
    if (!container) return;
    const goal = state.appData.settings?.dailyGoal || { type: 'words', value: 20 };
    const isDarkMode = document.documentElement.classList.contains('dark');
    container.innerHTML = `
        <header class="text-center mb-8">
            <div class="relative inline-block"><div class="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-4xl font-bold text-indigo-600 dark:text-indigo-300">${(state.appData.profileName || 'A').charAt(0).toUpperCase()}</div></div>
            <h1 class="text-2xl font-bold mt-4">${state.appData.profileName || ''}</h1>
        </header>
        <div class="space-y-4">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">TÀI KHOẢN</h3>
            <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                ${renderSettingsItem('switch-profile-btn', 'Đổi hồ sơ', 'profile.switchProfile()')}
                ${renderSettingsItem('delete-profile-btn', 'Xóa hồ sơ này', 'profile.promptDeleteProfile()', 'text-red-500')}
            </div>
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2 mt-6">CÀI ĐẶT</h3>
            <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 class="font-medium mb-2">Tùy chọn học</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="category-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Chủ đề</label>
                        <select id="category-filter" onchange="applyFilters()" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500"></select>
                    </div>
                    <div>
                        <label for="difficulty-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Độ khó</label>
                        <select id="difficulty-filter" onchange="applyFilters()" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500">
                            <option value="all">Tất cả</option>
                            <option value="easy">Dễ</option>
                            <option value="medium">Trung bình</option>
                            <option value="hard">Khó</option>
                        </select>
                    </div>
                </div>
                 <p id="filter-result-info" class="text-center text-xs text-gray-500 mt-2 h-4"></p>
            </div>
            <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
                <div class="flex justify-between items-center"><label for="dark-mode-toggle-switch">Chế độ tối</label><button id="dark-mode-toggle-switch" onclick="toggleDarkMode()" class="p-2 rounded-lg text-2xl">${isDarkMode ? '🌙' : '☀️'}</button></div>
                <hr class="border-gray-200 dark:border-gray-600 my-2">
                <div><label for="voice-select" class="block text-sm font-medium mb-1">Giọng đọc</label><select id="voice-select" class="w-full p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"></select></div>
                <div class="mt-2"><label for="rate-slider" class="block text-sm font-medium">Tốc độ: <span id="rate-value">1.0</span>x</label><input id="rate-slider" type="range" min="0.5" max="2" step="0.1" value="1" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-500 mt-1"></div>
            </div>
            <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
                <label class="block text-sm font-medium mb-2">Mục tiêu hàng ngày</label>
                <div class="flex items-center gap-2">
                    <select id="goal-type-select" class="block w-2/3 p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                        <option value="words" ${goal.type === 'words' ? 'selected' : ''}>Ôn từ</option>
                        <option value="minutes" ${goal.type === 'minutes' ? 'selected' : ''}>Dành thời gian</option>
                    </select>
                    <input type="number" id="goal-value-input" value="${goal.value}" min="1" class="block w-1/3 p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                    <span id="goal-unit-label" class="text-sm text-gray-600 dark:text-gray-400">${goal.type === 'words' ? 'từ' : 'phút'}</span>
                </div>
            </div>
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2 mt-6">KHÁC</h3>
            <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                ${renderSettingsItem('exam-mode-btn', 'Luyện thi', "showGameScreen('exam-screen')")}
            </div>
        </div>
    `;
    
    populateFilters();
    applyFilters();
    setupVoiceOptions();
    addSettingsEventListeners();
}

// ===================================================================
// UI HELPERS & COMPONENT RENDERERS
// ===================================================================

function populateFilters() {
    const categoryFilterEl = document.getElementById('category-filter');
    const difficultyFilterEl = document.getElementById('difficulty-filter');
    if (!categoryFilterEl || !difficultyFilterEl) return;

    const categories = ['all', ...new Set(state.vocabList.map(v => v.category || 'Chung'))];
    categoryFilterEl.innerHTML = categories.map(cat => `<option value="${cat}">${cat === 'all' ? 'Tất cả chủ đề' : cat}</option>`).join('');

    categoryFilterEl.value = state.activeFilters.category;
    difficultyFilterEl.value = state.activeFilters.difficulty;
}

export function applyFilters() {
    const category = document.getElementById('category-filter')?.value || 'all';
    const difficulty = document.getElementById('difficulty-filter')?.value || 'all';
    setState({ activeFilters: { category, difficulty } });
    let filtered = state.vocabList;

    if (category !== 'all') {
        filtered = filtered.filter(v => (v.category || 'Chung') === category);
    }
    if (difficulty !== 'all') {
        filtered = filtered.filter(v => (v.difficulty || 'medium') === difficulty);
    }

    setState({ filteredVocabList: filtered });

    const infoEl = document.getElementById('filter-result-info');
    if (infoEl) {
        if (filtered.length < state.vocabList.length) {
            infoEl.textContent = `Áp dụng cho ${filtered.length} từ`;
        } else {
            infoEl.textContent = 'Áp dụng cho tất cả từ';
        }
    }
}

export function showProgressSubTab(subTabName) {
    document.querySelectorAll('.sub-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.sub-tab-btn').forEach(el => el.classList.remove('active-sub-tab'));
    document.getElementById(`${subTabName}-sub-tab-content`).style.display = 'block';
    document.getElementById(`progress-sub-tab-${subTabName}`).classList.add('active-sub-tab');
}

function renderPracticeModeItem(title, description, screenId, iconBgClass = 'bg-indigo-100 dark:bg-indigo-800') {
    return `<div onclick="showGameScreen('${screenId}')" class="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><div class="w-10 h-10 ${iconBgClass} rounded-lg flex items-center justify-center"></div><div class="flex-grow"><p class="font-semibold">${title}</p><p class="text-sm text-gray-500 dark:text-gray-400">${description}</p></div><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div>`;
}

function renderSettingsItem(id, text, onclickAction, textColor = '') {
    return `<div id="${id}" onclick="${onclickAction}" class="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600/50 first:rounded-t-lg last:rounded-b-lg"><span class="font-medium ${textColor}">${text}</span><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div>`;
}

export function handleGoalChange() {
    const typeSelect = document.getElementById('goal-type-select');
    const valueInput = document.getElementById('goal-value-input');
    const unitLabel = document.getElementById('goal-unit-label');
    if (!typeSelect || !valueInput || !unitLabel) return;
    const goalType = typeSelect.value;
    const goalValue = parseInt(valueInput.value) || 1;
    valueInput.value = goalValue;
    unitLabel.textContent = goalType === 'words' ? 'từ' : 'phút';
    state.appData.settings.dailyGoal = { type: goalType, value: goalValue };
    saveUserData();
    renderHomeTab();
}

export function updateDashboard() {
    if (document.getElementById('home-tab')?.classList.contains('active')) {
        renderHomeTab();
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
    if(document.getElementById('profile-tab')?.classList.contains('active')) {
        renderProfileTab();
    }
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
            voiceSelect.innerHTML = `<option value="">Không có giọng đọc</option>`;
            return;
        }
        state.availableVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name;
            voiceSelect.appendChild(option);
        });
        if (currentVal) voiceSelect.value = currentVal;
    }
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();
}

export function renderSuggestions() {
    // This function is no longer needed as suggestions are a game mode now.
}

export function addSettingsEventListeners() {
    const safeAddEventListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.removeEventListener(event, handler);
            element.addEventListener(event, handler);
        }
    };
    safeAddEventListener('rate-slider', 'input', (event) => {
        const rateValue = document.getElementById('rate-value');
        if (rateValue) rateValue.textContent = parseFloat(event.target.value).toFixed(1);
    });
    safeAddEventListener('goal-type-select', 'change', handleGoalChange);
    safeAddEventListener('goal-value-input', 'change', handleGoalChange);
}