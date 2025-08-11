// js/profile.js

import { collection, getDocs, addDoc, query, where, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase.js';
import { setState } from './state.js';
import { DOMElements } from './ui.js';
import * as data from './data.js';
import { hashText } from './utils.js';

export async function displayProfileScreen() {
    try {
        const profilesCollection = collection(db, "profiles");
        const profilesSnapshot = await getDocs(profilesCollection);
        DOMElements.profileListEl.innerHTML = '';
        if (profilesSnapshot.empty) {
            DOMElements.profileListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Chưa có hồ sơ nào. Hãy tạo một hồ sơ mới!</p>';
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
                DOMElements.profileListEl.appendChild(profileItem);
            });
        }
    } catch (error) {
        console.error("Lỗi khi tải hồ sơ: ", error);
        DOMElements.profileFeedbackEl.textContent = "Không thể tải danh sách hồ sơ.";
    }
}

export async function createNewProfile() {
    const profileNameInput = document.getElementById('profile-name-input');
    const passwordInput = document.getElementById('profile-password-input');
    const name = profileNameInput.value.trim();
    const password = passwordInput.value.trim();

    if (name.length < 3) {
        DOMElements.profileFeedbackEl.textContent = "Tên phải có ít nhất 3 ký tự.";
        return;
    }
    if (password.length < 6) {
        DOMElements.profileFeedbackEl.textContent = "Mật khẩu phải có ít nhất 6 ký tự.";
        return;
    }

    DOMElements.profileFeedbackEl.textContent = "Đang kiểm tra tên...";
    try {
        const q = query(collection(db, "profiles"), where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            DOMElements.profileFeedbackEl.textContent = "Tên này đã tồn tại.";
            return;
        }

        const passwordHash = await hashText(password);
        const docRef = await addDoc(collection(db, "profiles"), { 
            name: name, 
            passwordHash: passwordHash,
            createdAt: new Date() 
        });

        DOMElements.profileFeedbackEl.textContent = `Đã tạo hồ sơ cho ${name}!`;
        await selectProfile(docRef.id, name);
    } catch (error) {
        console.error("Lỗi khi tạo hồ sơ: ", error);
        DOMElements.profileFeedbackEl.textContent = "Đã xảy ra lỗi khi tạo hồ sơ.";
    }
}

async function selectProfile(profileId, profileName) {
    setState({ selectedProfileId: profileId });
    DOMElements.profileSelectionContainer.classList.add('hidden');
    DOMElements.loadingContainer.classList.remove('hidden');
    DOMElements.mainAppContainer.classList.add('hidden');
    DOMElements.userIdDisplayEl.textContent = `Hồ sơ: ${profileName}`;
    await data.loadUserData();
    DOMElements.loadingContainer.classList.add('hidden');
    DOMElements.mainAppContainer.classList.remove('hidden');
}

export function switchProfile() {
    DOMElements.mainAppContainer.classList.add('hidden');
    DOMElements.profileSelectionContainer.classList.remove('hidden');
    setState({
        selectedProfileId: null,
        appData: {},
        vocabList: [],
        filteredVocabList: []
    });
    displayProfileScreen();
}

function promptDeleteProfile(profileId, profileName) {
    DOMElements.profileToDeleteNameEl.textContent = profileName;
    document.getElementById('delete-password-input').value = '';
    document.getElementById('delete-feedback').textContent = '';
    DOMElements.deleteConfirmModal.classList.remove('hidden');
    DOMElements.confirmDeleteBtn.onclick = () => handlePasswordVerificationForDelete(profileId);
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
        DOMElements.deleteConfirmModal.classList.add('hidden');
        await displayProfileScreen();
    } catch (error) {
        console.error("Lỗi khi xóa hồ sơ:", error);
        alert("Đã xảy ra lỗi khi xóa hồ sơ.");
    }
}
