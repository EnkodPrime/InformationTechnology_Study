const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_list.js", "04_list.c");
const A = t.ch.algos;
const P = [
  "pushb 4, pushb 7, pushb 2, ins 7 5, find 2, del 4",
  "pushf 3, pushf 2, pushf 1, pushb 9, del 9, del 1, find 3",
  "del 5, find 1, pushb 1, del 1, ins 1 2, pushf 8",
  "pushb 1, pushb 2, pushb 3, pushb 4, pushb 5, ins 5 6, ins 1 0, del 3, find 6",
];
P.forEach((prog, i) => {
  let r = A.list({ prog, mode: "single" });
  for (const f of ["out", "list", "cmp", "hops"]) t.eq(`s${i + 1} ${f}`, r[f], t.get(`s${i + 1} ${f}`));
  t.checkTags("ch04_single", r.frames);
  r = A.list({ prog, mode: "double" });
  for (const f of ["out", "list", "back", "cmp", "hops"]) t.eq(`d${i + 1} ${f}`, r[f], t.get(`d${i + 1} ${f}`));
  t.checkTags("ch04_double", r.frames);
});
const w = A.wrong({ vals: "1 2 3 4", after: 2, x: 9 }); t.checkTags("ch04_wrong", w.frames);
t.done();
