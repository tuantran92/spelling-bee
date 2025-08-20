// js/gameModes.js
import { state, setState } from './state.js';
import { updateWordLevel, recordDailyActivity, saveUserData, getReviewableWords, updateAndCacheSuggestions, fetchWordData } from './data.js';
import { scrambleWord, levenshteinDistance, playSound, maskWord, shuffleArray } from './utils.js';
import { closeGameScreen } from './ui.js';
import { speak } from './utils.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

// --- THÊM MỚI: Biến để xử lý cử chỉ vuốt ---
let touchStartX = 0;
let touchEndX = 0;
let swipeThreshold = 50; // Cần vuốt ít nhất 50px để được tính là qua thẻ

function getNextWord() {
    const gameList = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
    if (gameList.length === 0) return null;
    return gameList[Math.floor(Math.random() * gameList.length)];
}

export function speakWord(word, event, options = {}) {
    if (event) event.stopPropagation();
    if (typeof SpeechSynthesisUtterance === "undefined") return;

    const synth = window.speechSynthesis;
    synth.cancel(); // Dừng bất kỳ âm thanh nào đang phát

    const utterance = new SpeechSynthesisUtterance(word);

    // Sử dụng tùy chọn được cung cấp, nếu không thì lấy từ giao diện
    const voiceSelect = document.getElementById('voice-select');
    const rateSlider = document.getElementById('rate-slider');

    const selectedVoiceName = options.voiceName || (voiceSelect ? voiceSelect.value : null);
    const rate = options.rate || (rateSlider ? parseFloat(rateSlider.value) : 1);

    utterance.rate = rate;

    if (selectedVoiceName && state.availableVoices.length > 0) {
        const selectedVoice = state.availableVoices.find(voice => voice.name === selectedVoiceName);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
    } else {
        // Fallback nếu không tìm thấy giọng đọc cụ thể
        utterance.lang = 'en-US';
    }

    synth.speak(utterance);
}

// === CÁC HÀM CHO "HỌC THEO GỢI Ý" ===

