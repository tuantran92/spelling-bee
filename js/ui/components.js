// js/ui/components.js
export function renderPracticeModeItem(title, description, screenId) {
  const styles = {
    'suggestion-screen':  { color: 'purple', icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>'},
    'spelling-screen':    { color: 'blue',   icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'},
    'reading-screen':     { color: 'teal',   icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>'},
    'mcq-screen':         { color: 'sky',    icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>'},
    'remember-word-screen':{color:'teal',    icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'},
    'listening-screen':   { color: 'rose',   icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>'},
    'scramble-screen':    { color: 'orange', icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>'},
    'pronunciation-screen':{color:'red',     icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>'},
    'fill-blank-screen':  { color: 'green',  icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"/></svg>'},
    'exam-screen':        { color: 'indigo', icon:'<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>'},
    // Word Match (Nối từ): icon "các nút nối nhau"
    'word-match-screen': {
      color: 'teal',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
               <circle cx="6"  cy="6"  r="2"></circle>
               <circle cx="18" cy="12" r="2"></circle>
               <circle cx="6"  cy="18" r="2"></circle>
               <path d="M8 6.8l8 3.2M8 17.2l8-3.2"></path>
             </svg>`
    },

    // Hangman (Đoán chữ): icon "khung + dây + đầu" tối giản
    'hangman-screen': {
      color: 'gray',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 SVG_COLOR" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
               <rect x="3" y="6" width="18" height="12" rx="2"></rect>
               <path d="M7 15h10M7 11h3"></path>
             </svg>`
    },
  };

  const style = styles[screenId] || { color: 'gray', icon: '' };
  const bgColor = `bg-${style.color}-100 dark:bg-${style.color}-900/50`;
  const iconColor = `text-${style.color}-500 dark:text-${style.color}-400`;

  return `
    <div onclick="showGameScreen('${screenId}')" class="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
      <div class="w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center">
        ${style.icon.replace('SVG_COLOR', iconColor)}
      </div>
      <div class="flex-grow">
        <p class="font-semibold">${title}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">${description}</p>
      </div>
      <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    </div>`;
}
