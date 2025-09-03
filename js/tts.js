// js/tts.js
import { state } from './state.js';

let voicesCache = [];

// Lấy danh sách voice, có cache đề phòng getVoices() trả rỗng lúc đầu
function getVoices() {
  const synth = window.speechSynthesis;
  if (!synth) return [];
  const list = synth.getVoices() || [];
  if (list.length) voicesCache = list;
  return list.length ? list : voicesCache;
}

function pickVoice(overrides = {}) {
  const wantedName = overrides.voiceName ?? state?.appData?.settings?.voice ?? '';
  let voices = getVoices();

  // Nếu chưa có voices (Chrome/Safari lần đầu), kích hoạt load
  if (!voices.length) {
    const synth = window.speechSynthesis;
    if (synth) {
      const noop = new SpeechSynthesisUtterance('');
      try { synth.speak(noop); synth.cancel(); } catch {}
    }
    voices = getVoices();
  }

  // 1) Ưu tiên tên được chỉ định
  if (wantedName) {
    const byName = voices.find(v => v.name === wantedName);
    if (byName) return byName;
  }

  // 2) Fallback theo ngôn ngữ (tuỳ app bạn dùng EN/VI)
  const byLangEn = voices.find(v => v.lang?.toLowerCase().startsWith('en'));
  if (byLangEn) return byLangEn;
  const byLangVi = voices.find(v => v.lang?.toLowerCase().startsWith('vi'));
  if (byLangVi) return byLangVi;

  // 3) Fallback đầu tiên
  return voices[0] || null;
}

/**
 * Hàm TTS chuẩn để bạn có thể gọi trực tiếp khi cần
 *   - overrides.voiceName: ép theo tên voice
 *   - overrides.rate: ép tốc độ
 */
export function speakWord(text, _opts = null, overrides = {}) {
  if (!text || !window.speechSynthesis) return;

  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);

  // Tốc độ: override > settings > 1
  const rate = Math.max(0.5, Math.min(2, overrides.rate ?? state?.appData?.settings?.speechRate ?? 1));
  u.rate = rate;

  // Voice
  const v = pickVoice(overrides);
  if (v) { u.voice = v; if (v.lang) u.lang = v.lang; }

  try { synth.cancel(); } catch {}
  synth.speak(u);
}

/**
 * Interceptor: ép MỌI utterance đi đúng voice + rate đã chọn,
 * kể cả khi game gọi speechSynthesis.speak() trực tiếp.
 */
export function installTTSInterceptor() {
  const synth = window.speechSynthesis;
  if (!synth || synth.__ttsInterceptorInstalled) return;

  const originalSpeak = synth.speak.bind(synth);

  synth.speak = function patchedSpeak(utter) {
    try {
      // Ép voice theo Settings nếu utter.voice chưa set hoặc bạn muốn luôn ép
      const chosen = pickVoice({});
      if (chosen && utter) {
        // Luôn đồng bộ giọng đã chọn (tránh lệch giọng do code cũ)
        utter.voice = chosen;
        if (chosen.lang) utter.lang = chosen.lang;
      }

      // Nếu app có speed setting mà utter.rate đang mặc định → áp setting
      const wantedRate = state?.appData?.settings?.speechRate;
      if (typeof wantedRate === 'number' && wantedRate > 0) {
        // Nếu code khác đã set rate rõ ràng, tôn trọng; nếu không, áp settings
        if (!('rate' in utter) || utter.rate === 1 || utter.rate == null) {
          utter.rate = Math.max(0.5, Math.min(2, wantedRate));
        }
      }
    } catch (e) {
      // nuốt lỗi để không phá speak gốc
      console.warn('TTS interceptor warn:', e);
    }

    // Gọi speak gốc
    return originalSpeak(utter);
  };

  synth.__ttsInterceptorInstalled = true;

  // Đảm bảo khi voices load xong, interceptor vẫn hoạt động
  if (typeof synth.onvoiceschanged === 'function') {
    const prev = synth.onvoiceschanged;
    synth.onvoiceschanged = (...args) => { try { prev.apply(synth, args); } catch {} };
  }
}