function renderSuggestionCard() {
    const container = document.getElementById('suggestion-screen-content');
    const { words, currentIndex } = state.suggestionSession;
    if (!container || !words[currentIndex]) return;

    const word = words[currentIndex];
    
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Học theo gợi ý</h2>
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">${currentIndex + 1} / ${words.length}</span>
        </div>
        <div class="w-full h-auto bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-center">
            <p class="font-bold text-3xl vocab-font-size">${word.word}</p>
            ${word.phonetic ? `<p class="text-lg text-indigo-500 dark:text-indigo-400 font-mono mt-1">${word.phonetic}</p>` : ''}
            <p class="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-2">${word.meaning}</p>
            ${word.definition ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-3 italic">"${word.definition}"</p>` : ''}
            ${word.example ? `<p class="text-sm text-gray-500 mt-2"><b>Ví dụ:</b> ${word.example}</p>` : ''}
        </div>
        <div class="mt-6">
            <button onclick="nextSuggestionWord()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg">
                Từ tiếp theo
            </button>
        </div>
    `;
    speakWord(word.word);
}

window.nextSuggestionWord = () => {
    const { words, currentIndex, listType } = state.suggestionSession;
    const word = words[currentIndex];

    // Cập nhật tiến trình cho từ vừa học
    updateWordLevel(word, true);

    if (listType === 'difficult' && state.appData.progress[word.word]) {
        state.appData.progress[word.word].wrongAttempts = 0;
    }

    if (currentIndex + 1 < words.length) {
        setState({ suggestionSession: { ...state.suggestionSession, currentIndex: currentIndex + 1 } });
        renderSuggestionCard();
    } else {
        updateAndCacheSuggestions(); 
        
        const container = document.getElementById('suggestion-screen-content');
        container.innerHTML = `
            <h2 class="text-2xl font-semibold mb-4">Hoàn thành!</h2>
            <p>Bạn đã học xong các từ được gợi ý. Rất tốt!</p>
            <button onclick="startSuggestionMode('suggestion-screen-content')" class="mt-6 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg">
                Quay lại danh sách
            </button>
        `;
        setState({ suggestionSession: { isActive: false, words: [], currentIndex: 0, listType: null } });
    }
}

window.startSuggestionSession = (listType, startIndex) => {
    const words = listType === 'difficult' ? state.suggestions.difficult : state.suggestions.new;
    setState({
        suggestionSession: {
            isActive: true,
            words: words,
            currentIndex: startIndex,
            listType: listType
        }
    });
    renderSuggestionCard();
}

export function startSuggestionMode(containerId) {
    const container = document.getElementById(containerId);
    const suggestions = state.suggestions;
    if (!container) return;

    setState({ suggestionSession: { isActive: false, words: [], currentIndex: 0, listType: null } });

    if (!suggestions.difficult.length && !suggestions.new.length) {
        container.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Gợi ý</h2><p>Không có gợi ý nào vào lúc này. Hãy học thêm để hệ thống có dữ liệu nhé!</p>`;
        return;
    }

    container.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Học theo gợi ý</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div>
                <div class="p-4 bg-red-50 dark:bg-red-900/40 rounded-lg h-full">
                    <h4 class="font-bold text-red-800 dark:text-red-300 mb-2">Từ khó cần ôn lại</h4>
                    ${suggestions.difficult.length > 0 ? `
                        <ul class="space-y-1">
                            ${suggestions.difficult.map((w, index) => `
                                <li>
                                    <button onclick="startSuggestionSession('difficult', ${index})" class="w-full text-left p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md">
                                        <p class="font-medium vocab-font-size">${w.word}</p>
                                        ${w.phonetic ? `<p class="text-sm text-indigo-500 dark:text-indigo-400 font-mono">${w.phonetic}</p>` : ''}
                                    </button>
                                </li>`).join('')}
                        </ul>` : '<p class="text-sm text-gray-500">Không có từ khó nào.</p>'}
                </div>
            </div>
            <div>
                <div class="p-4 bg-green-50 dark:bg-green-900/40 rounded-lg h-full">
                    <h4 class="font-bold text-green-800 dark:text-green-300 mb-2">Từ mới nên học</h4>
                     ${suggestions.new.length > 0 ? `
                        <ul class="space-y-1">
                             ${suggestions.new.map((w, index) => `
                                <li>
                                     <button onclick="startSuggestionSession('new', ${index})" class="w-full text-left p-2 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md">
                                        <p class="font-medium vocab-font-size">${w.word}</p>
                                        ${w.phonetic ? `<p class="text-sm text-indigo-500 dark:text-indigo-400 font-mono">${w.phonetic}</p>` : ''}
                                    </button>
                                </li>`).join('')}
                        </ul>` : '<p class="text-sm text-gray-500">Không có từ mới nào.</p>'}
                </div>
            </div>
        </div>
    `;
}

export function renderReviewCard(containerId) {
    const screenEl = document.getElementById(containerId);
    if (!screenEl) return;
    
    const reviewWords = getReviewableWords();
    if (reviewWords.length === 0) {
        screenEl.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Tuyệt vời!</h2><p>Bạn đã ôn hết các từ cần học trong hôm nay. 🎉</p>`;
        return;
    }

    const { words, currentIndex } = state.reviewSession;
     if (!words || words.length === 0 || currentIndex >= words.length) {
        finishReviewSession();
        return;
    }
    const word = words[currentIndex];

    screenEl.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Ôn tập Thông minh</h2>
        <div class="relative w-full h-56 md:h-64">
            <div id="review-card" class="absolute w-full h-full bg-cyan-600 rounded-xl flex flex-col items-center justify-center p-4 shadow-lg">
                <div class="text-center">
                    <p class="font-bold text-white vocab-font-size-review">${word.word}</p>
                    ${word.phonetic ? `<p class="text-lg text-cyan-100 font-mono mt-1">${word.phonetic}</p>` : ''}
                    <p class="text-xl md:text-2xl text-cyan-200 mt-2 vocab-font-size">- ${word.meaning} -</p>
                </div>
                <button onclick="speakWord('${word.word}', event)" class="mt-4 bg-white/20 hover:bg-white/30 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </button>
            </div>
        </div>
        <div id="review-controls" class="mt-6 flex flex-col items-center gap-4">
            <p class="text-gray-500 dark:text-gray-400">Bạn có nhớ từ này không?</p>
            <div class="flex gap-4">
                <button onclick="handleReviewAnswer(false)" class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg shadow-md">Không nhớ</button>
                <button onclick="handleReviewAnswer(true)" class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-md">Nhớ</button>
            </div>
            <p id="review-card-counter" class="text-gray-700 dark:text-gray-300 font-medium">${currentIndex + 1} / ${words.length}</p>
        </div>
    `;
    speakWord(word.word);
}

export function handleReviewAnswer(isCorrect) {
    const { words, currentIndex } = state.reviewSession;
    const word = words[currentIndex];

    playSound(isCorrect ? 'correct' : 'wrong');
    updateWordLevel(word, isCorrect);

    if (currentIndex + 1 < words.length) {
        setState({ reviewSession: { ...state.reviewSession, currentIndex: currentIndex + 1 }});
        renderReviewCard('review-screen-content');
    } else {
        finishReviewSession();
    }
}

function finishReviewSession() {
    setState({ reviewSession: { isActive: false, words: [], currentIndex: 0 } });
    alert("Hoàn thành! Bạn đã ôn tập xong các từ cho hôm nay.");
    closeGameScreen('review-screen');
}

// --- Chế độ Đánh Vần (Spelling) ---
export function startSpelling(containerId) {
    const container = document.getElementById(containerId);
    const newWord = getNextWord();
    if (!newWord) {
        container.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ nào để học. Hãy thêm từ mới trong tab "Từ vựng"!</p>`;
        return;
    }
    setState({ currentWord: newWord });

    container.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Điền từ đúng</h2>
        <div class="relative">
            <p id="spelling-meaning" class="text-xl bg-gray-100 dark:bg-gray-700 p-4 rounded-lg vocab-font-size"></p>
            <button id="spelling-speak-btn" class="p-2 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white shadow-md absolute top-1/2 right-3 -translate-y-1/2" title="Nghe lại"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
        </div>
        <div id="spelling-example" class="text-gray-500 dark:text-gray-400 italic my-4 h-5"></div>
        <input type="text" id="spelling-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white vocab-font-size" placeholder="Nhập từ tiếng Anh...">
        <div class="mt-4">
            <button onclick="checkSpelling()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">Kiểm tra</button>
        </div>
        <p id="spelling-result" class="mt-4 h-6 text-lg font-medium"></p>
    `;

    document.getElementById('spelling-meaning').textContent = state.currentWord.meaning;
    document.getElementById('spelling-example').textContent = state.currentWord.example || '';
    document.getElementById('spelling-speak-btn').onclick = () => speakWord(state.currentWord.word);
    
    const inputEl = document.getElementById('spelling-input');
    inputEl.focus();
    inputEl.onkeydown = (event) => { if (event.key === 'Enter') checkSpelling(); };
    speakWord(newWord.word);
}

export function checkSpelling() {
    const userAnswer = document.getElementById('spelling-input').value.trim().toLowerCase();
    const resultEl = document.getElementById('spelling-result');
    if (!userAnswer) return;

    const correctAnswer = state.currentWord.word.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;

    playSound(isCorrect ? 'correct' : 'wrong');
    updateWordLevel(state.currentWord, isCorrect);

    if (isCorrect) {
        resultEl.textContent = '✅ Chính xác!';
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
        setTimeout(() => startSpelling('spelling-screen-content'), 1500);
    } else {
        const distance = levenshteinDistance(userAnswer, correctAnswer);
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
        if (distance <= 2) {
            resultEl.textContent = `🤔 Gần đúng rồi! Thử lại.`;
        } else {
            resultEl.textContent = `❌ Sai rồi! Đáp án: ${state.currentWord.word}`;
        }
    }
}


export function startReading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentList = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
    if (currentList.length === 0) {
        container.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ nào để học trong bộ lọc hiện tại.</p>`;
        return;
    }
    const shuffledList = shuffleArray([...currentList]);
    setState({ flashcardList: shuffledList, currentFlashcardIndex: 0 });

    container.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Flashcard</h2>
        <div class="relative group">
            <div id="flashcard-content" class="w-full bg-gray-100 dark:bg-gray-700 rounded-xl flex flex-col p-4 shadow-lg text-center">
                
                <div id="flashcard-image-container" class="w-full h-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    <img id="flashcard-image" src="" class="w-full h-full object-contain" alt="Vocabulary Image">
                </div>
                
                <div id="flashcard-text-content">
                    <p id="flashcard-word" class="font-bold vocab-font-size-flashcard text-gray-900 dark:text-gray-100"></p>
                    <p id="flashcard-phonetic" class="text-lg text-indigo-500 dark:text-indigo-400 font-mono mt-1"></p>
                    <p id="flashcard-meaning" class="text-xl font-semibold mt-2 text-gray-800 dark:text-gray-200"></p>
                    <p id="flashcard-definition" class="text-sm italic text-gray-600 dark:text-gray-400 px-2 mt-2"></p>
                    <p id="flashcard-example" class="text-sm italic text-gray-500 dark:text-gray-400 px-2 mt-2"></p>
                </div>
                
                <div class="flex-grow"></div> 
                <p id="flashcard-attribution" class="w-full text-left text-xs text-gray-400 dark:text-gray-500 mt-3" style="display: none;"></p>
                <button id="flashcard-speak-btn" class="absolute bottom-4 right-4 bg-teal-500 hover:bg-teal-600 p-2 rounded-full">
                    <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </button>
            </div>
        </div>

        <div class="mt-4 flex flex-col items-center gap-4">
             <div id="card-counter-container" class="text-gray-500 dark:text-gray-400 font-semibold">
                <span id="card-counter">1 / ${shuffledList.length}</span>
            </div>
            <div class="flex gap-4 w-full max-w-sm">
                <button onclick="handleFlashcardAnswer(false)" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-md">Không nhớ</button>
                <button onclick="handleFlashcardAnswer(true)" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md">Nhớ</button>
            </div>
             <button id="flashcard-speak-meaning-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mt-2">
                Đọc tiếng Việt
            </button>
        </div>
    `;
    
    updateFlashcard();
}

function updateFlashcard() {
    const gameList = state.flashcardList || []; 
    const contentEl = document.getElementById('flashcard-content');
    if (gameList.length === 0 || !contentEl) {
        if (contentEl) contentEl.innerHTML = `<p class="text-orange-500">Không có từ nào để học.</p>`;
        return;
    }

    if (state.currentFlashcardIndex >= gameList.length) {
        // Kết thúc phiên
        const container = document.getElementById('reading-screen-content');
        container.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Hoàn thành!</h2><p>Bạn đã học xong hết các thẻ.</p>`;
        return;
    }

    const word = gameList[state.currentFlashcardIndex];
    setState({ currentWord: word });

    const imageContainer = document.getElementById("flashcard-image-container");
    const imageEl = document.getElementById("flashcard-image");
    const textContentEl = document.getElementById("flashcard-text-content");
    const attributionEl = document.getElementById("flashcard-attribution");

    if (word.imageUrl) {
        imageEl.src = word.imageUrl;
        imageContainer.classList.remove('hidden');
        textContentEl.classList.remove('no-image');
        attributionEl.style.display = 'none';
    } else {
        imageContainer.classList.add('hidden');
        textContentEl.classList.add('no-image');
        attributionEl.style.display = 'none';
    }

    document.getElementById("flashcard-word").textContent = word.word;
    document.getElementById("flashcard-phonetic").textContent = word.phonetic || '';
    document.getElementById("flashcard-meaning").textContent = word.meaning;
    const definitionEl = document.getElementById("flashcard-definition");
    if (word.definition) {
        definitionEl.textContent = `(${word.definition})`;
        definitionEl.style.display = 'block';
    } else {
        definitionEl.style.display = 'none';
    }

    const exampleEl = document.getElementById("flashcard-example");
    if (word.example) {
        exampleEl.textContent = `Vd: ${word.example}`;
        exampleEl.style.display = 'block';
    } else {
        exampleEl.style.display = 'none';
    }

    const speakButton = document.getElementById("flashcard-speak-btn");
    const speakMeaningButton = document.getElementById("flashcard-speak-meaning-btn");

    speakButton.onclick = (event) => {
        if (event) event.stopPropagation();
        speak(word.word, 'en-US');
    };
    
    speakMeaningButton.onclick = (event) => {
        if (event) event.stopPropagation();
        speak(word.meaning, 'vi-VN');
    };

    document.getElementById("card-counter").textContent = `${state.currentFlashcardIndex + 1} / ${gameList.length}`;
    
    speak(word.word, 'en-US');
}


