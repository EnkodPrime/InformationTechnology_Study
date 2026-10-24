const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_transpozicia.js", "04_transposition.c");
require("./_alpha.js")(t);
const A = t.ch.algos;
const K = (s) => s.split("").join(" ");
const cases = [["ATTACKATDAWN", "lat", "ATTACKATDAWN", "3142"], ["ATTACK", "lat", "ATTACK", "123"], ["WEAREDISCOVERED", "lat", "WEAREDISCOVERED", "3142"], ["BG", "bg", "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", "25314"]];
for (const [nm, al, txt, key] of cases) {
  const e = A.columnar({ alpha: al, text: txt, key: K(key), mode: "enc", pad: false });
  t.eq(`col(${nm})`, e.result, t.get(`col(${nm})`)); t.checkTags("ch04_col_enc", e.frames);
  const d = A.columnar({ alpha: al, text: e.result, key: K(key), mode: "dec" });
  t.eq(`coldec(${nm})`, d.result, t.get(`coldec(${nm})`)); t.checkTags("ch04_col_dec", d.frames);
}
let e = A.columnar({ alpha: "lat", text: "WEAREDISCOVERED", key: "3 1 4 2", mode: "enc", pad: true });
t.eq("colpad", e.result, t.get("colpad(WEAREDISCOVERED)"));
t.eq("coldecpad", A.columnar({ alpha: "lat", text: e.result, key: "3 1 4 2", mode: "dec" }).result, t.get("coldecpad(WEAREDISCOVERED)"));
const db = A.double({ alpha: "lat", text: "ATTACKATDAWN", key1: "3 1 4 2", key2: "3 1 2" });
t.eq("double", db.result, t.get("double(ATTACKATDAWN)")); t.eq("doubledec", db.back, t.get("doubledec(ATTACKATDAWN)")); t.checkTags("ch04_col_enc", db.frames);
for (const [nm, al, txt, r] of [["ATTACKATDAWN", "lat", "ATTACKATDAWN", 3], ["ATTACKATDAWN", "lat", "ATTACKATDAWN", 2], ["WEAREDISCOVERED", "lat", "WEAREDISCOVERED", 4], ["BG", "bg", "ЩЕ СЕ СРЕЩНЕМ ПРИ МОСТА", 3]]) {
  const x = A.rail({ alpha: al, text: txt, rails: r, mode: "enc" });
  t.eq(`rail${r}(${nm})`, x.result, t.get(`rail${r}(${nm})`)); t.checkTags("ch04_rail", x.frames);
  const y = A.rail({ alpha: al, text: x.result, rails: r, mode: "dec" });
  t.eq(`raildec${r}(${nm})`, y.result, t.get(`raildec${r}(${nm})`)); t.checkTags("ch04_rail", y.frames);
}
for (const nm of ["ATTACKATDAWN", "WEAREDISCOVERED"]) {
  const x = A.route({ alpha: "lat", text: nm, w: 4, mode: "enc" });
  t.eq(`route4(${nm})`, x.result, t.get(`route4(${nm})`)); t.checkTags("ch04_route", x.frames);
  const y = A.route({ alpha: "lat", text: x.result, w: 4, mode: "dec" });
  t.eq(`routedec4(${nm})`, y.result, t.get(`routedec4(${nm})`)); t.checkTags("ch04_route", y.frames);
}
// невалиден ключ
let thrown = false; try { A.columnar({ alpha: "lat", text: "ABC", key: "1 1 2", mode: "enc" }); } catch (err) { thrown = true; }
t.eq("bad key throws", thrown, true);
t.done();
