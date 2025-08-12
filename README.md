#  Luyện Từ Vựng 🚀

Một ứng dụng web học từ vựng thông minh (Spelling Bee) được xây dựng bằng JavaScript thuần và tích hợp Firebase. Ứng dụng giúp người dùng quản lý, học và ôn tập từ vựng một cách hiệu quả thông qua nhiều chế độ học tương tác và hệ thống ôn tập ngắt quãng (SRS).

## ✨ Các tính năng nổi bật

Ứng dụng được trang bị nhiều tính năng mạnh mẽ để tối ưu hóa trải nghiệm học tập:

### Quản lý & Dữ liệu
* **👨‍👩‍👧‍👦 Quản lý hồ sơ:** Hỗ trợ nhiều hồ sơ người dùng trên cùng một thiết bị, mỗi hồ sơ có tiến trình và cài đặt riêng biệt. Mật khẩu được mã hóa an toàn.
* **☁️ Đồng bộ đám mây:** Toàn bộ danh sách từ vựng và tiến trình học của người dùng được lưu trữ và đồng bộ bằng **Firebase Firestore**.
* **📊 Quản lý từ vựng:** Giao diện cho phép người dùng Thêm, Sửa, Xóa từ vựng một cách dễ dàng.
* **🔍 Lọc và Tìm kiếm:** Dễ dàng lọc danh sách từ theo chủ đề hoặc tìm kiếm tức thì theo từ hoặc nghĩa.
* **🔄 Import từ Google Sheets:** Ghi đè và cập nhật toàn bộ danh sách từ vựng chung từ một tệp Google Sheets công khai.

### Chế độ học & Ôn tập
* **🧠 Ôn tập thông minh (SRS):** Tự động tính toán và nhắc nhở những từ đã đến hạn ôn tập dựa trên thuật toán Lặp lại ngắt quãng (Spaced Repetition System), giúp ghi nhớ từ vựng lâu dài.
* **✍️ Đánh Vần (Spelling):** Luyện kỹ năng viết đúng chính tả của từ.
* **🃏 Flashcard:** Học từ vựng theo phương pháp thẻ ghi nhớ kinh điển.
* **🎧 Luyện Nghe (Listening):** Nghe phát âm và gõ lại từ đúng.
* **📝 Trắc Nghiệm (MCQ):** Chọn nghĩa đúng cho một từ cho trước.
* **🔄 Sắp Xếp Chữ (Scramble):** Sắp xếp các ký tự bị xáo trộn để tạo thành từ đúng.
* **🎤 Luyện Phát Âm (Pronunciation):** Sử dụng API nhận dạng giọng nói của trình duyệt để kiểm tra phát âm.
* **✔️ Gợi ý lỗi gõ sai (Typo Suggestion):** Khi gõ sai 1-2 ký tự, hệ thống sẽ gợi ý "Gần đúng rồi!" thay vì báo sai ngay, tạo trải nghiệm thân thiện hơn.

### Theo dõi & Động lực
* **🎯 Mục tiêu hàng ngày:** Cho phép người dùng tự đặt mục tiêu học theo **số từ** hoặc **thời gian**, và theo dõi tiến trình hoàn thành ngay trên giao diện chính.
* **🔥 Chuỗi học (Streak):** Theo dõi số ngày học liên tiếp để tạo động lực.
* **📈 Thống kê chi tiết:** Xem biểu đồ hoạt động, tỷ lệ thành thạo, và danh sách các từ khó nhất.
* **🏆 Thành tựu:** Mở khóa các huy hiệu khi đạt được các cột mốc quan trọng (ví dụ: chuỗi 7 ngày, học được 50 từ).

### Tùy chỉnh
* **🌗 Chế độ Sáng/Tối (Dark Mode):** Tự động chuyển đổi giao diện theo cài đặt hệ thống hoặc tùy chọn của người dùng.
* **🗣️ Tùy chỉnh giọng đọc:** Lựa chọn giọng đọc (Anh-Anh, Anh-Mỹ) và điều chỉnh tốc độ phát âm.

