// js/game-modes/exam.js
// Luyện thi (Exam): MCQ có đếm ngược + nghe mẫu (không phụ thuộc speakWord)

import { state, setState } from '../state.js';
import { playSound, speak } from '../utils.js';

let examTimerId = null;

/* ===== helpers ===== */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getActiveWordList() {
  const list = (state.filteredVocabList && state.filteredVocabList.length > 0)
    ? state.filteredVocabList
    : (state.vocabList || []);
  // chỉ lấy từ có word + meaning
  return list.filter(w => w && w.word && w.meaning);
}

function mmss(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' + s : s}`;
}

/** tạo câu hỏi MCQ */
function buildQuestions(maxItems = 10) {
  const list = shuffle(getActiveWordList());
  const base = list.slice(0, Math.min(maxItems, list.length));
  const allMeanings = list.map(w => w.meaning);
  return base.map(w => {
    const wrongs = shuffle(allMeanings.filter(m => m !== w.meaning)).slice(0, 3);
    const choices = shuffle([w.meaning, ...wrongs]);
    return {
      prompt: w.word,
      word: w,
      choices,
      correctIndex: choices.indexOf(w.meaning)
    };
  });
}

/* ===== UI render ===== */
function renderHeader(container, timeLeft, idx, total, score) {
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-3';
  header.innerHTML = `
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold">Luyện thi</h2>
      <div class="text-sm text-gray-400">${idx + 1}/${total}</div>
    </div>
    <div class="flex items-center gap-3">
      <div class="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700">
        Điểm: <span id="exam-score" class="font-bold">${score}</span>
      </div>
      <div class="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700">
        ⏰ <span id="exam-timer" class="font-bold">${mmss(timeLeft)}</span>
      </div>
    </div>
  `;
  container.appendChild(header);
}

function renderQuestion(container, q, containerId) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-4';
  wrap.innerHTML = `
    <div class="text-center">
      <div class="text-2xl font-extrabold text-indigo-400 vocab-font-size-mcq">${q.prompt}</div>
      <div class="mt-2">
        <button id="exam-speak-btn"
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">
          ▶️ Nghe mẫu
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 mt-3">
      ${q.choices.map((c, i) => `
        <button class="exam-choice text-left px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                data-index="${i}">
          ${c}
        </button>
      `).join('')}
    </div>

    <p id="exam-feedback" class="h-6 text-center text-lg font-medium mt-1"></p>
  `;
  container.appendChild(wrap);

  // dùng utils.speak thay cho speakWord cũ
  wrap.querySelector('#exam-speak-btn')?.addEventListener('click', () => speak(q.prompt));

  wrap.querySelectorAll('.exam-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      checkExamAnswer(containerId, idx);
    });
  });
}

function renderResult(container, score, total, containerId) {
  container.innerHTML = `
    <div class="text-center">
      <div class="text-3xl font-extrabold mb-2">Kết thúc 🎉</div>
      <div class="text-lg mb-4">Điểm của bạn: <span class="font-bold">${score}</span> / ${total}</div>
      <div class="flex items-center justify-center gap-3">
        <button id="exam-restart"
                class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Làm lại</button>
        <button id="exam-close"
                class="px-4 py-2 rounded-lg bg-gray-700/70 hover:bg-gray-700 text-white">Đóng</button>
      </div>
    </div>
  `;
  container.querySelector('#exam-restart')?.addEventListener('click', () => startExam(containerId));
  container.querySelector('#exam-close')?.addEventListener('click', () => window.closeGameModal?.());
}

