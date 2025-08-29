// js/data.js

import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { db } from './firebase.js';
import { state, setState } from './state.js';
import { SRS_INTERVALS, wordsApiKey, pixabayApiKey } from './config.js';
import { updateDashboard, showToast } from './ui.js';
import { parseCSV, shuffleArray, delay } from './utils.js';
import { checkAchievements } from './achievements.js';

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { auth } from './firebase.js';

const MASTER_VOCAB_ID = "sharedList";

// —————————————————————————————————————————————
// Phiên âm dự phòng cho các từ thông dụng
// —————————————————————————————————————————————
const commonWordPhonetics = {
  "a": "/ə/", "an": "/ən/", "the": "/ðə/", "this": "/ðɪs/", "that": "/ðæt/",
  "and": "/ænd/", "but": "/bʌt/", "or": "/ɔːr/", "for": "/fɔːr/",
  "of": "/əv/", "in": "/ɪn/", "on": "/ɑːn/", "at": "/æt/", "to": "/tuː/",
  "with": "/wɪð/", "by": "/baɪ/", "from": "/frʌm/",
  "I": "/aɪ/", "you": "/juː/", "he": "/hiː/", "she": "/ʃiː/", "it": "/ɪt/",
  "we": "/wiː/", "they": "/ðeɪ/", "me": "/miː/", "him": "/hɪm/", "her": "/hɜːr/",
  "us": "/ʌs/", "them": "/ðem/", "my": "/maɪ/",
  "is": "/ɪz/", "are": "/ɑːr/", "was": "/wɒz/", "were": "/wɜːr/", "be": "/biː/",
  "have": "/hæv/", "has": "/hæz/", "do": "/duː/", "does": "/dʌz/", "go": "/ɡoʊ/",
  "say": "/seɪ/", "get": "/ɡɛt/", "make": "/meɪk/", "know": "/noʊ/",
  "think": "/θɪŋk/", "take": "/teɪk/", "see": "/siː/", "come": "/kʌm/",
  "want": "/wɑːnt/",
  "book": "/bʊk/", "bus": "/bʌs/", "car": "/kɑːr/", "cat": "/kæt/", "dog": "/dɒɡ/",
  "day": "/deɪ/", "good": "/ɡʊd/", "hello": "/həˈloʊ/", "house": "/haʊs/",
  "life": "/laɪf/", "love": "/lʌv/", "man": "/mæn/", "person": "/ˈpɜːrsn/",
  "stop": "/stɑːp/", "time": "/taɪm/", "world": "/wɜːrld/", "woman": "/ˈwʊmən/",
  "year": "/jɪər/"
};

// —————————————————————————————————————————————
// Gợi ý nhanh (khó, mới)
// —————————————————————————————————————————————
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
    .map(item => state.vocabList.find(v => v.word === item.word))
    .filter(Boolean);

  const learnedWordsSet = new Set(Object.keys(appData.progress).filter(word => appData.progress[word].level > 0));
  const newWords = vocabList
    .filter(v => !learnedWordsSet.has(v.word))
    .sort(() => 0.5 - Math.random())
    .slice(0, 5);

  setState({ suggestions: { difficult: difficultWords, new: newWords } });
}

// —————————————————————————————————————————————
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

// —————————————————————————————————————————————
async function loadMasterVocab() {
  try {
    const docRef = doc(db, "masterVocab", MASTER_VOCAB_ID);
    const snap = await getDoc(docRef);
    return (snap.exists() && snap.data().vocabList) ? snap.data().vocabList : [];
  } catch (e) {
    console.error("Lỗi tải từ vựng chung:", e);
    return [];
  }
}

export async function saveMasterVocab() {
  try {
    await setDoc(doc(db, "masterVocab", MASTER_VOCAB_ID), { vocabList: state.vocabList });
  } catch (e) {
    console.error("Lỗi lưu từ vựng chung:", e);
  }
}

