// js/data.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase.js';
import { state, setState } from './state.js';
import { SRS_INTERVALS } from './config.js';
import { updateDashboard } from './ui.js';
import { parseCSV } from './utils.js';
import { checkAchievements } from './achievements.js';

const MASTER_VOCAB_ID = "sharedList";

export function generateSuggestions() {
    const { appData, vocabList } = state;
    if (!appData.progress || vocabList.length === 0) {
        return { difficult: [], new: [] };
    }

    const difficultWords = Object.entries(appData.progress)
        .map(([word, data]) => ({ word, wrongAttempts: data.wrongAttempts || 0, level: data.level || 0 }))
        .filter(item => item.wrongAttempts > 1 || (item.level > 0 && item.level < 3))
        .sort((a, b) => b.wrongAttempts - a.wrongAttempts || a.level - b.level)
        .slice(0, 5)
        .map(item => vocabList.find(v => v.word === item.word))
        .filter(Boolean);

    const learnedWordsSet = new Set(Object.keys(appData.progress).filter(word => appData.progress[word].level > 0));
    let newWords = vocabList.filter(v => !learnedWordsSet.has(v.word))
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

    return { difficult: difficultWords, new: newWords };
}

export function getReviewableWords() {
    const now = new Date();
    const reviewable = state.vocabList.filter(wordObj => {
        const progress = state.appData.progress[wordObj.word];
        if (!progress || progress.level === 0 || !progress.nextReview) return false;
        return new Date(progress.nextReview) <= now;
    });
    
    // Khởi tạo/Cập nhật phiên ôn tập với các từ đến hạn
    setState({ reviewSession: { isActive: true, words: reviewable.sort(() => 0.5 - Math.random()), currentIndex: 0 } });
    return reviewable;
}

async function loadMasterVocab() {
    try {
        const docRef = doc(db, "masterVocab", MASTER_VOCAB_ID);
        const docSnap = await getDoc(docRef);
        return (docSnap.exists() && docSnap.data().vocabList) ? docSnap.data().vocabList : [];
    } catch (error) {
        console.error("Lỗi tải từ vựng chung:", error);
        return [];
    }
}

export async function saveMasterVocab() {
    try {
        await setDoc(doc(db, "masterVocab", MASTER_VOCAB_ID), { vocabList: state.vocabList });
    } catch (error) {
        console.error("Lỗi lưu từ vựng chung:", error);
    }
}

export async function loadUserData(profileName) {
    if (!state.selectedProfileId) return;

    const masterList = await loadMasterVocab();
    const userDocRef = doc(db, "users", state.selectedProfileId);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.exists() ? userDocSnap.data() : {};

    const defaultAppData = {
        profileName: profileName,
        streak: 0, lastVisit: null, progress: {},
        dailyActivity: {}, achievements: {}, examHistory: [],
        settings: {
            darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            dailyGoal: { type: 'words', value: 20 }
        },
        dailyProgress: { date: null, words: 0, minutes: 0 }
    };

    let appData = {
        ...defaultAppData,
        ...userData.appData,
        profileName: profileName,
        settings: { ...defaultAppData.settings, ...userData.appData?.settings },
        dailyProgress: { ...defaultAppData.dailyProgress, ...userData.appData?.dailyProgress }
    };

    if (appData.settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    let dataChanged = false;
    masterList.forEach(word => {
        if (!appData.progress[word.word]) {
            appData.progress[word.word] = { level: 0, nextReview: new Date().toISOString(), wrongAttempts: 0 };
            dataChanged = true;
        }
    });

    const today = new Date().toDateString();
    const lastVisit = appData.lastVisit ? new Date(appData.lastVisit).toDateString() : null;
    if (lastVisit !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastVisit === yesterday.toDateString()) {
            appData.streak = (appData.streak || 0) + 1;
        } else {
            appData.streak = 1;
        }
        appData.lastVisit = new Date().toISOString();
        dataChanged = true;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (appData.dailyProgress.date !== todayStr) {
        appData.dailyProgress = { date: todayStr, words: 0, minutes: 0 };
        dataChanged = true;
    }

    setState({ appData, vocabList: masterList, filteredVocabList: masterList });
    
    if (dataChanged) {
        await saveUserData();
    }
    updateDashboard();
}


export async function saveUserData() {
    if (!state.selectedProfileId) return;
    try {
        await setDoc(doc(db, "users", state.selectedProfileId), { appData: state.appData }, { merge: true });
    } catch (error) {
        console.error("Lỗi khi lưu dữ liệu:", error);
    }
}

export function updateWordLevel(wordObj, isCorrect) {
    if (!wordObj?.word || !state.appData.progress[wordObj.word]) return;

    const wordProgress = state.appData.progress[wordObj.word];
    if (isCorrect) {
        wordProgress.level = Math.min(wordProgress.level + 1, SRS_INTERVALS.length - 1);
        recordDailyActivity(1);
    } else {
        wordProgress.level = Math.max(0, wordProgress.level - 2);
        wordProgress.wrongAttempts = (wordProgress.wrongAttempts || 0) + 1;
    }
    const intervalDays = SRS_INTERVALS[wordProgress.level];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
    wordProgress.nextReview = nextReviewDate.toISOString();
    
    checkAchievements();
    saveUserData();
}

export function recordDailyActivity(count) {
    const today = new Date().toISOString().split('T')[0];
    if (!state.appData.dailyActivity) {
        state.appData.dailyActivity = {};
    }
    state.appData.dailyActivity[today] = (state.appData.dailyActivity[today] || 0) + count;
    state.appData.dailyProgress.words += count;
    updateDashboard();
}

export async function importFromGoogleSheet() {
    const url = prompt("Dán link Google Sheet vào đây. Sheet cần được chia sẻ công khai và có các cột: word, meaning, example, category.");
    if (!url) return { success: false, message: 'Hủy bỏ.' };

    const regex = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const matches = url.match(regex);
    if (!matches) {
        return { success: false, message: 'URL không hợp lệ.' };
    }

    const sheetId = matches[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Lỗi mạng khi tải sheet.');
        const csvText = await response.text();
        const newVocabList = parseCSV(csvText).map(word => ({
            ...word,
            difficulty: 'medium'
        }));

        setState({ vocabList: newVocabList });
        await saveMasterVocab();
        await loadUserData(state.appData.profileName);

        checkAchievements('firstImport');
        return { success: true, message: `Import thành công ${newVocabList.length} từ!` };

    } catch (error) {
        console.error('Lỗi import:', error);
        return { success: false, message: 'Lỗi: Không thể tải sheet. Kiểm tra lại URL và quyền chia sẻ.' };
    }
}