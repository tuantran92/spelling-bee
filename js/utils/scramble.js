// js/utils/scramble.js
// Tạo N xáo trộn (khác nhau, khác hẳn bản gốc) từ một từ/ cụm từ.
// Giữ nguyên chữ có dấu tiếng Việt nhờ NFC, bỏ khoảng trắng trước khi xáo, rồi chèn lại ngẫu nhiên.
export function makeScrambleOptions(answer, n = 3) {
  const original = (answer ?? "").trim();
  if (!original) return [];

  // Chuẩn hóa để xử lý dấu (tiếng Việt dùng NFC là ổn)
  const nfc = original.normalize("NFC");

  // Tách chữ và khoảng trắng
  const letters = Array.from(nfc.replace(/\s+/g, ""));
  const spacesCount = nfc.split("").filter(c => c === " ").length;

  function shuffleOnce(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function insertRandomSpaces(strLetters, spaceN) {
    if (spaceN <= 0) return strLetters.join("");
    const positions = Array.from({ length: strLetters.length + 1 }, (_, i) => i);
    // chọn vị trí chèn khoảng trắng (không trùng)
    const chosen = new Set();
    while (chosen.size < Math.min(spaceN, positions.length)) {
      chosen.add(positions[Math.floor(Math.random() * positions.length)]);
    }
    const arr = strLetters.slice();
    // chèn từ phải sang trái để không lệch index các vị trí đã chọn
    [...chosen].sort((a, b) => b - a).forEach(pos => arr.splice(pos, 0, " "));
    // loại bỏ khoảng trắng đầu/cuối nếu lỡ chèn
    return arr.join("").replace(/^\s+|\s+$/g, "").replace(/\s{2,}/g, " ");
  }

  const bads = new Set();
  const lowerOriginal = nfc.toLowerCase();

  let guard = 0;
  while (bads.size < n && guard < 200) {
    guard++;
    let shuffled = shuffleOnce(letters);
    // nếu trùng y hệt (đôi khi xáo lại thành cũ), đổi chỗ 2 phần tử
    if (shuffled.join("") === letters.join("") && shuffled.length > 1) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    let candidate = insertRandomSpaces(shuffled, spacesCount);
    // tránh trùng đáp án đúng (bất kể hoa/thường) và trùng nhau
    if (candidate.toLowerCase() === lowerOriginal) continue;
    // tránh quá giống (chỉ khác khoảng trắng)
    if (candidate.replace(/\s+/g, "").toLowerCase() === lowerOriginal.replace(/\s+/g, "")) continue;

    // đảm bảo độ dài/độ khác biệt tối thiểu (tránh xáo ra chuỗi y hệt)
    if (candidate.length >= Math.max(2, original.length - 2)) {
      bads.add(candidate);
    }
  }

  return Array.from(bads);
}
