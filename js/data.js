// js/data.js

import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js"; // THÊM DÒNG NÀY
import { db, storage, functions } from './firebase.js'; // Thêm functions vào
import { state, setState } from './state.js';
import { SRS_INTERVALS, wordsApiKey, pixabayApiKey } from './config.js';
import { updateDashboard } from './ui.js';
import { parseCSV, shuffleArray, delay } from './utils.js';
import { checkAchievements } from './achievements.js';

const MASTER_VOCAB_ID = "sharedList";

// ... (Toàn bộ các hàm khác từ updateAndCacheSuggestions đến fetchAllUsersForLeaderboard giữ nguyên không đổi) ...
export function updateAndCacheSuggestions() {
    const { appData, vocabList } = state;
    if (!appData.progress || vocabList.length === 0) {
        setState({ suggestions: { difficult: [], new: [] } });
        return;
    }

    const difficultWords = Object.entries(appData.progress)
        .map(([word, data]) => ({ word, wrongAttempts: data.wrongAttempts || 0, level: data.level || 0 }))
        .filter(item => item.wrongAttempts > 1 || (item.level > 0 && item.level < 3))
        .sort((a, b) => b.wrongAttempts - a.wrongAttempts || a.level - b.level)
        .slice(0, 5)
        .map(item => vocabList.find(v => v.word === item.word))
        .filter(Boolean);

    const learnedWordsSet = new Set(Object.keys(appData.progress).filter(word => appData.progress[word].level > 0));
    const newWords = vocabList.filter(v => !learnedWordsSet.has(v.word))
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

    setState({ suggestions: { difficult: difficultWords, new: newWords } });
}


