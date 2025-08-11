// js/config.js

// --- ⚠️ QUAN TRỌNG: THAY THẾ BẰNG THÔNG TIN CẤU HÌNH FIREBASE CỦA BẠN ---
export const firebaseConfig = {
    apiKey: "AIzaSyDxSkZM92j_2ZE2ob5IZXwodCM01pumhgo",
    authDomain: "spelling-bee-2c08c.firebaseapp.com",
    projectId: "spelling-bee-2c08c",
    storageBucket: "spelling-bee-2c08c.appspot.com",
    messagingSenderId: "455471826012",
    appId: "1:455471826012:web:d2aec008fb86fdee6d5299",
    measurementId: "G-95V4YFCS7E"
};

// Danh sách từ vựng mặc định cho người dùng mới
export const defaultVocabList = [
    { word: 'default', meaning: 'mặc định', example: 'This is the default setting.', category: 'Tech' },
    { word: 'example', meaning: 'ví dụ', example: 'Please give me an example.', category: 'General' },
    { word: 'learning', meaning: 'học tập', example: 'Learning is a lifelong process.', category: 'General' }
];

// Các mốc thời gian cho thuật toán lặp lại ngắt quãng (tính bằng ngày)
export const SRS_INTERVALS = [1, 2, 5, 10, 21, 45, 90];

// THÊM MỚI: Định nghĩa các thành tựu
export const ACHIEVEMENT_DEFINITIONS = {
    streak3: { name: "Bắt đầu nóng máy", description: "Duy trì chuỗi học 3 ngày liên tiếp.", icon: "🔥" },
    streak7: { name: "Bền bỉ", description: "Duy trì chuỗi học 7 ngày liên tiếp.", icon: "💯" },
    streak30: { name: "Không thể ngăn cản", description: "Duy trì chuỗi học 30 ngày liên tiếp.", icon: "🚀" },
    learned10: { name: "Nhập môn", description: "Học được 10 từ vựng.", icon: "🌱" },
    learned50: { name: "Chăm chỉ", description: "Học được 50 từ vựng.", icon: "📚" },
    learned100: { name: "Chuyên gia từ vựng", description: "Học được 100 từ vựng.", icon: "🎓" },
    mastered10: { name: "Bậc thầy tập sự", description: "Thành thạo 10 từ vựng.", icon: "🌟" },
    mastered50: { name: "Bậc thầy ấn tượng", description: "Thành thạo 50 từ vựng.", icon: "⭐" },
    exam90: { name: "Thủ khoa", description: "Đạt 90% điểm trở lên trong chế độ Luyện thi.", icon: "🥇" },
    firstImport: { name: "Nhà sưu tầm", description: "Import từ vựng từ Google Sheet lần đầu tiên.", icon: "📦" }
};
