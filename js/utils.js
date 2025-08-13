// js/utils.js

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

export function scrambleWord(word) {
    let scrambled;
    const letters = word.split("");
    do {
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        scrambled = letters.join("");
    } while (scrambled === word && word.length > 1);
    return scrambled;
}

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