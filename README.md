Luyện Từ Vựng PRO 🚀
Một ứng dụng web học từ vựng thông minh được xây dựng bằng JavaScript thuần và tích hợp Firebase. Ứng dụng được thiết kế theo hướng mobile-first với giao diện hiện đại, responsive, giúp người dùng quản lý, học và ôn tập từ vựng một cách hiệu quả.

✨ Các tính năng nổi bật
Ứng dụng được trang bị nhiều tính năng mạnh mẽ để tối ưu hóa trải nghiệm học tập:

Giao diện & Trải nghiệm người dùng
📱 Giao diện Mobile-First: Thiết kế ưu tiên cho thiết bị di động với thanh điều hướng dạng tab tiện lợi, đồng thời tự động thích ứng (responsive) với máy tính bảng và máy tính để bàn.

👨‍👩‍👧‍👦 Quản lý hồ sơ an toàn: Hỗ trợ nhiều hồ sơ người dùng trên cùng một thiết bị. Mỗi hồ sơ có tiến trình riêng và được bảo vệ bằng mật khẩu đã được mã hóa.

☁️ Đồng bộ đám mây: Toàn bộ danh sách từ vựng và tiến trình học của người dùng được lưu trữ và đồng bộ bằng Firebase Firestore.

🌗 Chế độ Sáng/Tối: Tự động chuyển đổi giao diện theo cài đặt hệ thống hoặc tùy chọn của người dùng.

Tab "Học" - Trung tâm luyện tập
🧠 Ôn tập thông minh (SRS): Tự động tính toán và nhắc nhở những từ đã đến hạn ôn tập dựa trên thuật toán Lặp lại ngắt quãng (Spaced Repetition System), giúp ghi nhớ từ vựng lâu dài.

🎯 Mục tiêu hàng ngày: Theo dõi tiến trình hoàn thành mục tiêu học theo số từ hoặc thời gian ngay trên thẻ ôn tập.

🔥 Chuỗi học (Streak): Theo dõi số ngày học liên tiếp để tạo động lực.

💡 Học theo gợi ý: Một chế độ học đặc biệt, tập trung vào các từ khó (sai nhiều) và gợi ý các từ mới phù hợp.

✍️ 8+ Chế độ luyện tập đa dạng:

Đánh Vần (Spelling)

Flashcard

Trắc Nghiệm (MCQ)

Luyện Nghe (Listening)

Sắp Xếp Chữ (Scramble)

Luyện Phát Âm (Pronunciation)

Điền từ (Fill-in-the-blank)

Luyện thi (Exam Mode)

Tab "Từ vựng" - Quản lý hiệu quả
🔍 Tìm kiếm & Lọc: Dễ dàng tìm kiếm tức thì theo từ hoặc nghĩa.

🎨 Phân loại theo độ khó: Các từ được đánh dấu màu sắc (Dễ, Trung bình, Khó) và cho phép thay đổi nhanh ngay trên danh sách.

⚙️ Quản lý từ vựng: Giao diện cho phép Thêm, Sửa, Xóa từ vựng thông qua một modal tiện lợi.

🔄 Import từ Google Sheets: Cập nhật toàn bộ danh sách từ vựng chung từ một tệp Google Sheets công khai.

📈 Tải thêm (Load More): Tối ưu hiệu năng, chỉ tải một phần danh sách và cho phép xem thêm, đảm bảo ứng dụng luôn mượt mà dù có hàng ngàn từ vựng.

Tab "Tiến độ" & "Hồ sơ"
📊 Thống kê chi tiết: Xem biểu đồ hoạt động, tỷ lệ thành thạo và danh sách các từ khó nhất.

🏆 Thành tựu: Mở khóa các huy hiệu khi đạt được các cột mốc quan trọng.

⚙️ Cài đặt tập trung: Toàn bộ các tùy chỉnh về bộ lọc học (Chủ đề, Độ khó), giọng đọc, tốc độ phát âm đều được đặt trong tab Hồ sơ một cách gọn gàng.

🛠️ Công nghệ sử dụng
Frontend:

HTML5

TailwindCSS: Framework CSS để xây dựng giao diện nhanh chóng và responsive.

JavaScript (ES6+ Modules): Toàn bộ logic của ứng dụng được viết bằng JS thuần, không sử dụng framework.

Chart.js: Thư viện để vẽ biểu đồ thống kê.

Backend:

Firebase: Nền tảng backend-as-a-service của Google.

Firestore Database: Lưu trữ dữ liệu từ vựng và tiến trình người dùng.

Firebase Authentication: Xử lý đăng nhập ẩn danh và quản lý định danh người dùng.

🚀 Hướng dẫn cài đặt và Chạy dự án
Để chạy dự án này trên máy của bạn, hãy làm theo các bước sau:

1. Sao chép (Clone) Repository
git clone [URL_REPO_CUA_BAN]
cd [TEN_THU_MUC]

2. Thiết lập Firebase
Ứng dụng này yêu cầu một dự án Firebase để hoạt động.

Truy cập Firebase Console và tạo một dự án mới.

Trong dự án, vào mục Authentication -> Sign-in method và bật Anonymous (Đăng nhập ẩn danh).

Vào mục Firestore Database, tạo một cơ sở dữ liệu mới.

Quay lại trang tổng quan dự án, nhấp vào biểu tượng </> để thêm một ứng dụng web mới.

Sao chép đối tượng cấu hình firebaseConfig.

3. Cấu hình dự án
Mở tệp js/config.js.

Dán đối tượng firebaseConfig bạn vừa sao chép từ Firebase vào.

// js/config.js
export const firebaseConfig = {
    apiKey: "AIza...",
    // ... các thông tin khác
};

4. Chạy ứng dụng
Bạn có thể chạy tệp index.html bằng bất kỳ live server nào. Ví dụ, nếu dùng Visual Studio Code, bạn có thể cài đặt extension Live Server và nhấp vào "Go Live".

📖 Cách sử dụng
Tạo/Chọn hồ sơ: Lần đầu truy cập, bạn cần tạo một hồ sơ mới. Những lần sau, bạn chỉ cần chọn hồ sơ và nhập mật khẩu.

Thêm từ vựng:

Vào tab Từ vựng.

Nhấn nút + để thêm từng từ một.

Hoặc Import từ Google Sheets để thêm hàng loạt.

Bắt đầu học:

Vào tab Học.

Nhấn Ôn tập hôm nay để học các từ đã đến hạn theo thuật toán SRS.

Hoặc chọn một trong các chế độ luyện tập bên dưới.

Tùy chỉnh:

Vào tab Hồ sơ -> Cài đặt để thay đổi bộ lọc mặc định, giọng đọc, mục tiêu ngày, v.v.

Chúc bạn học tập vui vẻ!
