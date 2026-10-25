/* Независима проверка на таблицата „истина“ за всяка двойка в лабораторията O/Ω/Θ/o/ω.
   Числено: отношението r(n) = f/g при големи n (за експоненти — в логаритмичен вид). */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = { console, Math, Number, String, Array, Object, Set, isFinite, getComputedStyle: () => ({ getPropertyValue: () => "" }), document: {} };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext("window.Study = { h(){} }; window.GLOSSARY = {};", ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/ch03_asym.js"), "utf8"), ctx);
const A = ctx.Study.asymAlgos;
let ok = 0, bad = 0;
const eq = (n, a, b) => { if (a === b) ok++; else { bad++; console.error("  ✗", n, a, b); } };
// log10 на отношението при голямо n, изчислено аналитично-независимо (без функциите от страницата)
const L = {
  quad: (n) => Math.log10((3 * n * n + 5 * n + 7) / (n * n)),
  n2n3: (n) => -Math.log10(n),
  n3n2: (n) => Math.log10(n),
  "100n": (n) => Math.log10(100 / n),
  nlog: (n) => Math.log10(Math.log2(n) / n),
  logs: (n) => Math.log10(Math.log2(10)),
  "2n1": () => Math.log10(2),
  "4n": (n) => n * Math.log10(2),
  nn1000: (n) => Math.log10(n / (n + 1000)),
  osc: (n) => (n % 2 === 0 ? 0.5 : -0.5) * Math.log10(n),
};
for (const P of A.PAIRS) {
  // поведение на log10(f/g) при n = 1e6 и 1e6+1 и при 1e12 (растеж/спад/константа)
  const a = L[P.id](1e6), b = L[P.id](1e12), a2 = L[P.id](1e6 + 1);
  const toInf = b > a + 1 && a2 > a - 1e9 && Math.min(a, a2) > 0.5;          // → ∞
  const toZero = b < a - 1 && Math.max(a, a2) < -0.5;                         // → 0
  const konst = Math.abs(b - a) < 0.01 && Math.abs(a2 - a) < 0.01;            // → константа > 0
  const osc = Math.abs(a2 - a) > 1;                                           // осцилира неограничено
  const truth = osc ? { O: 0, Om: 0, Th: 0, o: 0, om: 0 }
    : toZero ? { O: 1, Om: 0, Th: 0, o: 1, om: 0 }
    : toInf ? { O: 0, Om: 1, Th: 0, o: 0, om: 1 }
    : konst ? { O: 1, Om: 1, Th: 1, o: 0, om: 0 } : null;
  if (!truth) { bad++; console.error("  ✗ неопределено", P.id); continue; }
  for (const k of ["O", "Om", "Th", "o", "om"]) eq(`${P.id}.${k}`, !!P.truth[k], !!truth[k]);
  // предложените константи работят за верните O/Ω/Θ числено
  if (P.truth.Th) eq(`${P.id} Θ c1,c2,n0`, A.check(P, "Th", 0, P.c1, P.c2, P.n0, P.N).length, 0);
  if (P.truth.O && !P.truth.Th) eq(`${P.id} O c,n0`, A.check(P, "O", P.c, 0, 0, P.n0, P.N).length, 0);
  if (P.truth.Om && !P.truth.Th) eq(`${P.id} Ω c,n0`, A.check(P, "Om", P.c, 0, 0, P.n0, P.N).length, 0);
}
// конкретни числа от текста
const Pq = A.PAIRS.find((p) => p.id === "quad");
eq("3n²+5n+7: n₀ при c₁=3,c₂=4", A.minN0(Pq, "Th", 0, 3, 4, 40), 7);
eq("3n²+5n+7: n₀ при c₂=10", A.minN0(Pq, "Th", 0, 3, 10, 40), 2);
const P100 = A.PAIRS.find((p) => p.id === "100n");
eq("100n ≤ n²: n₀", A.minN0(P100, "O", 1, 0, 0, 300), 100);
const Pn = A.PAIRS.find((p) => p.id === "nn1000");
eq("n ≥ 0.5(n+1000): n₀", A.minN0(Pn, "Om", 0.5, 0, 0, 5000), 1000);
console.log(`ch03_asym: ${ok} съвпадения, ${bad} разлики`);
if (bad) process.exitCode = 1;
