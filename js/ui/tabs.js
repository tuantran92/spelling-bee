// js/ui/tabs.js
import { updateAndCacheSuggestions } from '../data.js';
import { renderHomeTab } from './home.js';
import { renderVocabTab } from './vocab.js';
import { renderProgressTab } from './progress.js';
import { renderProfileTab } from './settings.js';

export function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`)?.classList.add('active');

  if (tabId === 'home-tab') updateAndCacheSuggestions();

  switch (tabId) {
    case 'home-tab':     renderHomeTab();     break;
    case 'vocab-tab':    renderVocabTab();    break;
    case 'progress-tab': renderProgressTab(); break;
    case 'profile-tab':  renderProfileTab();  break;
  }
}
