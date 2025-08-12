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

// --- SỬA LỖI: Logic gợi ý từ vựng thông minh ---
export function generateSuggestions() {
    // Sửa lại cách truy cập dữ liệu từ state.appData.progress
    const { appData, vocabList } = state;
    if (!appData.progress || vocabList.length === 0) {
        return { difficult: [], new: [] };
    }

    // 1. Gợi ý từ khó (sai nhiều, level thấp)
    const difficultWords = Object.entries(appData.progress)
        .map(([word, data]) => ({
            word,
            wrongAttempts: data.wrongAttempts || 0,
            level: data.level || 0
        }))
        .filter(item => item.wrongAttempts > 1 || (item.level > 0 && item.level < 3))
        .sort((a, b) => b.wrongAttempts - a.wrongAttempts || a.level - b.level)
        .slice(0, 5)
        .map(item => vocabList.find(v => v.word === item.word))
        .filter(Boolean);

    // 2. Gợi ý từ mới để học
    const learnedWordsSet = new Set(Object.keys(appData.progress).filter(word => appData.progress[word].level > 0));
    
    const categoryCounts = {};
    learnedWordsSet.forEach(word => {
        const vocabItem = vocabList.find(v => v.word === word);
        if (vocabItem && vocabItem.category) {
            categoryCounts[vocabItem.category] = (categoryCounts[vocabItem.category] || 0) + 1;
        }
    });

    const favoriteCategory = Object.keys(categoryCounts).length > 0
        ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    let newWords = [];
    if (favoriteCategory) {
        newWords = vocabList.filter(v =>
            (v.category === favoriteCategory) && !learnedWordsSet.has(v.word)
        );
    }
    
    if (newWords.length < 5) {
        const otherNewWords = vocabList.filter(v => !learnedWordsSet.has(v.word));
        newWords.push(...otherNewWords);
    }
    
    const suggestedNewWords = [...new Set(newWords)]
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

    return { difficult: difficultWords, new: suggestedNewWords };
}


export function getReviewableWords() {
    const now = new Date();
    now.setHours(0, 0, 0, 0); 

    const reviewable = state.vocabList.filter(wordObj => {
        const progress = state.appData.progress[wordObj.word];
        if (!progress || progress.level === 0) {
            return false;
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
        settings: {
            darkMode: undefined,
            dailyGoal: { type: 'words', value: 20 }
        },
        dailyProgress: { date: null, words: 0, minutes: 0 }
    };
    
    let appData = {
        ...defaultAppData,
        ...(userData.appData || {}),
        settings: { ...defaultAppData.settings, ...(userData.appData?.settings || {}) },
        dailyProgress: { ...defaultAppData.dailyProgress, ...(userData.appData?.dailyProgress || {}) }
    };

    let themeChanged = false;
    if (appData.settings?.darkMode === undefined) {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        appData.settings.darkMode = prefersDark;
        themeChanged = true;
    }

    if (appData.settings.darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    let dataChanged = false;
    masterList.forEach(word => {
        if (!appData.progress[word.word]) {
            appData.progress[word.word] = {
                level: 0,
                nextReview: new Date().toISOString(),
                wrongAttempts: 0
            };
            dataChanged = true;
        }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const lastVisitDate = appData.lastVisit ? new Date(appData.lastVisit).toDateString() : null;

    if (new Date(appData.lastVisit).toDateString() !== new Date().toDateString()) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        appData.streak = (lastVisitDate === yesterday.toDateString()) ? (appData.streak || 0) + 1 : 1;
        appData.lastVisit = new Date().toISOString();
        dataChanged = true;
    }

    if (appData.dailyProgress.date !== todayStr) {
        appData.dailyProgress = { date: todayStr, words: 0, minutes: 0 };
        dataChanged = true;
    }

    setState({ appData, vocabList: masterList });
    updateDashboard();
    updateDarkModeButton();

    if (dataChanged || themeChanged) {
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
    
    if (isCorrect) {
        recordDailyActivity(1);
    }
    checkAchievements();
    saveUserData();
}

export function recordDailyActivity(count) {
    const today = new Date().toISOString().split('T')[0];
    const currentActivityCount = state.appData.dailyActivity?.[today] || 0;
    if (!state.appData.dailyActivity) {
        state.appData.dailyActivity = {};
    }
    state.appData.dailyActivity[today] = currentActivityCount + count;

    if (state.appData.dailyProgress.date === today) {
        state.appData.dailyProgress.words += count;
    } else {
        state.appData.dailyProgress = { date: today, words: count, minutes: 0 };
    }
    updateDashboard();
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