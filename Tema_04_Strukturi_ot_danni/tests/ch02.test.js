const t = require("../../tools/harness.js")(__dirname + "/..", "ch02_stack.js", "02_stack.c");
const A = t.ch.algos;
const D = { dyn1: ["push 4, push 7, push 2, top, pop, pop", 1], dyn2: ["push 1, push 2, push 3, push 4, push 5, push 6, push 7, push 8, push 9", 1], dyn3: ["pop, push 5, pop, pop", 2] };
for (const k in D) {
  const r = A.dyn({ prog: D[k][0], cap0: D[k][1] });
  for (const f of ["out", "size", "cap", "copies", "grows"]) t.eq(`${k} ${f}`, r[f], t.get(`${k} ${f}`));
  t.checkTags("ch02_dyn", r.frames);
}
let r = A.amort({ m: 1000 });
t.eq("dyn1000 copies", r.copies, t.get("dyn1000 copies")); t.eq("dyn1000 grows", r.grows, t.get("dyn1000 grows")); t.checkTags("ch02_dyn", r.frames);
for (const s of ["([])", "([)]", "(()", "())", "{[()()]}", "", "a(b[c]d)e"]) { r = A.brackets({ s }); t.eq(`br(${s})`, r.result, t.get(`br(${s})`)); t.checkTags("ch02_brackets", r.frames); }
for (const e of ["3 4 + 2 *", "5 1 2 + 4 * + 3 -", "2 3 4 * +", "1 +", "1 2", "8 0 /", "9 3 - 2 /"]) { r = A.postfix({ expr: e }); t.eq(`pf(${e})`, r.result, t.get(`pf(${e})`)); t.checkTags("ch02_postfix", r.frames); }
let threw = 0; try { A.postfix({ expr: "3 x +" }); } catch (e) { threw = 1; } t.eq("bad token", threw, 1);
t.done();
