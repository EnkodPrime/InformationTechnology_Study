const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_compare.js", "07_compare.c");
const A = t.ch.algos;
for (const [n, k, x] of [[8, 0, 7], [8, 5, 3], [16, 15, 0], [100, 50, 99], [100, 0, 1000], [1, 0, 0]]) {
  const c = A.counts(n, k, x);
  t.eq(`n${n} k${k} arr get`, c.arrGet, t.get(`n${n} k${k} arr get`));
  t.eq(`n${n} k${k} lst get`, c.lstGet, t.get(`n${n} k${k} lst get`));
  t.eq(`n${n} x${x} arr find`, c.arrFind, t.get(`n${n} x${x} arr find`));
  t.eq(`n${n} x${x} lst find`, c.lstFind, t.get(`n${n} x${x} lst find`));
  t.eq(`n${n} x${x} bal find`, c.balFind, t.get(`n${n} x${x} bal find`));
  t.eq(`n${n} x${x} deg find`, c.degFind, t.get(`n${n} x${x} deg find`));
  t.eq(`n${n} k${k} arr ins`, c.arrIns, t.get(`n${n} k${k} arr ins`));
  t.eq(`n${n} k${k} lst ins`, c.lstIns, t.get(`n${n} k${k} lst ins`));
}
// анимацията брои същите стъпки
const KEY = { array: "ch07_array", list: "ch07_list", bal: "ch07_bst", deg: "ch07_bst" };
for (const [n, k, x] of [[8, 0, 7], [8, 5, 3], [16, 15, 0], [1, 0, 0], [20, 19, -5], [24, 12, 30]]) {
  const c = A.counts(n, k, x);
  const exp = { array: { get: c.arrGet, find: c.arrFind, ins: c.arrIns }, list: { get: c.lstGet, find: c.lstFind, ins: c.lstIns }, bal: { find: c.balFind }, deg: { find: c.degFind } };
  for (const ds in exp) for (const op in exp[ds]) { const r = A.run({ n, k, x, op, ds }); t.eq(`anim ${ds} ${op} n${n}`, r.steps, exp[ds][op]); t.checkTags(KEY[ds], r.frames); }
}
t.done();
