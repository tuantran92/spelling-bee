// js/ui/settings.js
import { state } from '../state.js';
import { saveUserData } from '../data.js';
import * as profile from '../profile.js';
import { populateFilters, applyFilters, setAllTopics } from './filters.js';

/** Render tab Hồ sơ (Settings) */
export function renderProfileTab() {
  const container = document.getElementById('profile-tab');
  if (!container) return;

  const goal = state.appData.settings?.dailyGoal || { type: 'words', value: 20 };
  const fontSize = state.appData.settings?.fontSize || 1.0;
  const avatarSrc =
    state.appData.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(state.appData.profileName || 'User')}&background=random&color=fff`;

  container.innerHTML = `
    <header class="text-center mb-8">
      <div id="avatarWrapper" class="relative inline-block group cursor-pointer">
        <img id="profileAvatarImg" src="${avatarSrc}" alt="Avatar"
             class="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 dark:border-indigo-800">
        <div class="absolute inset-0 hidden group-hover:flex items-center justify-center
                    bg-black/40 text-white text-xs font-medium rounded-full pointer-events-none">
          Đổi ảnh
        </div>
      </div>
      <h1 class="text-2xl font-bold mt-4">${state.appData.profileName || ''}</h1>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Trái: Tùy chọn học -->
      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">TÙY CHỌN HỌC</h3>

        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 class="font-medium mb-2">Chủ đề & Độ khó</h4>

          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Chủ đề (chọn nhiều)
          </label>
          <div id="topic-checkboxes"
               class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto p-2
                      bg-gray-50 dark:bg-gray-600 rounded-md border border-gray-300 dark:border-gray-500"></div>

          <div class="flex gap-2 mt-2">
            <button id="btn-select-all-topics"
                    class="px-3 py-1 rounded-md text-sm bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500">Chọn tất cả</button>
            <button id="btn-clear-topics"
                    class="px-3 py-1 rounded-md text-sm bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500">Bỏ chọn</button>
          </div>
          <p class="text-[11px] text-gray-500 mt-1">Chạm để bật/tắt từng chủ đề (thân thiện di động).</p>

          <div class="mt-4">
            <label for="difficulty-filter" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Độ khó</label>
            <select id="difficulty-filter" class="block w-full p-2 border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500">
              <option value="all">Tất cả</option>
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>

          <p id="filter-result-info" class="text-center text-xs text-gray-500 mt-2 h-4"></p>
        </div>

        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
          <label class="block text-sm font-medium mb-2">Mục tiêu hàng ngày</label>
          <div class="flex items-center gap-2">
            <select id="goal-type-select" class="block w-2/3 p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white">
              <option value="words" ${goal.type === 'words' ? 'selected' : ''}>Ôn từ</option>
              <option value="minutes" ${goal.type === 'minutes' ? 'selected' : ''}>Dành thời gian</option>
            </select>
            <input type="number" id="goal-value-input" value="${goal.value}" min="1"
                   class="block w-1/3 p-2 text-base border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white">
            <span id="goal-unit-label" class="text-sm text-gray-600 dark:text-gray-400">
              ${goal.type === 'words' ? 'từ' : 'phút'}
            </span>
          </div>
        </div>

        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <label for="dark-mode-toggle-switch">Chế độ tối</label>
            <button id="dark-mode-toggle-switch" class="p-2 rounded-lg text-2xl" title="Bật/Tắt dark mode">
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
      </div>

      <!-- Phải: Tài khoản -->
      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">TÀI KHOẢN</h3>
        <div class="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4">
          <div class="flex justify-between items-center py-2 cursor-pointer hover:opacity-80" id="switch-profile-btn">
            <span class="font-medium">Đổi hồ sơ</span>
            <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render & events cho phần còn lại
  populateFilters();
  const box = document.getElementById('topic-checkboxes');
  if (box) box.addEventListener('change', () => applyFilters());
  const diff = document.getElementById('difficulty-filter');
  if (diff) diff.addEventListener('change', () => applyFilters());
  const selAll = document.getElementById('btn-select-all-topics');
  const clrAll = document.getElementById('btn-clear-topics');
  if (selAll) selAll.addEventListener('click', () => setAllTopics(true));
  if (clrAll) clrAll.addEventListener('click', () => setAllTopics(false));

  const darkBtn = document.getElementById('dark-mode-toggle-switch');
  if (darkBtn) darkBtn.addEventListener('click', toggleDarkMode);

  const switchBtn = document.getElementById('switch-profile-btn');
  if (switchBtn) switchBtn.addEventListener('click', () => profile.switchProfile());

  setupVoiceOptions();
  addSettingsEventListeners();
  applyAppearanceSettings();
  applyFilters();

  // 🔑 avatar clickable
  profile.initAvatarChangeUI();
}

/** Lưu mục tiêu */
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

  // Kích hoạt load voice trên vài trình duyệt (hack nhẹ)
  if (synth.getVoices().length === 0) {
    const noop = new SpeechSynthesisUtterance('');
    synth.speak(noop); synth.cancel();
  }

  function populateVoiceList() {
    const voiceSelect = document.getElementById('voice-select');
    if (!voiceSelect) return;

    setTimeout(() => {
      const voices = synth.getVoices();
      if (voices.length === 0) { setTimeout(populateVoiceList, 100); return; }

      const supportedVoices = voices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('vi'));
      const savedVoiceName = state.appData.settings?.voice;
      voiceSelect.innerHTML = '';

      const enVoices = supportedVoices.filter(v => v.lang.startsWith('en'));
      const viVoices = supportedVoices.filter(v => v.lang.startsWith('vi'));

      if (enVoices.length) {
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

      if (viVoices.length) {
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

  // ✅ DEMO: phát trực tiếp theo voice chọn (không qua window.speakWord)
  const demoBtn = document.getElementById('demo-voice-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      const voiceSelect = document.getElementById('voice-select');
      const rateSlider = document.getElementById('rate-slider');
      if (!voiceSelect || !rateSlider) return;

      const wantedName = voiceSelect.value;
      const rate = Math.max(0.5, Math.min(2, parseFloat(rateSlider.value || '1')));

      const u = new SpeechSynthesisUtterance('Hello, this is a test.');
      const voices = window.speechSynthesis.getVoices() || [];
      const v = voices.find(v => v.name === wantedName)
            || voices.find(v => v.lang?.toLowerCase().startsWith('en'))
            || voices[0];

      if (v) { u.voice = v; if (v.lang) u.lang = v.lang; }
      u.rate = rate;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  }
}

export function addSettingsEventListeners() {
  const safe = (id, evt, handler) => {
    const el = document.getElementById(id);
    if (el) { el.removeEventListener(evt, handler); el.addEventListener(evt, handler); }
  };
  safe('goal-type-select', 'change', handleGoalChange);
  safe('goal-value-input', 'change', handleGoalChange);
  safe('font-size-slider', 'input', handleFontSizeChange);

  // ✅ Lưu giọng đọc & tốc độ vào settings
  safe('voice-select', 'change', () => {
    state.appData.settings = state.appData.settings || {};
    state.appData.settings.voice = document.getElementById('voice-select')?.value || '';
    saveUserData();
  });
  safe('rate-slider', 'change', () => {
    state.appData.settings = state.appData.settings || {};
    const v = parseFloat(document.getElementById('rate-slider')?.value || '1') || 1;
    state.appData.settings.speechRate = Math.max(0.5, Math.min(2, v));
    const rv = document.getElementById('rate-value');
    if (rv) rv.textContent = state.appData.settings.speechRate.toFixed(1);
    saveUserData();
  });
}
