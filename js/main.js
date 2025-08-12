// js/main.js

import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase.js';
import { setState, state } from './state.js';
import { showScreen, applyFilters, populateScreenHTML, cancelVocabEdit, setupVoiceOptions, toggleControls, toggleDarkMode, handleGoalChange, updateDashboard, renderSuggestions } from './ui.js';
import * as profile from './profile.js';
import * as data from './data.js';
import * as game from './gameModes.js';
import * as vocabManager from './vocabManager.js';
import * as exam from './exam.js';

const learningGameModes = ['spelling-screen', 'reading-screen', 'scramble-screen', 'mcq-screen', 'listening-screen', 'pronunciation-screen', 'fill-blank-screen', 'review-screen'];

function startRandomMode() {
    const randomModes = learningGameModes.filter(mode => mode !== 'review-screen');
    const randomScreen = randomModes[Math.floor(Math.random() * randomModes.length)];
    showScreen(randomScreen);
}

function startSessionTimer() {
    if (state.sessionTimer) return;

    const timerId = setInterval(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (state.appData.dailyProgress.date !== todayStr) {
             state.appData.dailyProgress = { date: todayStr, words: 0, minutes: 0 };
        }
        
        state.appData.dailyProgress.minutes += 1/60;
        updateDashboard();
    }, 1000);
    setState({ sessionTimer: timerId });
}

function stopSessionTimer() {
    if (state.sessionTimer) {
        clearInterval(state.sessionTimer);
        setState({ sessionTimer: null });
        data.saveUserData();
    }
}

function attachGlobalFunctions() {
    window.startRandomMode = startRandomMode;
    window.startSmartReview = game.startSmartReview;

    window.createNewProfile = profile.createNewProfile;
    window.switchProfile = profile.switchProfile;
    
    window.showScreen = (screenId) => {
        if (learningGameModes.includes(screenId)) {
            startSessionTimer();
        } else {
            stopSessionTimer();
        }
        showScreen(screenId);
    };
    window.toggleDarkMode = toggleDarkMode;

    window.handleVocabSubmit = vocabManager.handleVocabSubmit;
    window.editVocabWord = vocabManager.editVocabWord;
    window.deleteVocabWord = vocabManager.deleteVocabWord;
    window.updateWordDifficulty = vocabManager.updateWordDifficulty;
    window.filterVocabManagementList = vocabManager.filterVocabManagementList;
    window.cancelVocabEdit = cancelVocabEdit;
    window.importFromGoogleSheet = data.importFromGoogleSheet;

    window.checkSpelling = game.checkSpelling;
    window.startSpelling = game.startSpelling;
    window.changeFlashcard = game.changeFlashcard;
    window.speakWord = game.speakWord;
    window.checkScramble = game.checkScramble;
    window.startScramble = game.startScramble;
    window.toggleScrambleHint = game.toggleScrambleHint;
    window.checkMcq = game.checkMcq;
    window.checkListening = game.checkListening;
    window.startListening = game.startListening;

    window.startExam = exam.startExam;
    
    window.startPronunciation = game.startPronunciation;
    window.listenForPronunciation = game.listenForPronunciation;
    window.startFillBlank = game.startFillBlank;
    window.checkFillBlank = game.checkFillBlank;
}

function addEventListeners() {
    const safeAddEventListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        }
    };
    
    safeAddEventListener('category-filter', 'change', applyFilters);
    safeAddEventListener('difficulty-filter', 'change', applyFilters);
    
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'create-profile-btn') profile.createNewProfile();
        if (e.target.id === 'switch-profile-btn') profile.switchProfile();
        if (e.target.id === 'back-to-menu-btn') window.showScreen('main-menu'); 
        if (e.target.closest('#toggle-controls-btn')) toggleControls();
        if (e.target.closest('#cancel-delete-btn')) {
             const modal = document.getElementById('delete-confirm-modal');
             if (modal) modal.classList.add('hidden');
        }

        // THÊM MỚI: Xử lý sự kiện click cho các tab gợi ý
        if (e.target.classList.contains('suggestion-tab-btn')) {
            document.querySelectorAll('.suggestion-tab-btn').forEach(btn => btn.classList.remove('active-tab'));
            e.target.classList.add('active-tab');
            renderSuggestions(e.target.dataset.type);
        }
    });

    safeAddEventListener('rate-slider', 'input', (event) => {
        const rateValue = document.getElementById('rate-value');
        if (rateValue) {
            rateValue.textContent = parseFloat(event.target.value).toFixed(1);
        }
    });
    
    safeAddEventListener('goal-type-select', 'change', handleGoalChange);
    safeAddEventListener('goal-value-input', 'change', handleGoalChange);
}

document.addEventListener('DOMContentLoaded', () => {
    populateScreenHTML(); 
    setupVoiceOptions();
    attachGlobalFunctions();
    addEventListeners();

    signInAnonymously(auth).catch(error => {
        console.error("Lỗi đăng nhập ẩn danh:", error);
        const container = document.getElementById('profile-selection-container');
        if(container) container.innerHTML = `<div class="text-red-500">Lỗi kết nối Firebase. Vui lòng kiểm tra cấu hình và bật đăng nhập ẩn danh trong Console.</div>`;
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            setState({ authUserId: user.uid });
            await profile.displayProfileScreen();
        }
    });
});