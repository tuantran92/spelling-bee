// js/gameModes.js

import { state, setState } from './state.js';
import { updateWordLevel, recordDailyActivity, saveUserData } from './data.js';
import { scrambleWord } from './utils.js';
import { populateScreenHTML } from './ui.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

/**
 * Lấy một từ ngẫu nhiên từ danh sách đã được lọc để chơi game.
 * @returns {object|null} - Đối tượng từ vựng hoặc null nếu danh sách trống.
 */
function getNextWord() {
    const gameList = state.filteredVocabList;
    if (gameList.length === 0) return null;
    return gameList[Math.floor(Math.random() * gameList.length)];
}

/**
 * Sử dụng API của trình duyệt để đọc một từ.
 */
export function speakWord(word, event) {
    if (event) event.stopPropagation();
    if (typeof SpeechSynthesisUtterance === "undefined") return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    const voiceSelect = document.getElementById('voice-select');
    const rateSlider = document.getElementById('rate-slider');
    const selectedVoiceName = voiceSelect ? voiceSelect.value : null;
    const rate = rateSlider ? parseFloat(rateSlider.value) : 1;
    utterance.rate = rate;
    if (selectedVoiceName && state.availableVoices.length > 0) {
        const selectedVoice = state.availableVoices.find(voice => voice.name === selectedVoiceName);
        if (selectedVoice) utterance.voice = selectedVoice;
    } else {
        utterance.lang = 'en-US';
    }
    synth.speak(utterance);
}

// --- Chế độ Đánh Vần ---
export function startSpelling() {
    const newWord = getNextWord();
    if (!document.getElementById('spelling-input')) populateScreenHTML();
    const screenEl = document.getElementById('spelling-screen');
    if (!newWord) {
        screenEl.innerHTML = `<p class="text-orange-500">Không có từ nào phù hợp với bộ lọc của bạn.</p>`;
        return;
    }
    setState({ currentWord: newWord });
    document.getElementById('spelling-meaning').textContent = state.currentWord.meaning;
    document.getElementById('spelling-example').textContent = state.currentWord.example || '';
    const inputEl = document.getElementById('spelling-input');
    inputEl.value = '';
    document.getElementById('spelling-result').textContent = '';
    inputEl.focus();
    
    // NÂNG CẤP: Thêm sự kiện nhấn Enter
    inputEl.onkeydown = (event) => {
        if (event.key === 'Enter') {
            checkSpelling();
        }
    };

    const speakBtn = document.getElementById('spelling-speak-btn');
    if (speakBtn) {
        speakBtn.onclick = (event) => speakWord(state.currentWord.word, event);
    }
    speakWord(newWord.word);
}

export function checkSpelling() {
    const userAnswer = document.getElementById('spelling-input').value.trim().toLowerCase();
    const resultEl = document.getElementById('spelling-result');
    if (!userAnswer) return;
    const isCorrect = userAnswer === state.currentWord.word.toLowerCase();
    updateWordLevel(state.currentWord, isCorrect);
    if (isCorrect) {
        resultEl.textContent = '✅ Chính xác!';
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
        setTimeout(startSpelling, 1500);
    } else {
        resultEl.textContent = `❌ Sai rồi! Đáp án: ${state.currentWord.word}`;
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
    }
}

// --- Chế độ Flashcard ---
export function startReading() {
    setState({ currentFlashcardIndex: 0 });
    updateFlashcard();
    const rateSlider = document.getElementById("rate-slider");
    const rateValue = document.getElementById("rate-value");
    if (rateSlider && rateValue) {
        rateSlider.oninput = () => { rateValue.textContent = parseFloat(rateSlider.value).toFixed(1); };
    }
}