// —————————————————————————————————————————————
// LOAD USER DATA (+ migrate & ép kiểu)
// —————————————————————————————————————————————
export async function loadUserData(profileName) {
  if (!state.selectedProfileId) return;

  const masterList = await loadMasterVocab();
  const shuffledMasterList = shuffleArray([...masterList]);

  const userDocRef = doc(db, "users", state.selectedProfileId);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const defaultAppData = {
    profileName,
    avatarUrl: '',
    streak: 0,
    lastVisit: null,
    progress: {},
    points: 0,
    dailyActivity: {},
    achievements: {},
    examHistory: [],
    settings: {
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      dailyGoal: { type: 'words', value: 20 },
      fontSize: 1.0,
      // NEW: lọc học
      studyTopics: [],        // chọn nhiều chủ đề
      studyDifficulty: 'all', // tất cả độ khó
    },
    dailyProgress: { date: null, words: 0, minutes: 0 }
  };

  let appData = {
    ...defaultAppData,
    ...userData.appData,
    profileName,
    settings: { ...defaultAppData.settings, ...userData.appData?.settings },
    dailyProgress: { ...defaultAppData.dailyProgress, ...userData.appData?.dailyProgress }
  };

  // Migrate cấu hình chủ đề (string → array)
  if (typeof appData.settings.studyTopics === 'string') {
    appData.settings.studyTopics = appData.settings.studyTopics ? [appData.settings.studyTopics] : [];
  }
  if (!Array.isArray(appData.settings.studyTopics)) appData.settings.studyTopics = [];
  if (!appData.settings.studyDifficulty) appData.settings.studyDifficulty = 'all';

  // Làm sạch số để tránh nối chuỗi
  appData.points = Number(appData.points || 0);
  appData.dailyProgress = appData.dailyProgress || { date: null, words: 0, minutes: 0 };
  appData.dailyProgress.words   = Number(appData.dailyProgress.words   || 0);
  appData.dailyProgress.minutes = Number(appData.dailyProgress.minutes || 0);
  appData.dailyActivity = appData.dailyActivity || {};
  for (const day of Object.keys(appData.dailyActivity)) {
    appData.dailyActivity[day] = Number(appData.dailyActivity[day] || 0);
  }

  // Dark mode
  if (appData.settings.darkMode) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');

  // Bổ sung progress cho từ chưa có
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

  // streak / lastVisit
  const todayStrDate = new Date().toDateString();
  const lastVisit = appData.lastVisit ? new Date(appData.lastVisit).toDateString() : null;
  if (lastVisit !== todayStrDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastVisit === yesterday.toDateString()) appData.streak = (appData.streak || 0) + 1;
    else appData.streak = 1;
    appData.lastVisit = new Date().toISOString();
    dataChanged = true;
  }

  // dailyProgress theo ngày
  const todayISO = new Date().toISOString().split('T')[0];
  if (appData.dailyProgress.date !== todayISO) {
    appData.dailyProgress = { date: todayISO, words: 0, minutes: 0 };
    dataChanged = true;
  }

  setState({ appData, vocabList: shuffledMasterList, filteredVocabList: shuffledMasterList });
  updateAndCacheSuggestions();

  if (dataChanged) await saveUserData();
  updateDashboard();
}

export async function saveUserData() {
  if (!state.selectedProfileId) return;
  try {
    await setDoc(doc(db, "users", state.selectedProfileId), { appData: state.appData }, { merge: true });
  } catch (e) {
    console.error("Lỗi khi lưu dữ liệu:", e);
  }
}

// —————————————————————————————————————————————
// SRS: cập nhật level + điểm + lịch ôn
// —————————————————————————————————————————————
export function updateWordLevel(wordObj, isCorrect) {
  if (!wordObj?.word || !state.appData.progress[wordObj.word]) return;

  const wp = state.appData.progress[wordObj.word];
  const oldLevel = wp.level;

  if (isCorrect) {
    wp.level = Math.min(wp.level + 1, SRS_INTERVALS.length - 1);
    wp.correctAttempts = (wp.correctAttempts || 0) + 1;
    state.appData.points = Number(state.appData.points || 0) + 10; // ép kiểu số
    recordDailyActivity(1);
  } else {
    wp.level = Math.max(0, wp.level - 2);
    wp.wrongAttempts = (wp.wrongAttempts || 0) + 1;
  }

  if (!wp.history) wp.history = [];
  wp.history.push({ date: new Date().toISOString(), action: isCorrect ? 'correct' : 'wrong', levelChange: `${oldLevel} -> ${wp.level}` });
  if (wp.history.length > 10) wp.history.shift();

  const intervalDays = SRS_INTERVALS[wp.level];
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  wp.nextReview = next.toISOString();

  checkAchievements();
  saveUserData();
}

