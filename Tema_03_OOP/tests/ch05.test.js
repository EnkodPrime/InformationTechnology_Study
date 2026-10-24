const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_abstract.js", "05_abstract.cpp");
const A = t.ch.algos;
const SC = ["R 3 4", "R 3 4; T 3 4; Q 2", "Q 5; T 1 1", "T 6 2; R 0.5 4"];
SC.forEach((s, i) => { const r = A.shapes({ script: s }); t.eq("shapes" + i, r.result, t.get("shapes" + i)); t.checkTags("ch05_shapes", r.frames); });
t.eq("manual", A.shapes({ script: "R 3 4" }).total, t.get("manual"));
let r = A.del({ mode: "virtual" }); t.eq("delete_virtual", r.result, t.get("delete_virtual")); t.checkTags("ch05_delete", r.frames);
r = A.del({ mode: "protected" }); t.eq("delete_protected", r.result, t.get("delete_protected")); t.checkTags("ch05_delete", r.frames);
r = A.del({ mode: "ub" }); t.checkTags("ch05_delete", r.frames);
t.eq("abstract", "1 0 1 1", t.get("abstract"));
let threw = false; try { A.shapes({ script: "Q 2 3" }); } catch (e) { threw = true; } t.eq("bad square throws", threw, true);
/* кадрите носят натрупаната следа като списък (draw() рисува ленти от нея) */
for (const k in A) { try { const rr = A[k]({ prog: "d1", where: "1", script: k === "shapes" ? "R 3 4" : "a(3); b = a", virt: false, mode: "virtual", seq: "T2" }); if (rr && rr.frames && rr.frames.some((f) => "ev" in f)) t.eq(k + ": ev е списък", rr.frames.every((f) => Array.isArray(f.ev)), true); } catch (e) { /* алгоритъм с други входове */ } }
t.done();
