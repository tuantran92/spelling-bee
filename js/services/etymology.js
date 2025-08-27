// js/services/etymology.js
// Word Info popup: Definitions (Free Dictionary) + Etymology (Free Dictionary or Wiktionary fallback)
// Cache vào state.appData.wordInfoCache[word] = { dict, origin }.
// Back-compat: vẫn export getWordOrigin() để chỗ cũ gọi không bị lỗi.

import { state } from '../state.js';
import { saveUserData } from '../data.js';

const FREE_DICT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const WIKI_API  = 'https://en.wiktionary.org/w/api.php';

function ensureCache() {
  if (!state.appData) state.appData = {};
  if (!state.appData.wordInfoCache) state.appData.wordInfoCache = {};
  return state.appData.wordInfoCache;
}
function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('sup, .reference').forEach(el => el.remove());
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------- Fetchers ----------
async function fetchFreeDictionary(word) {
  const res = await fetch(`${FREE_DICT}${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`free-dict HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return null;

  // gộp dữ liệu các entry
  const first = data[0];
  // IPA
  const phonetic = first.phonetic || (first.phonetics && first.phonetics.find(p => p.text)?.text) || '';
  // audio đầu tiên
  let audio = '';
  for (const e of data) {
    const hit = (e.phonetics || []).find(p => p.audio);
    if (hit && hit.audio) { audio = hit.audio; break; }
  }

  // meanings: mỗi POS lấy 1-2 định nghĩa
  const meanings = [];
  for (const e of data) {
    (e.meanings || []).forEach(m => {
      const defs = (m.definitions || []).slice(0, 2).map(d => ({
        definition: d.definition,
        example: d.example || ''
      }));
      meanings.push({
        partOfSpeech: m.partOfSpeech || '',
        definitions: defs,
        synonyms: (m.synonyms || []).slice(0, 8)
      });
    });
  }

  // origin (nếu có)
  let origin = null;
  for (const e of data) {
    if (typeof e.origin === 'string' && e.origin.trim()) {
      origin = e.origin.trim(); break;
    }
  }

  return {
    phonetic,
    audio,
    meanings,
    sourceUrls: first.sourceUrls || [],
    origin // có thể null
  };
}

async function fetchWiktionaryEtymology(word) {
  const base = `${WIKI_API}?origin=*`;
  const secRes = await fetch(`${base}&action=parse&prop=sections&format=json&page=${encodeURIComponent(word)}`);
  if (!secRes.ok) throw new Error(`wiktionary sections HTTP ${secRes.status}`);
  const secData = await secRes.json();
  const sections = secData?.parse?.sections || [];
  const etySec = sections.find(s => String(s.line).toLowerCase().startsWith('etymology'));
  if (!etySec) return null;

  const txtRes = await fetch(`${base}&action=parse&format=json&prop=text&page=${encodeURIComponent(word)}&section=${etySec.index}`);
  if (!txtRes.ok) throw new Error(`wiktionary text HTTP ${txtRes.status}`);
  const txtData = await txtRes.json();
  const html = txtData?.parse?.text?.['*'];
  if (!html) return null;

  const text = stripHtml(html);
  return {
    text: text.length > 1400 ? text.slice(0, 1400).trim() + '…' : text,
    source: 'wiktionary',
    url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#Etymology`
  };
}

// ---------- Core ----------
export async function getWordInfo(word) {
  if (!word) return null;
  const key = String(word).toLowerCase();
  const cache = ensureCache();

  if (cache[key]) return cache[key];

  let dict = null;
  let origin = null;

  try { dict = await fetchFreeDictionary(key); } catch (e) { console.warn('[WordInfo] FreeDict error:', e); }

  if (dict?.origin) {
    origin = { text: dict.origin, source: 'dictionaryapi', url: 'https://dictionaryapi.dev/' };
  } else {
    try { origin = await fetchWiktionaryEtymology(key); } catch (e) { console.warn('[WordInfo] Wiktionary error:', e); }
  }

  const info = { dict, origin: origin || null };
  cache[key] = info;
  saveUserData();
  return info;
}

// Back-compat: ai gọi cũ vẫn dùng được
export async function getWordOrigin(word) {
  const info = await getWordInfo(word);
  return info?.origin || null;
}

// ---------- UI ----------
export async function openEtymologyPopup(word) {
  // xoá cũ
  document.getElementById('etymology-overlay')?.remove();

  // overlay
  const overlay = document.createElement('div');
  overlay.id = 'etymology-overlay';
  overlay.className = 'fixed inset-0 bg-black/40 flex items-center justify-center p-4';
  Object.assign(overlay.style, { zIndex: '2147483647' });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // card
  const card = document.createElement('div');
  card.className = 'max-w-2xl w-full bg-gray-900 text-gray-100 rounded-2xl shadow-2xl p-5';
  card.innerHTML = `
    <div class="flex items-start justify-between">
      <h3 class="text-xl font-bold">📜 Gốc từ & Định nghĩa: <span class="text-indigo-400">${word}</span></h3>
      <button id="ety-close" class="bg-gray-700 hover:bg-gray-600 rounded-full p-2" title="Đóng">✕</button>
    </div>

    <!-- Tabs -->
    <div class="mt-3 flex gap-2">
      <button id="ety-tab-def" class="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm font-semibold">Định nghĩa</button>
      <button id="ety-tab-ety" class="px-3 py-1 rounded-md bg-gray-700 text-gray-200 text-sm font-semibold">Gốc từ</button>
    </div>

    <!-- Panels -->
    <div id="ety-def-panel" class="mt-3"></div>
    <div id="ety-ety-panel" class="mt-3 hidden"></div>

    <div id="ety-source" class="mt-4 text-xs text-gray-400"></div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  function close(){ window.removeEventListener('keydown', esc); overlay.remove(); }
  const esc = (e)=>{ if(e.key==='Escape') close(); };
  window.addEventListener('keydown', esc);
  document.getElementById('ety-close')?.addEventListener('click', close);

  // tab switching
  const tabDef = card.querySelector('#ety-tab-def');
  const tabEty = card.querySelector('#ety-tab-ety');
  const panelDef = card.querySelector('#ety-def-panel');
  const panelEty = card.querySelector('#ety-ety-panel');
  function showDef(){ panelDef.classList.remove('hidden'); panelEty.classList.add('hidden'); tabDef.className='px-3 py-1 rounded-md bg-indigo-600 text-white text-sm font-semibold'; tabEty.className='px-3 py-1 rounded-md bg-gray-700 text-gray-200 text-sm font-semibold'; }
  function showEty(){ panelEty.classList.remove('hidden'); panelDef.classList.add('hidden'); tabEty.className='px-3 py-1 rounded-md bg-indigo-600 text-white text-sm font-semibold'; tabDef.className='px-3 py-1 rounded-md bg-gray-700 text-gray-200 text-sm font-semibold'; }
  tabDef.addEventListener('click', showDef);
  tabEty.addEventListener('click', showEty);

  // loading skeleton
  panelDef.innerHTML = `<div class="animate-pulse text-gray-400">Đang tải định nghĩa…</div>`;
  panelEty.innerHTML = `<div class="animate-pulse text-gray-400">Đang tải gốc từ…</div>`;

  // fetch info
  const info = await getWordInfo(word);
  renderDefinition(panelDef, info?.dict, word);
  renderEtymology(panelEty, info?.origin, word);
  renderSource(card.querySelector('#ety-source'), info);
}

function renderDefinition(panel, dict, word) {
  if (!dict) {
    panel.innerHTML = `<p>Không lấy được định nghĩa cho <b>${word}</b>.</p>`;
    return;
  }

  const audioBtn = dict.audio
    ? `<button id="ety-audio-btn" class="ml-2 px-2 py-1 rounded bg-white/10 hover:bg-white/20">🔊</button>
       <audio id="ety-audio" src="${dict.audio}"></audio>`
    : '';

  let html = `
    <div class="flex items-center gap-2">
      <div class="text-lg font-semibold">${dict.phonetic ? `<span class="font-mono">${dict.phonetic}</span>` : ''}</div>
      ${audioBtn}
    </div>
  `;

  if (Array.isArray(dict.meanings) && dict.meanings.length) {
    html += `<div class="mt-3 space-y-3">` +
      dict.meanings.slice(0, 4).map(m => `
        <div class="bg-gray-800 rounded-lg p-3">
          <div class="text-sm uppercase tracking-wide text-indigo-300">${m.partOfSpeech || ''}</div>
          <ul class="list-disc ml-5 mt-1 space-y-1">
            ${m.definitions.map(d => `
              <li>
                ${d.definition}
                ${d.example ? `<div class="text-gray-400 italic">Ví dụ: ${d.example}</div>` : ''}
              </li>
            `).join('')}
          </ul>
          ${m.synonyms && m.synonyms.length ? `<div class="mt-2 text-sm text-gray-300">Từ đồng nghĩa: ${m.synonyms.join(', ')}</div>` : ''}
        </div>
      `).join('') +
      `</div>`;
  }

  panel.innerHTML = html;

  const btn = panel.querySelector('#ety-audio-btn');
  const audio = panel.querySelector('#ety-audio');
  if (btn && audio) btn.addEventListener('click', () => { try { audio.currentTime = 0; audio.play(); } catch(_){} });
}

function renderEtymology(panel, origin, word) {
  if (origin && origin.text) {
    panel.innerHTML = `
      <pre class="whitespace-pre-wrap font-sans leading-relaxed">${origin.text}</pre>
      <div class="mt-2 text-xs text-gray-400">Nguồn: <a class="underline" href="${origin.url || '#'}" target="_blank" rel="noopener">${origin.source === 'wiktionary' ? 'Wiktionary' : 'dictionaryapi.dev'}</a></div>
    `;
  } else {
    panel.innerHTML = `
      <p>Chưa tìm thấy gốc từ (Etymology) cho <b>${word}</b>.</p>
      <p class="text-sm text-gray-400 mt-1">Không phải từ nào nguồn công khai cũng có “origin”. Có thể thử thêm etymonline.com.</p>
    `;
  }
}

function renderSource(el, info) {
  if (!el) return;
  const srcs = [];
  if (info?.dict?.sourceUrls?.length) {
    srcs.push(`<a class="underline" href="${info.dict.sourceUrls[0]}" target="_blank" rel="noopener">wiktionary source</a>`);
  }
  el.innerHTML = srcs.join(' · ');
}

// expose inline
if (typeof window !== 'undefined') {
  window.openEtymologyPopup = openEtymologyPopup;
}
