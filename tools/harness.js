/* Общ тест-харнес за всички теми: зарежда рамката и една глава в node (без DOM),
   компилира C/C++ файла и дава помощници за сверка.
   Употреба (от <тема>/tests/chNN.test.js):
     const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_x.js", "01_x.c");  // или .cpp, или null */
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process"), os = require("os");
module.exports = function (topicDir, chFile, cFile) {
  const T = path.resolve(topicDir);
  const ctx = { console, Math, JSON, Number, String, Array, Object, Set, Map, Error, Infinity, NaN, isFinite, parseInt, parseFloat, BigInt, Date, RegExp, Symbol, Uint8Array, Uint32Array, Int32Array, Float64Array, TextEncoder, TextDecoder };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of [path.join(T, "../common/js/study.js"), path.join(T, "js/glossary.js"), path.join(T, "js/csrc.js"), path.join(T, "js", chFile)])
    if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
  const ch = ctx.Study.chapters[ctx.Study.chapters.length - 1];
  let cout = "";
  if (cFile) {
    const src = path.join(T, "c", cFile), cpp = cFile.endsWith(".cpp");
    const bin = path.join(os.tmpdir(), path.basename(T) + "_" + path.basename(cFile).replace(/\W/g, "_"));
    cp.execFileSync(cpp ? "g++" : "gcc", cpp ? ["-std=c++17", "-Wall", "-Wextra", "-Werror", "-O2", src, "-o", bin, "-lm"] : ["-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", src, "-o", bin, "-lm"], { stdio: "inherit" });
    cout = cp.execFileSync(bin, { encoding: "utf8" });
  }
  const get = (k) => { const m = cout.split("\n").find((l) => l.startsWith(k + " = ")); if (!m) throw new Error("Няма ред в C изхода: " + k); return m.slice(k.length + 3).trim(); };
  let fails = 0, ok = 0;
  const eq = (name, a, b) => { if (String(a) === String(b)) ok++; else { fails++; console.error(`  ✗ ${name}: JS=${a}  C=${b}`); } };
  const done = () => { console.log(`${chFile}: ${ok} съвпадения, ${fails} разлики`); if (fails) process.exitCode = 1; };
  const checkTags = (codeKey, frames) => {
    const s = ctx.CSRC && ctx.CSRC[codeKey]; if (!s) { fails++; console.error("  ✗ липсва регион " + codeKey); return; }
    for (const f of frames) for (const tg of [].concat(f.at || [])) if (!s.tags[tg]) { fails++; console.error(`  ✗ ${codeKey}: етикет @${tg} не съществува`); return; }
    ok++;
  };
  return { ch, ctx, cout, get, eq, done, checkTags };
};
