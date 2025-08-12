// js/achievements.js

import { state } from './state.js';
import { ACHIEVEMENT_DEFINITIONS, SRS_INTERVALS } from './config.js';
import { saveUserData } from './data.js';

export function checkAchievements(specificCheck = null) {
    if (!state.appData || !state.appData.achievements) return;

    const newlyUnlocked = [];
    const check = (id, condition) => {
        if (condition && !state.appData.achievements[id]) {
            state.appData.achievements[id] = true;
            newlyUnlocked.push(id);
        }
    };

    const learnedCount = Object.keys(state.appData.progress).filter(p => state.appData.progress[p].level > 0).length;
    const masteredCount = Object.values(state.appData.progress).filter(p => p.level >= SRS_INTERVALS.length - 1).length;
    const highestScore = state.appData.examHistory?.reduce((max, h) => Math.max(max, h.score), 0) || 0;
    
    const checks = {
        streak3: () => check('streak3', state.appData.streak >= 3),
        streak7: () => check('streak7', state.appData.streak >= 7),
        streak30: () => check('streak30', state.appData.streak >= 30),
        learned10: () => check('learned10', learnedCount >= 10),
        learned50: () => check('learned50', learnedCount >= 50),
        mastered10: () => check('mastered10', masteredCount >= 10),
        exam90: () => check('exam90', highestScore >= 90),
        firstImport: () => check('firstImport', true)
    };

    if (specificCheck && checks[specificCheck]) {
        checks[specificCheck]();
    } else if (!specificCheck) {
        Object.values(checks).forEach(c => c());
    }

    if (newlyUnlocked.length > 0) {
        saveUserData();
        showAchievementUnlockedModal(newlyUnlocked[0]);
    }
}

function showAchievementUnlockedModal(achievementId) {
    // This function can be improved to show a nicer, non-blocking toast/notification
    const achievement = ACHIEVEMENT_DEFINITIONS[achievementId];
    if (!achievement) return;
    alert(`🏆 Thành tựu mới! 🏆\n\n${achievement.name}\n${achievement.description}`);
}

export function renderAchievementsPage(containerId) {
    const screen = document.getElementById(containerId);
    if (!screen) return;
    const userAchievements = state.appData.achievements || {};

    screen.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            ${Object.entries(ACHIEVEMENT_DEFINITIONS).map(([id, ach]) => {
                const isUnlocked = userAchievements[id];
                return `
                    <div class="border ${isUnlocked ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/50' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'} p-4 rounded-lg text-center transition-all ${!isUnlocked ? 'opacity-50' : ''}">
                        <div class="text-5xl mb-2">${ach.icon}</div>
                        <h3 class="font-bold ${isUnlocked ? 'text-yellow-600 dark:text-yellow-300' : ''}">${ach.name}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${ach.description}</p>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}