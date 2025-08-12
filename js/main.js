// js/main.js

import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase.js';
import { setState, state } from './state.js';
import { showTab, showGameScreen, closeGameScreen, updateDashboard, addSettingsEventListeners } from './ui.js';
import * as profile from './profile.js';
import * as data from './data.js';
import * as game from './gameModes.js';
import * as vocabManager from './vocabManager.js';
import * as exam from './exam.js';
import * as ui from './ui.js';

const learningGameModes = ['spelling-screen', 'reading-screen', 'scramble-screen', 'mcq-screen', 'listening-screen', 'pronunciation-screen', 'fill-blank-screen', 'review-screen', 'exam-screen'];

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

/**
 * Gán các hàm cần thiết vào đối tượng window để có thể gọi từ HTML (onclick).
 */
function attachGlobalFunctions() {
    window.showTab = showTab;
    window.showGameScreen = (screenId) => {
        if (learningGameModes.includes(screenId)) {
            startSessionTimer();
        }
        showGameScreen(screenId);
    };
    window.closeGameScreen = (screenId) => {
        stopSessionTimer();
        closeGameScreen(screenId);
    };

    // Profile
    window.profile = profile;

    // UI
    window.toggleDarkMode = ui.toggleDarkMode;
    window.showProgressSubTab = ui.showProgressSubTab;

    // Vocab Manager
    window.openVocabForm = vocabManager.openVocabForm;
    window.handleVocabSubmit = vocabManager.handleVocabSubmit;
    window.editVocabWord = vocabManager.editVocabWord;
    window.deleteVocabWord = vocabManager.deleteVocabWord;
    window.filterVocabManagementList = vocabManager.filterVocabManagementList;
    window.importFromGoogleSheet = vocabManager.importFromGoogleSheet;
    window.closeVocabForm = vocabManager.closeVocabForm;

    // Game Modes
    window.speakWord = game.speakWord;
    window.checkSpelling = game.checkSpelling;
    window.changeFlashcard = game.changeFlashcard;
    window.checkScramble = game.checkScramble;
    window.toggleScrambleHint = game.toggleScrambleHint;
    window.checkMcq = game.checkMcq;
    window.checkListening = game.checkListening;
    window.listenForPronunciation = game.listenForPronunciation;
    window.checkFillBlank = game.checkFillBlank;
    window.handleReviewAnswer = game.handleReviewAnswer;

    // Exam
    window.startExam = exam.startExam;
    window.checkExamAnswer = exam.checkExamAnswer; // Cần global cho onclick
}

function addEventListeners() {
    const safeAddEventListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        }
    };

    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'create-profile-btn') profile.createNewProfile();
    });

    addSettingsEventListeners();
}


document.addEventListener('DOMContentLoaded', () => {
    attachGlobalFunctions();

    signInAnonymously(auth).catch(error => {
        console.error("Lỗi đăng nhập ẩn danh:", error);
        const container = document.getElementById('profile-selection-container');
        if(container) container.innerHTML = `<div class="text-red-500">Lỗi kết nối Firebase. Vui lòng kiểm tra cấu hình và bật đăng nhập ẩn danh trong Console.</div>`;
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            setState({ authUserId: user.uid });
            await profile.displayProfileScreen();
        } else {
            // Hiển thị màn hình chọn hồ sơ nếu không có user
            document.getElementById('profile-selection-container').classList.remove('hidden');
            document.getElementById('main-app-container').classList.add('hidden');
            document.getElementById('loading-container').classList.add('hidden');
        }
    });

    // Thêm các event listener sau khi DOM đã load
    addEventListeners();
});