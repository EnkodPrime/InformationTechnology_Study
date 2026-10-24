const t = require("../../tools/harness.js")(__dirname + "/..", "ch02_procesi.js", "02_procesi.c");
const A = t.ch.algos;
for (const [nm, n, script] of [["s1", 3, "t w t d1 x t x x"], ["s2", 2, "w d1 w d2 x x"], ["s3", 3, "w w w d2 d1"], ["s4", 2, "x x t"], ["s5", 1, "t t w d1 x"]]) {
  const r = A.proc({ n, script });
  t.eq(nm + ".kernel", r.kernel, t.get(nm + ".kernel"));
  t.eq(nm + ".ctx", r.ctx, t.get(nm + ".ctx"));
  t.eq(nm + ".bad", r.bad, t.get(nm + ".bad"));
  t.eq(nm + ".states", r.states, t.get(nm + ".states"));
  t.eq(nm + ".running", r.running, t.get(nm + ".running"));
  t.checkTags("s02_states", r.frames);
}
t.done();