export function updateFlashcard() {
    const gameList = state.filteredVocabList;
    if (!document.getElementById("flashcard")) populateScreenHTML();
    const readingScreen = document.getElementById("reading-screen");
    if (gameList.length === 0) {
        readingScreen.innerHTML = '<p class="text-orange-500">Không có từ nào phù hợp với bộ lọc của bạn.</p>';
        return;
    }
    const word = gameList[state.currentFlashcardIndex];
    setState({ currentWord: word });
    document.getElementById("flashcard").classList.remove("is-flipped");
    document.getElementById("flashcard-front").innerHTML = `<p class="text-2xl md:text-3xl font-bold text-white">${word.word}</p><button onclick="speakWord('${word.word}', event)" class="mt-4 bg-white/20 hover:bg-white/30 p-3 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>`;
    document.getElementById("flashcard-back").innerHTML = `<p class="text-xl md:text-2xl font-semibold text-white">${word.meaning}</p><p class="text-sm text-gray-200 italic mt-2 px-2">${word.example || ""}</p>`;
    document.getElementById("card-counter").textContent = `${state.currentFlashcardIndex + 1} / ${gameList.length}`;
    speakWord(word.word);
}

export function changeFlashcard(direction) {
    const gameList = state.filteredVocabList;
    if (gameList.length === 0) return;
    const newIndex = (state.currentFlashcardIndex + direction + gameList.length) % gameList.length;
    setState({ currentFlashcardIndex: newIndex });
    updateFlashcard();
    recordDailyActivity(1);
    saveUserData();
}

// --- Chế độ Xem Toàn Bộ ---
export function startShuffle() {
    const filterEl = document.getElementById("shuffle-category-filter");
    if (!filterEl) return;
    const categories = [...new Set(state.vocabList.map(v => v.category || 'Chung'))];
    filterEl.innerHTML = '<option value="all">Tất cả chủ đề</option>';
    categories.sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filterEl.appendChild(option);
    });
    const applyShuffleFilter = (event) => {
        const selectedCategory = event.target.value;
        const listToRender = (selectedCategory === 'all')
            ? state.vocabList
            : state.vocabList.filter(v => (v.category || 'Chung') === selectedCategory);
        renderShuffleList(listToRender);
    };
    filterEl.onchange = applyShuffleFilter;
    renderShuffleList(state.vocabList);
}

function renderShuffleList(list) {
    const listEl = document.getElementById("vocab-list-display");
    listEl.innerHTML = "";
    if (list.length === 0) {
        listEl.innerHTML = '<li class="text-gray-500 text-center">Không có từ nào trong chủ đề này.</li>';
        return;
    }
    list.forEach(word => {
        const li = document.createElement("li");
        const level = state.appData.progress[word.word]?.level || 0;
        let colorClass = "bg-red-100 dark:bg-red-900";
        if (level > 3) colorClass = "bg-green-100 dark:bg-green-900";
        else if (level > 0) colorClass = "bg-yellow-100 dark:bg-yellow-900";
        li.className = `${colorClass} p-4 rounded-lg flex justify-between items-center`;
        li.innerHTML = `<div><span class="font-bold text-lg text-gray-900 dark:text-gray-100">${word.word}</span><span class="text-gray-600 dark:text-gray-400"> - ${word.meaning}</span></div><button onclick="speakWord('${word.word}', event)" class="bg-white/20 hover:bg-white/30 p-2 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>`;
        listEl.appendChild(li);
    });
}

// --- Chế độ Sắp Xếp Chữ ---
export function startScramble() {
    const newWord = getNextWord();
    if (!document.getElementById('scrambled-word-display')) populateScreenHTML();
    const screenEl = document.getElementById("scramble-screen");
    if (!newWord) {
        screenEl.innerHTML = '<p class="text-orange-500">Không có từ nào phù hợp với bộ lọc của bạn.</p>';
        return;
    }
    setState({ currentWord: newWord });
    const scrambled = scrambleWord(state.currentWord.word);
    document.getElementById("scramble-meaning").textContent = state.currentWord.meaning;
    const displayEl = document.getElementById("scrambled-word-display");
    displayEl.innerHTML = "";
    scrambled.split("").forEach(letter => {
        const span = document.createElement("span");
        span.className = "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100 text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-lg shadow-md";
        span.textContent = letter;
        displayEl.appendChild(span);
    });
    const inputEl = document.getElementById("scramble-input");
    inputEl.value = "";
    document.getElementById("scramble-result").textContent = "";
    inputEl.focus();

    // NÂNG CẤP: Thêm sự kiện nhấn Enter
    inputEl.onkeydown = (event) => {
        if (event.key === 'Enter') {
            checkScramble();
        }
    };
}

