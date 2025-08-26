// js/ui/vocab.js
import * as vocabManager from '../vocabManager.js';

export function renderVocabTab() {
  const container = document.getElementById('vocab-tab');
  if (!container) return;
  container.innerHTML = `
    <header class="mb-4"><h1 class="text-2xl font-bold">Kho từ vựng</h1></header>
    <div id="vocab-management-content"></div>
    <button onclick="openVocabForm()" class="fixed bottom-20 right-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-40">
      <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
    </button>
  `;
  vocabManager.renderVocabManagementList('vocab-management-content');
}
