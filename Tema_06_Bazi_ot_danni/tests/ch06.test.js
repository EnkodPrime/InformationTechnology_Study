const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_anomalies.js", "06_nf.c");
const fs = require("fs"), vm = require("vm");
vm.runInContext(fs.readFileSync(__dirname + "/../js/t06_fd.js", "utf8"), t.ctx);
const A = t.ch.algos;
const ch = [
  ["ch1", "A B C", "A->B", "A B|B C"], ["ch2", "A B C", "B->C", "A B|B C"],
  ["ch3", "Student Course Teacher", "Student,Course->Teacher; Teacher->Course", "Teacher Course|Student Teacher"],
  ["ch4", "Student Course Teacher", "Student,Course->Teacher; Teacher->Course", "Student Course|Course Teacher"],
  ["ch5", "A B C D E", "A->C; B->C; C->D; D,E->C; C,E->A", "A D|A B|B E|C D E|A E"],
  ["ch6", "EmpID DeptID DeptName", "EmpID->DeptID; DeptID->DeptName", "EmpID DeptName|DeptID DeptName"],
];
for (const [k, attrs, fds, dec] of ch) {
  const r = A.chase({ attrs, fds, dec });
  t.eq(k, r.row, t.get(k)); t.eq(k + " steps", r.steps, t.get(k + " steps")); t.eq(k + " preserved", r.preserved, t.get(k + " preserved"));
  t.checkTags("ch06_chase", r.frames);
}
const sp = [["sp1", "A B C|1 x p|2 x q", "A B", "B C"], ["sp2", "A B C|1 x p|2 x q", "A B", "A C"],
  ["sp3", "A B C|1 x p|2 x p|3 y q|4 y q|5 z r", "A B", "B C"], ["sp4", "A B C|1 x p|2 x p|3 y q|4 y q|5 z r", "A C", "B C"]];
for (const [k, rows, a1, a2] of sp) {
  const r = A.spurious({ rows, a1, a2 });
  t.eq(k, `${r.n} ${r.sp}`, t.get(k)); t.checkTags("ch06_spurious", r.frames);
}
for (const kind of ["update", "insert", "delete"]) for (const design of ["flat", "norm"]) t.eq(`anomaly ${kind} ${design} frames`, A.anomaly({ kind, design }).frames.length > 1, true);
t.done();
