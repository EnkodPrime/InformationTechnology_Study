const t = require("../../tools/harness.js")(__dirname + "/..", "ch02_ataki.js", "02_known_plain.c");
require("./_alpha.js")(t);
const A = t.ch.algos;
for (const [a, m] of [[5, 26], [2, 26], [7, 30], [9, 26]]) { const r = A.modinv({ a, m }); t.eq(`modinv(${a},${m})`, r.result, t.get(`modinv(${a},${m})`)); t.checkTags("ch02_modinv", r.frames); }
let r = A.affine_kp({ alpha: "lat", p1: "C", c1: "S", p2: "D", c2: "X" });
t.eq("affine(C>S,D>X)", `${r.ok} ${r.a} ${r.b}`, t.get("affine(C>S,D>X)")); t.checkTags("ch02_affine_kp", r.frames);
r = A.affine_kp({ alpha: "lat", p1: "C", c1: "S", p2: "A", c2: "I" });
t.eq("affine(C>S,A>I)", r.ok, t.get("affine(C>S,A>I)")); t.checkTags("ch02_affine_kp", r.frames);
r = A.affine_kp({ alpha: "lat", p1: "N", c1: "H", p2: "A", c2: "I" });
t.eq("affine(N>H,A>I)", r.ok, t.get("affine(N>H,A>I)"));
r = A.affine_kp({ alpha: "bg", p1: "Б", c1: "К", p2: "В", c2: "С" });
t.eq("affine30(1>10,2>17)", `${r.ok} ${r.a} ${r.b}`, t.get("affine30(1>10,2>17)")); t.checkTags("ch02_affine_kp", r.frames);
r = A.vig_kp({ alpha: "lat", p: "ATTACKATDAWN", c: "LXFOPVEFRNHR" });
t.eq("vigks", r.ks, t.get("vigks(ATTACKATDAWN)")); t.eq("period", r.period, t.get("period(ATTACKATDAWN)")); t.checkTags("ch02_vig_kp", r.frames);
r = A.vig_kp({ alpha: "bg", p: "ДОНЕСИКАРТАТА", c: "ОЩЛЮЬУИЧЪЯЮЛК" });
t.eq("vigks bg", r.ks.slice(0, 4), "КЛЮЧ"); t.eq("period bg", r.period, 4);
t.done();