export function checkScramble() {
    const userAnswer = document.getElementById("scramble-input").value.trim().toLowerCase();
    const resultEl = document.getElementById("scramble-result");
    if (!userAnswer) return;
    const isCorrect = userAnswer === state.currentWord.word.toLowerCase();
    updateWordLevel(state.currentWord, isCorrect);
    if (isCorrect) {
        resultEl.textContent = "✅ Chính xác!";
        resultEl.className = "mt-4 h-6 text-lg font-medium text-green-500";
        setTimeout(startScramble, 1500);
    } else {
        resultEl.textContent = "❌ Sai rồi! Thử lại đi.";
        resultEl.className = "mt-4 h-6 text-lg font-medium text-red-500";
    }
}

// --- Chế độ Trắc Nghiệm ---
export function startMcq() {
    const gameList = state.filteredVocabList;
    if (!document.getElementById('mcq-options')) populateScreenHTML();
    const screenEl = document.getElementById("mcq-screen");
    if (gameList.length < 4) {
        screenEl.innerHTML = '<p class="text-red-500">Cần ít nhất 4 từ trong bộ lọc để chơi chế độ này.</p>';
        return;
    }
    const correctWord = gameList[Math.floor(Math.random() * gameList.length)];
    setState({ currentWord: correctWord });
    const options = [correctWord];
    const fullVocabList = state.vocabList;
    while (options.length < 4) {
        const randomWord = fullVocabList[Math.floor(Math.random() * fullVocabList.length)];
        if (!options.some(opt => opt.word === randomWord.word)) {
            options.push(randomWord);
        }
    }
    options.sort(() => .5 - Math.random());
    document.getElementById("mcq-word").textContent = state.currentWord.word;
    const optionsEl = document.getElementById("mcq-options");
    optionsEl.innerHTML = "";
    options.forEach(opt => {
        const button = document.createElement("button");
        button.className = "btn-glowing bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors";
        button.textContent = opt.meaning;
        button.onclick = (event) => checkMcq(event.currentTarget, opt.word === state.currentWord.word);
        optionsEl.appendChild(button);
    });
    document.getElementById("mcq-result").textContent = "";
    const speakBtn = document.getElementById('mcq-speak-btn');
    if (speakBtn) {
        speakBtn.onclick = (event) => speakWord(state.currentWord.word, event);
    }
    speakWord(state.currentWord.word);
}

export function checkMcq(clickedButton, isCorrect) {
    const resultEl = document.getElementById("mcq-result");
    const isFirstAttempt = !document.querySelector("#mcq-options button:disabled");
    if (isFirstAttempt) {
        updateWordLevel(state.currentWord, isCorrect);
    }
    if (isCorrect) {
        resultEl.textContent = "✅ Chính xác!";
        resultEl.className = "mt-6 h-6 text-lg font-medium text-green-500";
        document.querySelectorAll("#mcq-options button").forEach(btn => {
            btn.disabled = true;
            if (btn === clickedButton) {
                btn.classList.remove('bg-sky-500', 'hover:bg-sky-600');
                btn.classList.add('bg-green-500');
            }
        });
        setTimeout(startMcq, 1500);
    } else {
        resultEl.textContent = "❌ Sai rồi, hãy chọn lại!";
        resultEl.className = "mt-6 h-6 text-lg font-medium text-red-500";
        clickedButton.disabled = true;
        clickedButton.classList.remove('bg-sky-500', 'hover:bg-sky-600');
        clickedButton.classList.add('bg-red-500', 'cursor-not-allowed');
    }
}

