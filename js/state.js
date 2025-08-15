// js/state.js

export const state = {
    authUserId: null,
    selectedProfileId: null,
    vocabList: [],
    filteredVocabList: [],
    currentWord: {},
    currentFlashcardIndex: 0,
    availableVoices: [],
    
    suggestions: {
        difficult: [],
        new: []
    },

    suggestionSession: {
        isActive: false,
        words: [],
        currentIndex: 0,
        listType: null
    },

    activeFilters: {
        category: 'all',
        difficulty: 'all'
    },

    appData: {
        profileName: '',
        avatarUrl: '', 
        streak: 0,
        lastVisit: null,
        progress: {},
        dailyActivity: {},
        achievements: {},
        examHistory: [],
        settings: {
            darkMode: undefined,
            dailyGoal: {
                type: 'words',
                value: 20
            },
            fontSize: 1.0
        },
        dailyProgress: {
            date: null,
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
            timeLimit: 60
        }
    },

    reviewSession: {
        isActive: false,
        words: [],
        currentIndex: 0
    },

    fillBlankSession: {
        isActive: false,
        words: [],
        currentIndex: 0
    },

    sessionTimer: null,
};

export function setState(newState) {
    Object.assign(state, newState);
}