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

export function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');
    document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`)?.classList.add('active');

    if (tabId === 'home-tab') {
        updateAndCacheSuggestions();
    }
    
    switch (tabId) {
        case 'home-tab': renderHomeTab(); break;
        case 'vocab-tab': renderVocabTab(); break;
        case 'progress-tab': renderProgressTab(); break;
        case 'profile-tab': renderProfileTab(); break;
    }
}

export function showGameScreen(screenId) {
    const container = document.getElementById('game-screen-container');
    if (!container) return;
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
    if (screenInitializers[screenId]) { screenInitializers[screenId](`${screenId}-content`); }
}

export function closeGameScreen(screenId) {
    document.getElementById(screenId)?.remove();
    if (screenId === 'fill-blank-screen') {
        setState({ fillBlankSession: { isActive: false, words: [], currentIndex: 0 } });
    }
}

// ... (phần còn lại của file giữ nguyên)

// ===================================================================
// TAB CONTENT RENDERERS
// ===================================================================

export function renderHomeTab() {
    const container = document.getElementById('home-tab');
    if (!container) return;
    const profileName = state.appData.profileName || "Bạn";
    const streak = state.appData.streak || 0;
    
    const avatarSrc = state.appData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=random&color=fff`;
    
    const reviewCount = getReviewableWords().length;
    const { type, value } = state.appData.settings?.dailyGoal || { type: 'words', value: 20 };
    const { words, minutes } = state.appData.dailyProgress || { words: 0, minutes: 0 };
    const progressValue = type === 'words' ? words : Math.floor(minutes);
    const progressPercentage = value > 0 ? Math.min(100, (progressValue / value) * 100) : 0;

    container.innerHTML = `
        <header class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl lg:text-3xl font-bold">Chào, ${profileName}!</h1>
                <p class="text-gray-500 dark:text-gray-400">Sẵn sàng để học chưa?</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-center">
                    <div class="text-3xl lg:text-4xl">🔥</div>
                    <div class="font-bold text-orange-500">${streak}</div>
                </div>
                <img src="${avatarSrc}" alt="Avatar" class="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800">
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
            <h3 class="text-lg lg:text-xl font-semibold mb-4">Luyện tập</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${renderPracticeModeItem('Học theo gợi ý', 'Tập trung vào từ khó và từ mới', 'suggestion-screen')}
                ${renderPracticeModeItem('Đánh Vần', 'Luyện kỹ năng viết đúng chính tả', 'spelling-screen')}
                ${renderPracticeModeItem('Flashcard', 'Học từ với thẻ ghi nhớ', 'reading-screen')}
                ${renderPracticeModeItem('Trắc Nghiệm', 'Chọn nghĩa đúng của từ', 'mcq-screen')}
                ${renderPracticeModeItem('Luyện Nghe', 'Nghe và gõ lại từ', 'listening-screen')}
                ${renderPracticeModeItem('Sắp Xếp Chữ', 'Tạo thành từ đúng', 'scramble-screen')}
                ${renderPracticeModeItem('Phát Âm', 'Kiểm tra phát âm của bạn', 'pronunciation-screen')}
                ${renderPracticeModeItem('Điền từ', 'Hoàn thành câu với từ đúng', 'fill-blank-screen')}
                ${renderPracticeModeItem('Luyện Thi', 'Kiểm tra kiến thức tổng hợp', 'exam-screen')}
            </div>
        </div>
    `;
}

export function renderVocabTab() {
    const container = document.getElementById('vocab-tab');
    if (!container) return;
    container.innerHTML = `
        <header class="mb-4"><h1 class="text-2xl font-bold">Kho từ vựng</h1></header>
        <div id="vocab-management-content"></div>
        <button onclick="openVocabForm()" class="fixed bottom-20 right-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-40">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        </button>
    `;
    vocabManager.renderVocabManagementList('vocab-management-content');
}

export function renderProgressTab() {
    const container = document.getElementById('progress-tab');
    if (!container) return;
    container.innerHTML = `
        <header class="mb-6"><h1 class="text-2xl font-bold">Tiến độ của bạn</h1></header>
        <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button id="progress-sub-tab-stats" class="sub-tab-btn active-sub-tab px-4 py-2 font-semibold" onclick="showProgressSubTab('stats')">Tổng quan</button>
            <button id="progress-sub-tab-leaderboard" class="sub-tab-btn px-4 py-2 font-semibold" onclick="showProgressSubTab('leaderboard')">Bảng xếp hạng</button>
            <button id="progress-sub-tab-achievements" class="sub-tab-btn px-4 py-2 font-semibold" onclick="showProgressSubTab('achievements')">Thành tựu</button>
        </div>
        <div id="stats-sub-tab-content" class="sub-tab-content active"></div>
        <div id="leaderboard-sub-tab-content" class="sub-tab-content"></div>
        <div id="achievements-sub-tab-content" class="sub-tab-content"></div>
    `;
    stats.renderStatisticsPage('stats-sub-tab-content');
    stats.renderLeaderboardPage('leaderboard-sub-tab-content');
    achievements.renderAchievementsPage('achievements-sub-tab-content');
    showProgressSubTab('stats');
}

