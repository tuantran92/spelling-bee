// js/ui/filters.js
import { state, setState } from '../state.js';

export function populateFilters() {
  const categoryFilterEl = document.getElementById('category-filter');
  const difficultyFilterEl = document.getElementById('difficulty-filter');
  if (!categoryFilterEl || !difficultyFilterEl) return;

  const categories = ['all', ...new Set(state.vocabList.map(v => v.category || 'Chung'))];
  categoryFilterEl.innerHTML = categories.map(cat =>
    `<option value="${cat}">${cat === 'all' ? 'Tất cả chủ đề' : cat}</option>`).join('');

  categoryFilterEl.value = state.activeFilters.category;
  difficultyFilterEl.value = state.activeFilters.difficulty;
}

export function applyFilters() {
  const category = document.getElementById('category-filter')?.value || 'all';
  const difficulty = document.getElementById('difficulty-filter')?.value || 'all';

  setState({ activeFilters: { category, difficulty } });

  let filtered = state.vocabList;
  if (category !== 'all') filtered = filtered.filter(v => (v.category || 'Chung') === category);
  if (difficulty !== 'all') filtered = filtered.filter(v => (v.difficulty || 'medium') === difficulty);
  setState({ filteredVocabList: filtered });

  const infoEl = document.getElementById('filter-result-info');
  if (infoEl) {
    infoEl.textContent = (filtered.length < state.vocabList.length)
      ? `Áp dụng cho ${filtered.length} từ`
      : 'Áp dụng cho tất cả từ';
  }
}
