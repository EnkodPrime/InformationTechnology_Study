const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_nf123.js", "06_nf.c");
const fs = require("fs"), vm = require("vm");
vm.runInContext(fs.readFileSync(__dirname + "/../js/t06_fd.js", "utf8"), t.ctx);
const A = t.ch.algos;
const P = {
  enr: ["StudentID StudentName CourseID CourseName Grade", "StudentID->StudentName; CourseID->CourseName; StudentID,CourseID->Grade"],
  emp: ["EmpID DeptID DeptName", "EmpID->DeptID; DeptID->DeptName"],
  sct: ["Student Course Teacher", "Student,Course->Teacher; Teacher->Course"],
  stu: ["student_id name programme_id programme_name", "student_id->name,programme_id; programme_id->programme_name"],
  ok: ["Student Course Grade", "Student,Course->Grade"],
  big: ["A B C D E F", "A,B->C; C->D; D->A; E->F; B,D->E"],
};
for (const k in P) {
  const r = A.analyze({ attrs: P[k][0], fds: P[k][1] });
  t.eq(k + " level", r.level, t.get(k + " level"));
  t.eq(k + " prime", r.prime, t.get(k + " prime"));
  t.eq(k + " viol", r.viol, t.get(k + " viol"));
  t.checkTags("ch07_analyze", r.frames);
}
for (const mode of ["query", "split"]) t.eq("phones " + mode, A.phones({ mode }).frames.length > 2, true);
t.done();