export function renderProfileTab() {
    const container = document.getElementById('profile-tab');
    if (!container) return;
    const goal = state.appData.settings?.dailyGoal || { type: 'words', value: 20 };
    const fontSize = state.appData.settings?.fontSize || 1.0;
    const isDarkMode = document.documentElement.classList.contains('dark');
    const avatarSrc = state.appData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.appData.profileName)}&background=random&color=fff`;

    container.innerHTML = `
        <header class="text-center mb-8">
            <div class="relative inline-block group">
                <img id="profile-avatar" src="${avatarSrc}" alt="Avatar" class="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 dark:border-indigo-800">
                <label for="avatar-upload-input" class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </label>
                <input type="file" id="avatar-upload-input" class="hidden" accept="image/*">
            </div>
            <h1 class="text-2xl font-bold mt-4">${state.appData.profileName || ''}</h1>
        </header>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="space-y-4">
                <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">TÀI KHOẢN & DỮ LIỆU</h3>
                <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    ${renderSettingsItem('switch-profile-btn', 'Đổi hồ sơ', 'profile.switchProfile()')}
                    
                    <div id="update-phonetics-wrapper">
                        ${renderSettingsItem('update-phonetics-btn', 'Cập nhật phiên âm (hàng loạt)', 'profile.updateAllPhonetics()')}
                    </div>
                    ${renderSettingsItem('delete-profile-btn', 'Xóa hồ sơ này', 'profile.promptDeleteProfile()', 'text-red-500')}
                </div>
            </div>
            <div class="space-y-4">
                <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">CÀI ĐẶT</h3>
                <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
                    <h4 class="font-medium mb-2">Tùy chọn học</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="category-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Chủ đề</label>
                            <select id="category-filter" onchange="applyFilters()" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500"></select>
                        </div>
                        <div>
                            <label for="difficulty-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Độ khó</label>
                            <select id="difficulty-filter" onchange="applyFilters()" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500">
                                <option value="all">Tất cả</option><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option>
                            </select>
                        </div>
                    </div>
                     <p id="filter-result-info" class="text-center text-xs text-gray-500 mt-2 h-4"></p>
                </div>
                <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
                    <div class="flex justify-between items-center"><label for="dark-mode-toggle-switch">Chế độ tối</label><button id="dark-mode-toggle-switch" onclick="toggleDarkMode()" class="p-2 rounded-lg text-2xl">${isDarkMode ? '🌙' : '☀️'}</button></div>
                    <hr class="border-gray-200 dark:border-gray-600 my-2">
                    <div>
                        <label for="voice-select" class="block text-sm font-medium mb-1">Giọng đọc</label>
                        <div class="flex items-center gap-2">
                            <select id="voice-select" class="w-full p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"></select>
                            <button id="demo-voice-btn" class="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500" title="Nghe thử">
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="mt-2"><label for="rate-slider" class="block text-sm font-medium">Tốc độ: <span id="rate-value">1.0</span>x</label><input id="rate-slider" type="range" min="0.5" max="2" step="0.1" value="1" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-500 mt-1"></div>
                    <div class="mt-2"><label for="font-size-slider" class="block text-sm font-medium">Cỡ chữ từ vựng: <span id="font-size-value">${fontSize.toFixed(1)}</span>x</label><input id="font-size-slider" type="range" min="0.8" max="1.5" step="0.1" value="${fontSize}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-500 mt-1"></div>
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
            </div>
        </div>
    `;
    
    populateFilters();
    applyFilters();
    setupVoiceOptions();
    addSettingsEventListeners();
    applyAppearanceSettings();
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

function renderPracticeModeItem(title, description, screenId) {
    const styles = {
        'suggestion-screen':  { color: 'purple', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>'},
        'spelling-screen':    { color: 'blue', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>'},
        'reading-screen':     { color: 'teal', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>'},
        'mcq-screen':         { color: 'sky', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>'},
        'listening-screen':   { color: 'rose', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>'},
        'scramble-screen':    { color: 'orange', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>'},
        'pronunciation-screen': { color: 'red', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>'},
        'fill-blank-screen':  { color: 'green', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>'},
        'exam-screen':        { color: 'indigo', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR_CLASS" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>'}
    };
    
    const style = styles[screenId] || { color: 'gray', icon: '' };
    const bgColor = `bg-${style.color}-100 dark:bg-${style.color}-900/50`;
    const iconColor = `text-${style.color}-500 dark:text-${style.color}-400`;

    return `<div onclick="showGameScreen('${screenId}')" class="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <div class="w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center">
                    ${style.icon.replace('SVG_COLOR_CLASS', iconColor)}
                </div>
                <div class="flex-grow">
                    <p class="font-semibold">${title}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${description}</p>
                </div>
                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>`;
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

export function handleFontSizeChange() {
    const slider = document.getElementById('font-size-slider');
    const display = document.getElementById('font-size-value');
    if (!slider || !display) return;

    const newSize = parseFloat(slider.value);
    display.textContent = newSize.toFixed(1);
    state.appData.settings.fontSize = newSize;
    applyAppearanceSettings();
    saveUserData();
}

function applyAppearanceSettings() {
    const isDark = state.appData.settings?.darkMode ?? localStorage.getItem('darkMode') === 'true';
    document.documentElement.classList.toggle('dark', isDark);

    const fontSize = state.appData.settings?.fontSize || 1.0;
    document.documentElement.style.setProperty('--vocab-font-scale', fontSize);
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
    if (state.appData.settings) {
        state.appData.settings.darkMode = newDarkModeState;
        saveUserData();
    }
    applyAppearanceSettings();
    if(document.getElementById('profile-tab')?.classList.contains('active')) {
        renderProfileTab();
    }
}

export function setupVoiceOptions() {
    const synth = window.speechSynthesis;

    function populateVoiceList() {
        const voiceSelect = document.getElementById('voice-select');
        if (!voiceSelect) return;

        // Đợi một chút để đảm bảo danh sách giọng đọc đã sẵn sàng
        setTimeout(() => {
            let voices = synth.getVoices();
            if (voices.length === 0) {
                 // Thử lại nếu danh sách rỗng
                setTimeout(populateVoiceList, 100);
                return;
            }

            // Lọc cả giọng Tiếng Anh (en) và Tiếng Việt (vi)
            const supportedVoices = voices.filter(voice => voice.lang.startsWith('en') || voice.lang.startsWith('vi'));
            setState({ availableVoices: supportedVoices });

            const savedVoiceName = state.appData.settings.voice;
            voiceSelect.innerHTML = '';

            // Nhóm giọng đọc theo ngôn ngữ
            const enVoices = supportedVoices.filter(v => v.lang.startsWith('en'));
            const viVoices = supportedVoices.filter(v => v.lang.startsWith('vi'));

            if (enVoices.length > 0) {
                const group = document.createElement('optgroup');
                group.label = 'Giọng Tiếng Anh';
                enVoices.forEach(voice => {
                    let option = document.createElement('option');
                    option.textContent = `${voice.name} (${voice.lang})`;
                    option.value = voice.name;
                    if (voice.name === savedVoiceName) option.selected = true;
                    group.appendChild(option);
                });
                voiceSelect.appendChild(group);
            }

            if (viVoices.length > 0) {
                const group = document.createElement('optgroup');
                group.label = 'Giọng Tiếng Việt';
                viVoices.forEach(voice => {
                    let option = document.createElement('option');
                    option.textContent = `${voice.name} (${voice.lang})`;
                    option.value = voice.name;
                    if (voice.name === savedVoiceName) option.selected = true;
                    group.appendChild(option);
                });
                voiceSelect.appendChild(group);
            }

            if (voiceSelect.selectedIndex === -1 && voiceSelect.options.length > 0) {
                voiceSelect.options[0].selected = true;
            }

        }, 50); // Thêm độ trễ nhỏ
    }

    populateVoiceList();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }
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

    safeAddEventListener('demo-voice-btn', 'click', () => {
        const voiceSelect = document.getElementById('voice-select');
        const rateSlider = document.getElementById('rate-slider');
        if (!voiceSelect || !rateSlider) return;
        
        const selectedVoiceName = voiceSelect.value;
        const rate = parseFloat(rateSlider.value);

        if (window.speakWord) {
            window.speakWord("Hello, this is a test.", null, { voiceName: selectedVoiceName, rate: rate });
        }
    });

    safeAddEventListener('font-size-slider', 'input', handleFontSizeChange);
    safeAddEventListener('avatar-upload-input', 'change', profile.handleAvatarUpload);
}

// === HÀM MỚI CHO TOAST ===
export function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'bg-gray-800 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-up';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        // Thêm class để bắt đầu animation fade-out
        toast.classList.remove('animate-fade-in-up');
        toast.classList.add('animate-fade-out-down');
        
        // Xóa element khỏi DOM sau khi animation kết thúc
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, duration);
}
// === KẾT THÚC HÀM MỚI ===