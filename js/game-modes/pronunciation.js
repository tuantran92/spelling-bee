// js/game-modes/pronunciation.js
import { state, setState } from '../state.js';
import { updateWordLevel } from '../data.js';
import { playSound, speak } from '../utils.js';

// Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let hadResult = false;

// ===== Helpers =====
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z']/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/** Lấy từ kế tiếp ngẫu nhiên từ danh sách hiện tại */
function getNextWord() {
  const list =
    (state.filteredVocabList && state.filteredVocabList.length > 0)
      ? state.filteredVocabList
      : (state.vocabList || []);
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

/** Xin quyền micro trước khi bật SpeechRecognition */
async function ensureMicPermission() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (err) {
    return err;
  }
}

export function startPronunciation(containerId) {
  const container = document.getElementById(containerId);
  if (!SpeechRecognition) {
    container.innerHTML = `
      <h2 class="text-xl font-semibold text-red-500">Lỗi Tương Thích</h2>
      <p class="mt-2">Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.
      Vui lòng dùng Chrome/Edge mới nhất (HTTPS hoặc localhost).</p>`;
    return;
  }

  const newWord = getNextWord();
  if (!newWord) {
    container.innerHTML = `<h2 class="text-xl font-semibold">Thông báo</h2>
      <p class="mt-2 text-orange-500">Không có từ phù hợp.</p>`;
    return;
  }
  setState({ currentWord: newWord });

  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Luyện Phát Âm</h2>
    <p class="mb-6">Đọc to từ sau đây:</p>
    <div class="text-center mb-6">
      <p id="pronunciation-word" class="font-bold text-pink-500 vocab-font-size-pronunciation">${newWord.word}</p>
      ${newWord.phonetic ? `<p class="text-lg text-pink-400 font-mono mt-1">${newWord.phonetic}</p>` : ''}
    </div>
    <div class="flex items-center justify-center gap-3">
      <button onclick="listenForPronunciation()"
              class="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg">
        Bắt đầu nói
      </button>
      <button onclick="speak('${newWord.word}')"
              class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-3 rounded-full"
              title="Nghe mẫu">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
      </button>
    </div>
    <p id="pronunciation-result" class="mt-4 h-6 text-lg font-medium"></p>
  `;
}

export async function listenForPronunciation() {
  const resultEl = document.getElementById('pronunciation-result');
  if (!SpeechRecognition) {
    if (resultEl) {
      resultEl.textContent = '⚠️ Trình duyệt không hỗ trợ nhận dạng giọng nói.';
      resultEl.className = 'mt-4 h-6 text-lg font-medium text-yellow-500';
    }
    return;
  }

  const word = state.currentWord?.word || '';
  const goal = normalize(word);

  // 1) xin quyền micro trước
  const mic = await ensureMicPermission();
  if (mic !== true) {
    resultEl.textContent = '⚠️ Trình duyệt bị chặn micro hoặc không tìm thấy thiết bị.';
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-yellow-500';
    return;
  }

  // 2) khởi tạo recognition
  if (recognition) try { recognition.stop(); } catch {}
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;
  recognition.continuous = false;
  hadResult = false;

  // Timeout nếu không nói gì
  let noSpeechTimer = null;
  const setNoSpeechTimer = () => {
    clearTimeout(noSpeechTimer);
    noSpeechTimer = setTimeout(() => {
      try { recognition.abort(); } catch {}
      resultEl.textContent = '⚠️ Không phát hiện tiếng nói. Thử nói gần mic và rõ hơn.';
      resultEl.className = 'mt-4 h-6 text-lg font-medium text-yellow-500';
    }, 8000);
  };

  // UI states
  resultEl.textContent = `🎤 Đang nghe từ: "${word}"...`;
  resultEl.className = 'mt-4 h-6 text-lg font-medium text-gray-400';

  let interim = '';
  let finalText = '';
  let bestConf = 0;

  recognition.onstart = () => setNoSpeechTimer();
  recognition.onspeechstart = () => setNoSpeechTimer();
  recognition.onaudiostart = () => setNoSpeechTimer();
  recognition.onsoundstart = () => setNoSpeechTimer();
  recognition.onspeechend = () => setNoSpeechTimer();

  recognition.onresult = (e) => {
    setNoSpeechTimer();
    const last = e.results[e.results.length - 1];
    if (!last) return;

    if (last.isFinal) {
      // chọn alternative có confidence cao nhất
      let best = last[0];
      for (let i = 1; i < last.length; i++) {
        if ((last[i]?.confidence || 0) > (best?.confidence || 0)) best = last[i];
      }
      finalText = best?.transcript || '';
      bestConf = best?.confidence || 0;
    } else {
      interim = Array.from(last).map(a => a.transcript).join(' ');
    }
  };

  recognition.onnomatch = () => {
    clearTimeout(noSpeechTimer);
    resultEl.textContent = '🤔 Không nhận ra lời nói. Thử lại chậm và rõ hơn.';
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-yellow-500';
  };

  recognition.onerror = (e) => {
    clearTimeout(noSpeechTimer);
    let msg = '⚠️ Lỗi không xác định.';
    switch (e.error) {
      case 'not-allowed':
      case 'service-not-allowed':
        msg = '⚠️ Bạn đã chặn quyền micro. Mở quyền mic cho trang này rồi thử lại.';
        break;
      case 'audio-capture':
        msg = '⚠️ Không tìm thấy thiết bị thu âm. Kiểm tra micro & chọn đúng input.';
        break;
      case 'no-speech':
        msg = '⚠️ Không phát hiện tiếng nói. Hãy nói gần mic hơn và rõ ràng.';
        break;
      case 'network':
        msg = '⚠️ Lỗi mạng khi nhận dạng. Kiểm tra kết nối Internet.';
        break;
      default:
        msg = `⚠️ Lỗi: ${e.error}`;
    }
    resultEl.textContent = msg;
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-yellow-500';
  };

  recognition.onend = () => {
    clearTimeout(noSpeechTimer);

    // nếu chưa có kết quả → coi như no-speech
    if (!finalText && !interim) {
      if (!resultEl.textContent) {
        resultEl.textContent = '⚠️ Không nhận được âm thanh, thử lại nhé.';
        resultEl.className = 'mt-4 h-6 text-lg font-medium text-yellow-500';
      }
      return;
    }

    hadResult = true;
    const heardRaw = finalText || interim;
    const heard = normalize(heardRaw);

    // So khớp gần đúng
    const dist = levenshtein(heard, goal);
    const pass =
      heard === goal ||
      (goal.length >= 4 && dist <= 1) ||
      (goal.length >= 7 && dist <= 2);

    playSound(pass ? 'correct' : 'wrong');
    if (state.currentWord) updateWordLevel(state.currentWord, pass);

    if (pass) {
      resultEl.textContent = `✅ Chuẩn! Bạn nói: "${heardRaw}"${bestConf ? ` (conf: ${Math.round(bestConf * 100)}%)` : ''}`;
      resultEl.className = 'mt-4 h-6 text-lg font-medium text-green-500';
      setTimeout(() => startPronunciation('pronunciation-screen-content'), 1200);
    } else {
      resultEl.textContent = `❌ Chưa đúng. Bạn nói: "${heardRaw}". Đáp án: "${word}"`;
      resultEl.className = 'mt-4 h-6 text-lg font-medium text-red-500';
    }
  };

  try {
    recognition.start(); // nên gọi từ onclick để iOS cho phép
  } catch {
    clearTimeout(noSpeechTimer);
    resultEl.textContent = '⚠️ Không thể khởi động nhận dạng. Thử lại.';
    resultEl.className = 'mt-4 h-6 text-lg font-medium text-yellow-500';
  }
}

// Bảo đảm callable từ onclick trong HTML
if (typeof window !== 'undefined') {
  window.listenForPronunciation = listenForPronunciation;
}
