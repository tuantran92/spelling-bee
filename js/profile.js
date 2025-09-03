// js/profile.js

import { collection, getDocs, addDoc, query, where, deleteDoc, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { db, storage } from './firebase.js';
import { state, setState } from './state.js';
//import { showTab } from './ui.js';
import * as data from './data.js';
import { hashText } from './utils.js';
import { showToast, showTab } from './ui.js';

export async function displayProfileScreen() {
    try {
        const profileListEl = document.getElementById('profile-list');
        if (!profileListEl) return;
        
        const profilesSnapshot = await getDocs(collection(db, "profiles"));
        profileListEl.innerHTML = '';
        if (profilesSnapshot.empty) {
            profileListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Chưa có hồ sơ nào. Hãy tạo mới!</p>';
        } else {
            profilesSnapshot.forEach(doc => {
                const profile = doc.data();
                const avatarSrc = profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random&color=fff`;
                const profileItem = document.createElement('div');
                profileItem.className = 'flex items-center justify-between gap-2';

                // gắn id cho ảnh để có thể cập nhật live sau khi upload
                profileItem.innerHTML = `
                    <button class="flex-grow flex items-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg" onclick="profile.promptPasswordForLogin('${doc.id}', '${profile.name}')">
                        <img id="avatar-img-in-profile-list-${doc.id}" src="${avatarSrc}" alt="Avatar" class="w-16 h-16 rounded-full object-cover">
                        <span class="flex-grow text-left text-xl">${profile.name}</span>
                    </button>
                `;

                profileListEl.appendChild(profileItem);
            });
        }
    } catch (error) {
        console.error("Lỗi khi tải hồ sơ: ", error);
        document.getElementById('profile-feedback').textContent = "Không thể tải danh sách hồ sơ.";
    }
}
// ===================================================================
// HÀM UPLOAD AVATAR ĐÃ SỬA HOÀN CHỈNH
// ===================================================================
export async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    // Giải quyết lỗi gốc: đảm bảo đã chọn profile
    if (!state.selectedProfileId) {
        console.error("Lỗi: Chưa chọn hồ sơ nào (state.selectedProfileId is null).");
        showToast("Đã xảy ra lỗi, vui lòng đăng nhập lại.", 4000);
        return;
    }

    showToast("Đang tải ảnh lên...", 2000);

    try {
        const storageRef = ref(storage, `avatars/${state.selectedProfileId}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // 1. Cập nhật state và lưu vào collection "users/{profileId}"
        state.appData.avatarUrl = downloadURL;
        await data.saveUserData(); 
        
        // 2. Cập nhật vào collection "profiles/{profileId}" để hiển thị ở màn hình chọn
        const profileRef = doc(db, "profiles", state.selectedProfileId);
        await setDoc(profileRef, { avatarUrl: downloadURL }, { merge: true });

        // Cập nhật ảnh ngay trên giao diện
        const profileAvatarImg = document.getElementById('profileAvatarImg');
        if(profileAvatarImg) profileAvatarImg.src = downloadURL;

        const avatarInList = document.getElementById('avatar-img-in-profile-list-' + state.selectedProfileId);
        if(avatarInList) avatarInList.src = downloadURL;
        
        showToast("Cập nhật ảnh đại diện thành công!", 3000);

    } catch (error) {
        console.error("Lỗi tải ảnh lên:", error);
        showToast("Lỗi tải ảnh lên: " + error.message, 4000);
    }
}

export async function createNewProfile() {
    const nameInput = document.getElementById('profile-name-input');
    const passwordInput = document.getElementById('profile-password-input');
    const feedbackEl = document.getElementById('profile-feedback');
    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();
    if (name.length < 3) {
        feedbackEl.textContent = "Tên phải có ít nhất 3 ký tự.";
        return;
    }
    if (password.length < 6) {
        feedbackEl.textContent = "Mật khẩu phải có ít nhất 6 ký tự.";
        return;
    }
    feedbackEl.textContent = "Đang kiểm tra...";
    try {
        const q = query(collection(db, "profiles"), where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            feedbackEl.textContent = "Tên này đã tồn tại.";
            return;
        }
        const passwordHash = await hashText(password);
        const docRef = await addDoc(collection(db, "profiles"), { 
            name: name, 
            passwordHash: passwordHash,
            createdAt: new Date(),
            avatarUrl: ''
        });
        await selectProfile(docRef.id, name);
    } catch (error) {
        console.error("Lỗi khi tạo hồ sơ: ", error);
        feedbackEl.textContent = "Đã xảy ra lỗi khi tạo hồ sơ.";
    }
}

export function promptPasswordForLogin(profileId, profileName) {
    const modal = document.getElementById('password-prompt-modal');
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-auto text-center">
            <h3 class="text-lg font-bold mb-2">Hồ sơ: ${profileName}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Vui lòng nhập mật khẩu để tiếp tục.</p>
            <input type="password" id="login-password-input" class="w-full p-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700">
            <p id="login-feedback" class="mt-2 h-5 text-sm text-red-500"></p>
            <div class="flex gap-2 mt-4">
                <button onclick="profile.closePasswordPrompt()" class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>
                <button onclick="profile.handlePasswordVerificationForLogin('${profileId}', '${profileName}')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Xác nhận</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
    document.getElementById('login-password-input').focus();
}

export function closePasswordPrompt() {
    const modal = document.getElementById('password-prompt-modal');
    modal.classList.add('hidden');
    modal.innerHTML = '';
}

export async function handlePasswordVerificationForLogin(profileId, profileName) {
    const passwordInput = document.getElementById('login-password-input');
    const feedbackEl = document.getElementById('login-feedback');
    const password = passwordInput.value;
    if (!password) {
        feedbackEl.textContent = "Vui lòng nhập mật khẩu.";
        return;
    }
    feedbackEl.textContent = "Đang kiểm tra...";
    try {
        const profileRef = doc(db, "profiles", profileId);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
            feedbackEl.textContent = "Không tìm thấy hồ sơ.";
            return;
        }
        const storedHash = profileSnap.data().passwordHash;
        const inputHash = await hashText(password);
        if (inputHash === storedHash) {
            feedbackEl.textContent = "";
            closePasswordPrompt();
            await selectProfile(profileId, profileName);
        } else {
            feedbackEl.textContent = "Mật khẩu không chính xác.";
            passwordInput.focus();
        }
    } catch (error) {
        console.error("Lỗi xác thực:", error);
        feedbackEl.textContent = "Đã xảy ra lỗi. Vui lòng thử lại.";
    }
}

async function selectProfile(profileId, profileName) {
    setState({ selectedProfileId: profileId });
    document.getElementById('profile-selection-container').classList.add('hidden');
    document.getElementById('loading-container').classList.remove('hidden');
    await data.loadUserData(profileName);
    document.getElementById('loading-container').classList.add('hidden');
    document.getElementById('main-app-container').classList.remove('hidden');
    document.getElementById('main-app-container').classList.add('flex');
    showTab('home-tab');
}

export function switchProfile() {
    setState({ selectedProfileId: null, appData: {}, vocabList: [], filteredVocabList: [] });
    document.getElementById('main-app-container').classList.add('hidden');
    document.getElementById('main-app-container').classList.remove('flex');
    document.getElementById('profile-selection-container').classList.remove('hidden');
    displayProfileScreen();
}

export function promptDeleteProfile() {
    const profileName = state.appData.profileName;
    const password = prompt(`Để xóa hồ sơ "${profileName}", vui lòng nhập lại mật khẩu của bạn:`);
    if(password) {
        handlePasswordVerificationForDelete(password);
    }
}

async function handlePasswordVerificationForDelete(password) {
    try {
        const profileRef = doc(db, "profiles", state.selectedProfileId);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
            alert("Không tìm thấy hồ sơ.");
            return;
        }
        const storedHash = profileSnap.data().passwordHash;
        const inputHash = await hashText(password);
        if (inputHash === storedHash) {
            if (confirm("Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ này và toàn bộ dữ liệu học?")) {
                 await deleteProfileData(state.selectedProfileId);
            }
        } else {
            alert("Mật khẩu không chính xác.");
        }
    } catch (error) {
        console.error("Lỗi xác thực xóa:", error);
        alert("Đã xảy ra lỗi. Vui lòng thử lại.");
    }
}

async function deleteProfileData(profileId) {
    if (!profileId) return;
    try {
        await deleteDoc(doc(db, "profiles", profileId));
        await deleteDoc(doc(db, "users", profileId));
        alert("Đã xóa hồ sơ thành công.");
        switchProfile();
    } catch (error) {
        console.error("Lỗi khi xóa hồ sơ:", error);
        alert("Đã xảy ra lỗi khi xóa hồ sơ.");
    }
}

// === HÀM ĐÃ ĐƯỢC NÂNG CẤP ===
export async function updateAllPhonetics() {
    const btnWrapper = document.getElementById('update-phonetics-wrapper');
    if (!btnWrapper) return;

    // Lọc những từ chưa có định nghĩa (dấu hiệu cho thấy dữ liệu chưa được làm giàu)
    const wordsToUpdate = state.vocabList.filter(word => !word.definition);

    if (wordsToUpdate.length === 0) {
        alert("Tuyệt vời! Tất cả các từ vựng đã được cập nhật đầy đủ.");
        return;
    }

    if (!confirm(`Tìm thấy ${wordsToUpdate.length} từ chưa được làm giàu dữ liệu. Bạn có muốn bắt đầu cập nhật không? Quá trình này có thể mất vài phút.`)) {
        return;
    }

    btnWrapper.innerHTML = `<div class="p-4 text-center text-sm font-medium">Đang cập nhật... <span id="phonetic-progress">0</span>/${wordsToUpdate.length}</div>`;
    const progressEl = document.getElementById('phonetic-progress');
    
    let updatedCount = 0;
    const newVocabList = [...state.vocabList];

    for (const wordObj of wordsToUpdate) {
        const apiData = await data.fetchWordData(wordObj.word);
        
        // Tìm đúng từ trong danh sách gốc và cập nhật
        const indexInFullList = newVocabList.findIndex(v => v.word === wordObj.word);
        if (indexInFullList !== -1 && apiData) {
            // Chỉ cập nhật các trường còn thiếu để không ghi đè dữ liệu người dùng đã nhập
            newVocabList[indexInFullList].phonetic = newVocabList[indexInFullList].phonetic || apiData.phonetic;
            newVocabList[indexInFullList].definition = newVocabList[indexInFullList].definition || apiData.definition;
            newVocabList[indexInFullList].example = newVocabList[indexInFullList].example || apiData.example;
            newVocabList[indexInFullList].partOfSpeech = newVocabList[indexInFullList].partOfSpeech || apiData.partOfSpeech;
            newVocabList[indexInFullList].synonyms = newVocabList[indexInFullList].synonyms?.length > 0 ? newVocabList[indexInFullList].synonyms : (apiData.synonyms || []);
        }

        updatedCount++;
        progressEl.textContent = updatedCount;
    }

    setState({ vocabList: newVocabList });
    await data.saveMasterVocab();

    btnWrapper.innerHTML = `<div class="p-4 text-center text-sm font-medium text-green-500">Hoàn tất! Đã xử lý ${wordsToUpdate.length} từ.</div>`;
    
    setTimeout(() => {
         // Phục hồi lại nút sau khi hoàn tất
         const profileTab = document.getElementById('profile-tab');
         if(profileTab && profileTab.classList.contains('active')) {
            showTab('profile-tab');
         }
    }, 3000);
}

// ======================================================
// START: THÊM HÀM MỚI NÀY VÀO CUỐI FILE
// ======================================================
export function initDataMigration() {
    const migrateBtn = document.getElementById('migrate-images-btn');
    // Nếu không tìm thấy nút (do đang ở tab khác), thì không làm gì cả
    if (!migrateBtn) return;

    // Gắn sự kiện click vào nút
    migrateBtn.addEventListener('click', async () => {
        const feedbackEl = document.getElementById('migration-feedback');

        if (!confirm('CẢNH BÁO: Quá trình này sẽ quét toàn bộ từ vựng của bạn và tải lại các ảnh từ Pixabay. Việc này có thể mất vài phút và không thể hoàn tác. Bạn có muốn tiếp tục không?')) {
            return;
        }

        migrateBtn.disabled = true;
        migrateBtn.textContent = 'Đang xử lý, vui lòng không tắt trang...';
        feedbackEl.textContent = 'Bắt đầu quá trình...';

        try {
            // Import các hàm cần thiết của Firebase Functions
            const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js');
            const functions = getFunctions(undefined, 'asia-southeast1'); // Chỉ định vùng nếu cần

            // Tên function phải khớp với tên bạn export trong file functions/index.js
            const migratePixabayImages = httpsCallable(functions, 'migratePixabayImages');

            // Gọi function và chờ kết quả
            const result = await migratePixabayImages();

            const message = result.data.message;
            feedbackEl.textContent = message;
            showToast(`Chuyển đổi hoàn tất! Đã cập nhật ${result.data.count} ảnh.`, 'success');

            // Tải lại danh sách từ vựng để hiển thị ảnh mới nếu có thay đổi
            if (result.data.count > 0) {
                const { fetchVocabList } = await import('./data.js');
                await fetchVocabList();
            }

        } catch (error) {
            console.error("Lỗi khi chuyển đổi ảnh:", error);
            feedbackEl.textContent = `Lỗi: ${error.message}`;
            showToast("Đã xảy ra lỗi trong quá trình chuyển đổi.", "error");
        } finally {
            // Dù thành công hay thất bại, bật lại nút bấm
            migrateBtn.disabled = false;
            migrateBtn.textContent = 'Bắt đầu chuyển đổi ảnh';
        }
    });
}

// 👉 NEW: gắn click vào avatar để mở picker ẩn
export function initAvatarChangeUI() {
  let img = document.getElementById('profileAvatarImg');
  const fileInput = document.getElementById('avatarFileInput');
  if (!img || !fileInput) return;

  // Xoá mọi handler cũ (nếu có) để tránh bị bind trùng
  const freshImg = img.cloneNode(true);
  img.parentNode.replaceChild(freshImg, img);
  img = freshImg;

  img.style.cursor = 'pointer';
  img.title = 'Bấm để đổi ảnh';
  img.addEventListener('click', (e) => {
    e.stopPropagation();          // ⛔ chặn bubble lên wrapper
    fileInput.click();
  });

  if (!fileInput.dataset.avatarUploaderBound) {
    fileInput.addEventListener('change', (e) => handleAvatarUpload(e));
    fileInput.dataset.avatarUploaderBound = '1';
  }
}
// ======================================================
// END
// ======================================================
