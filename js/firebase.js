import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
// Import các hàm cần thiết từ 'firebase-functions'
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { firebaseConfig } from "./config.js";

// Khởi tạo các dịch vụ
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// Khởi tạo Functions ở đúng vùng 'asia-southeast1'
const functions = getFunctions(app, 'asia-southeast1');

// Export tất cả các dịch vụ để file khác có thể dùng
export { app, auth, db, storage, functions, httpsCallable };