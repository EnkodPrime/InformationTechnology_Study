const t = require("../../tools/harness.js")(__dirname + "/..", "ch02_relmodel.js", "02_relmodel.c");
const A = t.ch.algos;
const cases = [
  ["t1", "+E 1 C1 5; +E 4 C1 5; +E 2 C2 7; +E 2 C3 5; +S 2 Dimo INF; +S 5 Eli FIZ; +E 3 C2 3", "RESTRICT"],
  ["t2", "-S 1", "RESTRICT"], ["t3", "-S 1", "CASCADE"], ["t4", "-S 1", "SET NULL"],
  ["t5", "-P INF", "RESTRICT"], ["t6", "-P INF", "SET NULL"], ["t7", "-P INF", "CASCADE"],
  ["t8", "-C C2", "CASCADE"], ["t9", "-S 3; -P MAT", "RESTRICT"],
];
for (const [k, script, rule] of cases) {
  const r = A.run_script({ script, rule, base: true });
  const base = "ok ok ok ok ok ok ok ok ok ok ";
  t.eq(k, base + r.result, t.get(k));
  t.eq(k + " counts", r.counts, t.get(k + " counts"));
  t.eq(k + " nullpid", r.nullpid, t.get(k + " nullpid"));
  t.checkTags("ch02_rel", r.frames);
}
let threw = 0; try { A.run_script({ script: "", rule: "RESTRICT" }); } catch (e) { threw = 1; } t.eq("empty script throws", threw, 1);
t.done();
