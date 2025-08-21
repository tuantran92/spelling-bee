const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

admin.initializeApp();

// Cấu hình Cloudinary bằng biến môi trường (cách mới và ổn định hơn)
// LƯU Ý: Bạn sẽ cần chạy lại lệnh `firebase functions:config:set` ở bước sau
const cloudinaryConfig = functions.config().cloudinary;

if (cloudinaryConfig && cloudinaryConfig.cloud_name) {
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloud_name,
    api_key: cloudinaryConfig.api_key,
    api_secret: cloudinaryConfig.api_secret,
  });
  console.log("Cloudinary đã được cấu hình thành công.");
} else {
  console.error("Cảnh báo: Cấu hình Cloudinary chưa được thiết lập. Hãy chạy lệnh `firebase functions:config:set`.");
}


/**
 * Callable Function để tải ảnh từ một URL lên Cloudinary.
 * Đây là phiên bản cuối cùng, ổn định nhất.
 */
exports.uploadImageFromUrl = functions.region('asia-southeast1').https.onCall(async (data, context) => {
  // onCall tự động kiểm tra xác thực người dùng
  if (!context.auth) {
    console.error("Lỗi xác thực: Người dùng chưa đăng nhập.");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  // Kiểm tra tham số đầu vào
  const { imageUrl, word, profileId } = data;
  if (!imageUrl || !word) {
    console.error("Lỗi tham số: Thiếu imageUrl hoặc word.", data);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'imageUrl' and 'word' arguments."
    );
  }

  // Kiểm tra lại nếu config chưa có thì báo lỗi sớm
  if (!cloudinary.config().cloud_name) {
      console.error("Lỗi nghiêm trọng: Cấu hình Cloudinary không tồn tại. Deploy sẽ thất bại.");
       throw new functions.https.HttpsError(
      "internal",
      "Cấu hình phía server bị thiếu."
    );
  }

  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `spelling-bee/${profileId || "unknown-profile"}`,
      public_id: `${Date.now()}_${word.replace(/\s+/g, '_')}`
    });

    console.log("Upload ảnh lên Cloudinary thành công:", result.secure_url);

    // Trả về kết quả thành công cho client
    return { success: true, url: result.secure_url };

  } catch (error) {
    console.error("Lỗi khi upload ảnh lên Cloudinary:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to upload image.",
      error.message
    );
  }
});

// Thêm import cho Google Generative AI ở đầu file cùng các import khác
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Lấy API key đã lưu
const geminiKey = functions.config().gemini.key;
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});


/**
 * Cloud Function để tự động phân loại từ vựng bằng AI.
 */
exports.categorizeVocabulary = functions.region('asia-southeast1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Người dùng chưa được xác thực.");
    }

    const { words } = data; // Nhận danh sách từ ['word1', 'word2', ...]
    if (!words || !Array.isArray(words) || words.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Danh sách từ không hợp lệ.");
    }

    // Câu lệnh "prompt" để ra lệnh cho AI
    const prompt = `
        Hãy phân loại danh sách các từ vựng tiếng Anh sau đây vào các chủ đề chung (ví dụ: Animals, Food, Technology, Business, Travel, etc.).
        Chỉ trả về một đối tượng JSON hợp lệ, không giải thích gì thêm.
        Trong đó, key là từ vựng và value là chủ đề của từ đó (viết hoa chữ cái đầu).
        Ví dụ: { "dog": "Animals", "apple": "Food", "computer": "Technology" }

        Danh sách từ: ${words.join(", ")}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const jsonText = response.text().replace(/```json|```/g, "").trim();
        
        console.log("Kết quả từ Gemini:", jsonText);

        // Parse kết quả JSON từ AI
        const categories = JSON.parse(jsonText);
        
        return { success: true, categories: categories };

    } catch (error) {
        console.error("Lỗi khi gọi Gemini API:", error);
        throw new functions.https.HttpsError("internal", "Không thể phân loại từ vựng.");
    }
});
