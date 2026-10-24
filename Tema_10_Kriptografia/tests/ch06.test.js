const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_vizhener.js", "06_vigenere.c");
const T10 = require("./_alpha.js")(t);
const A = t.ch.algos;
const cases = [["ATTACKATDAWN", "lat", "ATTACKATDAWN", "LEMON", 0], ["EN", "lat", T10.TEXTS.EN_SAMPLE, "LEMON", 1], ["EN7", "lat", T10.TEXTS.EN_SAMPLE, "FIRMWARE", 1], ["BG", "bg", T10.TEXTS.BG_SAMPLE, "КЛЮЧ", 1]];
for (const [nm, al, txt, key, an] of cases) {
  const e = A.vig({ alpha: al, text: nm === "ATTACKATDAWN" ? txt : txt.slice(0, 40), key, mode: "enc" });
  t.checkTags("ch06_vig", e.frames);
  // пълният текст е над 40 букви за стъпковия режим — сверяваме началото
  const full = t.get(`vig(${nm})`);
  t.eq(`vig(${nm}) начало`, e.result, full.slice(0, e.result.length));
  const d = A.vig({ alpha: al, text: e.result, key, mode: "dec" });
  t.eq(`vigdec(${nm}) начало`, d.result, t.get(`vigdec(${nm})`).slice(0, d.result.length)); t.checkTags("ch06_vig", d.frames);
  if (!an) continue;
  const k = A.kasiski({ alpha: al, text: txt, key });
  t.eq(`kasN(${nm})`, k.n, t.get(`kasN(${nm})`));
  t.eq(`kas(${nm})`, k.dist.slice(0, 12).join(" "), t.get(`kas(${nm})`));
  t.eq(`votes(${nm})`, Array.from({ length: 11 }, (_, q) => k.votes[q + 2]).join(" "), t.get(`votes(${nm})`));
  t.checkTags("ch06_kasiski", k.frames);
  const ic = A.ic({ alpha: al, text: txt, key });
  t.eq(`ic(${nm})`, ic.vals.slice(0, 10).map((v) => v.toFixed(4)).join(" "), t.get(`ic(${nm})`)); t.checkTags("ch06_ic", ic.frames);
  const cr = A.crack({ alpha: al, text: txt, key, L: T10.encode(T10.get(al), key).length });
  t.eq(`crack(${nm})`, cr.key, t.get(`crack(${nm})`)); t.checkTags("ch06_crack", cr.frames);
}
t.done();
