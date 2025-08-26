// js/ui/settings.js
import { state, setState } from '../state.js';
import { saveUserData } from '../data.js';
import * as profile from '../profile.js';
import { populateFilters, applyFilters } from './filters.js';

export function renderProfileTab() {
  const container = document.getElementById('profile-tab');
  if (!container) return;

  const goal = state.appData.settings?.dailyGoal || { type: 'words', value: 20 };
  const fontSize = state.appData.settings?.fontSize || 1.0;
  const isDarkMode = document.documentElement.classList.contains('dark');
  const avatarSrc = state.appData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.appData.profileName)}&background=random&color=fff`;

  container.innerHTML = `
    <header class="text-center mb-8">
      <div class="relative inline-block group">
        <img id="profile-avatar" src="${avatarSrc}" alt="Avatar" class="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 dark:border-indigo-800">
        <label for="avatar-upload-input" class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </label>
        <input type="file" id="avatar-upload-input" class="hidden" accept="image/*">
      </div>
      <h1 class="text-2xl font-bold mt-4">${state.appData.profileName || ''}</h1>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">TÀI KHOẢN & DỮ LIỆU</h3>
        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg">
          ${renderSettingsItem('switch-profile-btn', 'Đổi hồ sơ', 'profile.switchProfile()')}
          <div id="update-phonetics-wrapper">
            ${renderSettingsItem('update-phonetics-btn', 'Cập nhật phiên âm (hàng loạt)', 'profile.updateAllPhonetics()')}
          </div>
          ${renderSettingsItem('delete-profile-btn', 'Xóa hồ sơ này', 'profile.promptDeleteProfile()', 'text-red-500')}
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">BẢO TRÌ DỮ LIỆU</h3>
        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
          <p class="text-sm text-gray-500 mb-2">Chạy chức năng này một lần duy nhất để chuyển các ảnh từ Pixabay (sẽ hết hạn sau 24h) sang kho lưu trữ vĩnh viễn của bạn.</p>
          <button id="migrate-images-btn" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors duration-200">Bắt đầu chuyển đổi ảnh</button>
          <p id="migration-feedback" class="text-sm text-center mt-2 h-4 text-indigo-500"></p>
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">CÀI ĐẶT</h3>
        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 class="font-medium mb-2">Tùy chọn học</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="category-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Chủ đề</label>
              <select id="category-filter" onchange="applyFilters()" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500"></select>
            </div>
            <div>
              <label for="difficulty-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Độ khó</label>
              <select id="difficulty-filter" onchange="applyFilters()" class="mt-1 block w-full p-2 border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500">
                <option value="all">Tất cả</option><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option>
              </select>
            </div>
          </div>
          <p id="filter-result-info" class="text-center text-xs text-gray-500 mt-2 h-4"></p>
        </div>

        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <label for="dark-mode-toggle-switch">Chế độ tối</label>
            <button id="dark-mode-toggle-switch" onclick="toggleDarkMode()" class="p-2 rounded-lg text-2xl">
              ${document.documentElement.classList.contains('dark') ? '🌙' : '☀️'}
            </button>
          </div>
          <hr class="border-gray-200 dark:border-gray-600 my-2">
          <div>
            <label for="voice-select" class="block text-sm font-medium mb-1">Giọng đọc</label>
            <div class="flex items-center gap-2">
              <select id="voice-select" class="w-full p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"></select>
              <button id="demo-voice-btn" class="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500" title="Nghe thử">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
              </button>
            </div>
          </div>
          <div class="mt-2">
            <label for="rate-slider" class="block text-sm font-medium">Tốc độ: <span id="rate-value">1.0</span>x</label>
            <input id="rate-slider" type="range" min="0.5" max="2" step="0.1" value="1" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-500 mt-1">
          </div>
          <div class="mt-2">
            <label for="font-size-slider" class="block text-sm font-medium">Cỡ chữ từ vựng: <span id="font-size-value">${fontSize.toFixed(1)}</span>x</label>
            <input id="font-size-slider" type="range" min="0.8" max="1.5" step="0.1" value="${fontSize}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-500 mt-1">
          </div>
        </div>

        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
          <label class="block text-sm font-medium mb-2">Mục tiêu hàng ngày</label>
          <div class="flex items-center gap-2">
            <select id="goal-type-select" class="block w-2/3 p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white">
              <option value="words" ${goal.type === 'words' ? 'selected' : ''}>Ôn từ</option>
              <option value="minutes" ${goal.type === 'minutes' ? 'selected' : ''}>Dành thời gian</option>
            </select>
            <input type="number" id="goal-value-input" value="${goal.value}" min="1" class="block w-1/3 p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white">
            <span id="goal-unit-label" class="text-sm text-gray-600 dark:text-gray-400">${goal.type === 'words' ? 'từ' : 'phút'}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  populateFilters();
  applyFilters();
  setupVoiceOptions();
  addSettingsEventListeners();
  applyAppearanceSettings();
}

