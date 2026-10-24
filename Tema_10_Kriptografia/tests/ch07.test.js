const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_chestoti.js", "07_freq_otp.c");
const T10 = require("./_alpha.js")(t);
const A = t.ch.algos;
for (const [nm, al, txt, key] of [["EN", "lat", T10.TEXTS.EN_SAMPLE, "QWERTYUIOPASDFGHJKLZXCVBNM"], ["BG", "bg", T10.TEXTS.BG_SAMPLE, "ЯВЕРТЪУИОПЮЩШАСДФГХЙКЛЗЬЦЖБНМЧ"]]) {
  const a2 = T10.get(al);
  t.eq(`langord(${nm})`, T10.decode(a2, A.langOrder(a2)), t.get(`langord(${nm})`));
  const r = A.freq({ alpha: al, text: txt, key });
  t.eq(`freqguess(${nm})`, r.d, t.get(`freqguess(${nm})`)); t.eq(`freqright(${nm})`, r.right, t.get(`freqright(${nm})`)); t.checkTags("ch07_rank", r.frames);
}
const hex = (b) => parseInt(b, 2).toString(16).toUpperCase();
let r = A.xor({ m1: "1100", k: "1010", mode: "otp" });
t.eq("c1", hex(r.result), t.get("c1")); t.eq("otp back", r.back, "1100"); t.checkTags("ch07_otp", r.frames);
r = A.xor({ m1: "0011", k: "1010", mode: "otp" }); t.eq("c2", hex(r.result), t.get("c2"));
r = A.xor({ m1: "1100", m2: "0011", k: "1010", mode: "reuse" });
t.eq("c1^c2", hex(r.result), t.get("c1^c2")); t.eq("m1^m2", hex(r.mm), t.get("m1^m2")); t.checkTags("ch07_otp", r.frames);
// изменение: 'A' ⊕ Δ('A'^'R') = 'R'
r = A.xor({ m1: "01000001", k: "11010110", m2: ("A".charCodeAt(0) ^ "R".charCodeAt(0)).toString(2).padStart(8, "0"), mode: "flip" });
t.eq("otpFlip first byte", String.fromCharCode(parseInt(r.result, 2)), t.get("otpFlip")[0]); t.checkTags("ch07_otp", r.frames);
t.done();
