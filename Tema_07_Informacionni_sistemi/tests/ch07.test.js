const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_proektirane.js", "07_design.c");
const A = t.ch.algos;
const cases = [["race(ABAB,cta)", "101 102", 1, "ABAB", "cta"], ["race(ABAB,atomic)", "101 102", 1, "ABAB", "atomic"], ["race(AABB,cta)", "101 102", 1, "AABB", "cta"],
  ["race(dup,cta)", "101 101", 2, "ABAB", "cta"], ["race(dup,atomic)", "101 101", 2, "ABAB", "atomic"], ["race(3,cta)", "101 102 103", 2, "ABCABC", "cta"], ["race(3,atomic)", "101 102 103", 2, "ABCABC", "atomic"]];
for (const [name, students, free, sched, mode] of cases) {
  const r = A.race({ students, free, sched, mode });
  t.eq(name, `free=${r.free} enrolled=${r.enrolled} res=${r.res}`, t.get(name));
  t.checkTags("ch07_race", r.frames);
}
for (const [name, lost, key] of [["idem(lost1,nokey)", "1 0 0", false], ["idem(lost1,key)", "1 0 0", true], ["idem(lost2,nokey)", "1 1 0", false], ["idem(lost2,key)", "1 1 0", true], ["idem(none,nokey)", "0 0 0", false], ["idem(all,key)", "1 1 1", true], ["idem(all,nokey)", "1 1 1", false]]) {
  const r = A.idem({ lost, use_key: key });
  t.eq(name, `got=${r.got} effects=${r.effects}`, t.get(name));
  t.checkTags("ch07_idem", r.frames);
}
t.done();
