# 📚 Luyện Từ Vựng 🚀

**Ứng dụng web học từ vựng thông minh** được xây dựng bằng **JavaScript thuần** và tích hợp **Firebase**.
Thiết kế **Mobile-First** với giao diện **hiện đại, responsive**, giúp bạn **quản lý, học và ôn tập từ vựng** hiệu quả.

---

## ✨ Tính Năng Nổi Bật

| Tính năng                      | Mô tả                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| 📱 **Giao diện Mobile-First**  | Tối ưu cho thiết bị di động, tự động responsive với tablet & desktop.                       |
| 👨‍👩‍👧‍👦 **Quản lý hồ sơ**  | Nhiều hồ sơ trên cùng thiết bị, tiến trình riêng, bảo vệ bằng mật khẩu mã hóa.              |
| ☁️ **Đồng bộ đám mây**         | Lưu & đồng bộ dữ liệu với Firebase Firestore.                                               |
| 🌗 **Chế độ Sáng/Tối**         | Tự động theo hệ thống hoặc tùy chỉnh.                                                       |
| 🧠 **Ôn tập thông minh (SRS)** | Ghi nhớ lâu dài với thuật toán Lặp lại ngắt quãng.                                          |
| 🎯 **Mục tiêu hàng ngày**      | Theo dõi số từ hoặc thời gian học mỗi ngày.                                                 |
| 🔥 **Chuỗi học (Streak)**      | Giữ động lực bằng số ngày học liên tiếp.                                                    |
| 💡 **Học theo gợi ý**          | Tập trung vào từ khó & gợi ý từ mới.                                                        |
| 🎮 **8+ chế độ luyện tập**     | Spelling, Flashcard, MCQ, Listening, Scramble, Pronunciation, Fill-in-the-blank, Exam Mode. |
| 🔍 **Tìm kiếm & Lọc**          | Tìm theo từ hoặc nghĩa tức thì.                                                             |
| 🎨 **Phân loại độ khó**        | Đánh dấu màu (Dễ, Trung bình, Khó) và chỉnh nhanh.                                          |
| ⚙️ **Quản lý từ vựng**         | Thêm/Sửa/Xóa qua modal tiện lợi.                                                            |
| 📤 **Import từ Google Sheets** | Đồng bộ nhanh danh sách từ.                                                                 |
| 📈 **Thống kê & Thành tựu**    | Biểu đồ tiến bộ, tỷ lệ thành thạo, huy hiệu thành tích.                                     |
| 🛠️ **Cài đặt tập trung**      | Bộ lọc học, giọng đọc, tốc độ phát âm…                                                      |

---

## 🛠️ Công Nghệ Sử Dụng

**Frontend**

* HTML5
* TailwindCSS (UI responsive, nhanh chóng)
* JavaScript ES6+ (JS thuần, không framework)
* Chart.js (vẽ biểu đồ thống kê)

**Backend**

* Firebase (Backend-as-a-Service)
* Firestore Database (lưu trữ dữ liệu)
* Firebase Authentication (đăng nhập ẩn danh & định danh)

---

## 🚀 Cài Đặt & Chạy Dự Án

```bash
# 1. Clone repo
git clone [URL_REPO_CUA_BAN]
cd [TEN_THU_MUC]

# 2. Cấu hình Firebase
# - Tạo project trên Firebase Console
# - Bật Anonymous Sign-in trong Authentication
# - Tạo Firestore Database
# - Thêm ứng dụng Web, copy firebaseConfig
```

**Thêm vào** `js/config.js`:

```javascript
export const firebaseConfig = {
  apiKey: "AIza...",
  // ...
};
```

**Chạy ứng dụng**:

* Mở `index.html` bằng Live Server (VD: extension Live Server của VS Code → "Go Live").

---

## 📖 Hướng Dẫn Sử Dụng

### 1️⃣ Tạo/Chọn Hồ Sơ

* Lần đầu: Tạo hồ sơ mới.
* Lần sau: Chọn hồ sơ & nhập mật khẩu.

### 2️⃣ Thêm Từ Vựng

* Tab **Từ Vựng** → Nhấn **+** để thêm từng từ.
* Hoặc **Import từ Google Sheets** để thêm hàng loạt.

### 3️⃣ Bắt Đầu Học

* Tab **Học** → Nhấn **Ôn tập hôm nay** (SRS).
* Hoặc chọn chế độ luyện tập bất kỳ.

### 4️⃣ Tùy Chỉnh

* Tab **Hồ Sơ** → **Cài đặt** để chỉnh bộ lọc, giọng đọc, mục tiêu ngày…

---

> 💡 **Mẹo:** Duy trì **Streak** và đặt **mục tiêu vừa sức** để tạo thói quen học đều đặn.