// —————————————————————————————————————————————
// Nhật ký & tiến độ hàng ngày
// —————————————————————————————————————————————
export function recordDailyActivity(count) {
  const today = new Date().toISOString().split('T')[0];
  if (!state.appData.dailyActivity) state.appData.dailyActivity = {};

  const prevDay = Number(state.appData.dailyActivity[today] || 0);
  state.appData.dailyActivity[today] = prevDay + Number(count || 0);

  const prevWords = Number(state.appData.dailyProgress?.words || 0);
  state.appData.dailyProgress.words = prevWords + Number(count || 0);

  updateDashboard();
}

// —————————————————————————————————————————————
// Import từ Google Sheet (CSV công khai)
// —————————————————————————————————————————————
export async function importFromGoogleSheet() {
  const url = prompt("Dán link Google Sheet (công khai). Cần cột: word, meaning, example, category.");
  if (!url) return { success: false, message: 'Đã hủy bỏ import.' };

  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return { success: false, message: 'URL không hợp lệ.' };

  const csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
  try {
    const resp = await fetch(csvUrl);
    if (!resp.ok) throw new Error('Sheet không công khai hoặc lỗi mạng.');
    const csv = await resp.text();
    const rows = parseCSV(csv);
    if (!rows.length) return { success: false, message: "Không thấy dữ liệu." };

    const list = [...state.vocabList];
    const existing = new Set(list.map(v => v.word.toLowerCase()));
    let added = 0, skipped = 0;

    rows.forEach(w => {
      if (existing.has((w.word || '').toLowerCase())) { skipped++; return; }
      const nw = {
        ...w,
        difficulty: w.difficulty || 'medium',
        phonetic: w.phonetic || '',
        definition: w.definition || '',
        partOfSpeech: w.partOfSpeech || '',
        imageUrl: w.imageUrl || null,
      };
      list.push(nw);
      if (!state.appData.progress[nw.word]) {
        state.appData.progress[nw.word] = { level: 0, nextReview: new Date().toISOString(), wrongAttempts: 0, correctAttempts: 0, history: [] };
      }
      added++;
    });

    if (added) {
      setState({ vocabList: list });
      await saveMasterVocab();
    }

    checkAchievements('firstImport');
    return { success: true, message: `Đã thêm ${added} từ mới. Bỏ qua ${skipped} từ trùng.`, addedCount: added };
  } catch (e) {
    console.error('Lỗi import:', e);
    return { success: false, message: 'Không thể tải/ xử lý sheet.' };
  }
}

// —————————————————————————————————————————————
// Bảng xếp hạng
// —————————————————————————————————————————————
export async function fetchAllUsersForLeaderboard() {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const out = [];
    usersSnapshot.forEach(docSnap => {
      const d = docSnap.data().appData;
      if (d.profileName && d.points >= 0) {
        out.push({
          name: d.profileName,
          points: Number(d.points || 0),
          avatarUrl: d.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.profileName)}&background=random&color=fff`
        });
      }
    });
    return out.sort((a, b) => b.points - a.points);
  } catch (e) {
    console.error("Lỗi BXH:", e);
    return [];
  }
}

// —————————————————————————————————————————————
// Cloud Function: tải ảnh vĩnh viễn từ URL vào Storage
// —————————————————————————————————————————————
export async function uploadImageViaCloudFunction(imageUrl, word) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Chưa đăng nhập.");
    const functions = getFunctions(undefined, 'asia-southeast1');
    const uploadImageFromUrl = httpsCallable(functions, 'uploadImageFromUrl');
    const result = await uploadImageFromUrl({ imageUrl, word, userId: user.uid });
    return result?.data?.success ? result.data.url : null;
  } catch (e) {
    console.error("uploadImageFromUrl error:", e);
    throw e;
  }
}

// —————————————————————————————————————————————
// Ảnh minh họa từ Pixabay (tạm)
// —————————————————————————————————————————————
export async function fetchWordImages(word, page = 1) {
  if (!pixabayApiKey || pixabayApiKey === "KEY_PIXABAY_CUA_BAN") return [];
  try {
    const resp = await fetch(`https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(word)}&image_type=photo&safesearch=true&per_page=12&page=${page}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.hits?.length) return [];
    return data.hits.map(h => ({ url: h.webformatURL, author: h.user, authorLink: h.pageURL }));
  } catch (e) {
    console.error("Pixabay error:", e);
    return [];
  }
}

