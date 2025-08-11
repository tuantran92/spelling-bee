// js/data.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase.js';
import { state, setState } from './state.js';
import { SRS_INTERVALS } from './config.js';
import { updateDashboard, showImportFeedback } from './ui.js';
import { renderVocabManagementList } from './vocabManager.js';
import { parseCSV } from './utils.js';
import { checkAchievements } from './achievements.js';

const MASTER_VOCAB_ID = "sharedList"; // ID cho document chứa danh sách từ chung

/**
 * Tải danh sách từ vựng chung từ Firestore.
 */
async function loadMasterVocab() {
    try {
        const docRef = doc(db, "masterVocab", MASTER_VOCAB_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().vocabList) {
            return docSnap.data().vocabList;
        }
        return []; // Trả về mảng rỗng nếu không có
    } catch (error) {
        console.error("Lỗi khi tải danh sách từ vựng chung:", error);
        return [];
    }
}

/**
 * Lưu danh sách từ vựng chung vào Firestore.
 */
export async function saveMasterVocab() {
    try {
        const docRef = doc(db, "masterVocab", MASTER_VOCAB_ID);
        await setDoc(docRef, { vocabList: state.vocabList });
    } catch (error) {
        console.error("Lỗi khi lưu danh sách từ vựng chung:", error);
    }
}

/**
 * Tải dữ liệu người dùng.
 * ĐÃ VIẾT LẠI: Tải danh sách từ chung, sau đó tải tiến trình của người dùng.
 */
export async function loadUserData() {
    if (!state.selectedProfileId) return;

    // 1. Tải danh sách từ vựng chung
    const masterList = await loadMasterVocab();

    // 2. Tải dữ liệu riêng của người dùng (tiến trình, chuỗi học...)
    const userDocRef = doc(db, "users", state.selectedProfileId);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.exists() ? userDocSnap.data() : {};

    const defaultAppData = {
        streak: 0, lastVisit: null, progress: {},
        dailyActivity: {}, achievements: {}, examHistory: []
    };

    let appData = { ...defaultAppData, ...(userData.appData || {}) };

    // 3. Đồng bộ tiến trình với danh sách từ chung
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

    // 4. Cập nhật chuỗi ngày học
    const today = new Date().toDateString();
    const lastVisitDate = appData.lastVisit ? new Date(appData.lastVisit).toDateString() : null;
    if (lastVisitDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        appData.streak = (lastVisitDate === yesterday.toDateString()) ? (appData.streak || 0) + 1 : 1;
        appData.lastVisit = new Date().toISOString();
        dataChanged = true;
    }

    // 5. Cập nhật state toàn cục
    setState({ appData, vocabList: masterList });
    updateDashboard();

    // Chỉ lưu lại nếu có dữ liệu người dùng cần khởi tạo hoặc chuỗi ngày học thay đổi
    if (dataChanged) {
        await saveUserData();
    }
}

/**
 * Lưu dữ liệu người dùng (CHỈ LƯU appData).
 * ĐÃ SỬA: Không lưu vocabList vào document của người dùng nữa.
 */
export async function saveUserData() {
    if (!state.selectedProfileId) return;
    try {
        const docRef = doc(db, "users", state.selectedProfileId);
        // Chỉ lưu appData, không lưu vocabList
        await setDoc(docRef, { appData: state.appData }, { merge: true });
    } catch (error) {
        console.error("Lỗi khi lưu dữ liệu người dùng:", error);
    }
}

/**
 * Nhập từ vựng từ Google Sheet vào danh sách chung.
 * ĐÃ VIẾT LẠI: Ghi đè lên danh sách chung thay vì của người dùng.
 */
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
        
        // Gán độ khó mặc định nếu chưa có
        newVocabList = newVocabList.map(word => ({
            ...word,
            difficulty: word.difficulty || 'medium'
        }));

        // Cập nhật state và lưu vào danh sách chung
        setState({ vocabList: newVocabList });
        await saveMasterVocab();
        
        // Tải lại dữ liệu cho người dùng hiện tại để đồng bộ tiến trình
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

// Các hàm còn lại (updateWordLevel, recordDailyActivity) giữ nguyên
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
    const currentCount = state.appData.dailyActivity[today] || 0;
    state.appData.dailyActivity[today] = currentCount + count;
}