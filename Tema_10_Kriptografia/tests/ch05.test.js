const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_cezar.js", "05_caesar_affine.c");
const T10 = require("./_alpha.js")(t);
const A = t.ch.algos;
for (const [nm, al, txt, k] of [["ATTACK", "lat", "ATTACK", 3], ["XYZ", "lat", "XYZ", 3], ["ATTACKATDAWN", "lat", "ATTACKATDAWN", 25], ["BG", "bg", "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", 3], ["BGYA", "bg", "ЮЯ", 3]]) {
  const e = A.caesar({ alpha: al, text: txt, k, mode: "enc" });
  t.eq(`caesar${k}(${nm})`, e.result, t.get(`caesar${k}(${nm})`)); t.checkTags("ch05_caesar", e.frames);
  const d = A.caesar({ alpha: al, text: e.result, k, mode: "dec" });
  t.eq(`caesardec${k}(${nm})`, d.result, t.get(`caesardec${k}(${nm})`)); t.checkTags("ch05_caesar", d.frames);
}
for (const [nm, al, txt, k] of [["EN", "lat", T10.TEXTS.EN_SAMPLE, 7], ["EN", "lat", T10.TEXTS.EN_SAMPLE, 19], ["BG", "bg", T10.TEXTS.BG_SAMPLE, 11], ["SHORT", "lat", "ATTACK", 3]]) {
  const r = A.brute({ alpha: al, text: txt, k });
  t.eq(`brute${k}(${nm})`, r.result, t.get(`brute${k}(${nm})`)); t.checkTags("ch05_brute", r.frames);
  const a2 = T10.get(al), p = T10.encode(a2, txt);
  t.eq(`chi2true${k}(${nm})`, A.chi2(p, a2.m, T10.refFreq(a2)).toFixed(3), t.get(`chi2true${k}(${nm})`));
}
const KEY = "ZEBRASCDFGHIJKLMNOPQTUVWXY";
let e = A.mono({ alpha: "lat", text: "ATTACKATDAWN", key: KEY, mode: "enc" });
t.eq("mono", e.result, t.get("mono(ATTACKATDAWN)")); t.checkTags("ch05_mono", e.frames);
let d = A.mono({ alpha: "lat", text: e.result, key: KEY, mode: "dec" });
t.eq("monodec", d.result, t.get("monodec(ATTACKATDAWN)")); t.checkTags("ch05_mono", d.frames);
let thrown = 0; try { A.mono({ alpha: "lat", text: "A", key: "ZEBRASCDFGHIJKLMNOPQTUVWXZ", mode: "enc" }); } catch (err) { thrown = 1; }
t.eq("monobad", thrown ? 0 : 1, t.get("monobad"));
for (const [nm, al, txt, a, b] of [["C", "lat", "C", 5, 8], ["ATTACKATDAWN", "lat", "ATTACKATDAWN", 5, 8], ["ATTACKATDAWN", "lat", "ATTACKATDAWN", 2, 3], ["BG", "bg", "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", 7, 3], ["BG", "bg", "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", 5, 1]]) {
  const x = A.affine({ alpha: al, text: txt, a, b, mode: "enc" });
  t.eq(`affine${a}_${b}(${nm})`, x.result, t.get(`affine${a}_${b}(${nm})`)); t.checkTags("ch05_affine", x.frames);
  if (x.result === "invalid") continue;
  const y = A.affine({ alpha: al, text: x.result, a, b, mode: "dec" });
  t.eq(`affinedec${a}_${b}(${nm})`, y.result, t.get(`affinedec${a}_${b}(${nm})`)); t.checkTags("ch05_affine", y.frames);
}
t.done();
