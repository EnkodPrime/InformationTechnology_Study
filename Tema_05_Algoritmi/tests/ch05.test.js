const t = require("./harness")("ch05_recursion.js", "05_recursion.c");
const A = t.ch.algos;
let r;
for (const n of [0, 1, 4, 10, 20]) {
  r = A.fact({ n, iter: false });
  t.eq(`fact(${n})`, r.result, t.get(`fact(${n})`));
  t.eq(`fact(${n}) calls`, r.calls, t.get(`fact(${n}) calls`));
  t.checkTags("ch05_fact_rec", r.frames);
  r = A.fact({ n, iter: true });
  t.eq(`fact_iter(${n})`, r.result, t.get(`fact_iter(${n})`));
  t.checkTags("ch05_fact_iter", r.frames);
}
for (const n of [0, 6, 8]) {
  r = A.bad_base({ variant: "dfact_bad", n, limit: 40 });
  t.eq(`dfact_bad(${n})`, r.result, t.get(`dfact_bad(${n})`));
  t.eq(`dfact_bad(${n}) calls`, r.calls, t.get(`dfact_bad(${n}) calls`));
  t.checkTags("ch05_dfact_bad", r.frames);
}
for (const n of [1, 7, 9]) {
  r = A.bad_base({ variant: "dfact_ok", n, limit: 40 });
  t.eq(`dfact_ok(${n})`, r.result, t.get(`dfact_ok(${n})`));
  t.eq(`dfact_ok(${n}) calls`, r.calls, t.get(`dfact_ok(${n}) calls`));
  t.checkTags("ch05_dfact_ok", r.frames);
}
r = A.bad_base({ variant: "dfact_bad", n: 7, limit: 40 });
t.eq("dfact_bad(7) overflow", r.overflow, true);
t.eq("dfact_bad(7) stop depth", r.stopDepth, t.get("dfact_bad(7) stop depth"));
t.checkTags("ch05_dfact_bad", r.frames);
r = A.bad_base({ variant: "dfact_bad", n: 8, limit: 40 });
t.eq("dfact_bad(8) stop depth", r.stopDepth, t.get("dfact_bad(8) stop depth"));
r = A.bad_base({ variant: "fact", n: -3, limit: 40 });
t.eq("fact(-3) stop depth", r.stopDepth, t.get("fact(-3) stop depth"));
t.checkTags("ch05_fact_rec", r.frames);
for (const [x, n] of [[2, 10], [3, 13], [2, 16], [-3, 7], [5, 24], [7, 0]]) {
  for (const v of ["pow_lin", "pow_twice", "pow_fast"]) {
    r = A.pow_tree({ variant: v, x, n });
    t.eq(`${v}(${x},${n})`, r.result, t.get(`${v}(${x},${n})`));
    t.eq(`${v}(${x},${n}) calls`, r.calls, t.get(`${v}(${x},${n}) calls`));
    t.eq(`${v}(${x},${n}) pow_calls`, A.pow_calls(v, n), t.get(`${v}(${x},${n}) calls`));
    t.checkTags("ch05_" + v, r.frames);
  }
}
let threw = 0;
for (const bad of [{ n: -1 }, { n: 21 }, { n: "x" }]) { try { A.fact(bad); } catch (e) { threw++; } }
t.eq("невалидни входове хвърлят", threw, 3);
t.done();
