/* Зарежда рамката и главите в node (без DOM), за да се тестват чистите функции algos.
   Употреба:  const { ch, cout } = require("./harness")("ch01_algorithm.js", "01_algorithm.c"); */
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const T = path.join(__dirname, "..");
module.exports = function (chFile, cFile) {
  const ctx = { console, Math, JSON, Number, String, Array, Object, Set, Map, Error, Infinity, NaN, isFinite, parseInt, parseFloat };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of [path.join(T, "../common/js/study.js"), path.join(T, "js/glossary.js"), path.join(T, "js/csrc.js"), path.join(T, "js", chFile)])
    vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
  const ch = ctx.Study.chapters[ctx.Study.chapters.length - 1];
  let cout = "";
  if (cFile) {
    const bin = path.join(require("os").tmpdir(), "t05_" + path.basename(cFile, ".c"));
    cp.execFileSync("gcc", ["-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", path.join(T, "c", cFile), "-o", bin, "-lm"], { stdio: "inherit" });
    cout = cp.execFileSync(bin, { encoding: "utf8" });
  }
  /** взима стойност от ред "ключ = стойност" в изхода на C */
  const get = (k) => { const m = cout.split("\n").find((l) => l.startsWith(k + " = ")); if (!m) throw new Error("Няма ред в C изхода: " + k); return m.slice(k.length + 3).trim(); };
  let fails = 0, ok = 0;
  const eq = (name, a, b) => { if (String(a) === String(b)) ok++; else { fails++; console.error(`  ✗ ${name}: JS=${a}  C=${b}`); } };
  const done = () => { console.log(`${chFile}: ${ok} съвпадения, ${fails} разлики`); if (fails) process.exitCode = 1; };
  // проверка, че всички етикети в кадрите съществуват в C региона
  const checkTags = (codeKey, frames) => {
    const src = ctx.CSRC[codeKey]; if (!src) { fails++; console.error("  ✗ липсва регион " + codeKey); return; }
    for (const f of frames) for (const t of [].concat(f.at || [])) if (!src.tags[t]) { fails++; console.error(`  ✗ ${codeKey}: етикет @${t} не съществува`); return; }
    ok++;
  };
  return { ch, ctx, cout, get, eq, done, checkTags };
};
