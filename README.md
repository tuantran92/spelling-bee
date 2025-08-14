# 📚 Luyện Từ Vựng PRO 🚀

Một ứng dụng web học từ vựng thông minh, hiện đại được xây dựng bằng JavaScript thuần và tích hợp sâu với Firebase. Ứng dụng được thiết kế theo triết lý "Mobile-First", responsive và cung cấp nhiều chế độ học đa dạng để giúp việc ghi nhớ từ vựng trở nên hiệu quả và thú vị.

**👉 [Xem Demo trực tiếp tại đây!](https://tuantran92.github.io/spelling-bee/)**

---

## ✨ Tính Năng Nổi Bật

| Tính năng | Mô tả |
| --- | --- |
| 📱 **Giao diện Hiện đại** | Tối ưu cho thiết bị di động, tự động responsive với tablet & desktop. Hỗ trợ chế độ Sáng/Tối. |
| 👨‍👩‍👧‍👦 **Quản lý đa hồ sơ** | Nhiều người dùng trên cùng thiết bị, mỗi người có tiến trình và mật khẩu bảo vệ riêng. |
| ☁️ **Đồng bộ đám mây** | Dữ liệu được lưu trữ và đồng bộ an toàn với Firebase Firestore. |
| 🧠 **Ôn tập thông minh (SRS)** | Thuật toán Lặp lại ngắt quãng (Spaced Repetition) giúp ghi nhớ từ vựng lâu dài và hiệu quả. |
| 🎮 **8+ Chế độ luyện tập** | Bao gồm: Flashcard, Đánh vần, Trắc nghiệm, Luyện nghe, Sắp xếp chữ, Luyện phát âm, Điền từ, và Chế độ Thi cử. |
| 💡 **Học theo gợi ý (Tương tác)** | Tập trung học các "từ khó" (sai nhiều) và "từ mới" trong một phiên học tuần tự, thông minh. |
| 📚 **Dữ liệu từ vựng phong phú** | Tự động làm giàu dữ liệu từ vựng (phiên âm, định nghĩa, loại từ, ví dụ) bằng cách tích hợp API từ điển. |
| 📤 **Import từ Google Sheets** | Dễ dàng thêm hàng loạt từ vựng vào kho từ của bạn từ một trang tính công khai. |
| 📈 **Theo dõi tiến độ** | Thống kê trực quan với biểu đồ hoạt động, số từ đã học, số từ thành thạo. |
| 🏆 **Hệ thống thành tựu** | Mở khóa các thành tựu để tạo động lực học tập, ví dụ: duy trì chuỗi học (streak), đạt số lượng từ nhất định. |
| ⚙️ **Tùy chỉnh linh hoạt** | Cho phép người dùng tùy chỉnh giọng đọc, tốc độ phát âm, cỡ chữ, và đặt mục tiêu học tập hàng ngày. |

---

## 🛠️ Công Nghệ Sử Dụng

* **Frontend:**
    * HTML5, CSS3, JavaScript (ES6+)
    * **Tailwind CSS:** Dùng cho việc xây dựng giao diện nhanh chóng và responsive.
    * **Chart.js:** Dùng để vẽ biểu đồ thống kê tiến độ.
* **Backend & Dữ liệu:**
    * **Firebase:**
        * **Firestore:** Lưu trữ cơ sở dữ liệu từ vựng và tiến trình người dùng.
        * **Authentication:** Xác thực người dùng ẩn danh.
        * **Storage:** Lưu trữ ảnh đại diện (avatar) của người dùng.
    * **WordsAPI & DictionaryAPI:** Tích hợp để lấy dữ liệu phiên âm, định nghĩa, và ví dụ cho từ vựng.

---

## 🚀 Cài đặt và Chạy ở Local

Để chạy dự án này trên máy của bạn, hãy làm theo các bước sau:

**1. Yêu cầu:**
* Cài đặt [Git](https://git-scm.com/).
* Cài đặt [Node.js](https://nodejs.org/) (để sử dụng `npm`).
* Có một tài khoản Google để tạo dự án Firebase.

**2. Sao chép Repository:**
```bash
git clone [https://github.com/tuantran92/spelling-bee.git](https://github.com/tuantran92/spelling-bee.git)
cd spelling-bee
```

**3. Cấu hình Firebase & API:**
* Tạo một dự án mới trên [Firebase Console](https://console.firebase.google.com/).
* Trong dự án của bạn, tạo một ứng dụng Web và sao chép đối tượng `firebaseConfig`.
* Tạo một tệp mới trong thư mục `js` tên là `config.js` và dán nội dung sau vào, thay thế bằng thông tin của bạn:

    ```javascript
    // js/config.js
    export const firebaseConfig = {
      apiKey: "...",
      authDomain: "...",
      projectId: "...",
      storageBucket: "...",
      messagingSenderId: "...",
      appId: "..."
    };

    // Lấy API Key từ RapidAPI (dành cho WordsAPI)
    export const wordsApiKey = "DÁN_API_KEY_CỦA_BẠN_VÀO_ĐÂY";
    ```
* Bật **Anonymous Sign-in** trong mục **Firebase Authentication -> Sign-in method**.
* Tạo **Cloud Firestore** database và **Storage** bucket.

**4. Chạy ứng dụng:**
* Cách đơn giản nhất là sử dụng extension **Live Server** trong Visual Studio Code.

---

## 🔒 Lưu ý về Bảo mật

* **Firebase API Key:** Các khóa trong `firebaseConfig` được thiết kế để công khai. Tuy nhiên, để bảo vệ dự án, bạn **BẮT BUỘC** phải **[giới hạn API Key](https://console.cloud.google.com/apis/credentials)** trong Google Cloud Console, chỉ cho phép các yêu cầu đến từ tên miền của bạn (ví dụ: `tuantran92.github.io`).
* **WordsAPI Key:** Đây là một khóa bí mật. Để sử dụng trong môi trường production một cách an toàn, bạn nên triển khai một **Firebase Cloud Function** làm proxy để giấu key này ở phía backend.
* **Firebase Rules:** Cấu hình **Security Rules** cho Firestore và Storage là lớp bảo vệ quan trọng nhất để đảm bảo người dùng chỉ có thể truy cập dữ liệu của chính họ.