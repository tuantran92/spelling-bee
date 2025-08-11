// js/profile.js

import { collection, getDocs, addDoc, query, where, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase.js';
import { setState } from './state.js';
// SỬA LỖI: Không import DOMElements nữa
// import { DOMElements } from './ui.js';
import * as data from './data.js';
import { hashText } from './utils.js';

export async function displayProfileScreen() {
    try {
        // Lấy các phần tử DOM trực tiếp
        const profileListEl = document.getElementById('profile-list');
        const profileFeedbackEl = document.getElementById('profile-feedback');

        const profilesCollection = collection(db, "profiles");
        const profilesSnapshot = await getDocs(profilesCollection);
        profileListEl.innerHTML = '';
        if (profilesSnapshot.empty) {
            profileListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Chưa có hồ sơ nào. Hãy tạo một hồ sơ mới!</p>';
        } else {
            profilesSnapshot.forEach(doc => {
                const profile = doc.data();
                const profileItem = document.createElement('div');
                profileItem.className = 'flex items-center justify-between gap-2';
                const profileButton = document.createElement('button');
                profileButton.className = 'flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105';
                profileButton.textContent = profile.name;
                profileButton.onclick = () => selectProfile(doc.id, profile.name);
                const deleteButton = document.createElement('button');
                deleteButton.className = 'flex-shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold p-3 rounded-lg shadow-md transition-transform transform hover:scale-105';
                deleteButton.title = `Xóa hồ sơ ${profile.name}`;
                deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>`;
                deleteButton.onclick = (e) => {
                    e.stopPropagation();
                    promptDeleteProfile(doc.id, profile.name);
                };
                profileItem.appendChild(profileButton);
                profileItem.appendChild(deleteButton);
                profileListEl.appendChild(profileItem);
            });
        }
    } catch (error) {
        console.error("Lỗi khi tải hồ sơ: ", error);
        const profileFeedbackEl = document.getElementById('profile-feedback');
        if (profileFeedbackEl) profileFeedbackEl.textContent = "Không thể tải danh sách hồ sơ.";
    }
}

export async function createNewProfile() {
    const profileNameInput = document.getElementById('profile-name-input');
    const passwordInput = document.getElementById('profile-password-input');
    const profileFeedbackEl = document.getElementById('profile-feedback');
    
    const name = profileNameInput.value.trim();
    const password = passwordInput.value.trim();

    if (name.length < 3) {
        profileFeedbackEl.textContent = "Tên phải có ít nhất 3 ký tự.";
        return;
    }
    if (password.length < 6) {
        profileFeedbackEl.textContent = "Mật khẩu phải có ít nhất 6 ký tự.";
        return;
    }

    profileFeedbackEl.textContent = "Đang kiểm tra tên...";
    try {
        const q = query(collection(db, "profiles"), where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            profileFeedbackEl.textContent = "Tên này đã tồn tại.";
            return;
        }

        const passwordHash = await hashText(password);
        const docRef = await addDoc(collection(db, "profiles"), { 
            name: name, 
            passwordHash: passwordHash,
            createdAt: new Date() 
        });

        profileFeedbackEl.textContent = `Đã tạo hồ sơ cho ${name}!`;
        await selectProfile(docRef.id, name);
    } catch (error) {
        console.error("Lỗi khi tạo hồ sơ: ", error);
        profileFeedbackEl.textContent = "Đã xảy ra lỗi khi tạo hồ sơ.";
    }
}

async function selectProfile(profileId, profileName) {
    setState({ selectedProfileId: profileId });
    document.getElementById('profile-selection-container').classList.add('hidden');
    document.getElementById('loading-container').classList.remove('hidden');
    document.getElementById('main-app-container').classList.add('hidden');
    document.getElementById('user-id-display').textContent = `Hồ sơ: ${profileName}`;
    await data.loadUserData();
    document.getElementById('loading-container').classList.add('hidden');
    document.getElementById('main-app-container').classList.remove('hidden');
}

export function switchProfile() {
    document.getElementById('main-app-container').classList.add('hidden');
    document.getElementById('profile-selection-container').classList.remove('hidden');
    setState({
        selectedProfileId: null,
        appData: {},
        vocabList: [],
        filteredVocabList: []
    });
    displayProfileScreen();
}

function promptDeleteProfile(profileId, profileName) {
    document.getElementById('profile-to-delete-name').textContent = profileName;
    document.getElementById('delete-password-input').value = '';
    document.getElementById('delete-feedback').textContent = '';
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    deleteConfirmModal.classList.remove('hidden');
    document.getElementById('confirm-delete-btn').onclick = () => handlePasswordVerificationForDelete(profileId);
}

async function handlePasswordVerificationForDelete(profileId) {
    const passwordInput = document.getElementById('delete-password-input');
    const feedbackEl = document.getElementById('delete-feedback');
    const password = passwordInput.value;

    if (!password) {
        feedbackEl.textContent = "Vui lòng nhập mật khẩu.";
        return;
    }

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
            await deleteProfile(profileId);
        } else {
            feedbackEl.textContent = "Mật khẩu không chính xác.";
        }

    } catch (error) {
        console.error("Lỗi xác thực xóa:", error);
        feedbackEl.textContent = "Đã xảy ra lỗi. Vui lòng thử lại.";
    }
}

async function deleteProfile(profileId) {
    if (!profileId) return;
    try {
        await deleteDoc(doc(db, "profiles", profileId));
        await deleteDoc(doc(db, "users", profileId));
        document.getElementById('delete-confirm-modal').classList.add('hidden');
        await displayProfileScreen();
    } catch (error) {
        console.error("Lỗi khi xóa hồ sơ:", error);
        alert("Đã xảy ra lỗi khi xóa hồ sơ.");
    }
}