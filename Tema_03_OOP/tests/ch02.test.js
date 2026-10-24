const t = require("../../tools/harness.js")(__dirname + "/..", "ch02_life.js", "02_lifecycle.cpp");
const A = t.ch.algos;
let r = A.order({ prog: "d1" }); t.eq("order1", r.result, t.get("order1")); t.checkTags("ch02_order", r.frames);
r = A.order({ prog: "d2" }); t.eq("order2", r.result, t.get("order2")); t.checkTags("ch02_order2", r.frames);
for (const w of [0, 1, 2]) { r = A.raii({ where: String(w) }); t.eq("raii" + w, r.result, t.get("raii" + w)); t.checkTags("ch02_raii", r.frames); }
const FIVE = { five1: "a(3); b = a; c = move(a); b = c; c = move(b)", five2: "a(2); b(4); a = b; b = move(a)", five3: "a(3); b = move(a); c = b" };
for (const k in FIVE) { r = A.five({ script: FIVE[k] }); t.eq(k, r.result, t.get(k)); t.checkTags("ch02_five", r.frames); t.eq(k + " no leak", r.frames[r.frames.length - 1].inv.ok, true); }
const SH = { shallow1: "a(3); b = a", shallow2: "a(3); b(2); c = a" };
for (const k in SH) { r = A.shallow({ script: SH[k] }); t.eq(k, r.result, t.get(k)); t.checkTags("ch02_shallow", r.frames); }
let threw = false; try { A.five({ script: "a(3); b = x" }); } catch (e) { threw = true; } t.eq("undeclared throws", threw, true);
/* кадрите носят натрупаната следа като списък (draw() рисува ленти от нея) */
for (const k in A) { try { const rr = A[k]({ prog: "d1", where: "1", script: k === "shapes" ? "R 3 4" : "a(3); b = a", virt: false, mode: "virtual", seq: "T2" }); if (rr && rr.frames && rr.frames.some((f) => "ev" in f)) t.eq(k + ": ev е списък", rr.frames.every((f) => Array.isArray(f.ev)), true); } catch (e) { /* алгоритъм с други входове */ } }
t.done();
