// tools/split-game-modes.js
/* eslint-disable no-console */
/**
 * Codemod tách hàm theo mode ra file riêng + tự chèn import ngược vào gameModes.js
 * - Chạy thử: node tools/split-game-modes.js --src js/gameModes.js --out js/game-modes --dry
 * - Chạy thật: node tools/split-game-modes.js --src js/gameModes.js --out js/game-modes
 *
 * Lưu ý: nếu 1 VariableStatement khai báo nhiều biến (const a=()=>{}, b=1;)
 * và chỉ a thuộc nhóm cần tách, script sẽ di chuyển CẢ statement. Nên tách biến trước khi chạy.
 */

const { Project, SyntaxKind, QuoteKind } = require("ts-morph");
const path = require("path");
const fs = require("fs");

// ==== CLI & path helpers ====
const ROOT = process.cwd();
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry");
function getArg(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

// Cho phép chỉ định --src và --out qua CLI
// Mặc định: src = js/gameModes.js, out = cùng thư mục với src + "game-modes"
const SRC_CLI = getArg("--src");
const OUT_CLI = getArg("--out");

const SRC_FILE = SRC_CLI
  ? path.resolve(ROOT, SRC_CLI)
  : path.join(ROOT, "js", "gameModes.js");

const OUT_DIR = OUT_CLI
  ? path.resolve(ROOT, OUT_CLI)
  : path.join(path.dirname(SRC_FILE), "game-modes");

// Tạo module specifier import theo vị trí thực tế (giữ kiểu ./sub/.. và dấu /)
function toModuleSpecifier(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}
const SCRAMBLE_SPEC = toModuleSpecifier(SRC_FILE, path.join(OUT_DIR, "scramble.js"));
const MCQ_SPEC      = toModuleSpecifier(SRC_FILE, path.join(OUT_DIR, "mcq.js"));

// ===== Danh sách hàm theo từng mode =====
const SCRAMBLE_FUNCS = new Set([
  "startScramble",
  "renderScrambleLetters",
  "handleScrambleLetterClick",
  "handleAnswerLetterClick",
  "handleScrambleBackspace",
  "toggleScrambleHint",
  "showScrambleAnswer",
  "checkScramble",
]);

const MCQ_FUNCS = new Set([
  "startMcq",
  "renderMcqScreen",
  "checkMcq",
]);

// Tuỳ chọn
const COMMENT_OUT_OLD = false; // true = comment-out code cũ; false = replace bằng 1 dòng //[moved]

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function run() {
  ensureFs();

  const project = new Project({
    manipulationSettings: { quoteKind: QuoteKind.Single },
    skipAddingFilesFromTsConfig: true,
  });

  const source = project.addSourceFileAtPath(SRC_FILE);

  // ==== PASS 1: QUÉT & THU THẬP (KHÔNG xoá/sửa node ở đây) ====
  const statementsSnapshot = source.getStatements();
  /** @type {{node:any, name:string, code:string, group:'scramble'|'mcq'}[]} */
  const collected = [];

  for (const stmt of statementsSnapshot) {
    // 1) function declaration: function foo() {}
    if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
      const name = stmt.getName?.();
      if (!name) continue;
      const group = pickGroup(name);
      if (!group) continue;

      const code = stmt.getFullText();
      collected.push({ node: stmt, name, code: markExport(code, name), group });
      continue;
    }

    // 2) variable statement với function/arrow: const foo = () => {}
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
      const decls = stmt.getDeclarationList().getDeclarations();
      for (const d of decls) {
        const name = d.getName?.();
        if (!name) continue;
        const init = d.getInitializer();
        if (!init) continue;

        const k = init.getKind();
        const isFunc = (k === SyntaxKind.ArrowFunction || k === SyntaxKind.FunctionExpression);
        if (!isFunc) continue;

        const group = pickGroup(name);
        if (!group) continue;

        const code = stmt.getFullText();
        collected.push({ node: stmt, name, code: markExport(code, name), group });
        break; // tránh đẩy trùng nếu nhiều decls
      }
    }
  }

  if (collected.length === 0) {
    console.log("Không tìm thấy hàm nào để tách. (Tên hàm không khớp danh sách?)");
    return;
  }

  // Gom theo nhóm
  const scramblePieces = collected.filter(c => c.group === "scramble");
  const mcqPieces = collected.filter(c => c.group === "mcq");

  // ==== PASS 2: GHI FILE module mới ====
  if (!isDryRun) {
    if (scramblePieces.length) {
      writeFileEnsured(path.join(OUT_DIR, "scramble.js"),
        headerComment("SCRAMBLE") + "\n\n" + join(scramblePieces.map(p => p.code)) + "\n"
      );
      console.log("✓ Đã tạo", path.relative(ROOT, path.join(OUT_DIR, "scramble.js")));
    }
    if (mcqPieces.length) {
      writeFileEnsured(path.join(OUT_DIR, "mcq.js"),
        headerComment("MCQ") + "\n\n" + join(mcqPieces.map(p => p.code)) + "\n"
      );
      console.log("✓ Đã tạo", path.relative(ROOT, path.join(OUT_DIR, "mcq.js")));
    }
  } else {
    console.log("— DRY RUN — không ghi game-modes/*.js");
  }

  // ==== PASS 3: GỠ/COMMENT các node cũ trong source ====
  if (!isDryRun) {
    const nodesToRemove = new Set(collected.map(c => c.node));
    for (const node of nodesToRemove) {
      removeOrComment(node);
    }
  } else {
    console.log("— DRY RUN — không xoá/replace code cũ trong gameModes.js");
  }

  // ==== PASS 4: CHÈN/MERGE IMPORT ====
  if (!isDryRun) {
    const namesByGroup = groupNames(collected);
    if (namesByGroup.scramble.length) {
      ensureNamedImport(source, SCRAMBLE_SPEC, namesByGroup.scramble);
    }
    if (namesByGroup.mcq.length) {
      ensureNamedImport(source, MCQ_SPEC, namesByGroup.mcq);
    }

    await source.save();
    console.log("✓ Đã cập nhật import trong", path.relative(ROOT, SRC_FILE));
  } else {
    console.log("— DRY RUN — không ghi", path.relative(ROOT, SRC_FILE));
  }

  console.log("\n✅ Hoàn tất.");
  if (isDryRun) {
    console.log("Chạy thực tế: node tools/split-game-modes.js --src js/gameModes.js --out js/game-modes");
  }
}

