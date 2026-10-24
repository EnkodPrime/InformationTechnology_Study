const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_zamestvane.js", "07_zamestvane.c");
const A = t.ch.algos;
const ops = "+12 +6 +10 +8 -1 -3 +5 +9 +4";
for (const [nm, total, o, policy] of [["first", 40, ops, "first"], ["best", 40, ops, "best"], ["worst", 40, ops, "worst"], ["hole", 10, "+2 +3 +3 +2 -1 -3 +4", "first"]]) {
  const r = A.fit({ total, ops: o, policy });
  for (const k of ["failed", "free", "largest", "holes", "layout"]) t.eq(nm + "." + k, r[k], t.get(nm + "." + k));
  t.checkTags("s07_fit", r.frames);
}
const std = "7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1", bel = "1 2 3 4 1 2 5 1 2 3 4 5";
const cases = [];
for (const p of ["fifo", "lru", "opt", "clock"]) { cases.push(["man." + p, "1 2 3 1 4", 3, p]); cases.push(["std." + p, std, 3, p]); }
cases.push(["belady3", bel, 3, "fifo"], ["belady4", bel, 4, "fifo"], ["lru3", bel, 3, "lru"], ["lru4", bel, 4, "lru"], ["hits.clock", "1 1 1 2 3 4 1 5", 3, "clock"], ["hits.opt", "1 1 1 2 3 4 1 5", 3, "opt"]);
for (const [nm, refs, nf, policy] of cases) {
  const r = A.replace({ refs, nf, policy });
  t.eq(nm + ".faults", r.faults, t.get(nm + ".faults"));
  t.eq(nm + ".victims", r.victims, t.get(nm + ".victims"));
  t.checkTags("s07_replace", r.frames);
}
t.done();
