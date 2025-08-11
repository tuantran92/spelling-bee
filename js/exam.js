// js/exam.js
// Module mới cho chế độ "Luyện thi"

import { state, setState } from './state.js';
import { showScreen } from './ui.js';
import { saveUserData } from './data.js';
import { checkAchievements } from './achievements.js';

let examTimerInterval = null;

/**
 * Hiển thị màn hình cài đặt bài thi.
 */
export function setupExamScreen() {
    const examScreen = document.getElementById('exam-screen');
    examScreen.innerHTML = `
        <div id="exam-setup">
            <h2 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">Luyện Thi</h2>
            <div class="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div class="mb-4">
                    <label for="exam-question-count" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Số lượng câu hỏi:</label>
                    <select id="exam-question-count" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                        <option value="10">10 câu</option>
                        <option value="20">20 câu</option>
                        <option value="50">50 câu</option>
                    </select>
                </div>
                <div class="mb-6">
                    <label for="exam-time-limit" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Giới hạn thời gian (phút):</label>
                    <select id="exam-time-limit" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                        <option value="1">1 phút</option>
                        <option value="2">2 phút</option>
                        <option value="5">5 phút</option>
                        <option value="10">10 phút</option>
                    </select>
                </div>
                <button onclick="startExam()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Bắt đầu thi</button>
            </div>
        </div>
        <div id="exam-inprogress" class="hidden"></div>
        <div id="exam-results" class="hidden"></div>
    `;
}

/**
 * Bắt đầu bài thi.
 */
export function startExam() {
    const questionCount = parseInt(document.getElementById('exam-question-count').value);
    const timeLimit = parseInt(document.getElementById('exam-time-limit').value) * 60; // convert to seconds

    if (state.filteredVocabList.length < questionCount) {
        alert(`Không đủ từ vựng để tạo bài thi ${questionCount} câu. Vui lòng chọn số lượng ít hơn hoặc thêm từ.`);
        return;
    }

    // Lấy ngẫu nhiên các câu hỏi
    const shuffled = [...state.filteredVocabList].sort(() => 0.5 - Math.random());
    const questions = shuffled.slice(0, questionCount).map(word => {
        // Tạo 3 đáp án sai
        const wrongAnswers = [...state.vocabList]
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
        examState: {
            isActive: true,
            questions: questions,
            currentQuestionIndex: 0,
            correctAnswers: 0,
            timeLeft: timeLimit,
            settings: { questionCount, timeLimit }
        }
    });

    document.getElementById('exam-setup').classList.add('hidden');
    document.getElementById('exam-inprogress').classList.remove('hidden');

    renderExamQuestion();
    startTimer();
}

/**
 * Bắt đầu đồng hồ đếm ngược.
 */
function startTimer() {
    const timerEl = document.getElementById('exam-timer');
    examTimerInterval = setInterval(() => {
        state.examState.timeLeft--;
        const minutes = Math.floor(state.examState.timeLeft / 60);
        const seconds = state.examState.timeLeft % 60;
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (state.examState.timeLeft <= 0) {
            finishExam();
        }
    }, 1000);
}

/**
 * Hiển thị câu hỏi hiện tại.
 */
function renderExamQuestion() {
    const examArea = document.getElementById('exam-inprogress');
    const qIndex = state.examState.currentQuestionIndex;
    const question = state.examState.questions[qIndex];

    examArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <div class="text-sm font-medium">Câu ${qIndex + 1} / ${state.examState.questions.length}</div>
            <div id="exam-timer" class="text-lg font-bold text-red-500"></div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <p class="text-gray-600 dark:text-gray-400 mb-2">Chọn nghĩa đúng cho từ:</p>
            <h3 class="text-3xl font-bold mb-6">${question.word}</h3>
            <div id="exam-options" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${question.options.map(opt => `
                    <button onclick="checkExamAnswer('${btoa(unescape(encodeURIComponent(opt)))}')" class="btn-glowing bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                        ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    // Cập nhật timer ngay lập tức
    const minutes = Math.floor(state.examState.timeLeft / 60);
    const seconds = state.examState.timeLeft % 60;
    document.getElementById('exam-timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Kiểm tra câu trả lời và chuyển câu hỏi.
 * @param {string} encodedAnswer - Câu trả lời đã được mã hóa base64.
 */
window.checkExamAnswer = (encodedAnswer) => {
    const userAnswer = decodeURIComponent(escape(atob(encodedAnswer)));
    const qIndex = state.examState.currentQuestionIndex;
    const question = state.examState.questions[qIndex];
    
    question.userAnswer = userAnswer;

    if (userAnswer === question.correctMeaning) {
        state.examState.correctAnswers++;
    }

    if (qIndex + 1 < state.examState.questions.length) {
        state.examState.currentQuestionIndex++;
        renderExamQuestion();
    } else {
        finishExam();
    }
};

/**
 * Kết thúc bài thi và hiển thị kết quả.
 */
function finishExam() {
    clearInterval(examTimerInterval);
    state.examState.isActive = false;

    const { questions, correctAnswers, settings } = state.examState;
    const score = Math.round((correctAnswers / questions.length) * 100);
    const timeTaken = settings.timeLimit - state.examState.timeLeft;

    // Lưu lịch sử
    const historyEntry = {
        date: new Date().toISOString(),
        score: score,
        time: timeTaken,
        results: questions.map(q => ({
            word: q.word,
            correct: q.correctMeaning,
            user: q.userAnswer
        }))
    };
    state.appData.examHistory.push(historyEntry);
    saveUserData();

    // Hiển thị màn hình kết quả
    document.getElementById('exam-inprogress').classList.add('hidden');
    const resultsScreen = document.getElementById('exam-results');
    resultsScreen.classList.remove('hidden');
    resultsScreen.innerHTML = `
        <h2 class="text-2xl font-bold text-center mb-4">Kết quả bài thi</h2>
        <div class="grid grid-cols-2 gap-4 text-center mb-6">
            <div class="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
                <div class="text-3xl font-bold text-green-600 dark:text-green-300">${score}%</div>
                <div class="text-sm">Điểm số</div>
            </div>
            <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
                <div class="text-3xl font-bold text-blue-600 dark:text-blue-300">${Math.floor(timeTaken / 60)}p ${timeTaken % 60}s</div>
                <div class="text-sm">Thời gian</div>
            </div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <h3 class="font-semibold mb-2">Xem lại các câu sai:</h3>
            <ul class="space-y-2">
                ${questions.filter(q => q.userAnswer !== q.correctMeaning).map(q => `
                    <li class="p-2 rounded ${q.userAnswer === null ? 'bg-gray-100 dark:bg-gray-700' : 'bg-red-100 dark:bg-red-900/50'}">
                        <p class="font-bold">${q.word}</p>
                        <p class="text-sm text-green-600">Đáp án đúng: ${q.correctMeaning}</p>
                        ${q.userAnswer !== null ? `<p class="text-sm text-red-600">Bạn đã chọn: ${q.userAnswer}</p>` : '<p class="text-sm text-gray-500">Bạn đã bỏ qua câu này</p>'}
                    </li>
                `).join('') || '<li class="text-green-500 p-2">Tuyệt vời! Bạn đã trả lời đúng tất cả.</li>'}
            </ul>
        </div>
        <button onclick="showScreen('main-menu')" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg">Về Menu chính</button>
    `;
    
    // Kiểm tra thành tựu
    checkAchievements();
}