export function handleGoalChange() {
  const typeSelect = document.getElementById('goal-type-select');
  const valueInput = document.getElementById('goal-value-input');
  const unitLabel = document.getElementById('goal-unit-label');
  if (!typeSelect || !valueInput || !unitLabel) return;

  const goalType = typeSelect.value;
  const goalValue = parseInt(valueInput.value) || 1;
  valueInput.value = goalValue;
  unitLabel.textContent = goalType === 'words' ? 'từ' : 'phút';

  state.appData.settings.dailyGoal = { type: goalType, value: goalValue };
  saveUserData();
}

export function handleFontSizeChange() {
  const slider = document.getElementById('font-size-slider');
  const display = document.getElementById('font-size-value');
  if (!slider || !display) return;

  const newSize = parseFloat(slider.value);
  display.textContent = newSize.toFixed(1);
  state.appData.settings.fontSize = newSize;
  applyAppearanceSettings();
  saveUserData();
}

export function applyAppearanceSettings() {
  const isDark = state.appData.settings?.darkMode ?? localStorage.getItem('darkMode') === 'true';
  document.documentElement.classList.toggle('dark', isDark);

  const fontSize = state.appData.settings?.fontSize || 1.0;
  document.documentElement.style.setProperty('--vocab-font-scale', fontSize);
}

// settings.js
export function updateDashboard() {
  const home = document.getElementById('home-tab');
  if (home && home.classList.contains('active')) {
    import('./home.js').then(({ renderHomeTab }) => renderHomeTab());
  }
}


export function toggleDarkMode() {
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  const newDarkModeState = !isCurrentlyDark;
  localStorage.setItem('darkMode', newDarkModeState);

  if (state.appData.settings) {
    state.appData.settings.darkMode = newDarkModeState;
    saveUserData();
  }
  applyAppearanceSettings();

  if (document.getElementById('profile-tab')?.classList.contains('active')) {
    renderProfileTab();
  }
}

export function setupVoiceOptions() {
  const synth = window.speechSynthesis;

  function populateVoiceList() {
    const voiceSelect = document.getElementById('voice-select');
    if (!voiceSelect) return;

    setTimeout(() => {
      let voices = synth.getVoices();
      if (voices.length === 0) { setTimeout(populateVoiceList, 100); return; }

      const supportedVoices = voices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('vi'));
      setState({ availableVoices: supportedVoices });

      const savedVoiceName = state.appData.settings.voice;
      voiceSelect.innerHTML = '';

      const enVoices = supportedVoices.filter(v => v.lang.startsWith('en'));
      const viVoices = supportedVoices.filter(v => v.lang.startsWith('vi'));

      if (enVoices.length > 0) {
        const group = document.createElement('optgroup');
        group.label = 'Giọng Tiếng Anh';
        enVoices.forEach(voice => {
          const opt = document.createElement('option');
          opt.textContent = `${voice.name} (${voice.lang})`;
          opt.value = voice.name;
          if (voice.name === savedVoiceName) opt.selected = true;
          group.appendChild(opt);
        });
        voiceSelect.appendChild(group);
      }

      if (viVoices.length > 0) {
        const group = document.createElement('optgroup');
        group.label = 'Giọng Tiếng Việt';
        viVoices.forEach(voice => {
          const opt = document.createElement('option');
          opt.textContent = `${voice.name} (${voice.lang})`;
          opt.value = voice.name;
          if (voice.name === savedVoiceName) opt.selected = true;
          group.appendChild(opt);
        });
        voiceSelect.appendChild(group);
      }

      if (voiceSelect.selectedIndex === -1 && voiceSelect.options.length > 0) {
        voiceSelect.options[0].selected = true;
      }
    }, 50);
  }

  populateVoiceList();
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = populateVoiceList;
}

export function addSettingsEventListeners() {
  // init migration
  profile.initDataMigration();

  const safe = (id, evt, handler) => {
    const el = document.getElementById(id);
    if (el) { el.removeEventListener(evt, handler); el.addEventListener(evt, handler); }
  };

  safe('rate-slider', 'input', (e) => {
    const rateValue = document.getElementById('rate-value');
    if (rateValue) rateValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  safe('goal-type-select', 'change', handleGoalChange);
  safe('goal-value-input', 'change', handleGoalChange);

  safe('demo-voice-btn', 'click', () => {
    const voiceSelect = document.getElementById('voice-select');
    const rateSlider = document.getElementById('rate-slider');
    if (!voiceSelect || !rateSlider) return;

    const selectedVoiceName = voiceSelect.value;
    const rate = parseFloat(rateSlider.value);
    if (window.speakWord) window.speakWord("Hello, this is a test.", null, { voiceName: selectedVoiceName, rate });
  });

  safe('font-size-slider', 'input', handleFontSizeChange);
  safe('avatar-upload-input', 'change', profile.handleAvatarUpload);
}

// internal helper used in renderProfileTab
function renderSettingsItem(id, text, onclickAction, textColor = '') {
  return `<div id="${id}" onclick="${onclickAction}" class="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600/50 first:rounded-t-lg last:rounded-b-lg">
    <span class="font-medium ${textColor}">${text}</span>
    <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
  </div>`;
}