// Hàm mới để xử lý câu trả lời và chuyển thẻ
window.handleFlashcardAnswer = (remembered) => {
    const word = state.flashcardList[state.currentFlashcardIndex];
    
    // Gọi hàm cập nhật level và điểm
    updateWordLevel(word, remembered); 
    
    // Phát âm thanh tương ứng
    playSound(remembered ? 'correct' : 'wrong');

    // Chuyển sang thẻ tiếp theo
    const newIndex = state.currentFlashcardIndex + 1;
    setState({ currentFlashcardIndex: newIndex });
    updateFlashcard();
}

// --- Sắp xếp chữ (Scramble) ---
export function startScramble(containerId) {
    const container = document.getElementById(containerId);
    const newWord = getNextWord();
    if (!newWord || newWord.word.length < 2) {
        container.innerHTML = '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ phù hợp cho chế độ này.</p>';
        return;
    }
    setState({ currentWord: newWord });
    const scrambled = scrambleWord(state.currentWord.word);
    
    container.innerHTML = `
        <h2 class="text-2xl font-semibold mb-2">Sắp xếp các chữ cái:</h2>
        <div class="h-auto flex flex-col items-center justify-center mb-4 gap-2">
            <div>
                <button id="scramble-hint-definition-btn" onclick="toggleScrambleHint('definition')" class="bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-md text-sm font-semibold">Hint</button>
                <button id="scramble-hint-meaning-btn" onclick="toggleScrambleHint('meaning')" class="ml-2 bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-md text-sm font-semibold">Gợi ý</button>
                <button onclick="showScrambleAnswer()" class="ml-2 bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white px-3 py-1 rounded-md text-sm font-semibold">Đáp án</button>
            </div>
            <div id="scramble-hint-container" class="mt-2 text-center h-auto min-h-[2rem]">
                <span id="scramble-hint-definition" class="hidden italic text-sm text-gray-500 dark:text-gray-400">"<span id="scramble-definition-content" class="font-semibold"></span>"</span>
                <span id="scramble-hint-meaning" class="hidden italic text-sm text-gray-500 dark:text-gray-400">Nghĩa: "<span id="scramble-meaning-content" class="font-semibold"></span>"</span>
            </div>
        </div>
        <div id="scrambled-word-display" class="flex justify-center items-center gap-2 my-6 flex-wrap">
            ${scrambled.split("").map(letter => `<span class="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100 text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-lg shadow-md vocab-font-size">${letter}</span>`).join('')}
        </div>
        <input type="text" id="scramble-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 vocab-font-size" placeholder="Nhập đáp án...">
        <div class="mt-4">
            <button id="check-scramble-btn" onclick="checkScramble()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg">Kiểm tra</button>
        </div>
        <p id="scramble-result" class="mt-4 h-6 text-lg font-medium"></p>
    `;
    
    document.getElementById("scramble-meaning-content").textContent = state.currentWord.meaning;
    const definitionContentEl = document.getElementById("scramble-definition-content");
    const hintButton = document.getElementById("scramble-hint-definition-btn");

    if (state.currentWord.definition) {
        definitionContentEl.textContent = state.currentWord.definition;
    } else {
        hintButton.disabled = true;
        hintButton.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const inputEl = document.getElementById("scramble-input");
    inputEl.focus();
    inputEl.onkeydown = e => { if (e.key === 'Enter') checkScramble(); };
}

export function toggleScrambleHint(type) {
    const definitionEl = document.getElementById('scramble-hint-definition');
    const meaningEl = document.getElementById('scramble-hint-meaning');
    
    const isDefCurrentlyVisible = !definitionEl.classList.contains('hidden');
    const isMeanCurrentlyVisible = !meaningEl.classList.contains('hidden');

    // Luôn ẩn cả hai trước khi quyết định hiển thị cái nào
    definitionEl.classList.add('hidden');
    meaningEl.classList.add('hidden');

    if (type === 'definition' && !isDefCurrentlyVisible) {
        definitionEl.classList.remove('hidden');
    } else if (type === 'meaning' && !isMeanCurrentlyVisible) {
        meaningEl.classList.remove('hidden');
    }
}

export function showScrambleAnswer() {
    const resultEl = document.getElementById("scramble-result");
    const inputEl = document.getElementById("scramble-input");
    const checkBtn = document.getElementById("check-scramble-btn");

    resultEl.textContent = `Đáp án là: "${state.currentWord.word}"`;
    resultEl.className = "mt-4 h-6 text-lg font-medium text-blue-500";
    
    // Vô hiệu hóa input và nút kiểm tra
    inputEl.disabled = true;
    checkBtn.disabled = true;
    checkBtn.classList.add('opacity-50', 'cursor-not-allowed');

    // Đánh dấu là đã trả lời sai và chuyển sang từ mới sau 2.5 giây
    updateWordLevel(state.currentWord, false); 
    playSound('wrong');
    setTimeout(() => startScramble('scramble-screen-content'), 2500);
}

export function checkScramble() {
    const userAnswer = document.getElementById("scramble-input").value.trim().toLowerCase();
    const resultEl = document.getElementById("scramble-result");
    if (!userAnswer) return;
    const isCorrect = userAnswer === state.currentWord.word.toLowerCase();
    
    playSound(isCorrect ? 'correct' : 'wrong');
    updateWordLevel(state.currentWord, isCorrect);

    if (isCorrect) {
        resultEl.textContent = "✅ Chính xác!";
        resultEl.className = "mt-4 h-6 text-lg font-medium text-green-500";
        setTimeout(() => startScramble('scramble-screen-content'), 1500);
    } else {
        resultEl.textContent = "❌ Sai rồi! Thử lại đi.";
        resultEl.className = "mt-4 h-6 text-lg font-medium text-red-500";
    }
}


// --- Trắc nghiệm (MCQ) ---
function renderNextMcqQuestion() {
    const wordEl = document.getElementById("mcq-word");
    const phoneticEl = document.getElementById("mcq-phonetic");
    const speakBtn = document.getElementById('mcq-speak-btn');
    const optionsEl = document.getElementById("mcq-options");
    const resultEl = document.getElementById("mcq-result");

    if (!wordEl || !speakBtn || !optionsEl || !resultEl) {
        console.error("MCQ UI elements not found. Cannot render next question.");
        return;
    }

    const gameList = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
    if (gameList.length < 4) {
        const container = document.getElementById('mcq-screen-content');
        if (container) {
            container.innerHTML = '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-red-500">Không đủ từ vựng để tiếp tục.</p>';
        }
        return;
    }
    
    const correctWord = getNextWord();
    setState({ currentWord: correctWord });

    const options = [correctWord];
    while (options.length < 4) {
        const randomWord = state.vocabList[Math.floor(Math.random() * state.vocabList.length)];
        if (!options.some(opt => opt.word === randomWord.word)) {
            options.push(randomWord);
        }
    }
    options.sort(() => .5 - Math.random());

    wordEl.textContent = state.currentWord.word;
    if (phoneticEl) {
        phoneticEl.textContent = state.currentWord.phonetic || '';
    }
    speakBtn.onclick = () => speakWord(state.currentWord.word);
    resultEl.textContent = ''; 
    optionsEl.innerHTML = ''; 

    options.forEach(opt => {
        const button = document.createElement("button");
        button.className = "bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors vocab-font-size";
        button.textContent = opt.meaning;
        button.onclick = (event) => checkMcq(event.currentTarget, opt.word === state.currentWord.word);
        optionsEl.appendChild(button);
    });

    speakWord(state.currentWord.word);
}

export function startMcq(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const gameList = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
    if (gameList.length < 4) {
        container.innerHTML = '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-red-500">Cần ít nhất 4 từ để chơi chế độ này.</p>';
        return;
    }
    
    container.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Chọn nghĩa đúng:</h2>
        <div class="flex justify-center items-center gap-4 mb-6">
            <div id="mcq-word-container" class="text-center font-bold bg-gray-100 dark:bg-gray-700 py-4 px-6 rounded-lg">
                <p id="mcq-word" class="vocab-font-size-mcq"></p>
                <p id="mcq-phonetic" class="text-lg text-gray-500 dark:text-gray-400 font-mono mt-1"></p>
            </div>
            <button id="mcq-speak-btn" class="p-3 bg-sky-500 hover:bg-sky-600 rounded-full text-white shadow-md"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
        </div>
        <div id="mcq-options" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
        <p id="mcq-result" class="mt-6 h-6 text-lg font-medium"></p>
    `;

    renderNextMcqQuestion();
}

export function checkMcq(clickedButton, isCorrect) {
    const resultEl = document.getElementById("mcq-result");
    const isFirstAttempt = !document.querySelector("#mcq-options button:disabled");

    playSound(isCorrect ? 'correct' : 'wrong');
    
    if (isFirstAttempt) {
        updateWordLevel(state.currentWord, isCorrect);
    }
    
    if (isCorrect) {
        resultEl.textContent = "✅ Chính xác!";
        resultEl.className = "mt-6 h-6 text-lg font-medium text-green-500";
        document.querySelectorAll("#mcq-options button").forEach(btn => {
            btn.disabled = true;
            if (btn === clickedButton) {
                btn.className = "bg-green-500 text-white font-semibold py-3 px-4 rounded-lg vocab-font-size";
            }
        });
        setTimeout(renderNextMcqQuestion, 1500);
    } else {
        resultEl.textContent = "❌ Sai rồi, hãy chọn lại!";
        resultEl.className = "mt-6 h-6 text-lg font-medium text-red-500";
        clickedButton.disabled = true;
        clickedButton.className = "bg-red-500 text-white font-semibold py-3 px-4 rounded-lg cursor-not-allowed vocab-font-size";
    }
}


// --- Luyện nghe (Listening) ---
export function startListening(containerId) {
    const container = document.getElementById(containerId);
    const newWord = getNextWord();
    if (!newWord) {
        container.innerHTML = '<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ nào để học.</p>';
        return;
    }
    setState({ currentWord: newWord });

    container.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Nghe và gõ lại</h2>
        <div class="my-6">
            <button id="listening-speak-btn" class="bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-full shadow-lg"><svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
        </div>
        <input type="text" id="listening-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 dark:bg-gray-700 vocab-font-size" placeholder="Nhập từ bạn nghe được...">
        <div class="mt-4"><button onclick="checkListening()" class="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-lg">Kiểm tra</button></div>
        <p id="listening-result" class="mt-4 h-6 text-lg font-medium"></p>
    `;
    
    document.getElementById('listening-speak-btn').onclick = () => speakWord(state.currentWord.word);
    const inputEl = document.getElementById("listening-input");
    inputEl.focus();
    inputEl.onkeydown = e => { if (e.key === 'Enter') checkListening(); };
    speakWord(state.currentWord.word);
}

export function checkListening() {
    const userAnswer = document.getElementById("listening-input").value.trim().toLowerCase();
    const resultEl = document.getElementById("listening-result");
    if (!userAnswer) return;

    const correctAnswer = state.currentWord.word.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;
    
    playSound(isCorrect ? 'correct' : 'wrong');
    updateWordLevel(state.currentWord, isCorrect);

    if (isCorrect) {
        resultEl.textContent = "✅ Chính xác!";
        resultEl.className = "mt-4 h-6 text-lg font-medium text-green-500";
        setTimeout(() => startListening('listening-screen-content'), 1500);
    } else {
        resultEl.textContent = `❌ Sai rồi! Đáp án: "${state.currentWord.word}"`;
        resultEl.className = "mt-4 h-6 text-lg font-medium text-red-500";
    }
}

// --- Luyện Phát Âm (Pronunciation) ---
export function startPronunciation(containerId) {
    const container = document.getElementById(containerId);
    if (!SpeechRecognition) {
        container.innerHTML = `<h2 class="text-xl font-semibold text-red-500">Lỗi Tương Thích</h2><p class="mt-2">Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói. Vui lòng dùng Chrome hoặc Edge mới nhất.</p>`;
        return;
    }
    const newWord = getNextWord();
    if (!newWord) {
        container.innerHTML = `<h2 class="text-xl font-semibold">Thông báo</h2><p class="mt-2 text-orange-500">Không có từ phù hợp.</p>`;
        return;
    }
    setState({ currentWord: newWord });
    
    container.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Luyện Phát Âm</h2>
        <p class="mb-6">Đọc to từ sau đây:</p>
        <div class="text-center mb-6">
            <p id="pronunciation-word" class="font-bold text-pink-500 vocab-font-size-pronunciation">${newWord.word}</p>
            ${newWord.phonetic ? `<p class="text-lg text-gray-500 dark:text-gray-400 font-mono mt-1">${newWord.phonetic}</p>` : ''}
        </div>
        <button id="pronunciation-record-btn" onclick="listenForPronunciation()" class="bg-red-500 hover:bg-red-600 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-lg">
            <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>
        <p id="pronunciation-status" class="mt-4 text-gray-500 h-5">Nhấn nút để bắt đầu ghi âm</p>
        <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg min-h-[60px]">
            <p class="text-sm">Bạn đã nói:</p>
            <p id="pronunciation-transcript" class="text-lg font-medium vocab-font-size"></p>
        </div>
        <p id="pronunciation-result" class="mt-4 h-6 text-lg font-medium"></p>
    `;
}

export function listenForPronunciation() {
    const recordBtn = document.getElementById('pronunciation-record-btn');
    const statusEl = document.getElementById('pronunciation-status');
    const transcriptEl = document.getElementById('pronunciation-transcript');
    const resultEl = document.getElementById('pronunciation-result');

    if (recognition && recognition.abort) {
        recognition.abort();
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true; 
    recognition.continuous = false;

    recognition.onstart = () => {
        statusEl.textContent = '🎤 Đang nghe...';
        transcriptEl.textContent = '';
        resultEl.textContent = '';
        recordBtn.disabled = true;
        recordBtn.classList.add('animate-pulse', 'bg-red-700');
    };

    recognition.onspeechend = () => {
        recognition.stop();
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        transcriptEl.textContent = finalTranscript || interimTranscript;
        
        if (finalTranscript) {
            const finalAnswer = finalTranscript.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
            const correctWord = state.currentWord.word.toLowerCase();
            const isCorrect = finalAnswer === correctWord;
            
            playSound(isCorrect ? 'correct' : 'wrong');
            updateWordLevel(state.currentWord, isCorrect);

            if (isCorrect) {
                resultEl.textContent = '✅ Phát âm chính xác!';
                resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
                setTimeout(() => startPronunciation('pronunciation-screen-content'), 2000);
            } else {
                resultEl.textContent = '❌ Chưa đúng lắm, thử lại nhé!';
                resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
            }
        }
    };

    recognition.onerror = (event) => {
        let errorMessage = 'Nhấn nút để ghi âm lại';
        if (event.error === 'not-allowed') {
            errorMessage = 'Lỗi: Bạn chưa cấp quyền sử dụng micro.';
        } else if (event.error === 'no-speech') {
            errorMessage = 'Không nghe thấy giọng nói. Thử lại nhé.';
        } else {
            errorMessage = `Lỗi: ${event.error}. Thử lại nhé.`;
        }
        statusEl.textContent = errorMessage;
    };

    recognition.onend = () => {
        if (statusEl.textContent.includes('Đang nghe')) {
            statusEl.textContent = 'Nhấn nút để ghi âm';
        }
        recordBtn.disabled = false;
        recordBtn.classList.remove('animate-pulse', 'bg-red-700');
    };

    recognition.start();
}
// --- Điền vào chỗ trống (Fill Blank) ---
export async function startFillBlank(containerId) {
    const screenEl = document.getElementById(containerId);

    if (!state.fillBlankSession.isActive) {
        screenEl.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Điền vào chỗ trống</h2><p class="text-gray-500">Đang chuẩn bị câu hỏi...</p><div class="loader mx-auto mt-4"></div>`;
        
        const allWords = state.filteredVocabList.length > 0 ? state.filteredVocabList : state.vocabList;
        if (allWords.length === 0) {
            screenEl.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không có từ nào để học.</p>`;
            return;
        }

        const wordsWithGoodExamples = allWords.filter(wordObj => {
            const example = wordObj.example;
            if (!example) return false;
            const regex = new RegExp(`\\b${wordObj.word}\\b`, 'i');
            return example.split(' ').length > 3 && /[.?!]$/.test(example.trim()) && regex.test(example);
        });

        if (wordsWithGoodExamples.length > 0) {
            setState({ 
                fillBlankSession: { 
                    isActive: true, 
                    words: shuffleArray(wordsWithGoodExamples), 
                    currentIndex: 0 
                } 
            });
            displayNextFillBlankQuestion(containerId);
        } else {
             screenEl.innerHTML = `<h2 class="text-2xl font-semibold mb-4">Thông báo</h2><p class="text-orange-500">Không tìm thấy câu ví dụ phù hợp. Hãy thử thêm ví dụ cho các từ của bạn.</p>`;
        }
    } else {
        displayNextFillBlankQuestion(containerId);
    }
}

function displayNextFillBlankQuestion(containerId) {
    const { words, currentIndex } = state.fillBlankSession;

    if (currentIndex >= words.length) {
        setState({ fillBlankSession: { isActive: false, words: [], currentIndex: 0 } });
        startFillBlank(containerId); // Tạo lại phiên mới để chơi tiếp
        return;
    }
    
    const wordObj = words[currentIndex];
    setState({ currentWord: wordObj });
    populateFillBlankUI(containerId, wordObj.example, wordObj);
}


async function findExampleSentence(word) {
    try {
        const wordData = await fetchWordData(word);
        return wordData?.example || null;
    } catch (error) {
        console.error("Lỗi khi tìm câu ví dụ:", error);
        return null;
    }
}

function populateFillBlankUI(containerId, sentence, wordObj) {
    const screenEl = document.getElementById(containerId);
    const masked = maskWord(wordObj.word);
    const regex = new RegExp(`\\b${wordObj.word}\\b`, 'ig');
    const sentenceWithBlank = sentence.replace(regex, `<span class="font-mono text-cyan-400 tracking-widest">${masked}</span>`);
    
    screenEl.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Điền vào chỗ trống</h2>
        <div id="fill-blank-sentence" class="p-6 bg-gray-100 dark:bg-gray-700 rounded-lg text-lg mb-4 vocab-font-size">${sentenceWithBlank}</div>
        
        <div class="h-auto flex flex-col items-center justify-center mb-4 gap-2">
            <div>
                <button id="fill-blank-hint-definition-btn" onclick="toggleFillBlankHint('definition')" class="bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-md text-sm font-semibold">Hint</button>
                <button id="fill-blank-hint-meaning-btn" onclick="toggleFillBlankHint('meaning')" class="ml-2 bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-md text-sm font-semibold">Gợi ý</button>
                <button onclick="translateFillBlankSentence()" class="ml-2 bg-blue-200 dark:bg-blue-800 px-3 py-1 rounded-md text-sm font-semibold">Dịch</button>
            </div>
            <div id="fill-blank-hint-container" class="mt-2 text-center h-auto min-h-[2rem]">
                <span id="fill-blank-hint-definition" class="hidden italic text-sm text-gray-500 dark:text-gray-400">"<span id="fill-blank-definition-content" class="font-semibold"></span>"</span>
                <span id="fill-blank-hint-meaning" class="hidden italic text-sm text-gray-500 dark:text-gray-400">Nghĩa: "<span id="fill-blank-meaning-content" class="font-semibold"></span>"</span>
                <span id="fill-blank-translation" class="hidden italic text-sm text-blue-500 dark:text-blue-400">Dịch: "<span id="fill-blank-translation-content" class="font-semibold"></span>"</span>
            </div>
        </div>

        <input type="text" id="fill-blank-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 vocab-font-size" placeholder="Nhập từ còn thiếu...">
        <div class="mt-4 flex gap-2">
            <button onclick="skipFillBlankQuestion()" class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Bỏ qua</button>
            <button onclick="checkFillBlank()" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Kiểm tra</button>
        </div>
        <p id="fill-blank-result" class="mt-4 h-6 text-lg font-medium"></p>
    `;

    document.getElementById("fill-blank-meaning-content").textContent = wordObj.meaning;
    const definitionContentEl = document.getElementById("fill-blank-definition-content");
    const hintButton = document.getElementById("fill-blank-hint-definition-btn");

    if (wordObj.definition) {
        definitionContentEl.textContent = wordObj.definition;
    } else {
        hintButton.disabled = true;
        hintButton.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const inputEl = document.getElementById('fill-blank-input');
    inputEl.focus();
    inputEl.onkeydown = (event) => { if (event.key === 'Enter') checkFillBlank(); };
}

export function toggleFillBlankHint(type) {
    const definitionEl = document.getElementById('fill-blank-hint-definition');
    const meaningEl = document.getElementById('fill-blank-hint-meaning');
    const translationEl = document.getElementById('fill-blank-translation');

    const elements = {
        definition: definitionEl,
        meaning: meaningEl,
        translation: translationEl
    };

    const isCurrentlyVisible = elements[type] && !elements[type].classList.contains('hidden');

    // Ẩn tất cả gợi ý trước
    Object.values(elements).forEach(el => el.classList.add('hidden'));

    // Hiển thị gợi ý được yêu cầu nếu nó chưa được hiển thị trước đó
    if (elements[type] && !isCurrentlyVisible) {
        elements[type].classList.remove('hidden');
    }
}

export async function translateFillBlankSentence() {
    const translationContentEl = document.getElementById('fill-blank-translation-content');
    const originalSentence = state.currentWord.example;

    if (!originalSentence) {
        translationContentEl.textContent = "Không có câu để dịch.";
        toggleFillBlankHint('translation');
        return;
    }
    
    translationContentEl.textContent = "Đang dịch...";
    toggleFillBlankHint('translation');

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(originalSentence)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Lỗi mạng khi dịch.');
        }
        const data = await response.json();
        const translatedText = data[0].map(arr => arr[0]).join('');
        translationContentEl.textContent = translatedText;
    } catch (error) {
        console.error("Lỗi dịch:", error);
        translationContentEl.textContent = "Dịch lỗi.";
    }
}


export function checkFillBlank() {
    const userAnswer = document.getElementById('fill-blank-input').value.trim().toLowerCase();
    const resultEl = document.getElementById('fill-blank-result');
    if (!userAnswer) return;

    const isCorrect = userAnswer === state.currentWord.word.toLowerCase();

    playSound(isCorrect ? 'correct' : 'wrong');
    updateWordLevel(state.currentWord, isCorrect);
    
    if (isCorrect) {
        resultEl.textContent = '✅ Chính xác!';
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
        const sentenceEl = document.getElementById('fill-blank-sentence');
        if (sentenceEl) {
            const maskedSpan = sentenceEl.querySelector('span');
            if (maskedSpan) {
                maskedSpan.innerHTML = `<strong class="text-green-400">${state.currentWord.word}</strong>`;
            }
        }
        setTimeout(() => {
            state.fillBlankSession.currentIndex++;
            startFillBlank('fill-blank-screen-content');
        }, 2500);
    } else {
        resultEl.textContent = `❌ Sai rồi! Đáp án: "${state.currentWord.word}"`;
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
    }
}

export function skipFillBlankQuestion() {
    playSound('wrong'); // Chơi âm thanh sai khi bỏ qua để có phản hồi
    state.fillBlankSession.currentIndex++;
    startFillBlank('fill-blank-screen-content');
}