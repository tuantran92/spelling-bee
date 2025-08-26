// js/ui/progress.js
import * as stats from '../statistics.js';
import * as achievements from '../achievements.js';

export function renderProgressTab() {
  const container = document.getElementById('progress-tab');
  if (!container) return;
  container.innerHTML = `
    <header class="mb-6"><h1 class="text-2xl font-bold">Tiến độ của bạn</h1></header>
    <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
      <button id="progress-sub-tab-stats" class="sub-tab-btn active-sub-tab px-4 py-2 font-semibold" onclick="showProgressSubTab('stats')">Tổng quan</button>
      <button id="progress-sub-tab-leaderboard" class="sub-tab-btn px-4 py-2 font-semibold" onclick="showProgressSubTab('leaderboard')">Bảng xếp hạng</button>
      <button id="progress-sub-tab-achievements" class="sub-tab-btn px-4 py-2 font-semibold" onclick="showProgressSubTab('achievements')">Thành tựu</button>
    </div>
    <div id="stats-sub-tab-content" class="sub-tab-content active"></div>
    <div id="leaderboard-sub-tab-content" class="sub-tab-content"></div>
    <div id="achievements-sub-tab-content" class="sub-tab-content"></div>
  `;
  stats.renderStatisticsPage('stats-sub-tab-content');
  stats.renderLeaderboardPage('leaderboard-sub-tab-content');
  achievements.renderAchievementsPage('achievements-sub-tab-content');
  showProgressSubTab('stats');
}

export function showProgressSubTab(subTabName) {
  document.querySelectorAll('.sub-tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.sub-tab-btn').forEach(el => el.classList.remove('active-sub-tab'));
  document.getElementById(`${subTabName}-sub-tab-content`).style.display = 'block';
  document.getElementById(`progress-sub-tab-${subTabName}`).classList.add('active-sub-tab');
}