---

## 🛠️ Công nghệ sử dụng

* **Frontend:**
    * HTML5
    * **TailwindCSS:** Framework CSS để xây dựng giao diện nhanh chóng.
    * **JavaScript (ES6+ Modules):** Toàn bộ logic của ứng dụng được viết bằng JS thuần, không sử dụng framework.
    * **Chart.js:** Thư viện để vẽ biểu đồ thống kê.
* **Backend:**
    * **Firebase:** Nền tảng backend-as-a-service của Google.
        * **Firestore Database:** Lưu trữ dữ liệu từ vựng và tiến trình người dùng.
        * **Firebase Authentication:** Xử lý đăng nhập ẩn danh và quản lý định danh người dùng.

---

## 🚀 Hướng dẫn cài đặt và Chạy dự án

Để chạy dự án này trên máy của bạn, hãy làm theo các bước sau:

### 1. Sao chép (Clone) Repository

```bash
git clone [https://github.com/your-username/spelling-bee-pro.git](https://github.com/your-username/spelling-bee-pro.git)
cd spelling-bee-pro
```

### 2. Thiết lập Firebase

Ứng dụng này yêu cầu một dự án Firebase để hoạt động.

1.  Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo một dự án mới.
2.  Trong dự án của bạn, vào mục **Authentication** -> **Sign-in method** và bật **Anonymous** (Đăng nhập ẩn danh).
3.  Vào mục **Firestore Database**, tạo một cơ sở dữ liệu mới và bắt đầu ở **chế độ production** (khuyến khích) hoặc chế độ test.
4.  Quay lại trang tổng quan dự án, nhấp vào biểu tượng `</>` để thêm một ứng dụng web mới.
5.  Sau khi đăng ký ứng dụng, Firebase sẽ cung cấp cho bạn một đối tượng cấu hình `firebaseConfig`. **Hãy sao chép nó.**

### 3. Cấu hình dự án

1.  Trong thư mục `js/` của dự án, tìm tệp `config.js`.
2.  Mở tệp `config.js` và dán đối tượng `firebaseConfig` bạn vừa sao chép từ Firebase vào.

    ```javascript
    // js/config.js

    // --- ⚠️ QUAN TRỌNG: THAY THẾ BẰNG THÔNG TIN CẤU HÌNH FIREBASE CỦA BẠN ---
    export const firebaseConfig = {
        apiKey: "AIza...",
        authDomain: "your-project-id.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project-id.appspot.com",
        messagingSenderId: "1234567890",
        appId: "1:1234567890:web:abcdef123456",
        measurementId: "G-ABCDEFGHIJ"
    };

    // ... các cấu hình khác
    ```

### 4. Chạy ứng dụng

Bạn có thể chạy tệp `index.html` bằng bất kỳ máy chủ live server nào. Ví dụ, nếu bạn dùng Visual Studio Code, bạn có thể cài đặt extension **Live Server** và nhấp vào "Go Live".

---

## 📖 Cách sử dụng

1.  **Tạo hồ sơ:** Lần đầu tiên truy cập, bạn cần tạo một hồ sơ mới với tên và mật khẩu.
2.  **Thêm từ vựng:**
    * Vào **Cài đặt** -> **Quản lý từ vựng**.
    * Thêm từng từ một bằng tay.
    * Hoặc **Import từ Google Sheets** để thêm hàng loạt (đây là cách nhanh nhất để bắt đầu).
3.  **Bắt đầu học:**
    * Nhấn **Ôn tập thông minh** để học các từ đã đến hạn.
    * Nhấn **Học ngẫu nhiên** để vào một chế độ học bất kỳ.
    * Hoặc chọn một chế độ học cụ thể bạn thích từ menu.
4.  **Theo dõi tiến trình:**
    * Theo dõi **Mục tiêu ngày** và **Chuỗi học** ngay trên giao diện chính.
    * Vào mục **Thống kê** để xem báo cáo chi tiết về quá trình học của bạn.

Chúc bạn học tập vui vẻ!
