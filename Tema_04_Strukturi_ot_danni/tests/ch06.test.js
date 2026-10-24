const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_bst.js", "06_bst.c");
const A = t.ch.algos;
const B = { b1: "ins 4 2 6 1 3, find 3, find 5", b2: "ins 1 2 3 4 5 6 7, find 7", b3: "ins 4 2 6 1 3 5 7, find 7", b4: "ins 50 30 70 20 40 60 80, del 20, del 30, del 50", b5: "ins 8 3 10 1 6 14 4 7 13, del 3, del 8, min, max, ins 6", b6: "del 1, min, ins 5, del 5, find 5", b7: "ins 5 3 8 4, del 5, del 3, del 99" };
for (const k in B) { const r = A.bst({ prog: B[k] }); for (const f of ["out", "in", "pre", "height", "cmp"]) t.eq(`${k} ${f}`, r[f], t.get(`${k} ${f}`)); t.checkTags("ch06_bst", r.frames); }
let s = A.shapes({ keys: "1 2 3 4 5 6 7", find: 7 }); t.eq("chain h", s.hA, 6); t.eq("bal h", s.hB, 2); t.eq("chain visits", s.vA, 7); t.eq("bal visits", s.vB, 3);
let threw = 0; try { A.bst({ prog: "ins" }); } catch (e) { threw = 1; } t.eq("bad", threw, 1);
t.done();
