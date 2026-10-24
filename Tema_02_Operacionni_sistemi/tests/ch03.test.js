const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_planirane.js", "03_planirane.c");
const A = t.ch.algos;
const cases = [["m.fcfs", "0:8:1 0:4:1 0:2:1", "fcfs", 2], ["m.sjf", "0:8:1 0:4:1 0:2:1", "sjf", 2], ["m.rr2", "0:8:1 0:4:1 0:2:1", "rr", 2], ["g.rr", "0:2:1 5:3:1", "rr", 1]];
for (const p of ["fcfs", "sjf", "srtf", "rr", "prio", "pprio"]) cases.push(["x." + p, "0:7:3 2:4:1 4:1:4 5:4:2", p, 3]);
for (const [nm, jobs, policy, q] of cases) {
  const r = A.sched({ jobs, policy, q });
  t.eq(nm + ".gantt", r.gantt, t.get(nm + ".gantt"));
  for (const k of ["wait", "tat", "resp", "switches"]) t.eq(nm + "." + k, r[k], t.get(nm + "." + k));
  t.checkTags("s03_sched", r.frames);
}
// примерът от ръководството: 20/3 и 8/3
t.eq("manual FCFS avg", A.sched({ jobs: "0:8 0:4 0:2", policy: "fcfs", q: 2 }).wait, 20);
t.eq("manual SJF avg", A.sched({ jobs: "0:8 0:4 0:2", policy: "sjf", q: 2 }).wait, 8);
t.done();
