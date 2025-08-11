// js/statistics.js

import { state } from './state.js';

/**
 * Tính toán tất cả các số liệu thống kê dựa trên dữ liệu người dùng.
 * @returns {object} - Một đối tượng chứa các thông tin đã được tính toán.
 */
export function calculateStatistics() {
    const { appData, vocabList } = state;

    // Tổng số từ
    const totalWords = vocabList.length;

    // Số từ đã học (đã ôn ít nhất 1 lần)
    const learnedWords = Object.keys(appData.progress).filter(word => 
        vocabList.some(v => v.word === word)
    ).length;

    // Số từ đã thành thạo (cấp độ cao)
    const masteredWords = Object.values(appData.progress).filter(p => p.level >= 6).length;

    // Từ khó nhất (bị sai nhiều nhất)
    const incorrectCounts = appData.stats?.incorrectCounts || {};
    const difficultWords = Object.entries(incorrectCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word, count]) => ({ word, count }));

    // Dữ liệu cho biểu đồ hoạt động
    const reviewsPerDay = appData.stats?.reviewsPerDay || {};
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
