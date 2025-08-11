// js/statistics.js

import { state } from './state.js';

let activityChart = null; // Biến để giữ instance của Chart

/**
 * Hiển thị trang thống kê với dữ liệu đã tính toán.
 * ĐÂY LÀ HÀM ĐÃ ĐƯỢC BỔ SUNG ĐỂ SỬA LỖI.
 */
export function renderStatisticsPage() {
    const screen = document.getElementById('stats-screen');
    const stats = calculateStatistics();

    screen.innerHTML = `
        <h2 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">Thống kê quá trình học</h2>
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-blue-600 dark:text-blue-300">${stats.totalWords}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Tổng số từ</div>
            </div>
            <div class="bg-green-100 dark:bg-green-900/50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-green-600 dark:text-green-300">${stats.learnedWords}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Từ đã học</div>
            </div>
            <div class="bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-yellow-600 dark:text-yellow-300">${stats.masteredWords}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Từ đã thành thạo</div>
            </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg mb-6 shadow-md">
            <h3 class="font-semibold mb-2 text-gray-800 dark:text-gray-200">Hoạt động trong 7 ngày qua</h3>
            <canvas id="activity-chart"></canvas>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 class="font-semibold mb-2 text-gray-800 dark:text-gray-200">Top 5 từ khó nhất (sai nhiều nhất)</h3>
            <ul class="space-y-2">
                ${stats.difficultWords.length > 0 ? stats.difficultWords.map(item => `
                    <li class="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/30 rounded-md">
                        <span class="font-medium text-gray-800 dark:text-gray-200">${item.word}</span>
                        <span class="text-red-500 font-bold">${item.count} lần sai</span>
                    </li>
                `).join('') : '<li class="text-gray-500">Chưa có dữ liệu.</li>'}
            </ul>
        </div>
    `;

    renderActivityChart(stats.chartData);
}


/**
 * Tính toán tất cả các số liệu thống kê dựa trên dữ liệu người dùng.
 * HÀM NÀY ĐÃ ĐƯỢC SỬA ĐỂ ĐỌC ĐÚNG DỮ LIỆU.
 */
function calculateStatistics() {
    const { appData, vocabList } = state;

    const totalWords = vocabList.length;

    const learnedWords = Object.keys(appData.progress).filter(word => 
        vocabList.some(v => v.word === word) && appData.progress[word].level > 0
    ).length;

    const masteredWords = Object.values(appData.progress).filter(p => p.level >= 6).length;

    // Sửa lại để đọc từ `appData.progress` thay vì `appData.stats` không tồn tại
    const difficultWords = Object.entries(appData.progress)
        .map(([word, data]) => ({ word, count: data.wrongAttempts || 0 }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Sửa lại để đọc từ `dailyActivity`
    const reviewsPerDay = appData.dailyActivity || {};
    const today = new Date();
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit' }));
        data.push(reviewsPerDay[dateString] || 0);
    }
    const chartData = { labels, data };

    return {
        totalWords,
        learnedWords,
        masteredWords,
        difficultWords,
        chartData
    };
}

/**
 * Vẽ biểu đồ hoạt động bằng Chart.js.
 * ĐÂY LÀ HÀM ĐÃ ĐƯỢC BỔ SUNG ĐỂ SỬA LỖI.
 */
function renderActivityChart(chartData) {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    
    // Hủy biểu đồ cũ trước khi vẽ biểu đồ mới để tránh lỗi
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
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
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