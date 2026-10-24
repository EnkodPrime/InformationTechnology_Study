const t = require("./harness")("ch06_divide.js", "06_divide.c");
const A = t.ch.algos;
let r;
const ms = { ms1: "8 3 6 2", ms2: "5 2 4 7 1 3 2 6", ms3: "9 8 7 6 5 4 3 2 1 0 -1", ms4: "3 3 1 9 12 0 7 7 4 15 2 8 6 11 5 10", ms5: "42" };
for (const k in ms) {
  r = A.merge_sort({ arr: ms[k] });
  t.eq(`${k} sorted`, r.result, t.get(`${k} sorted`));
  t.eq(`${k} cmp`, r.cmp, t.get(`${k} cmp`));
  t.eq(`${k} copy`, r.copy, t.get(`${k} copy`));
  t.checkTags("ch06_merge_sort", r.frames);
}
const bs = "2 5 8 12 16 23 38 56 72 91";
for (const key of [23, 2, 91, 7, 100, 56]) {
  r = A.binary_search({ arr: bs, key, pre: "sort" });
  t.eq(`bs(${key})`, r.result, t.get(`bs(${key})`));
  t.eq(`bs(${key}) cmp`, r.cmp, t.get(`bs(${key}) cmp`));
  t.checkTags("ch06_bsearch", r.frames);
}
r = A.binary_search({ arr: "9 1 7 3 8 2 6", key: 9, pre: "raw" });
t.eq("bs_unsorted(9)", r.result, t.get("bs_unsorted(9)"));
t.eq("bs_unsorted(9) cmp", r.cmp, t.get("bs_unsorted(9) cmp"));
let threw = 0; try { A.binary_search({ arr: "3 1 2", key: 1, pre: "reject" }); } catch (e) { threw = 1; }
t.eq("reject unsorted", threw, 1);
const qs = { qs1: "5 2 4 7 1 3 2 6", qs2: "1 2 3 4 5 6 7 8 9 10 11 12", qs3: "4 4 4 1 4 4 2 4 4 4", qs4: "3 3 1 9 12 0 7 7 4 15 2 8 6 11 5 10" };
for (const k in qs) for (let m = 0; m < 4; m++) {
  r = A.quick_sort({ arr: qs[k], mode: String(m) });
  t.eq(`${k} m${m} sorted`, r.result, t.get(`${k} m${m} sorted`));
  t.eq(`${k} m${m} cmp`, r.cmp, t.get(`${k} m${m} cmp`));
  t.eq(`${k} m${m} swap`, r.swp, t.get(`${k} m${m} swap`));
  t.eq(`${k} m${m} depth`, r.maxd, t.get(`${k} m${m} depth`));
  t.checkTags("ch06_quick_sort", r.frames);
}
// рекурентно дърво: обща работа
for (const n of [1, 2, 16, 64]) {
  t.eq(`ms tree n=${n}`, A.rec_tree({ kind: "ms", n }).total, n * (Math.log2(n) + 1));
  t.eq(`bs tree n=${n}`, A.rec_tree({ kind: "bs", n }).total, Math.log2(n) + 1);
  t.eq(`one tree n=${n}`, A.rec_tree({ kind: "one", n }).total, 2 * n - 1);
}
t.done();