// ========= Helpers =========

function ensureFs() {
  if (!fs.existsSync(SRC_FILE)) {
    throw new Error(`Không tìm thấy file nguồn: ${SRC_FILE}`);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

function pickGroup(name) {
  if (SCRAMBLE_FUNCS.has(name)) return "scramble";
  if (MCQ_FUNCS.has(name)) return "mcq";
  return null;
}

function headerComment(tag) {
  return `// ===== Auto-extracted ${tag} functions (generated by split-game-modes.js) =====`;
}

function markExport(code, name) {
  const trimmed = code.trim();

  // function declaration
  if (/^\s*export\s+function\s+/.test(trimmed)) return trimmed;
  if (/^\s*function\s+/.test(trimmed)) {
    return trimmed.replace(/^(\s*)function\s+/, "$1export function ");
  }

  // variable declaration
  if (/^\s*export\s+(const|let|var)\s+/.test(trimmed)) return trimmed;
  if (/^\s*(const|let|var)\s+/.test(trimmed)) {
    return trimmed.replace(/^(\s*)(const|let|var)\s+/, "$1export $2 ");
  }

  // fallback
  return "export " + trimmed;
}

function removeOrComment(stmt) {
  if (COMMENT_OUT_OLD) {
    const text = stmt.getFullText();
    stmt.replaceWithText(text.split("\n").map(l => "// " + l).join("\n"));
  } else {
    const name =
      stmt.getKind() === SyntaxKind.FunctionDeclaration
        ? stmt.getName?.() || ""
        : (stmt.getKind() === SyntaxKind.VariableStatement
            ? stmt.getDeclarationList().getDeclarations()[0]?.getName() || ""
            : "");
    stmt.replaceWithText(`// [moved] ${name}`);
  }
}

// Tạo/merge: import { a, b } from 'module';
function ensureNamedImport(source, moduleSpecifier, names) {
  const unique = Array.from(new Set(names)).sort();

  const existing = source.getImportDeclaration(
    i => i.getModuleSpecifierValue() === moduleSpecifier
  );

  if (existing) {
    const named = existing.getNamedImports().map(n => n.getName());
    const toAdd = unique.filter(n => !named.includes(n));
    if (toAdd.length) {
      existing.addNamedImports(toAdd);
      console.log(`• Gộp thêm import { ${toAdd.join(", ")} } từ ${moduleSpecifier}`);
    }
  } else {
    source.insertImportDeclaration(0, {
      moduleSpecifier,
      namedImports: unique,
    });
    console.log(`• Thêm import mới từ ${moduleSpecifier}: { ${unique.join(", ")} }`);
  }
}

function groupNames(collected) {
  const m = { scramble: [], mcq: [] };
  for (const c of collected) {
    if (!m[c.group].includes(c.name)) m[c.group].push(c.name);
  }
  return m;
}

function join(arr) {
  return arr.join("\n\n");
}

function writeFileEnsured(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}
