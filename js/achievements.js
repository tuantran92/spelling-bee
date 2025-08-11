// js/achievements.js
// Module mới cho hệ thống "Thành tựu"

import { state, setState } from './state.js';
import { ACHIEVEMENT_DEFINITIONS, SRS_INTERVALS } from './config.js';
import { saveUserData } from './data.js';

/**
 * Kiểm tra tất cả các thành tựu và mở khóa nếu đủ điều kiện.
 * @param {string} [specificCheck] - ID của một thành tựu cụ thể cần kiểm tra.
 */
export function checkAchievements(specificCheck = null) {
    const newlyUnlocked = [];

    const check = (id, condition) => {
        if (condition && !state.appData.achievements[id]) {
            state.appData.achievements[id] = true;
            newlyUnlocked.push(id);
        }
    };

    // Tính toán các chỉ số cần thiết
    const learnedCount = Object.keys(state.appData.progress).length;
    const masteredCount = Object.values(state.appData.progress).filter(p => p.level >= SRS_INTERVALS.length - 1).length;
    const highestScore = state.appData.examHistory.reduce((max, h) => Math.max(max, h.score), 0);
    
    const checks = {
        streak3: () => check('streak3', state.appData.streak >= 3),
        streak7: () => check('streak7', state.appData.streak >= 7),
        streak30: () => check('streak30', state.appData.streak >= 30),
        learned10: () => check('learned10', learnedCount >= 10),
        learned50: () => check('learned50', learnedCount >= 50),
        learned100: () => check('learned100', learnedCount >= 100),
        mastered10: () => check('mastered10', masteredCount >= 10),
        mastered50: () => check('mastered50', masteredCount >= 50),
        exam90: () => check('exam90', highestScore >= 90),
        firstImport: () => check('firstImport', true) // Điều kiện này được kích hoạt trực tiếp
    };

    if (specificCheck && checks[specificCheck]) {
        checks[specificCheck]();
    } else if (!specificCheck) {
        Object.values(checks).forEach(c => c());
    }

    if (newlyUnlocked.length > 0) {
        saveUserData();
        // Hiển thị thông báo cho thành tựu đầu tiên trong danh sách vừa mở khóa
        showAchievementUnlockedModal(newlyUnlocked[0]);
    }
}

/**
 * Hiển thị modal thông báo mở khóa thành tựu.
 * @param {string} achievementId - ID của thành tựu.
 */
function showAchievementUnlockedModal(achievementId) {
    const achievement = ACHIEVEMENT_DEFINITIONS[achievementId];
    if (!achievement) return;

    document.getElementById('achievement-icon').textContent = achievement.icon;
    document.getElementById('achievement-name').textContent = achievement.name;
    document.getElementById('achievement-description').textContent = achievement.description;
    
    const modal = document.getElementById('achievement-unlocked-modal');
    modal.classList.remove('hidden');

    // Tự động ẩn sau vài giây
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 5000);
}

/**
 * Hiển thị trang danh sách thành tựu.
 */
export function renderAchievementsPage() {
    const screen = document.getElementById('achievements-screen');
    const userAchievements = state.appData.achievements || {};

    screen.innerHTML = `
        <h2 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">Bộ sưu tập thành tựu</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${Object.entries(ACHIEVEMENT_DEFINITIONS).map(([id, ach]) => {
                const isUnlocked = userAchievements[id];
                return `
                    <div class="border ${isUnlocked ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/50' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'} p-4 rounded-lg text-center transition-all ${!isUnlocked ? 'opacity-50' : ''}">
                        <div class="text-5xl mb-2">${ach.icon}</div>
                        <h3 class="font-bold ${isUnlocked ? 'text-yellow-600 dark:text-yellow-300' : 'text-gray-800 dark:text-gray-200'}">${ach.name}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${ach.description}</p>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
