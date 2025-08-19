// js/exam.js

import { state, setState } from './state.js';
import { saveUserData } from './data.js';
import { checkAchievements } from './achievements.js';
import { closeGameScreen } from './ui.js';
import { playSound } from './utils.js';

let examTimerInterval = null;

export function setupExamScreen(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div id="exam-setup">
            <h2 class="text-2xl font-bold mb-6">Luyện Thi</h2>
            <div class="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg">
                <div class="mb-4">
                    <label for="exam-question-count" class="block text-sm font-medium">Số lượng câu hỏi:</label>
                    <select id="exam-question-count" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-700">
                        <option value="10">10 câu</option>
                        <option value="20">20 câu</option>
                        <option value="30">30 câu</option>
                        <option value="40">40 câu</option>
                        <option value="50">50 câu</option>
                        <option value="60">60 câu</option>                        
                        <option value="70">70 câu</option>
                        <option value="80">80 câu</option>
                        <option value="90">90 câu</option>
                    </select>
                </div>
                <div class="mb-6">
                    <label for="exam-time-limit" class="block text-sm font-medium">Giới hạn thời gian (phút):</label>
                    <select id="exam-time-limit" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-700">
                        <option value="1">1 phút</option>
                        <option value="2">2 phút</option>
                        <option value="3">3 phút</option>
                        <option value="4">4 phút</option>
                        <option value="5">5 phút</option>
                        <option value="6">6 phút</option>
                        <option value="7">7 phút</option>
                        <option value="8">8 phút</option>
                        <option value="9">9 phút</option>
                    </select>
                </div>
                <button onclick="startExam()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Bắt đầu thi</button>
            </div>
        </div>
        <div id="exam-inprogress" class="hidden"></div>
        <div id="exam-results" class="hidden"></div>
    `;
}

export function startExam() {
    const questionCount = parseInt(document.getElementById('exam-question-count').value);
    const timeLimit = parseInt(document.getElementById('exam-time-limit').value) * 60;

    // SỬA LỖI: Sử dụng danh sách từ đã được lọc
    const vocabForExam = state.filteredVocabList;
    if (vocabForExam.length < questionCount) {
        alert(`Không đủ từ vựng theo bộ lọc hiện tại. Cần ít nhất ${questionCount} từ, nhưng chỉ có ${vocabForExam.length} từ phù hợp.`);
        return;
    }

    const shuffled = [...vocabForExam].sort(() => 0.5 - Math.random());
    const questions = shuffled.slice(0, questionCount).map(wordObj => {
        // Lấy câu trả lời sai từ toàn bộ danh sách để đa dạng hơn
        const wrongAnswers = [...state.vocabList]
            .filter(w => w.word !== wordObj.word)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.meaning);
        
        const options = [wordObj.meaning, ...wrongAnswers].sort(() => 0.5 - Math.random());
        return {
            wordData: wordObj,
            correctMeaning: wordObj.meaning,
            options: options,
            userAnswer: null
        };
    });

    setState({
        examState: { isActive: true, questions, currentQuestionIndex: 0, correctAnswers: 0, timeLeft: timeLimit, settings: { questionCount, timeLimit } }
    });

    document.getElementById('exam-setup').classList.add('hidden');
    document.getElementById('exam-inprogress').classList.remove('hidden');

    renderExamQuestion();
    startTimer();
}

function startTimer() {
    examTimerInterval = setInterval(() => {
        state.examState.timeLeft--;
        const timerEl = document.getElementById('exam-timer');
        if (timerEl) {
            const minutes = Math.floor(state.examState.timeLeft / 60);
            const seconds = state.examState.timeLeft % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        if (state.examState.timeLeft <= 0) {
            finishExam();
        }
    }, 1000);
}

function renderExamQuestion() {
    const examArea = document.getElementById('exam-inprogress');
    const { questions, currentQuestionIndex, timeLeft } = state.examState;
    const question = questions[currentQuestionIndex];
    const word = question.wordData;

    // --- BẮT ĐẦU THAY ĐỔI TẠI ĐÂY ---

    examArea.innerHTML = `
        <div class="grid grid-cols-3 items-center mb-2">
            <div class="text-sm font-medium text-left">Câu ${currentQuestionIndex + 1}/${questions.length}</div>
            <div id="exam-timer" class="text-3xl font-bold text-red-500 text-center"></div>
            <div></div>
        </div>
        <div class="flex justify-center items-center gap-4 mb-6">
            <div class="text-center font-bold bg-gray-100 dark:bg-gray-700 py-4 px-6 rounded-lg">
                <h3 class="text-3xl font-bold">${word.word}</h3>
                <p class="text-lg text-gray-500 dark:text-gray-400 font-mono mt-1">${word.phonetic || ''}</p>
            </div>
            <button onclick="speakWord('${word.word}')" class="p-3 bg-sky-500 hover:bg-sky-600 rounded-full text-white shadow-md">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            </button>
        </div>
        <div id="exam-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${question.options.map(opt => `
                <button onclick="checkExamAnswer(this, '${btoa(unescape(encodeURIComponent(opt)))}')" class="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-lg">
                    ${opt}
                </button>
            `).join('')}
        </div>
    `;

    // --- KẾT THÚC THAY ĐỔI ---

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('exam-timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    speakWord(word.word);
}

export function checkExamAnswer(buttonEl, encodedAnswer) {
    const userAnswer = decodeURIComponent(escape(atob(encodedAnswer)));
    const { questions, currentQuestionIndex } = state.examState;
    const question = questions[currentQuestionIndex];
    const isCorrect = userAnswer === question.correctMeaning;
    
    question.userAnswer = userAnswer;

    playSound(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
        state.examState.correctAnswers++;
    }

    if (currentQuestionIndex + 1 < questions.length) {
        state.examState.currentQuestionIndex++;
        renderExamQuestion();
    } else {
        finishExam();
    }
};

function finishExam() {
    clearInterval(examTimerInterval);
    state.examState.isActive = false;

    const { questions, correctAnswers, settings, timeLeft } = state.examState;
    const score = Math.round((correctAnswers / questions.length) * 100);
    const timeTaken = settings.timeLimit - timeLeft;

    if (!state.appData.examHistory) state.appData.examHistory = [];
    state.appData.examHistory.push({
        date: new Date().toISOString(),
        score: score,
        time: timeTaken
    });
    saveUserData();

    document.getElementById('exam-inprogress').classList.add('hidden');
    const resultsScreen = document.getElementById('exam-results');
    resultsScreen.classList.remove('hidden');
    resultsScreen.innerHTML = `
        <h2 class="text-2xl font-bold text-center mb-4">Kết quả</h2>
        <div class="grid grid-cols-2 gap-4 text-center mb-6">
            <div class="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
                <div class="text-3xl font-bold text-green-600">${score}%</div>
                <div class="text-sm">Điểm số</div>
            </div>
            <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
                <div class="text-3xl font-bold text-blue-600">${Math.floor(timeTaken / 60)}p ${timeTaken % 60}s</div>
                <div class="text-sm">Thời gian</div>
            </div>
        </div>
        <button onclick="closeGameScreen('exam-screen')" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg">Quay lại</button>
    `;
    
    checkAchievements();
}