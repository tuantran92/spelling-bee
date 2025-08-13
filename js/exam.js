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
                        <option value="50">50 câu</option>
                    </select>
                </div>
                <div class="mb-6">
                    <label for="exam-time-limit" class="block text-sm font-medium">Giới hạn thời gian (phút):</label>
                    <select id="exam-time-limit" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-700">
                        <option value="1">1 phút</option>
                        <option value="2">2 phút</option>
                        <option value="5">5 phút</option>
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

    const allVocab = state.vocabList;
    if (allVocab.length < questionCount) {
        alert(`Không đủ từ vựng. Cần ít nhất ${questionCount} từ.`);
        return;
    }

    const shuffled = [...allVocab].sort(() => 0.5 - Math.random());
    const questions = shuffled.slice(0, questionCount).map(word => {
        const wrongAnswers = [...allVocab]
            .filter(w => w.word !== word.word)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.meaning);
        
        const options = [word.meaning, ...wrongAnswers].sort(() => 0.5 - Math.random());
        return {
            word: word.word,
            correctMeaning: word.meaning,
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

    examArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <div class="text-sm font-medium">Câu ${currentQuestionIndex + 1}/${questions.length}</div>
            <div id="exam-timer" class="text-lg font-bold text-red-500"></div>
        </div>
        <h3 class="text-3xl font-bold mb-6">${question.word}</h3>
        <div id="exam-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${question.options.map(opt => `
                <button onclick="checkExamAnswer(this, '${btoa(unescape(encodeURIComponent(opt)))}')" class="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-lg">
                    ${opt}
                </button>
            `).join('')}
        </div>
    `;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('exam-timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

window.checkExamAnswer = (buttonEl, encodedAnswer) => {
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