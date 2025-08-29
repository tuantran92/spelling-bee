export {
  startScramble,
  checkScramble,
  toggleScrambleHint,
  showScrambleAnswer,
  handleScrambleLetterClick,
  handleAnswerLetterClick,
  handleScrambleBackspace,
} from './game-modes/scramble.js';
export { startTimedScramble } from './game-modes/timed-scramble.js';
export {
  startMcq,
  checkMcq,
} from './game-modes/mcq.js';
export {
  startSuggestionMode,
  startSuggestionSession,
  nextSuggestionWord
} from './game-modes/suggestion.js';

export {
  renderReviewCard,
  handleReviewAnswer,
  startReview
} from './game-modes/review.js';
export { startRememberWord, checkRememberWord } from './game-modes/remember-word.js';
export { startListening, checkListening } from './game-modes/listening.js';
export { startPronunciation, listenForPronunciation } from './game-modes/pronunciation.js';
export { startSpelling, checkSpelling } from './game-modes/spelling.js';
export {
  startFillBlank, checkFillBlank, toggleFillBlankHint,
  skipFillBlankQuestion, translateFillBlankSentence
} from './game-modes/fill-blank.js';
export { startReading, handleFlashcardAnswer } from './game-modes/reading.js';
export { startWordMatch } from './game-modes/word-match.js';
export { startHangman, hangmanGuess } from './game-modes/hangman.js';

// js/gameModes.js
import { state, setState } from './state.js';
import { updateWordLevel, recordDailyActivity, saveUserData, getReviewableWords, updateAndCacheSuggestions, fetchWordData } from './data.js';
import { scrambleWord, levenshteinDistance, playSound, maskWord, shuffleArray } from './utils.js';
import { closeGameScreen } from './ui.js';
import { speak } from './utils.js';
// Wrapper cho legacy code: một số màn vẫn gọi speakWord(...)
export function speakWord(word, event, options = {}) {
  try { if (event) event.stopPropagation(); } catch {}
  // có thể dùng options.voiceName / options.rate nếu cần,
  // nhưng mặc định gọi speak(word) là đủ
  try { speak(word); } catch (e) { console.warn('speakWord fallback error:', e); }
}

export { openEtymologyPopup, getWordOrigin } from './services/etymology.js';
export { startExam } from './game-modes/exam.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
