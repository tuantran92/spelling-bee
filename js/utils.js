// js/utils.js

/**
 * Phân tích chuỗi CSV từ Google Sheet thành một mảng các đối tượng từ vựng.
 * @param {string} text - Nội dung file CSV.
 * @returns {Array<object>} - Mảng các đối tượng từ vựng.
 */
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

/**
 * Xáo trộn các chữ cái của một từ.
 * @param {string} word - Từ cần xáo trộn.
 * @returns {string} - Từ đã được xáo trộn.
 */
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

/**
 * Mã hóa một chuỗi bằng thuật toán SHA-256.
 * @param {string} text - Chuỗi cần mã hóa.
 * @returns {Promise<string>} - Chuỗi hex đã được mã hóa.
 */
export async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
