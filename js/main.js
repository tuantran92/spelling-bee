// js/main.js
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase.js';
import { setState, state } from './state.js';
import { showTab, showGameScreen, closeGameScreen, updateDashboard, addSettingsEventListeners, applyFilters, handleFontSizeChange } from './ui.js';
import * as profile from './profile.js';
import * as data from './data.js';
import * as game from './gameModes.js';
import * as vocabManager from './vocabManager.js';
import * as exam from './exam.js';
import * as ui from './ui.js';
import * as scramble from './game-modes/scramble.js';
import * as mcq from './game-modes/mcq.js';
// 🔊 TTS chuẩn + interceptor toàn cục
import { speakWord as ttsSpeakWord, installTTSInterceptor } from './tts.js';

const learningGameModes = [
  'suggestion-screen', 'review-screen', 'spelling-screen', 'reading-screen',
  'scramble-screen', 'mcq-screen', 'listening-screen', 'pronunciation-screen',
  'scramble-screen', 'timed-scramble-screen', 'mcq-screen', 'listening-screen', 'pronunciation-screen',
  'fill-blank-screen', 'exam-screen', 'remember-word-screen'
];

function startSessionTimer() {
  if (state.sessionTimer) return;
  const timerId = setInterval(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (state.appData.dailyProgress.date !== todayStr) {
      state.appData.dailyProgress = { date: todayStr, words: 0, minutes: 0 };
    }
    state.appData.dailyProgress.minutes =
      Number(state.appData.dailyProgress.minutes || 0) + 1/60;
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
  // Tabs & màn hình
  window.showTab = showTab;
  window.showGameScreen = (screenId) => {
    if (learningGameModes.includes(screenId)) startSessionTimer();
    showGameScreen(screenId);
  };
  window.closeGameScreen = (screenId) => {
    stopSessionTimer();
    closeGameScreen(screenId);
  };

  // UI & Profile
  window.toggleDarkMode = ui.toggleDarkMode;
  window.showProgressSubTab = ui.showProgressSubTab;
  window.applyFilters = applyFilters;
  window.handleFontSizeChange = ui.handleFontSizeChange;
  window.profile = profile;
  window.exportToCSV = vocabManager.exportToCSV;

  // Vocab Manager
  window.openVocabForm = vocabManager.openVocabForm;
  window.handleVocabFormSubmit = vocabManager.handleVocabFormSubmit;
  window.editVocabWord = vocabManager.editVocabWord;
  window.deleteVocabWord = vocabManager.deleteVocabWord;
  window.importFromGoogleSheet = vocabManager.importFromGoogleSheet;
  window.closeVocabForm = vocabManager.closeVocabForm;
  window.updateWordDifficulty = vocabManager.updateWordDifficulty;
  window.showWordStats = vocabManager.showWordStats;
  window.closeWordStats = vocabManager.closeWordStats;
  window.selectWordImage = vocabManager.selectWordImage;
  window.skipImageSelection = vocabManager.skipImageSelection;
  window.loadMoreImages = vocabManager.loadMoreImages;

  // 🔊 TTS chuẩn (nếu gamemode nào vẫn gọi window.speakWord thì sẽ dùng đúng giọng)
  window.speakWord = (text, opts, overrides) => ttsSpeakWord(text, opts, overrides);

  // Game Modes (các API giữ nguyên)
  window.checkSpelling = game.checkSpelling;
  window.handleFlashcardAnswer = game.handleFlashcardAnswer;
  window.checkListening = game.checkListening;
  window.listenForPronunciation = game.listenForPronunciation;
  window.checkFillBlank = game.checkFillBlank;
  window.toggleFillBlankHint = game.toggleFillBlankHint;
  window.skipFillBlankQuestion = game.skipFillBlankQuestion;
  window.translateFillBlankSentence = game.translateFillBlankSentence;
  window.handleReviewAnswer = game.handleReviewAnswer;
  window.startSuggestionMode = game.startSuggestionMode;
  window.checkRememberWord = game.checkRememberWord;

  window.startScramble = scramble.startScramble;
  window.checkScramble = scramble.checkScramble;
  window.toggleScrambleHint = scramble.toggleScrambleHint;
  window.showScrambleAnswer = scramble.showScrambleAnswer;
  window.handleScrambleLetterClick = scramble.handleScrambleLetterClick;
  window.handleAnswerLetterClick = scramble.handleAnswerLetterClick;
  window.handleScrambleBackspace = scramble.handleScrambleBackspace;

  window.startMcq = mcq.startMcq;
  window.checkMcq = mcq.checkMcq;

  window.startExam = exam.startExam;
  window.checkExamAnswer = exam.checkExamAnswer;

  window.startReading = game.startReading;
  window.handleFlashcardAnswer = game.handleFlashcardAnswer;

  window.startSuggestionMode   = game.startSuggestionMode;
  window.startSuggestionSession = game.startSuggestionSession;
  window.nextSuggestionWord     = game.nextSuggestionWord;
  window.handleReviewAnswer     = game.handleReviewAnswer;

  window.startWordMatch = game.startWordMatch;
  window.startHangman   = game.startHangman;
  window.hangmanGuess   = game.hangmanGuess;

  window.openEtymologyPopup = game.openEtymologyPopup;
}

function addEventListeners() {
  document.body.addEventListener('click', (e) => {
    const target = e.target;

    if (target.id === 'create-profile-btn') {
      profile.createNewProfile();
    }

    if (target.closest('#show-create-form-btn')) {
      const form = document.getElementById('create-profile-form');
      const button = document.getElementById('show-create-form-btn');
      if (form) {
        form.classList.toggle('hidden');
        if (button.querySelector('span')) {
          const isHidden = form.classList.contains('hidden');
          button.querySelector('span').textContent = isHidden ? 'Tạo hồ sơ mới' : 'Đóng';
        }
      }
    }

    // Khi bấm tab "Hồ sơ" thì gắn click-to-upload cho avatar
    const btn = target.closest('button');
    if (btn && btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("showTab('profile-tab'")) {
      setTimeout(() => { profile.initAvatarChangeUI(); }, 0);
    }
  });

  addSettingsEventListeners();
}

document.addEventListener('DOMContentLoaded', () => {
  // 🚀 Cài interceptor TTS ngay khi app boot
  installTTSInterceptor();

  attachGlobalFunctions();

  signInAnonymously(auth).catch(error => {
    console.error("Lỗi đăng nhập ẩn danh:", error);
    const container = document.getElementById('profile-selection-container');
    if (container) {
      container.innerHTML = `<div class="text-red-500">Lỗi kết nối Firebase. Vui lòng kiểm tra cấu hình.</div>`;
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      setState({ authUserId: user.uid });
      await profile.displayProfileScreen();
    } else {
      document.getElementById('profile-selection-container').classList.remove('hidden');
      document.getElementById('main-app-container').classList.add('hidden');
      document.getElementById('loading-container').classList.add('hidden');
    }
  });

  addEventListeners();
});
