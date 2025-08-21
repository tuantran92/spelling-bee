// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cloudinary = require("cloudinary").v2; // Thêm thư viện Cloudinary

admin.initializeApp();

// --- CẤU HÌNH CLOUDINARY ---
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


exports.uploadImageFromUrl = functions.region('asia-southeast1').https.onCall(async (data, context) => {
  if (!context.auth) {
    console.error("Lỗi xác thực: Người dùng chưa đăng nhập.");
    throw new functions.https.HttpsError("unauthenticated", "Yêu cầu cần được xác thực.");
  }

  // **FIX**: Thay profileId bằng userId
  const { imageUrl, word, userId } = data;
  if (!imageUrl || !word || !userId) {
    console.error("Lỗi tham số: Thiếu imageUrl, word, hoặc userId.", data);
    throw new functions.https.HttpsError("invalid-argument", "Cần có 'imageUrl', 'word', và 'userId'.");
  }

  if (!cloudinary.config().cloud_name) {
    console.error("Lỗi nghiêm trọng: Cấu hình Cloudinary không tồn tại.");
    throw new functions.https.HttpsError("internal", "Cấu hình phía server bị thiếu.");
  }

  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      // **FIX**: Dùng userId để tạo thư mục
      folder: `spelling-bee/user_uploads/${userId}`,
      public_id: `${Date.now()}_${word.replace(/\s+/g, '_')}`
    });
    console.log("Upload ảnh lên Cloudinary thành công:", result.secure_url);
    return { success: true, url: result.secure_url };
  } catch (error)
  {
    console.error("Lỗi khi upload ảnh lên Cloudinary:", error);
    throw new functions.https.HttpsError("internal", "Không thể upload ảnh.", error.message);
  }
});


/**
 * CHỨC NĂNG CŨ: Di dời ảnh từ Pixabay sang Firebase Storage.
 * (Giữ lại để bạn có thể dùng nếu cần)
 */
exports.migratePixabayImages = functions
  .region("asia-southeast1")
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    // ... (Code của chức năng migratePixabayImages giữ nguyên như cũ)
    if (!context.auth) { throw new functions.https.HttpsError("unauthenticated", "Yêu cầu cần được xác thực."); }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    let updatedCount = 0;
    let checkedCount = 0;
    const sharedListRef = db.collection("masterVocab").doc("sharedList");
    const sharedListSnap = await sharedListRef.get();
    if (!sharedListSnap.exists) { return { message: "Không tìm thấy document 'sharedList'.", count: 0, checked: 0 }; }
    const vocabList = sharedListSnap.data().vocabList || [];
    if (vocabList.length === 0) { return { message: "Danh sách 'vocabList' rỗng.", count: 0, checked: 0 }; }
    const newVocabList = [...vocabList];
    const migrationPromises = [];
    newVocabList.forEach((wordData, index) => {
      checkedCount++;
      const imageUrl = wordData.imageUrl;
      if (imageUrl && typeof imageUrl === 'string' && (imageUrl.includes("pixabay.com") || imageUrl.includes("cdn.pixabay.com"))) {
        const promise = (async () => {
          try {
            const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
            const imageBuffer = Buffer.from(response.data, "binary");
            const contentType = response.headers["content-type"] || "image/jpeg";
            const fileExtension = contentType.split("/")[1] || "jpg";
            const fileName = `vocab_images/${uid}/${wordData.word}_${index}.${fileExtension}`;
            const file = bucket.file(fileName);
            await file.save(imageBuffer, { metadata: { contentType } });
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            newVocabList[index].imageUrl = publicUrl;
            updatedCount++;
          } catch (error) { console.error(`Lỗi khi xử lý từ "${wordData.word}":`, error.message); }
        })();
        migrationPromises.push(promise);
      }
    });
    await Promise.all(migrationPromises);
    if (updatedCount > 0) {
      await sharedListRef.update({ vocabList: newVocabList });
    }
    return { message: `Hoàn tất! Đã kiểm tra ${checkedCount} từ và cập nhật ${updatedCount} ảnh.`, count: updatedCount, checked: checkedCount };
  });