// js/statistics.js

import { state } from './state.js';
import { fetchAllUsersForLeaderboard } from './data.js';

let activityChart = null; // Biến để giữ instance của Chart

export function renderStatisticsPage(containerId) {
    const screen = document.getElementById(containerId);
    if (!screen) return;

    const stats = calculateStatistics();

    screen.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-center">
            <div class="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-lg">
                <div class="text-3xl font-bold text-blue-600 dark:text-blue-300">${stats.totalWords}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Tổng số từ</div>
            </div>
            <div class="bg-green-100 dark:bg-green-900/50 p-4 rounded-lg">
                <div class="text-3xl font-bold text-green-600 dark:text-green-300">${stats.learnedWords}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Từ đã học</div>
            </div>
            <div class="bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-lg col-span-2 md:col-span-1">
                <div class="text-3xl font-bold text-yellow-600 dark:text-yellow-300">${stats.masteredWords}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Từ thành thạo</div>
            </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg mb-6 shadow-md">
            <h3 class="font-semibold mb-2 text-gray-800 dark:text-gray-200">Hoạt động 7 ngày qua</h3>
            <div class="h-64">
                <canvas id="activity-chart"></canvas>
            </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 class="font-semibold mb-2 text-gray-800 dark:text-gray-200">Top 5 từ khó nhất</h3>
            <ul class="space-y-2">
                ${stats.difficultWords.length > 0 ? stats.difficultWords.map(item => `
                    <li class="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/30 rounded-md">
                        <span class="font-medium text-gray-800 dark:text-gray-200">${item.word}</span>
                        <span class="text-red-500 font-bold">${item.count} lần sai</span>
                    </li>
                `).join('') : '<li class="text-gray-500 dark:text-gray-400">Chưa có dữ liệu.</li>'}
            </ul>
        </div>
    `;

    // Phải chờ một chút để DOM được cập nhật trước khi vẽ chart
    setTimeout(() => renderActivityChart(stats.chartData), 0);
}


function calculateStatistics() {
    const { appData, vocabList } = state;
    if (!appData || !appData.progress) {
        return { totalWords: 0, learnedWords: 0, masteredWords: 0, difficultWords: [], chartData: { labels: [], data: [] } };
    }

    const totalWords = vocabList.length;

    const learnedWords = Object.keys(appData.progress).filter(word => 
        vocabList.some(v => v.word === word) && appData.progress[word].level > 0
    ).length;

    const masteredWords = Object.values(appData.progress).filter(p => p.level >= 6).length;

    const difficultWords = Object.entries(appData.progress)
        .map(([word, data]) => ({ word, count: data.wrongAttempts || 0 }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const reviewsPerDay = appData.dailyActivity || {};
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit' }));
        data.push(reviewsPerDay[dateString] || 0);
    }
    const chartData = { labels, data };

    return { totalWords, learnedWords, masteredWords, difficultWords, chartData };
}

function renderActivityChart(chartData) {
    const ctx = document.getElementById('activity-chart')?.getContext('2d');
    if (!ctx) return;
    
    // Hủy biểu đồ cũ trước khi vẽ để tránh lỗi
    if (activityChart) {
        activityChart.destroy();
    }
    
    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Số từ đã ôn',
                data: chartData.data,
                backgroundColor: 'rgba(79, 70, 229, 0.5)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    ticks: {
                        precision: 0
                    },
                    suggestedMax: 10 
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// --- HÀM MỚI ---
export async function renderLeaderboardPage(containerId) {
    const screen = document.getElementById(containerId);
    if (!screen) return;
    screen.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div><p class="mt-2 text-sm text-gray-500">Đang tải bảng xếp hạng...</p></div>`;

    const users = await fetchAllUsersForLeaderboard();

    if (users.length === 0) {
        screen.innerHTML = `<div class="text-center p-8"><p class="text-gray-500">Chưa có dữ liệu để hiển thị bảng xếp hạng.</p></div>`;
        return;
    }

    const rankIcons = ['🥇', '🥈', '🥉'];

    screen.innerHTML = `
        <h3 class="font-semibold mb-4 text-gray-800 dark:text-gray-200 text-center">Bảng Xếp Hạng Toàn Cầu</h3>
        <ul class="space-y-3">
            ${users.map((user, index) => `
                <li class="flex items-center gap-4 p-3 ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/40' : 'bg-gray-100 dark:bg-gray-800'} rounded-lg">
                    <div class="font-bold text-lg w-8 text-center">${rankIcons[index] || index + 1}</div>
                    <img src="${user.avatarUrl}" alt="Avatar" class="w-10 h-10 rounded-full object-cover">
                    <div class="flex-grow">
                        <p class="font-semibold text-gray-800 dark:text-gray-200">${user.name}</p>
                    </div>
                    <div class="font-bold text-indigo-500">${user.points} điểm</div>
                </li>
            `).join('')}
        </ul>
    `;
}