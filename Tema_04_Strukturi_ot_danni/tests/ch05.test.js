const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_tree.js", "05_tree.c");
const A = t.ch.algos;
const T = { t1: "4 2 6 1 3", t2: "1 2 3 4 5 6 7", t3: "1 2 3 - - 4 5", t4: "1 2 3 4 5 6", t5: "1 - 2 - 3 - 4", t6: "-", t7: "8 3 10 1 6 - 14 - - 4 7 13" };
const KEY = { "ch05_pre": "pre", "ch05_in": "in", "ch05_post": "post", "ch05_level": "level" };
for (const k in T) {
  for (const reg in KEY) { const r = A.traverse({ spec: T[k], kind: KEY[reg] }); t.eq(`${k} ${KEY[reg]}`, r.result, t.get(`${k} ${KEY[reg]}`)); t.checkTags(reg, r.frames); }
  const hh = A.height({ spec: T[k] }); t.eq(`${k} height`, hh.height, t.get(`${k} height`)); t.eq(`${k} n`, hh.n, t.get(`${k} n`)); t.checkTags("ch05_height", hh.frames);
  const s = A.shape({ spec: T[k] });
  for (const f of ["full", "complete", "perfect"]) t.eq(`${k} ${f}`, s[f], t.get(`${k} ${f}`));
  t.checkTags("ch05_shape", s.frames);
}
for (const [k, e] of [["ex2", "2 3 + 4 *"], ["ex3", "5 1 2 + 4 * + 3 -"], ["ex4", "1 +"]]) { const r = A.expr({ postfix: e }); t.eq(k, r.result, t.get(k)); t.checkTags("ch05_expr", r.frames); if (r.result !== "E") { t.eq(k + " prefix", r.prefix, t.get(k + " prefix")); t.eq(k + " infix", r.infix, t.get(k + " infix")); } }
const r1 = A.expr({ postfix: "a b + c *" }); t.eq("ex1 prefix", r1.prefix, t.get("ex1 prefix")); t.eq("ex1 infix", r1.infix, t.get("ex1 infix")); t.eq("ex1 (a=2,b=3,c=4)", r1.result, 20);
t.eq("arr holes chain", A.asArray({ spec: "1 - 2 - 3 - 4", pick: 0 }).holes, 11);
t.eq("arr holes complete", A.asArray({ spec: "1 2 3 4 5 6", pick: 0 }).holes, 0);
t.done();
