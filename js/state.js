// js/state.js

// File này chứa đối tượng trạng thái toàn cục của ứng dụng.
// Tất cả các dữ liệu động sẽ được lưu ở đây.

export const state = {
    authUserId: null,
    selectedProfileId: null,
    vocabList: [],
    filteredVocabList: [],
    currentWord: {},
    currentFlashcardIndex: 0,
    availableVoices: [],
    
    appData: {
        streak: 0,
        lastVisit: null,
        progress: {},
        dailyActivity: {},
        achievements: {},
        examHistory: [],
        // THÊM MỚI: Cài đặt và tiến trình mục tiêu
        settings: {
            darkMode: undefined,
            dailyGoal: {
                type: 'words', // 'words' hoặc 'minutes'
                value: 20
            }
        },
        dailyProgress: {
            date: null, // 'YYYY-MM-DD'
            words: 0,
            minutes: 0
        }
    },
    
    editingWordIndex: -1,

    examState: {
        isActive: false,
        questions: [],
        currentQuestionIndex: 0,
        correctAnswers: 0,
        timer: null,
        timeLeft: 0,
        settings: {
            questionCount: 10,
            timeLimit: 120
        }
    },

    reviewSession: {
        isActive: false,
        words: [],
        currentIndex: 0
    },

    // THÊM MỚI: Timer để theo dõi thời gian học
    sessionTimer: null,
};

/**
 * Hàm cập nhật trạng thái một cách an toàn.
 * @param {object} newState - Các thuộc tính mới cần cập nhật cho state.
 */
export function setState(newState) {
    Object.assign(state, newState);
}