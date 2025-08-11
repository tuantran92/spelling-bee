// js/state.js

// File này chứa đối tượng trạng thái toàn cục của ứng dụng.
// Tất cả các dữ liệu động sẽ được lưu ở đây.

export const state = {
    authUserId: null,           // ID người dùng từ Firebase Auth
    selectedProfileId: null,    // ID của hồ sơ đang được chọn
    vocabList: [],              // Danh sách từ vựng đầy đủ
    filteredVocabList: [],      // Danh sách từ vựng đã lọc theo chủ đề
    currentWord: {},            // Từ vựng đang được hiển thị trong game
    currentFlashcardIndex: 0,   // Vị trí của flashcard hiện tại
    availableVoices: [],        // Danh sách giọng đọc có sẵn trên trình duyệt
    
    // Dữ liệu của người dùng (tiến trình, chuỗi học, và các dữ liệu mới)
    appData: {
        streak: 0,
        lastVisit: null,
        progress: {}, // { word: { level: 0, nextReview: '...', wrongAttempts: 0 } }
        // THÊM MỚI: Dữ liệu cho các tính năng mới
        dailyActivity: {}, // { 'YYYY-MM-DD': count }
        achievements: {}, // { 'streak3': true }
        examHistory: [], // { date: '...', score: 80, time: 120, results: [...] }
    },
    
    editingWordIndex: -1,       // Index của từ đang được sửa (-1 là thêm mới)

    // THÊM MỚI: Trạng thái cho chế độ Luyện thi
    examState: {
        isActive: false,
        questions: [],
        currentQuestionIndex: 0,
        correctAnswers: 0,
        timer: null,
        timeLeft: 0,
        settings: {
            questionCount: 10,
            timeLimit: 120 // seconds
        }
    }
};

/**
 * Hàm cập nhật trạng thái một cách an toàn.
 * @param {object} newState - Các thuộc tính mới cần cập nhật cho state.
 */
export function setState(newState) {
    Object.assign(state, newState);
}
