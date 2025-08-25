// js/utils.js
import { state } from './state.js';

export function parseCSV(text) {
    const rows = text.split(/\r?\n/).slice(1);
    return rows.map(row => {
        const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const clean = (str) => (str || '').trim().replace(/^"|"$/g, '');
        const [word, meaning, example, category] = columns.map(clean);
        if (word && meaning) {
            return { word: word.toLowerCase(), meaning, example, category: category || 'Chung' };
        }
        return null;
    }).filter(item => item !== null);
}

// ===================================================================
// START: THAY ĐỔI THUẬT TOÁN TẠI ĐÂY
// ===================================================================
/**
 * Xáo trộn một vài ký tự trong từ để dễ đoán hơn.
 * @param {string} word - Từ gốc cần xáo trộn.
 * @returns {string} Từ đã được xáo trộn nhẹ.
 */
export function scrambleWord(word) {
    if (word.length <= 1) {
        return word;
    }

    let scrambled;
    const letters = word.split("");
    const len = letters.length;

    do {
        const tempLetters = [...letters]; // Làm việc trên một bản sao

        // Xác định số lần hoán đổi ký tự dựa trên độ dài của từ.
        // Càng dài thì hoán đổi càng nhiều, nhưng chỉ khoảng 1/3 số ký tự.
        // Luôn hoán đổi ít nhất 1 lần.
        const swaps = Math.max(1, Math.floor(len / 3));

        for (let i = 0; i < swaps; i++) {
            // Chọn 2 vị trí ngẫu nhiên và khác nhau để hoán đổi
            const index1 = Math.floor(Math.random() * len);
            let index2 = Math.floor(Math.random() * len);
            
            while (index1 === index2) {
                index2 = Math.floor(Math.random() * len);
            }

            // Hoán đổi 2 ký tự
            [tempLetters[index1], tempLetters[index2]] = [tempLetters[index2], tempLetters[index1]];
        }
        scrambled = tempLetters.join("");
        
    } while (scrambled === word); // Đảm bảo từ sau khi xáo trộn phải khác từ gốc

    return scrambled;
}
// ===================================================================
// END: THAY ĐỔI THUẬT TOÁN
// ===================================================================


export async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
    for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,        // deletion
                matrix[j - 1][i] + 1,        // insertion
                matrix[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    return matrix[b.length][a.length];
}

/**
 * PHIÊN BẢN GỠ LỖI: Hàm phát âm thanh với console.log
 * @param {'correct' | 'wrong'} type 
 */
export function playSound(type) {
    console.log(`[playSound] Được gọi để phát âm thanh: ${type}`); // Gỡ lỗi
    const audioEl = document.getElementById(type === 'correct' ? 'audio-correct' : 'audio-wrong');
    
    if (audioEl) {
        console.log(`[playSound] Đã tìm thấy element audio: #${audioEl.id}`); // Gỡ lỗi
        audioEl.currentTime = 0;
        audioEl.play()
            .then(() => {
                console.log(`[playSound] Âm thanh ${type} đã phát thành công.`); // Gỡ lỗi
            })
            .catch(error => {
                console.error(`[playSound] Lỗi khi phát âm thanh ${type}:`, error); // Gỡ lỗi
            });
    } else {
        console.error(`[playSound] KHÔNG tìm thấy element audio cho: ${type}`); // Gỡ lỗi
    }
}


/**
 * THÊM MỚI: Hàm xáo trộn mảng (Fisher-Yates shuffle)
 * @param {Array} array Mảng cần xáo trộn
 * @returns {Array} Mảng đã được xáo trộn
 */
export function shuffleArray(array) {
    let currentIndex = array.length,  randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

/**
 * THÊM MỚI: Hàm che một phần từ vựng để làm gợi ý
 * @param {string} word - Từ cần che
 * @returns {string} Từ đã được che
 */
export function maskWord(word) {
    const len = word.length;
    if (len <= 2) {
        return '-'.repeat(len);
    }
    if (len === 3) {
        return `${word[0]}-${word[2]}`; // cat -> c-t
    }

    const chars = word.split('');
    let maskedChars = new Array(len).fill('-');
    
    // Luôn hiển thị ký tự đầu và cuối
    maskedChars[0] = chars[0];
    maskedChars[len - 1] = chars[len - 1];

    if (len >= 7 && len <= 9) {
        // Hiển thị thêm 1 ký tự ngẫu nhiên ở giữa
        const randomIndex = Math.floor(Math.random() * (len - 2)) + 1;
        maskedChars[randomIndex] = chars[randomIndex];
    } else if (len > 9) {
        // Hiển thị thêm 2 ký tự ngẫu nhiên ở giữa
        let index1 = Math.floor(Math.random() * (len - 2)) + 1;
        let index2;
        do {
            index2 = Math.floor(Math.random() * (len - 2)) + 1;
        } while (index1 === index2);
        
        maskedChars[index1] = chars[index1];
        maskedChars[index2] = chars[index2];
    }
    
    return maskedChars.join('');
}


/**
 * THÊM MỚI: Hàm tạo độ trễ (delay)
 * @param {number} ms - Thời gian chờ (mili-giây)
 */
export const delay = ms => new Promise(res => setTimeout(res, ms));

export function speak(text, lang, onEndCallback) {
    if (!text) {
        if (onEndCallback) onEndCallback();
        return;
    }
    if (typeof SpeechSynthesisUtterance === "undefined") {
        if (onEndCallback) onEndCallback();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const rateSlider = document.getElementById('rate-slider');
    utterance.rate = rateSlider ? parseFloat(rateSlider.value) : 1;

    if (state.availableVoices && state.availableVoices.length > 0) {
        const voiceSelect = document.getElementById('voice-select');
        const selectedVoiceName = voiceSelect ? voiceSelect.value : null;
        let voiceToUse = null;

        // 1. Ưu tiên giọng người dùng đã chọn, nếu nó khớp với ngôn ngữ đang cần đọc
        if (selectedVoiceName) {
            const selectedVoice = state.availableVoices.find(voice => voice.name === selectedVoiceName);
            if (selectedVoice && selectedVoice.lang.startsWith(lang.substring(0, 2))) {
                voiceToUse = selectedVoice;
            }
        }

        // 2. Nếu không, tìm một giọng đọc bất kỳ khác khớp với ngôn ngữ đang cần
        if (!voiceToUse) {
            voiceToUse = state.availableVoices.find(voice => voice.lang.startsWith(lang.substring(0, 2)));
        }

        if (voiceToUse) {
            utterance.voice = voiceToUse;
        }
    }

    if (onEndCallback && typeof onEndCallback === 'function') {
        utterance.onend = onEndCallback;
    }

    window.speechSynthesis.speak(utterance);
}