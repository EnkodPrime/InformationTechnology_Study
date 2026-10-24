/* същата визуализация в режим „C“ — сверка с 04_vtable.c (ръчна виртуална таблица) */
const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_virtual.js", "04_vtable.c");
const A = t.ch.algos;
for (const q of ["TPS", "PPTS", "STTP", "T"]) for (const m of [0, 1]) {
  const r = A.dispatch({ seq: q, method: String(m), lang: "c" });
  t.eq(`C poll(${q},${m})`, r.result, t.get(`poll(${q},${m})`)); t.checkTags("ch04_cvtable", r.frames);
}
t.done();
