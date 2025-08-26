// js/ui/home.js
import { state } from '../state.js';
import { getReviewableWords } from '../data.js';
import { renderPracticeModeItem } from './components.js';

export function renderHomeTab() {
  const container = document.getElementById('home-tab');
  if (!container) return;

  const profileName = state.appData.profileName || "Bạn";
  const streak = state.appData.streak || 0;
  const avatarSrc = state.appData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=random&color=fff`;

  const reviewCount = getReviewableWords().length;
  const { type, value } = state.appData.settings?.dailyGoal || { type: 'words', value: 20 };
  const { words, minutes } = state.appData.dailyProgress || { words: 0, minutes: 0 };
  const progressValue = type === 'words' ? words : Math.floor(minutes);
  const progressPercentage = value > 0 ? Math.min(100, (progressValue / value) * 100) : 0;

  container.innerHTML = `
    <header class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold">Chào, ${profileName}!</h1>
        <p class="text-gray-500 dark:text-gray-400">Sẵn sàng để học chưa?</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-center">
          <div class="text-3xl lg:text-4xl">🔥</div>
          <div class="font-bold text-orange-500">${streak}</div>
        </div>
        <img src="${avatarSrc}" alt="Avatar" class="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800">
      </div>
    </header>

    <div class="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg mb-8 cursor-pointer transform hover:scale-105 transition-transform" onclick="showGameScreen('review-screen')">
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-xl font-bold">Ôn tập hôm nay</h2>
          <p class="text-3xl font-bold mt-1">${reviewCount} từ</p>
        </div>
        <div class="bg-white/20 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
      </div>
      <div class="mt-4">
        <p class="text-xs font-medium mb-1">Mục tiêu ngày: ${progressValue}/${value} ${type === 'words' ? 'từ' : 'phút'}</p>
        <div class="w-full bg-white/20 rounded-full h-2"><div class="bg-white h-2 rounded-full" style="width:${progressPercentage}%"></div></div>
      </div>
    </div>

    <div>
      <h3 class="text-lg lg:text-xl font-semibold mb-4">Luyện tập</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${renderPracticeModeItem('Học theo gợi ý', 'Tập trung vào từ khó và từ mới', 'suggestion-screen')}
        ${renderPracticeModeItem('Đánh Vần', 'Luyện kỹ năng viết đúng chính tả', 'spelling-screen')}
        ${renderPracticeModeItem('Flashcard', 'Học từ với thẻ ghi nhớ', 'reading-screen')}
        ${renderPracticeModeItem('Trắc Nghiệm', 'Chọn nghĩa đúng của từ', 'mcq-screen')}
        ${renderPracticeModeItem('Nhớ từ mới', 'Chọn từ đúng trong các từ bị xáo trộn', 'remember-word-screen')}
        ${renderPracticeModeItem('Luyện Nghe', 'Nghe và gõ lại từ', 'listening-screen')}
        ${renderPracticeModeItem('Sắp Xếp Chữ', 'Tạo thành từ đúng', 'scramble-screen')}
        ${renderPracticeModeItem('Phát Âm', 'Kiểm tra phát âm của bạn', 'pronunciation-screen')}
        ${renderPracticeModeItem('Điền từ', 'Hoàn thành câu với từ đúng', 'fill-blank-screen')}
        ${renderPracticeModeItem('Luyện Thi', 'Kiểm tra kiến thức tổng hợp', 'exam-screen')}
        ${renderPracticeModeItem('Nối từ (Word Match)', 'Ghép từ với nghĩa đúng', 'word-match-screen')}
        ${renderPracticeModeItem('Đoán chữ', 'Đoán chữ cái của từ', 'hangman-screen')}

      </div>
    </div>
  `;
}
