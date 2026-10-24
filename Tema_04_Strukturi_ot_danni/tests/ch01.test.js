const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_adt.js", "01_adt.c");
const A = t.ch.algos;
const P = { adt1: ["push 4, push 7, push 2, top, pop, pop, empty", 4], adt2: ["push 1, push 2, push 3, push 4, push 5, pop, empty", 3], adt3: ["pop, top, empty, push 9, top, empty", 2] };
for (const k in P) for (const impl of ["array", "list"]) {
  const r = A.adt({ prog: P[k][0], cap: P[k][1], impl });
  t.eq(`${k} array`, r.outA, t.get(`${k} array`));
  t.eq(`${k} list`, r.outL, t.get(`${k} list`));
  t.checkTags(impl === "list" ? "ch01_list" : "ch01_array", r.frames);
  t.checkTags("ch01_contract", r.frames.map((f) => ({ at: f.cAt })));
}
let threw = 0; try { A.adt({ prog: "push x", cap: 2, impl: "array" }); } catch (e) { threw = 1; } t.eq("bad input", threw, 1);
t.done();