// —————————————————————————————————————————————
// Thông tin từ/phiên âm
// —————————————————————————————————————————————
export async function fetchWordData(word) {
  if (!word) return null;
  const encodedWord = encodeURIComponent(word);
  const wordData = { phonetic: null, definition: null, example: null, partOfSpeech: null, synonyms: [] };

  async function getPhoneticFromSingleWord(w) {
    try {
      const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`);
      if (!resp.ok) throw new Error('dict api error');
      const data = await resp.json();
      return data[0]?.phonetic || data[0]?.phonetics?.find(p => p.text)?.text || null;
    } catch {
      const key = Object.keys(commonWordPhonetics).find(k => k.toLowerCase() === w.toLowerCase());
      return key ? commonWordPhonetics[key] : null;
    }
  }

  // WordsAPI (nếu có key)
  if (wordsApiKey && wordsApiKey !== "DÁN_API_KEY_CỦA_BẠN_VÀO_ĐÂY") {
    try {
      const resp = await fetch(`https://wordsapiv1.p.rapidapi.com/words/${encodedWord}`, {
        method: 'GET',
        headers: { 'X-RapidAPI-Key': wordsApiKey, 'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com' }
      });
      if (resp.ok) {
        const d = await resp.json();
        const pr = d.pronunciation?.all || d.pronunciation?.noun || d.pronunciation?.verb;
        if (pr) wordData.phonetic = `/${pr}/`;
        if (d.results?.length) {
          const r0 = d.results[0];
          wordData.definition = r0.definition || null;
          wordData.partOfSpeech = r0.partOfSpeech || null;
          wordData.synonyms = r0.synonyms?.slice(0, 3) || [];
          const rWithEx = d.results.find(r => r.examples)?.examples?.[0];
          if (rWithEx) wordData.example = rWithEx;
        }
        if (wordData.phonetic) return wordData;
      }
    } catch (e) { console.error("WordsAPI error:", e); }
  }

  // Cụm từ: ghép phiên âm từng phần
  const parts = word.split(' ').filter(Boolean);
  if (parts.length > 1) {
    const phoneticParts = [];
    for (const p of parts) {
      const ph = await getPhoneticFromSingleWord(p);
      if (ph) phoneticParts.push(ph);
      await delay(200);
    }
    if (phoneticParts.length) wordData.phonetic = `/${phoneticParts.join(' ')}/`;
  }

  // Fallback dictionaryapi.dev
  if (!wordData.phonetic && !wordData.definition) {
    try {
      const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodedWord}`);
      if (resp.ok) {
        const data = await resp.json();
        const e0 = data[0];
        if (e0) {
          wordData.phonetic = e0.phonetics?.find(p => p.text)?.text || null;
          const m0 = e0.meanings?.[0];
          if (m0) {
            const d0 = m0.definitions?.[0];
            wordData.partOfSpeech = m0.partOfSpeech || null;
            if (d0) {
              wordData.definition = d0.definition || null;
              wordData.example = d0.example || null;
              wordData.synonyms = d0.synonyms?.slice(0, 3) || [];
            }
          }
        }
      }
    } catch (e) { console.error("dictionaryapi.dev error:", e); }
  }

  return wordData;
}

// —————————————————————————————————————————————
// Upload ảnh người dùng chọn
// —————————————————————————————————————————————
export async function uploadCustomImage(file, profileId) {
  const storage = getStorage();
  const filePath = `images/${profileId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, filePath);
  try {
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (e) {
    console.error("Lỗi tải ảnh lên:", e);
    showToast("Tải ảnh lên thất bại. Vui lòng thử lại.", "error");
    throw e;
  }
}