// --- Chế độ Luyện Nghe ---
export function startListening() {
    const newWord = getNextWord();
    if (!document.getElementById('listening-input')) populateScreenHTML();
    const screenEl = document.getElementById("listening-screen");
    if (!newWord) {
        screenEl.innerHTML = '<p class="text-orange-500">Không có từ nào phù hợp với bộ lọc của bạn.</p>';
        return;
    }
    setState({ currentWord: newWord });
    const inputEl = document.getElementById("listening-input");
    inputEl.value = "";
    document.getElementById("listening-result").textContent = "";
    inputEl.focus();

    // NÂNG CẤP: Thêm sự kiện nhấn Enter
    inputEl.onkeydown = (event) => {
        if (event.key === 'Enter') {
            checkListening();
        }
    };
    
    speakWord(state.currentWord.word);
}

export function checkListening() {
    const userAnswer = document.getElementById("listening-input").value.trim().toLowerCase();
    const resultEl = document.getElementById("listening-result");
    const isCorrect = userAnswer === state.currentWord.word.toLowerCase();
    updateWordLevel(state.currentWord, isCorrect);
    if (isCorrect) {
        resultEl.textContent = "✅ Chính xác!";
        resultEl.className = "mt-4 h-6 text-lg font-medium text-green-500";
        setTimeout(startListening, 1500);
    } else {
        resultEl.textContent = `❌ Sai rồi! Đáp án đúng là "${state.currentWord.word}"`;
        resultEl.className = "mt-4 h-6 text-lg font-medium text-red-500";
    }
}

// --- Chế độ Luyện Phát Âm ---
export function startPronunciation() {
    if (!SpeechRecognition) {
        document.getElementById('pronunciation-screen').innerHTML = `<h2 class="text-2xl font-semibold text-red-500 dark:text-red-400 mb-4">Lỗi Tương Thích</h2><p class="text-gray-600 dark:text-gray-400">Trình duyệt của bạn không hỗ trợ API Nhận dạng Giọng nói. Vui lòng sử dụng Google Chrome hoặc một trình duyệt khác được hỗ trợ.</p>`;
        return;
    }
    const newWord = getNextWord();
    if (!newWord) {
        document.getElementById('pronunciation-screen').innerHTML = `<p class="text-orange-500">Không có từ nào phù hợp với bộ lọc của bạn.</p>`;
        return;
    }
    setState({ currentWord: newWord });
    document.getElementById('pronunciation-word').textContent = newWord.word;
    document.getElementById('pronunciation-transcript').textContent = '';
    document.getElementById('pronunciation-result').textContent = '';
    document.getElementById('pronunciation-status').textContent = 'Nhấn nút để ghi âm';
    document.getElementById('pronunciation-record-btn').disabled = false;
    document.getElementById('pronunciation-record-btn').classList.remove('is-recording');
}

export function listenForPronunciation() {
    const recordBtn = document.getElementById('pronunciation-record-btn');
    const statusEl = document.getElementById('pronunciation-status');
    const transcriptEl = document.getElementById('pronunciation-transcript');
    const resultEl = document.getElementById('pronunciation-result');
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
        statusEl.textContent = 'Đang nghe...';
        recordBtn.disabled = true;
        recordBtn.classList.add('is-recording');
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        transcriptEl.textContent = transcript;
        const correctWord = state.currentWord.word.toLowerCase();
        const isCorrect = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") === correctWord;
        updateWordLevel(state.currentWord, isCorrect);
        if (isCorrect) {
            resultEl.textContent = '✅ Phát âm chính xác!';
            resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
            setTimeout(startPronunciation, 2000);
        } else {
            resultEl.textContent = '❌ Chưa đúng lắm, thử lại nhé!';
            resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
        }
    };
    recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
            statusEl.textContent = 'Không nghe thấy gì, thử lại nhé.';
        } else if (event.error === 'not-allowed') {
            statusEl.textContent = 'Bạn cần cấp quyền truy cập micro.';
        } else {
            statusEl.textContent = 'Đã xảy ra lỗi, vui lòng thử lại.';
            console.error('Speech recognition error:', event.error);
        }
    };
    recognition.onend = () => {
        statusEl.textContent = 'Nhấn nút để ghi âm';
        recordBtn.disabled = false;
        recordBtn.classList.remove('is-recording');
    };
    recognition.start();
}

