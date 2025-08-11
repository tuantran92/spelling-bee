// js/main.js
// File chính - Điểm khởi đầu của ứng dụng.
// Chịu trách nhiệm điều phối, khởi tạo và gán các sự kiện.

import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase.js';
import { setState } from './state.js';
import { DOMElements, showScreen, applyFilters, populateScreenHTML, cancelVocabEdit, setupVoiceOptions, toggleControls } from './ui.js';
import * as profile from './profile.js';
import * as data from './data.js';
import * as game from './gameModes.js';
import * as vocabManager from './vocabManager.js';
import * as exam from './exam.js';

/**
 * Gán các hàm vào đối tượng window để HTML có thể gọi qua onclick.
 */
function attachGlobalFunctions() {
    // Profile
    window.createNewProfile = profile.createNewProfile;
    window.switchProfile = profile.switchProfile;
    
    // UI
    window.showScreen = showScreen;

    // Vocab Management
    window.handleVocabSubmit = vocabManager.handleVocabSubmit;
    window.editVocabWord = vocabManager.editVocabWord;
    window.deleteVocabWord = vocabManager.deleteVocabWord;
    window.updateWordDifficulty = vocabManager.updateWordDifficulty;
    window.filterVocabManagementList = vocabManager.filterVocabManagementList;
    window.cancelVocabEdit = cancelVocabEdit;
    window.importFromGoogleSheet = data.importFromGoogleSheet;

    // Game modes
    window.checkSpelling = game.checkSpelling;
    window.startSpelling = game.startSpelling;
    window.changeFlashcard = game.changeFlashcard;
    window.speakWord = game.speakWord;
    window.checkScramble = game.checkScramble;
    window.startScramble = game.startScramble;
    window.checkMcq = game.checkMcq;
    window.checkListening = game.checkListening;
    window.startListening = game.startListening;

    // Exam mode
    window.startExam = exam.startExam;
    
    // Các hàm cho chế độ mới
    window.startPronunciation = game.startPronunciation;
    window.listenForPronunciation = game.listenForPronunciation;
    window.startFillBlank = game.startFillBlank;
    window.checkFillBlank = game.checkFillBlank;
}

/**
 * Gán các sự kiện cho các element không có onclick.
 * ĐÃ SỬA LỖI: Thêm kiểm tra null để tránh crash ứng dụng.
 */
function addEventListeners() {
    // Hàm phụ để gán sự kiện an toàn
    const safeAddEventListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with ID '${id}' not found.`);
        }
    };
    
    const safeAddOnClick = (id, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.onclick = handler;
        } else {
            console.warn(`Element with ID '${id}' not found.`);
        }
    };

    // Gán sự kiện bằng các hàm an toàn
    safeAddEventListener('category-filter', 'change', applyFilters);
    safeAddEventListener('difficulty-filter', 'change', applyFilters);
    
    safeAddOnClick('cancel-delete-btn', () => DOMElements.deleteConfirmModal.classList.add('hidden'));
    safeAddOnClick('create-profile-btn', profile.createNewProfile);
    safeAddOnClick('switch-profile-btn', profile.switchProfile);
    safeAddOnClick('back-to-menu-btn', () => showScreen('main-menu'));
    
    safeAddEventListener('toggle-controls-btn', 'click', toggleControls);
}

/**
 * Khởi tạo ứng dụng khi DOM đã sẵn sàng.
 */
document.addEventListener('DOMContentLoaded', () => {
    populateScreenHTML(); 
    setupVoiceOptions();
    addEventListeners();
    attachGlobalFunctions();

    signInAnonymously(auth).catch(error => {
        console.error("Lỗi đăng nhập ẩn danh:", error);
        DOMElements.profileSelectionContainer.innerHTML = `<div class="text-red-500">Lỗi kết nối Firebase. Vui lòng kiểm tra cấu hình và bật đăng nhập ẩn danh trong Console.</div>`;
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            setState({ authUserId: user.uid });
            await profile.displayProfileScreen();
        }
    });
});