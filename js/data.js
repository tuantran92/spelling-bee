// js/data.js

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase.js';
import { state, setState } from './state.js';
import { defaultVocabList, SRS_INTERVALS } from './config.js';
import { updateDashboard, showImportFeedback } from './ui.js';
import { renderVocabManagementList } from './vocabManager.js';
import { parseCSV } from './utils.js';
import { checkAchievements } from './achievements.js';

/**
 * Tải dữ liệu người dùng từ Firestore.
 * ĐÃ ĐƯỢC VIẾT LẠI HOÀN TOÀN ĐỂ ĐẢM BẢO TÍNH CHÍNH XÁC.
 */
export async function loadUserData() {
    if (!state.selectedProfileId) return;

    try {
        const docRef = doc(db, "users", state.selectedProfileId);
        const docSnap = await getDoc(docRef);
        const userData = docSnap.exists() ? docSnap.data() : {};

        const defaultAppData = {
            streak: 0, lastVisit: null, progress: {},
            dailyActivity: {}, achievements: {}, examHistory: []
        };
        
        const vocabList = userData.vocabList && userData.vocabList.length > 0 
            ? userData.vocabList 
            : [...defaultVocabList];
            
        let appData = { ...defaultAppData, ...(userData.appData || {}) };

        // Khởi tạo tiến trình cho các từ mới mà không ghi đè dữ liệu cũ
        let progressChanged = false;
        vocabList.forEach(word => {
            if (!appData.progress[word.word]) {
                appData.progress[word.word] = {
                    level: 0,
                    nextReview: new Date().toISOString(),
                    wrongAttempts: 0
                };
                progressChanged = true;
            }
        });

        // Cập nhật chuỗi ngày học
        const today = new Date().toDateString();
        const lastVisitDate = appData.lastVisit ? new Date(appData.lastVisit).toDateString() : null;
        if (lastVisitDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            appData.streak = (lastVisitDate === yesterday.toDateString()) ? (appData.streak || 0) + 1 : 1;
            appData.lastVisit = new Date().toISOString();
            progressChanged = true; // streak cũng là một thay đổi cần lưu
        }

        // Cập nhật state toàn cục
        setState({ appData, vocabList });
        updateDashboard();

        // Chỉ lưu lại nếu có từ mới hoặc chuỗi ngày học thay đổi khi khởi động
        if (progressChanged) {
            await saveUserData();
        }

    } catch (error) {
        console.error("Lỗi nghiêm trọng khi tải dữ liệu người dùng:", error);
    }
}

/**
 * Lưu dữ liệu người dùng hiện tại vào Firestore.
 */
export async function saveUserData() {
    if (!state.selectedProfileId) return;
    try {
        const docRef = doc(db, "users", state.selectedProfileId);
        const dataToSave = { appData: state.appData, vocabList: state.vocabList };
        await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
        console.error("Lỗi khi lưu dữ liệu người dùng:", error);
    }
}

/**
 * Cập nhật cấp độ của một từ sau khi trả lời.
 */
export function updateWordLevel(wordObj, isCorrect) {
    if (!wordObj || !wordObj.word) return;

    // Đảm bảo mục tiến trình tồn tại
    if (!state.appData.progress[wordObj.word]) {
        state.appData.progress[wordObj.word] = { 
            level: 0, 
            nextReview: new Date().toISOString(),
            wrongAttempts: 0 
        };
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
    
    // Ghi nhận hoạt động và lưu lại
    recordDailyActivity(1);
    checkAchievements();
    saveUserData();
}

/**
 * Ghi nhận hoạt động học tập trong ngày.
 * @param {number} count - Số từ đã ôn.
 */
export function recordDailyActivity(count) {
    const today = new Date().toISOString().split('T')[0];
    const currentCount = state.appData.dailyActivity[today] || 0;
    state.appData.dailyActivity[today] = currentCount + count;
}

/**
 * Nhập từ vựng từ Google Sheet.
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
        const parsedData = parseCSV(csvText);
        if (parsedData.length === 0) throw new Error('Không tìm thấy dữ liệu hoặc sheet trống.');
        
        let importedCount = 0;
        const newVocabList = [...state.vocabList];
        parsedData.forEach(newWord => {
            if (newWord.word && !newVocabList.some(existingWord => existingWord.word === newWord.word)) {
                newVocabList.push(newWord);
                // Tạo tiến trình cho từ mới
                if (!state.appData.progress[newWord.word]) {
                    state.appData.progress[newWord.word] = {
                        level: 0,
                        nextReview: new Date().toISOString(),
                        wrongAttempts: 0
                    };
                }
                importedCount++;
            }
        });
        
        if (importedCount > 0) {
            setState({ vocabList: newVocabList });
            await saveUserData(); // Lưu lại danh sách từ và tiến trình mới
            updateDashboard();
            renderVocabManagementList();
            showImportFeedback(`Import thành công ${importedCount} từ mới.`, 'success');
            checkAchievements('firstImport');
        } else {
            showImportFeedback('Không có từ mới nào để import.', 'info');
        }
        
        gsheetUrlInput.value = '';

    } catch (error) {
        console.error('Lỗi khi import sheet:', error);
        showImportFeedback('Lỗi: Không thể tải sheet. Kiểm tra URL và quyền chia sẻ.', 'error');
    }
}
