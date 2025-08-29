// js/data.js

import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"; // Đảm bảo có getStorage
//import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { db, functions } from './firebase.js'; // storage sẽ được khởi tạo riêng
import { state, setState } from './state.js';
import { SRS_INTERVALS, wordsApiKey, pixabayApiKey } from './config.js';
import { updateDashboard, showToast } from './ui.js';
import { parseCSV, shuffleArray, delay } from './utils.js';
import { checkAchievements } from './achievements.js';
//import { auth } from './firebase.js';

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { auth } from './firebase.js';

const MASTER_VOCAB_ID = "sharedList";

// DANH SÁCH PHIÊN ÂM DỰ PHÒNG CHO CÁC TỪ THÔNG DỤNG (Bản cải thiện)
const commonWordPhonetics = {
    // Articles & Determiners (Mạo từ & Từ hạn định)
    "a": "/ə/",
    "an": "/ən/",
    "the": "/ðə/",
    "this": "/ðɪs/",
    "that": "/ðæt/",

    // Conjunctions (Liên từ)
    "and": "/ænd/",
    "but": "/bʌt/",
    "or": "/ɔːr/",
    "for": "/fɔːr/",

    // Prepositions (Giới từ)
    "of": "/əv/",
    "in": "/ɪn/",
    "on": "/ɑːn/",
    "at": "/æt/",
    "to": "/tuː/",
    "with": "/wɪð/",
    "by": "/baɪ/",
    "from": "/frʌm/",

    // Pronouns (Đại từ)
    "I": "/aɪ/",
    "you": "/juː/",
    "he": "/hiː/",
    "she": "/ʃiː/",
    "it": "/ɪt/",
    "we": "/wiː/",
    "they": "/ðeɪ/",
    "me": "/miː/",
    "him": "/hɪm/",
    "her": "/hɜːr/",
    "us": "/ʌs/",
    "them": "/ðem/",
    "my": "/maɪ/",

    // Common Verbs (Động từ thông dụng)
    "is": "/ɪz/",
    "are": "/ɑːr/",
    "was": "/wɒz/",
    "were": "/wɜːr/",
    "be": "/biː/",
    "have": "/hæv/",
    "has": "/hæz/",
    "do": "/duː/",
    "does": "/dʌz/",
    "go": "/ɡoʊ/",
    "say": "/seɪ/",
    "get": "/ɡɛt/",
    "make": "/meɪk/",
    "know": "/noʊ/",
    "think": "/θɪŋk/",
    "take": "/teɪk/",
    "see": "/siː/",
    "come": "/kʌm/",
    "want": "/wɑːnt/",

    // Common Nouns (Danh từ thông dụng)
    "book": "/bʊk/",
    "bus": "/bʌs/",
    "car": "/kɑːr/",
    "cat": "/kæt/",
    "dog": "/dɒɡ/",
    "day": "/deɪ/",
    "good": "/ɡʊd/",
    "hello": "/həˈloʊ/",
    "house": "/haʊs/",
    "life": "/laɪf/",
    "love": "/lʌv/",
    "man": "/mæn/",
    "person": "/ˈpɜːrsn/",
    "stop": "/stɑːp/",
    "time": "/taɪm/",
    "world": "/wɜːrld/",
    "woman": "/ˈwʊmən/",
    "year": "/jɪər/"
};

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

    // 🔧 Làm sạch kiểu dữ liệu đề phòng bản cũ lưu chuỗi
    appData.points = Number(appData.points || 0);
    appData.dailyProgress = appData.dailyProgress || { date: null, words: 0, minutes: 0 };
    appData.dailyProgress.words   = Number(appData.dailyProgress.words   || 0);
    appData.dailyProgress.minutes = Number(appData.dailyProgress.minutes || 0);
    appData.dailyActivity = appData.dailyActivity || {};
    for (const day of Object.keys(appData.dailyActivity)) {
      appData.dailyActivity[day] = Number(appData.dailyActivity[day] || 0);
    }

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
        state.appData.points = Number(state.appData.points || 0) + 10; // 🔧 ép kiểu số
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

// ✅ THAY MỚI: luôn cộng bằng số & cập nhật dashboard
export function recordDailyActivity(count) {
    const today = new Date().toISOString().split('T')[0];
    if (!state.appData.dailyActivity) state.appData.dailyActivity = {};

    const prevDayVal = Number(state.appData.dailyActivity[today] || 0);
    state.appData.dailyActivity[today] = prevDayVal + Number(count || 0);

    const prevWords = Number(state.appData.dailyProgress?.words || 0);
    state.appData.dailyProgress.words = prevWords + Number(count || 0);

    updateDashboard();
}

