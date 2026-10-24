const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_virtual.js", "04_virtual.cpp");
const A = t.ch.algos;
for (const q of ["TPS", "PPTS", "STTP", "T"]) for (const m of [0, 1, 2]) {
  const r = A.dispatch({ seq: q, method: String(m), lang: "cpp" });
  t.eq(`poll(${q},${m})`, r.result, t.get(`poll(${q},${m})`)); t.checkTags("ch04_dispatch", r.frames);
}
for (const o of ["b", "d", "e", "rbd", "rbe"]) for (const c of ["f()", "f(1)", "g(2.5)", "g(2)", "h()"]) {
  const r = A.names({ obj: o, call: c });
  t.eq(`call(${o},${c})`, r.result, t.get(`call(${o},${c})`)); t.checkTags("ch04_names", r.frames);
}
const r = A.ctor(); t.eq("ctor", r.result, t.get("ctor")); t.checkTags("ch04_ctor", r.frames);
let threw = false; try { A.dispatch({ seq: "TX", method: "0", lang: "cpp" }); } catch (e) { threw = true; } t.eq("bad seq throws", threw, true);
/* кадрите носят натрупаната следа като списък (draw() рисува ленти от нея) */
for (const k in A) { try { const rr = A[k]({ prog: "d1", where: "1", script: k === "shapes" ? "R 3 4" : "a(3); b = a", virt: false, mode: "virtual", seq: "T2" }); if (rr && rr.frames && rr.frames.some((f) => "ev" in f)) t.eq(k + ": ev е списък", rr.frames.every((f) => Array.isArray(f.ev)), true); } catch (e) { /* алгоритъм с други входове */ } }
t.done();
