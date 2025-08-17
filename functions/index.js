// functions/index.js (Phiên bản hoàn chỉnh)

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getStorage} = require("firebase-admin/storage");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");
const { Buffer } = require("buffer"); // DÒNG QUAN TRỌNG ĐÃ BỊ THIẾU

initializeApp();

exports.uploadImageFromUrl = onCall({region: "asia-southeast1"}, async (request) => {
  // 1. Xác thực người dùng
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  // 2. Lấy dữ liệu
  const {imageUrl, word, profileId} = request.data;
  if (!imageUrl || !word || !profileId) {
    throw new HttpsError(
        "invalid-argument",
        "Missing imageUrl, word, or profileId.",
    );
  }

  // 3. Xử lý logic
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      logger.error("Fetch failed:", response.statusText);
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.buffer();
    const bucket = getStorage().bucket();
    const fileName = `${new Date().getTime()}_${word}.jpg`;
    const filePath = `word_images/${profileId}/${fileName}`;
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: "image/jpeg",
      },
    });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });

    return {success: true, url: url};
  } catch (error) {
    logger.error("Error uploading image:", error);
    throw new HttpsError(
        "internal",
        "Unable to upload image.",
        error,
    );
  }
});
