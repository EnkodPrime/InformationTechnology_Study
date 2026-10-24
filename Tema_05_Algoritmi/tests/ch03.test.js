const t = require("./harness")("ch03_complexity.js", "03_complexity.c");
const A = t.ch.algos;
const names = { single: "single", nested: "nested", tri: "triangle", double: "doubling", rec: "rec" };
const keys = { single: "ch03_single", nested: "ch03_nested", tri: "ch03_tri", double: "ch03_double", rec: "ch03_rec" };
for (const n of [0, 1, 2, 5, 8, 10, 13, 16, 31, 60])
  for (const k in names) { const r = A.frag({ frag: k, n }); t.eq(`${names[k]}(${n})`, r.result, t.get(`${names[k]}(${n})`)); t.checkTags(keys[k], r.frames); }
// формулите от текста
for (const n of [1, 5, 13, 60]) { t.eq(`tri formula ${n}`, A.frag({ frag: "tri", n }).result, n * (n + 1) / 2); t.eq(`dbl formula ${n}`, A.frag({ frag: "double", n }).result, Math.floor(Math.log2(n)) + 1); }
for (const n of [2, 8, 16]) t.eq(`rec formula ${n}`, A.frag({ frag: "rec", n }).result, n * Math.log2(n));
for (const [key, pos] of [[10, 0], [50, 4], [200, 19], [7, -1]]) { const r = A.lsearch({ n: 20, pos }); t.eq(`lsearch(${key})`, `${r.result} ${r.cmp}`, t.get(`lsearch(${key})`)); t.checkTags("ch03_lsearch", r.frames); }
for (const [c1, c2] of [[3, 4], [2, 5], [3, 3.5], [1, 10], [4, 5], [3, 3]]) { const r = A.theta({ c1, c2, nmax: 40 }); t.eq(`min_n0(${c1},${c2})`, r.result, t.get(`min_n0(${c1},${c2})`)); t.checkTags("ch03_theta", r.frames); }
for (const W of [1, 2, 1000, 1024, 1000000, 1099511627776]) t.eq(`bits(${W})`, A.bits({ W }), t.get(`bits(${W})`));
t.done();
