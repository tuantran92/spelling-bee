// js/data.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase.js';
import { state, setState } from './state.js';
import { SRS_INTERVALS } from './config.js';
import { updateDashboard, showImportFeedback, updateDarkModeButton, updateReviewButton } from './ui.js';
import { renderVocabManagementList } from './vocabManager.js';
import { parseCSV } from './utils.js';
import { checkAchievements } from './achievements.js';

const MASTER_VOCAB_ID = "sharedList";

/**
 * THÊM MỚI: Lấy danh sách các từ cần ôn tập trong ngày.
 * @returns {Array<object>} Danh sách các từ vựng cần ôn tập.
 */
export function getReviewableWords() {
    const now = new Date();
    // Đặt về đầu ngày để so sánh chính xác
    now.setHours(0, 0, 0, 0); 

    const reviewable = state.vocabList.filter(wordObj => {
        const progress = state.appData.progress[wordObj.word];
        if (!progress || progress.level === 0) {
            return false; // Bỏ qua từ chưa học
        }
        const nextReviewDate = new Date(progress.nextReview);
        nextReviewDate.setHours(0, 0, 0, 0);
        return nextReviewDate <= now;
    });
    return reviewable;
}

async function loadMasterVocab() {
    try {
        const docRef = doc(db, "masterVocab", MASTER_VOCAB_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().vocabList) {
            return docSnap.data().vocabList;
        }
        return [];
    } catch (error) {
        console.error("Lỗi khi tải danh sách từ vựng chung:", error);
        return [];
    }
}

export async function saveMasterVocab() {
    try {
        const docRef = doc(db, "masterVocab", MASTER_VOCAB_ID);
        await setDoc(docRef, { vocabList: state.vocabList });
    } catch (error) {
        console.error("Lỗi khi lưu danh sách từ vựng chung:", error);
    }
}

export async function loadUserData() {
    if (!state.selectedProfileId) return;

    const masterList = await loadMasterVocab();

    const userDocRef = doc(db, "users", state.selectedProfileId);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.exists() ? userDocSnap.data() : {};

    const defaultAppData = {
        streak: 0, lastVisit: null, progress: {},
        dailyActivity: {}, achievements: {}, examHistory: [],
        settings: { darkMode: undefined }
    };

    let appData = { ...defaultAppData, ...(userData.appData || {}) };
    
    let themeChanged = false;
    if (appData.settings?.darkMode === undefined) {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (!appData.settings) appData.settings = {};
        appData.settings.darkMode = prefersDark;
        themeChanged = true;
    }

    if (appData.settings.darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    let progressChanged = false;
    masterList.forEach(word => {
        if (!appData.progress[word.word]) {
            appData.progress[word.word] = {
                level: 0,
                nextReview: new Date().toISOString(),
                wrongAttempts: 0
            };
            progressChanged = true;
        }
    });

    const today = new Date().toDateString();
    const lastVisitDate = appData.lastVisit ? new Date(appData.lastVisit).toDateString() : null;
    if (lastVisitDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        appData.streak = (lastVisitDate === yesterday.toDateString()) ? (appData.streak || 0) + 1 : 1;
        appData.lastVisit = new Date().toISOString();
        progressChanged = true;
    }

    setState({ appData, vocabList: masterList });
    updateDashboard(); // Hàm này sẽ gọi cả updateReviewButton
    updateDarkModeButton();

    if (progressChanged || themeChanged) {
        await saveUserData();
    }
}

export async function saveUserData() {
    if (!state.selectedProfileId) return;
    try {
        const docRef = doc(db, "users", state.selectedProfileId);
        await setDoc(docRef, { appData: state.appData }, { merge: true });
    } catch (error) {
        console.error("Lỗi khi lưu dữ liệu người dùng:", error);
    }
}

export function updateWordLevel(wordObj, isCorrect) {
    if (!wordObj || !wordObj.word) return;
    if (!state.appData.progress[wordObj.word]) {
        state.appData.progress[wordObj.word] = { level: 0, nextReview: new Date().toISOString(), wrongAttempts: 0 };
    }
    const wordProgress = state.appData.progress[wordObj.word];
    if (isCorrect) {
        wordProgress.level = Math.min(wordProgress.level + 1, SRS_INTERVALS.length - 1);
    } else {
        wordProgress.level = Math.max(0, wordProgress.level - 2);
        wordProgress.wrongAttempts = (wordProgress.wrongAttempts || 0) + 1;
    }
    const intervalDays = SRS_INTERVALS[wordProgress.level];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
    wordProgress.nextReview = nextReviewDate.toISOString();
    recordDailyActivity(1);
    checkAchievements();
    saveUserData();
}

export function recordDailyActivity(count) {
    const today = new Date().toISOString().split('T')[0];
    const currentCount = state.appData.dailyActivity?.[today] || 0;
    if (!state.appData.dailyActivity) {
        state.appData.dailyActivity = {};
    }
    state.appData.dailyActivity[today] = currentCount + count;
}

export async function importFromGoogleSheet() {
    const gsheetUrlInput = document.getElementById('gsheet-url');
    const url = gsheetUrlInput.value;
    if (!url) {
        showImportFeedback('Vui lòng nhập URL.', 'error');
        return;
    }
    const regex = /spreadsheets\/d\/([a-zA-Z0-9-_]+)(?:\/edit.*gid=([0-9]+))?/;
    const matches = url.match(regex);
    if (!matches) {
        showImportFeedback('URL không hợp lệ.', 'error');
        return;
    }
    const sheetId = matches[1];
    const gid = matches[2] || '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    showImportFeedback('Đang import...', 'info');
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Network response was not ok.');
        const csvText = await response.text();
        let newVocabList = parseCSV(csvText);
        
        newVocabList = newVocabList.map(word => ({
            ...word,
            difficulty: word.difficulty || 'medium'
        }));

        setState({ vocabList: newVocabList });
        await saveMasterVocab();
        await loadUserData();

        renderVocabManagementList();
        showImportFeedback(`Import thành công ${newVocabList.length} từ. Danh sách chung đã được cập nhật.`, 'success');
        checkAchievements('firstImport');
        gsheetUrlInput.value = '';

    } catch (error) {
        console.error('Lỗi khi import sheet:', error);
        showImportFeedback('Lỗi: Không thể tải sheet. Kiểm tra URL và quyền chia sẻ.', 'error');
    }
}