// ---------------------------------------------------------------- //
// ----- BẮT ĐẦU THAY ĐỔI TẠI ĐÂY ----- //
// ---------------------------------------------------------------- //
export async function importFromGoogleSheet() {
    const url = prompt("Dán link Google Sheet vào đây. Sheet cần được chia sẻ công khai và có các cột: word, meaning, example, category.");
    if (!url) {
        return { success: false, message: 'Đã hủy bỏ import.' };
    }

    const regex = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const matches = url.match(regex);
    if (!matches) {
        return { success: false, message: 'URL không hợp lệ. Vui lòng kiểm tra lại.' };
    }

    const sheetId = matches[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error('Lỗi mạng hoặc sheet không được chia sẻ công khai.');
        }
        const csvText = await response.text();
        const wordsFromSheet = parseCSV(csvText);

        if (wordsFromSheet.length === 0) {
            return { success: false, message: "Không tìm thấy từ vựng nào trong sheet." };
        }

        const currentVocabList = [...state.vocabList];
        const existingWords = new Set(currentVocabList.map(v => v.word.toLowerCase()));
        
        let addedCount = 0;
        let skippedCount = 0;

        wordsFromSheet.forEach(wordData => {
            if (existingWords.has(wordData.word.toLowerCase())) {
                skippedCount++;
            } else {
                const newWord = {
                    ...wordData,
                    difficulty: 'medium', // Gán giá trị mặc định
                    // Thêm các trường dữ liệu mặc định khác nếu cần
                    phonetic: '',
                    definition: '',
                    partOfSpeech: '',
                    imageUrl: null
                };
                currentVocabList.push(newWord);
                // Thêm vào tiến trình học của người dùng
                if (!state.appData.progress[newWord.word]) {
                    state.appData.progress[newWord.word] = { level: 0, nextReview: new Date().toISOString(), wrongAttempts: 0, correctAttempts: 0, history: [] };
                }
                addedCount++;
            }
        });

        // Chỉ lưu lại nếu có sự thay đổi
        if (addedCount > 0) {
            setState({ vocabList: currentVocabList });
            await saveMasterVocab();
        }
        
        // Tạo thông báo kết quả
        let message = `Đã thêm ${addedCount} từ mới.`;
        if (skippedCount > 0) {
            message += ` Bỏ qua ${skippedCount} từ đã có.`;
        } else {
            message += " Không có từ nào bị trùng lặp.";
        }

        checkAchievements('firstImport');
        
        // Trả về kết quả để UI xử lý
        return { success: true, message: message, addedCount: addedCount };

    } catch (error) {
        console.error('Lỗi import:', error);
        return { success: false, message: 'Lỗi: Không thể tải hoặc xử lý sheet.' };
    }
}
// ---------------------------------------------------------------- //
// ----- KẾT THÚC THAY ĐỔI ----- //
// ---------------------------------------------------------------- //

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

// ===================================================================
// START: THAY THẾ TOÀN BỘ HÀM NÀY
// ===================================================================
export async function uploadImageViaCloudFunction(imageUrl, word) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Không tìm thấy người dùng đã xác thực.");
    }
    const userId = user.uid;

    const functions = getFunctions(undefined, 'asia-southeast1');
    const uploadImageFromUrl = httpsCallable(functions, 'uploadImageFromUrl');

    const result = await uploadImageFromUrl({ imageUrl, word, userId });

    if (result.data.success) {
      return result.data.url;
    }
    return null;

  } catch (error) {
    console.error("Lỗi khi gọi cloud function 'uploadImageFromUrl':", error);
    throw error; 
  }
}
// ===================================================================
// END: THAY THẾ TOÀN BỘ HÀM NÀY
// ===================================================================

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

    async function getPhoneticFromSingleWord(word) {
      try {
        // Cố gắng lấy phiên âm từ API trước
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const phonetic = data[0]?.phonetic || data[0]?.phonetics?.find(p => p.text)?.text;
        if (phonetic) {
          return phonetic;
        } else {
          throw new Error('Phonetic not found in API response');
        }
      } catch (error) {
        // Nếu API lỗi, tìm trong danh sách dự phòng commonWordPhonetics
        console.warn(`Could not fetch phonetic for "${word}" from API. Trying common words list.`);
        const matchingWord = Object.keys(commonWordPhonetics).find(key => key.toLowerCase() === word.toLowerCase());
        if (matchingWord) {
          console.log(`Found phonetic for "${word}" in common words list.`);
          return commonWordPhonetics[matchingWord];
        } else {
          console.warn(`Could not find phonetic for "${word}" in common words list.`);
          return null; // Trả về null nếu không tìm thấy ở đâu cả
        }
      }
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
                        const firstDefinition = firstMeaning.definitions?.[0];
                        wordData.partOfSpeech = firstMeaning.partOfSpeech || null;
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

// === START: THÊM HÀM MỚI VÀO CUỐI FILE ===
/**
 * Tải file ảnh tùy chỉnh lên Firebase Storage.
 * @param {File} file - File ảnh để tải lên.
 * @param {string} profileId - ID của hồ sơ người dùng.
 * @returns {Promise<string>} URL của ảnh đã tải lên.
 */
export async function uploadCustomImage(file, profileId) {
    const storage = getStorage();
    // Tạo một tên file độc nhất để tránh ghi đè
    const filePath = `images/${profileId}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);

    try {
        // Tải file lên
        const snapshot = await uploadBytes(storageRef, file);
        // Lấy URL công khai
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Lỗi tải ảnh lên:", error);
        showToast("Tải ảnh lên thất bại. Vui lòng thử lại.", "error");
        throw error;
    }
}
// === END: THÊM HÀM MỚI VÀO CUỐI FILE ===