export function getReviewableWords() {
    const now = new Date();
    const reviewable = state.vocabList.filter(wordObj => {
        const progress = state.appData.progress[wordObj.word];
        if (!progress || progress.level === 0 || !progress.nextReview) return false;
        return new Date(progress.nextReview) <= now;
    });
    
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
    const shuffledMasterList = shuffleArray([...masterList]);
    const userDocRef = doc(db, "users", state.selectedProfileId);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.exists() ? userDocSnap.data() : {};

    const defaultAppData = {
        profileName: profileName,
        avatarUrl: '',
        streak: 0, lastVisit: null, progress: {},
        points: 0,
        dailyActivity: {}, achievements: {}, examHistory: [],
        settings: {
            darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            dailyGoal: { type: 'words', value: 20 },
            fontSize: 1.0
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
    shuffledMasterList.forEach(word => {
        if (!appData.progress[word.word]) {
            appData.progress[word.word] = {
                level: 0,
                nextReview: new Date().toISOString(),
                wrongAttempts: 0,
                correctAttempts: 0,
                history: []
            };
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

    setState({ appData, vocabList: shuffledMasterList, filteredVocabList: shuffledMasterList });
    
    updateAndCacheSuggestions();
    
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
    const oldLevel = wordProgress.level;

    if (isCorrect) {
        wordProgress.level = Math.min(wordProgress.level + 1, SRS_INTERVALS.length - 1);
        wordProgress.correctAttempts = (wordProgress.correctAttempts || 0) + 1;
        state.appData.points = (state.appData.points || 0) + 10;
        recordDailyActivity(1);
    } else {
        wordProgress.level = Math.max(0, wordProgress.level - 2);
        wordProgress.wrongAttempts = (wordProgress.wrongAttempts || 0) + 1;
    }

    if (!wordProgress.history) {
        wordProgress.history = [];
    }
    wordProgress.history.push({
        date: new Date().toISOString(),
        action: isCorrect ? 'correct' : 'wrong',
        levelChange: `${oldLevel} -> ${wordProgress.level}`
    });
    if (wordProgress.history.length > 10) {
        wordProgress.history.shift();
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

export async function fetchAllUsersForLeaderboard() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = [];
        usersSnapshot.forEach(doc => {
            const data = doc.data().appData;
            if (data.profileName && data.points) {
                usersData.push({
                    name: data.profileName,
                    points: data.points,
                    avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.profileName)}&background=random&color=fff`
                });
            }
        });
        return usersData.sort((a, b) => b.points - a.points);
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu bảng xếp hạng:", error);
        return [];
    }
}

export async function uploadImageViaCloudFunction(imageUrl, word) {
    if (!imageUrl || !word) return null;
    try {
        const uploadImage = httpsCallable(functions, 'uploadImageFromUrl');
        const result = await uploadImage({
            imageUrl: imageUrl,
            word: word,
            profileId: state.selectedProfileId
        });
        if (result.data && result.data.success) {
            return result.data.url;
        } else {
            throw new Error(result.data.error || "Cloud function returned an error.");
        }
    } catch (error) {
        console.error("Error calling uploadImageFromUrl cloud function:", error);
        return null;
    }
}

export async function fetchWordImages(word, page = 1) {
    if (!pixabayApiKey || pixabayApiKey === "KEY_PIXABAY_CUA_BAN") {
        return [];
    }
    try {
        const response = await fetch(`https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(word)}&image_type=photo&safesearch=true&per_page=12&page=${page}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.hits && data.hits.length > 0) {
                return data.hits.map(hit => ({
                    url: hit.webformatURL,
                    author: hit.user,
                    authorLink: hit.pageURL
                }));
            }
        }
        return [];
    } catch (error) {
        console.error("Lỗi khi lấy ảnh từ Pixabay:", error);
        return [];
    }
}

export async function fetchWordData(word) {
    if (!word) return null;
    
    const encodedWord = encodeURIComponent(word);
    let wordData = { phonetic: null, definition: null, example: null, partOfSpeech: null, synonyms: [] };

    const getPhoneticFromSingleWord = async (singleWord) => {
        if (commonWordPhonetics[singleWord]) {
            return commonWordPhonetics[singleWord];
        }

        if (wordsApiKey && wordsApiKey !== "DÁN_API_KEY_CỦA_BẠN_VÀO_ĐÂY") {
            const url = `https://wordsapiv1.p.rapidapi.com/words/${encodeURIComponent(singleWord)}`;
            const options = {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': wordsApiKey,
                    'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com'
                }
            };
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    const data = await response.json();
                    return data.pronunciation?.all || data.pronunciation?.noun || data.pronunciation?.verb || null;
                }
            } catch (error) {
                console.error(`Lỗi WordsAPI cho từ "${singleWord}":`, error);
            }
        }
        return null;
    };
    
    if (wordsApiKey && wordsApiKey !== "DÁN_API_KEY_CỦA_BẠN_VÀO_ĐÂY") {
        try {
            const response = await fetch(`https://wordsapiv1.p.rapidapi.com/words/${encodedWord}`, {
                method: 'GET',
                headers: { 'X-RapidAPI-Key': wordsApiKey, 'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com' }
            });
            if (response.ok) {
                const data = await response.json();
                const pronunciation = data.pronunciation?.all || data.pronunciation?.noun || data.pronunciation?.verb;
                if (pronunciation) wordData.phonetic = `/${pronunciation}/`;

                if (data.results && data.results.length > 0) {
                    const firstResult = data.results[0];
                    wordData.definition = firstResult.definition || null;
                    wordData.partOfSpeech = firstResult.partOfSpeech || null;
                    wordData.synonyms = firstResult.synonyms?.slice(0, 3) || [];
                    wordData.example = data.results.find(r => r.examples)?.examples[0] || null;
                }
                
                if (wordData.phonetic) return wordData;
            }
        } catch (error) {
            console.error("Lỗi khi gọi WordsAPI:", error);
        }
    }

    const words = word.split(' ').filter(w => w.length > 0);
    if (words.length > 1) {
        let phoneticParts = [];
        for (const part of words) {
            const partPhonetic = await getPhoneticFromSingleWord(part);
            if (partPhonetic) {
                phoneticParts.push(partPhonetic);
            }
            await delay(200);
        }
        if (phoneticParts.length > 0) {
            wordData.phonetic = `/${phoneticParts.join(' ')}/`;
        }
    }

    if (!wordData.phonetic && !wordData.definition) {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodedWord}`);
            if (response.ok) {
                const data = await response.json();
                const firstEntry = data[0];
                if (firstEntry) {
                    wordData.phonetic = firstEntry.phonetics?.find(p => p.text)?.text || null;
                    const firstMeaning = firstEntry.meanings?.[0];
                    if (firstMeaning) {
                        wordData.partOfSpeech = firstMeaning.partOfSpeech || null;
                        const firstDefinition = firstMeaning.definitions?.[0];
                        if (firstDefinition) {
                            wordData.definition = firstDefinition.definition || null;
                            wordData.example = firstDefinition.example || null;
                            wordData.synonyms = firstDefinition.synonyms?.slice(0, 3) || [];
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi lấy phiên âm từ dictionaryapi.dev:", error);
        }
    }

    return wordData;
}