function startTimer() {
  if (examTimerInterval) clearInterval(examTimerInterval);

  examTimerInterval = setInterval(() => {
    const s = state.examState;
    if (!s || s.done) { clearInterval(examTimerInterval); examTimerInterval = null; return; }

    s.timeLeft = Math.max(0, s.timeLeft - 1);

    const t = document.getElementById('exam-timer');
    if (t) {
      const m = Math.floor(s.timeLeft / 60), ss = s.timeLeft % 60;
      t.textContent = `${m.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
    } else {
      // màn hình đã đóng => dừng luôn
      clearInterval(examTimerInterval); examTimerInterval = null; return;
    }

    if (s.timeLeft <= 0) finishExam();
  }, 1000);
}


function stopTimer() {
  if (examTimerId) { clearInterval(examTimerId); examTimerId = null; }
}

function renderExamQuestion(containerId) {
  const s = state.examSession;
  const container = document.getElementById(containerId);
  if (!container || !s) return;
  container.innerHTML = '';
  renderHeader(container, s.timeLeft, s.index, s.questions.length, s.score);
  renderQuestion(container, s.questions[s.index], containerId);
}

function checkExamAnswer(containerId, choiceIndex) {
  const s = state.examSession; if (!s) return;
  const q = s.questions[s.index];
  const correct = choiceIndex === q.correctIndex;
  const fb = document.getElementById('exam-feedback');

  if (correct) {
    s.score += 1; playSound('correct');
    const scoreEl = document.getElementById('exam-score'); if (scoreEl) scoreEl.textContent = String(s.score);
    if (fb) { fb.textContent = '✅ Chính xác!'; fb.className = 'h-6 text-center text-lg font-medium text-green-500'; }
  } else {
    playSound('wrong');
    if (fb) { fb.textContent = `❌ Chưa đúng. Đáp án: "${q.choices[q.correctIndex]}"`; fb.className = 'h-6 text-center text-lg font-medium text-red-500'; }
  }

  setTimeout(() => {
    s.index += 1;
    if (s.index >= s.questions.length) finishExam(containerId);
    else renderExamQuestion(containerId);
  }, 800);
}

function finishExam() {
  // chống gọi nhiều lần
  const s = state.examState;
  if (!s || s.done) return;
  s.done = true;

  if (examTimerInterval) { clearInterval(examTimerInterval); examTimerInterval = null; }
  s.isActive = false;

  const { questions, correctAnswers, settings, timeLeft } = s;
  const score = Math.round((correctAnswers / questions.length) * 100);
  const timeTaken = settings.timeLimit - timeLeft;

  // lưu 1 lần
  try {
    if (!state.appData.examHistory) state.appData.examHistory = [];
    state.appData.examHistory.push({ date: new Date().toISOString(), score, time: timeTaken });
    if (typeof saveUserData === 'function') saveUserData();
  } catch (e) {
    console.warn('Save exam result failed:', e);
  }

  // Có thể modal đã đóng — kiểm tra DOM trước khi chạm
  const inprog = document.getElementById('exam-inprogress');
  const results = document.getElementById('exam-results');
  if (!inprog || !results) {
    // Không còn UI để hiển thị — thoát nhẹ nhàng
    return;
  }

  inprog.classList.add('hidden');
  results.classList.remove('hidden');
  results.innerHTML = `
    <h2 class="text-2xl font-bold text-center mb-4">Kết quả</h2>
    <div class="grid grid-cols-2 gap-4 text-center mb-6">
      <div class="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
        <div class="text-3xl font-bold text-green-600">${score}%</div>
        <div class="text-sm">Điểm số</div>
      </div>
      <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
        <div class="text-3xl font-bold text-blue-600">${Math.floor(timeTaken/60)}p ${timeTaken%60}s</div>
        <div class="text-sm">Thời gian</div>
      </div>
    </div>
    <button onclick="closeGameScreen('exam-screen')"
            class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg">
      Quay lại
    </button>
  `;
}


export function startExam() {
  const questionCount = parseInt(document.getElementById('exam-question-count').value);
  const timeLimit = parseInt(document.getElementById('exam-time-limit').value) * 60;

  const vocabForExam = state.filteredVocabList;
  if (vocabForExam.length < questionCount) {
    alert(`Không đủ từ vựng theo bộ lọc hiện tại. Cần ít nhất ${questionCount} từ, nhưng chỉ có ${vocabForExam.length} từ phù hợp.`);
    return;
  }

  const shuffled = [...vocabForExam].sort(() => 0.5 - Math.random());
  const questions = shuffled.slice(0, questionCount).map(w => {
    const wrongs = [...state.vocabList].filter(x => x.word !== w.word)
      .sort(() => 0.5 - Math.random()).slice(0, 3).map(x => x.meaning);
    const options = [w.meaning, ...wrongs].sort(() => 0.5 - Math.random());
    return { wordData: w, correctMeaning: w.meaning, options, userAnswer: null };
  });

  setState({
    examState: {
      isActive: true,
      done: false,              // <— chốt chặn lặp
      questions,
      currentQuestionIndex: 0,
      correctAnswers: 0,
      timeLeft: timeLimit,
      settings: { questionCount, timeLimit }
    }
  });

  const setupEl = document.getElementById('exam-setup');
  const inprogEl = document.getElementById('exam-inprogress');
  if (setupEl) setupEl.classList.add('hidden');
  if (inprogEl) inprogEl.classList.remove('hidden');

  renderExamQuestion();
  startTimer();
}


// optional debug
if (typeof window !== 'undefined') window.startExam = startExam;
