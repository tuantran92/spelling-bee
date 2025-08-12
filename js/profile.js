// js/profile.js

import { collection, getDocs, addDoc, query, where, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase.js';
import { setState, state } from './state.js';
import { showTab } from './ui.js';
import * as data from './data.js';
import { hashText } from './utils.js';

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
                const profileItem = document.createElement('div');
                profileItem.className = 'flex items-center justify-between gap-2';
                profileItem.innerHTML = `
                    <button class="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg" onclick="profile.selectProfile('${doc.id}', '${profile.name}')">
                        ${profile.name}
                    </button>
                `;
                profileListEl.appendChild(profileItem);
            });
        }
    } catch (error) {
        console.error("Lỗi khi tải hồ sơ: ", error);
        const feedbackEl = document.getElementById('profile-feedback');
        if (feedbackEl) feedbackEl.textContent = "Không thể tải danh sách hồ sơ.";
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
            createdAt: new Date() 
        });

        await selectProfile(docRef.id, name);
    } catch (error) {
        console.error("Lỗi khi tạo hồ sơ: ", error);
        feedbackEl.textContent = "Đã xảy ra lỗi khi tạo hồ sơ.";
    }
}

export async function selectProfile(profileId, profileName) {
    setState({ selectedProfileId: profileId });
    document.getElementById('profile-selection-container').classList.add('hidden');
    document.getElementById('loading-container').classList.remove('hidden');

    await data.loadUserData(profileName);

    document.getElementById('loading-container').classList.add('hidden');
    document.getElementById('main-app-container').classList.remove('hidden');
    document.getElementById('main-app-container').classList.add('flex');
    
    // Khởi tạo và hiển thị tab đầu tiên
    showTab('home-tab');
}

export function switchProfile() {
    setState({
        selectedProfileId: null,
        appData: {},
        vocabList: [],
        filteredVocabList: []
    });
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
        switchProfile(); // Quay về màn hình chọn hồ sơ
    } catch (error) {
        console.error("Lỗi khi xóa hồ sơ:", error);
        alert("Đã xảy ra lỗi khi xóa hồ sơ.");
    }
}