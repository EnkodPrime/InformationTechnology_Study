const t = require("../../tools/harness.js")(__dirname + "/..", "ch09_tx.js", "09_tx.c");
const A = t.ch.algos;
for (let crash = 0; crash <= 2; crash++) {
  const r = A.transfer({ a: 100, b: 50, amount: 30, crash });
  t.eq(`tr${crash}`, `${r.ok} ${r.bal[0]} ${r.bal[1]} ${r.undone}`, t.get(`tr${crash}`)); t.checkTags("ch09_transfer", r.frames);
}
let r = A.transfer({ a: 20, b: 50, amount: 30, crash: 0 });
t.eq("tr3", `${r.ok} ${r.bal[0]} ${r.bal[1]} ${r.undone}`, t.get("tr3")); t.checkTags("ch09_transfer", r.frames);
const sc = ["R1 R2 W1 W2 C1 C2", "R1 W1 C1 R2 W2 C2", "R1 R2 W2 W1 C2 C1", "R2 R1 W1 C1 W2 C2"];
sc.forEach((s, i) => { for (let m = 0; m < 3; m++) {
  r = A.schedule({ sched: s, x0: 100, d1: 10, d2: 20, mode: m });
  t.eq(`sc${i} m${m}`, `${r.x} ${r.waits}`, t.get(`sc${i} m${m}`)); t.checkTags("ch09_schedule", r.frames);
} });
const keys = "42 7 19 88 3 56 71 25 64 11 90 33 50 15 77 2";
r = A.index({ keys, probe: 0, mode: "insert" }); t.eq("ix moves", r.moves, t.get("ix moves")); t.checkTags("ch09_index", r.frames);
for (const p of [50, 2, 90, 60]) {
  const s = A.index({ keys, probe: p, mode: "scan" }), x = A.index({ keys, probe: p, mode: "index" });
  t.eq(`ix${p}`, `${s.result} ${s.cmp} ${x.found} ${x.cmp}`, t.get(`ix${p}`));
  t.checkTags("ch09_index", s.frames); t.checkTags("ch09_index", x.frames);
}
let threw = 0; try { A.schedule({ sched: "R1 W1 R2 W2 C2", x0: 100, d1: 1, d2: 1, mode: 0 }); } catch (e) { threw = 1; } t.eq("bad schedule throws", threw, 1);
t.done();
