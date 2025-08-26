// js/ui.js  (AGGREGATOR – giữ API cũ, re-export từ các module con)
export { showTab } from './ui/tabs.js';
export { showGameScreen, closeGameScreen } from './ui/game-screen.js';
export { renderHomeTab } from './ui/home.js';
export { renderVocabTab } from './ui/vocab.js';
export { renderProgressTab, showProgressSubTab } from './ui/progress.js';
export { renderProfileTab, handleGoalChange, handleFontSizeChange, applyAppearanceSettings, updateDashboard, toggleDarkMode, setupVoiceOptions, addSettingsEventListeners } from './ui/settings.js';
export { populateFilters, applyFilters } from './ui/filters.js';
export { renderPracticeModeItem } from './ui/components.js';
export { showToast } from './ui/toast.js';

// 👉 Đảm bảo inline onclick trong HTML vẫn gọi được (bind ra global)
if (typeof window !== 'undefined') {
  import('./ui/tabs.js').then(m => { window.showTab = m.showTab; });
  import('./ui/game-screen.js').then(m => {
    window.showGameScreen = m.showGameScreen;
    window.closeGameScreen = m.closeGameScreen;
  });
  import('./ui/progress.js').then(m => { window.showProgressSubTab = m.showProgressSubTab; });
  import('./ui/filters.js').then(m => { window.applyFilters = m.applyFilters; });
  import('./ui/settings.js').then(m => {
    window.toggleDarkMode = m.toggleDarkMode;
    window.handleGoalChange = m.handleGoalChange;
  });
}
