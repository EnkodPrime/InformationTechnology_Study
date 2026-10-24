const t = require("../../tools/harness.js")(__dirname + "/..", "ch08_more.js", "08_storage.cpp");
const A = t.ch.algos;
const r = A.storage();
t.eq("full", r.result, t.get("full"));
t.eq("in_main", r.result.split("|end main")[0] + "|end main", t.get("in_main"));
t.checkTags("ch08_storage", r.frames);
/* кадрите носят натрупаната следа като списък (draw() рисува ленти от нея) */
for (const k in A) { try { const rr = A[k]({ prog: "d1", where: "1", script: k === "shapes" ? "R 3 4" : "a(3); b = a", virt: false, mode: "virtual", seq: "T2" }); if (rr && rr.frames && rr.frames.some((f) => "ev" in f)) t.eq(k + ": ev е списък", rr.frames.every((f) => Array.isArray(f.ev)), true); } catch (e) { /* алгоритъм с други входове */ } }
t.done();
