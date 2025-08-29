// js/ui/filters.js
import { state, setState } from '../state.js';
import { saveUserData } from '../data.js';

/**
 * Vẽ danh sách checkbox chủ đề + set độ khó hiện tại.
 * Gọi sau khi render tab Hồ sơ.
 */
export function populateFilters() {
  const box = document.getElementById('topic-checkboxes');
  const difficultyEl = document.getElementById('difficulty-filter');
  if (!box || !difficultyEl) return;

  // danh sách chủ đề duy nhất
  const topics = [...new Set(
    state.vocabList.map(v => (v.category || 'Chung').trim())
  )].filter(Boolean).sort((a, b) => a.localeCompare(b));

  // chủ đề đang chọn trong settings
  const selected = Array.isArray(state.appData?.settings?.studyTopics)
    ? state.appData.settings.studyTopics
    : [];

  // build checkbox list (to, dễ bấm trên mobile)
  box.innerHTML = topics.map(t => `
    <label class="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
      <input type="checkbox" name="topic-item" value="${t.replace(/"/g, '&quot;')}"
             class="w-5 h-5 accent-violet-600"
             ${selected.includes(t) ? 'checked' : ''}>
      <span class="text-sm">${t}</span>
    </label>
  `).join('');

  // độ khó
  difficultyEl.value = state.appData?.settings?.studyDifficulty || 'all';
}

/**
 * Đọc checkbox + độ khó -> lưu settings + lọc danh sách từ.
 * Gọi khi thay đổi bất kỳ checkbox hoặc độ khó.
 */
export function applyFilters() {
  const boxes = document.querySelectorAll('#topic-checkboxes input[name="topic-item"]:checked');
  const difficultyEl = document.getElementById('difficulty-filter');

  const categories = Array.from(boxes).map(b => b.value);
  const difficulty = difficultyEl ? difficultyEl.value : 'all';

  // lưu settings để dùng cho game & lần mở sau
  if (state.appData?.settings) {
    state.appData.settings.studyTopics = categories;
    state.appData.settings.studyDifficulty = difficulty;
    try { saveUserData(); } catch {}
  }
  setState({ activeFilters: { categories, difficulty } });

  // lọc danh sách từ
  let filtered = state.vocabList;
  if (categories.length) {
    const set = new Set(categories.map(t => t.toLowerCase()));
    filtered = filtered.filter(v => set.has((v.category || 'Chung').toLowerCase()));
  }
  if (difficulty !== 'all') {
    filtered = filtered.filter(v => (v.difficulty || 'medium') === difficulty);
  }
  setState({ filteredVocabList: filtered });

  const infoEl = document.getElementById('filter-result-info');
  if (infoEl) {
    infoEl.textContent = (filtered.length < state.vocabList.length)
      ? `Áp dụng cho ${filtered.length} từ`
      : 'Áp dụng cho tất cả từ';
  }
}

/** Đánh dấu tất cả / bỏ chọn tất cả chủ đề rồi áp filter */
export function setAllTopics(checked) {
  document.querySelectorAll('#topic-checkboxes input[name="topic-item"]').forEach(i => { i.checked = checked; });
  applyFilters();
}