// --- Chế độ Điền Từ ---
async function findExampleSentence(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) return null;
        const data = await response.json();
        if (data && data.length > 0) {
            for (const entry of data) {
                for (const meaning of entry.meanings) {
                    for (const definition of meaning.definitions) {
                        if (definition.example && definition.example.toLowerCase().includes(word.toLowerCase())) {
                            return definition.example;
                        }
                    }
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Lỗi khi tìm câu ví dụ qua API:", error);
        return null;
    }
}

export async function startFillBlank() {
    const screenEl = document.getElementById('fill-blank-screen');
    screenEl.innerHTML = `<p class="text-gray-500 dark:text-gray-400">Đang tìm câu ví dụ, vui lòng chờ...</p><div class="loader mx-auto mt-4"></div>`;
    const wordsToTry = [...state.filteredVocabList].sort(() => 0.5 - Math.random());
    if (wordsToTry.length === 0) {
        screenEl.innerHTML = `<p class="text-orange-500">Không có từ nào phù hợp với bộ lọc của bạn.</p>`;
        return;
    }
    let exampleFound = false;
    for (const wordObj of wordsToTry) {
        let exampleSentence = null;
        if (wordObj.example && wordObj.example.toLowerCase().includes(wordObj.word.toLowerCase())) {
            exampleSentence = wordObj.example;
        } else {
            exampleSentence = await findExampleSentence(wordObj.word);
        }
        if (exampleSentence) {
            setState({ currentWord: wordObj });
            populateFillBlankUI(exampleSentence, wordObj);
            exampleFound = true;
            break;
        }
    }
    if (!exampleFound) {
        screenEl.innerHTML = `<p class="text-orange-500">Không tìm thấy câu ví dụ nào phù hợp. Vui lòng thử lại sau hoặc thêm ví dụ cho các từ của bạn.</p>`;
    }
}

function populateFillBlankUI(sentence, wordObj) {
    const screenEl = document.getElementById('fill-blank-screen');
    const regex = new RegExp(`\\b${wordObj.word}\\b`, 'ig');
    const sentenceWithBlank = sentence.replace(regex, '_______');
    screenEl.innerHTML = `<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Điền vào chỗ trống</h2><div id="fill-blank-sentence" class="p-6 bg-gray-100 dark:bg-gray-700 rounded-lg text-lg md:text-xl text-gray-800 dark:text-gray-200 mb-6 leading-relaxed">${sentenceWithBlank}</div><input type="text" id="fill-blank-input" class="w-full max-w-xs mx-auto p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white" placeholder="Nhập từ còn thiếu..."><div class="mt-4"><button onclick="checkFillBlank()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg mr-2">Kiểm tra</button><button onclick="startFillBlank()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Câu khác</button></div><p id="fill-blank-result" class="mt-4 h-6 text-lg font-medium"></p>`;
    const inputEl = document.getElementById('fill-blank-input');
    inputEl.focus();

    // NÂNG CẤP: Thêm sự kiện nhấn Enter
    inputEl.onkeydown = (event) => {
        if (event.key === 'Enter') {
            checkFillBlank();
        }
    };
}

export function checkFillBlank() {
    const userAnswer = document.getElementById('fill-blank-input').value.trim().toLowerCase();
    const resultEl = document.getElementById('fill-blank-result');
    if (!userAnswer) return;
    const isCorrect = userAnswer === state.currentWord.word.toLowerCase();
    updateWordLevel(state.currentWord, isCorrect);
    if (isCorrect) {
        resultEl.textContent = '✅ Chính xác!';
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
        const sentenceEl = document.getElementById('fill-blank-sentence');
        if (sentenceEl) {
            const regex = new RegExp('_______', 'g');
            sentenceEl.innerHTML = sentenceEl.innerHTML.replace(regex, `<strong class="text-cyan-400">${state.currentWord.word}</strong>`);
        }
        setTimeout(startFillBlank, 2500);
    } else {
        resultEl.textContent = `❌ Sai rồi! Đáp án đúng là "${state.currentWord.word}"`;
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
    }
}