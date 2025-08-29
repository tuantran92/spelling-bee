// js/ui/home.js
import { state } from '../state.js';
import { getReviewableWords } from '../data.js';

// Cấu hình các ô chức năng (tiêu đề, mô tả, màn hình, màu accent, icon)
const FEATURES = [
  { title: 'Học Theo Gợi Ý', sub: 'Tập trung vào từ khó và từ mới', screen: 'suggestion-screen', accent: 'violet', icon: '✨' },
  { title: 'Đánh Vần', sub: 'Luyện kỹ năng viết đúng chính tả', screen: 'spelling-screen', accent: 'blue', icon: '✍️' },
  { title: 'Flashcard', sub: 'Học từ với thẻ ghi nhớ', screen: 'reading-screen', accent: 'teal', icon: '🃏' },
  { title: 'Trắc Nghiệm', sub: 'Chọn nghĩa đúng của từ', screen: 'mcq-screen', accent: 'blue', icon: '📝' },
  { title: 'Nhớ Từ Mới', sub: 'Chọn từ đúng trong các từ', screen: 'remember-word-screen', accent: 'green', icon: '✅' },
  { title: 'Sắp Xếp Chữ', sub: 'Tạo thành từ đúng', screen: 'scramble-screen', accent: 'amber', icon: '🔤' },
  { title: 'Sắp Xếp Chữ (tính giờ)', sub: 'Liên tục tới khi hết giờ', screen: 'timed-scramble-screen', accent: 'amber', icon: '⏱️' },
  { title: 'Điền từ', sub: 'Hoàn thành câu với từ đúng', screen: 'fill-blank-screen', accent: 'teal', icon: '🧩' },
  { title: 'Luyện Thi', sub: 'Kiểm tra kiến thức tổng hợp', screen: 'exam-screen', accent: 'violet', icon: '📚' },
  { title: 'Nối Từ (Word Match)', sub: 'Ghép từ với nghĩa đúng', screen: 'word-match-screen', accent: 'green', icon: '🔗' },
  { title: 'Đoán Chữ', sub: 'Đoán chữ cái của từ', screen: 'hangman-screen', accent: 'amber', icon: '🎯' },
  { title: 'Luyện Nghe', sub: 'Nghe và gõ lại từ', screen: 'listening-screen', accent: 'rose', icon: '🎧' },
  { title: 'Phát Âm', sub: 'Kiểm tra phát âm của bạn', screen: 'pronunciation-screen', accent: 'rose', icon: '🎙️' },
];

export function renderHomeTab() {
  const container = document.getElementById('home-tab');
  if (!container) return;

  const profileName = state.appData.profileName || 'Bạn';
  const streak = state.appData.streak || 0;
  const avatarSrc =
    state.appData.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=random&color=fff`;

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

    <!-- Hero: Ôn tập hôm nay -->
    <section class="hero cursor-pointer" onclick="showGameScreen('review-screen')">
      <div class="flex justify-between items-start">
        <div>
          <div class="opacity-90">Ôn tập hôm nay</div>
          <div class="font-extrabold text-4xl leading-none mt-1">${reviewCount} từ</div>
          <div class="opacity-85 mt-1 text-sm">Mục tiêu ngày: ${progressValue}/${value} ${type === 'words' ? 'từ' : 'phút'}</div>
        </div>
        <button class="rounded-xl px-3 py-2 font-bold bg-white/15 border border-white/25">Tiếp tục ôn</button>
      </div>
      <div class="progress mt-3"><span style="width:${progressPercentage}%;"></span></div>
    </section>

    <h3 class="section-title mt-6">Luyện tập</h3>

    <!-- Lưới chức năng -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      ${FEATURES.map(f => `
        <a data-accent="${f.accent}" href="javascript:void(0)" onclick="showGameScreen('${f.screen}')">
          <div class="feature">
            <div class="icon">${f.icon}</div>
            <div>
              <div class="title">${f.title}</div>
              <div class="subtitle">${f.sub}</div>
            </div>
            <div class="chev">›</div>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}
