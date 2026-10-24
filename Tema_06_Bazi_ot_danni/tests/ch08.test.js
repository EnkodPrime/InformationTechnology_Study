const t = require("../../tools/harness.js")(__dirname + "/..", "ch08_bcnf.js", "06_nf.c");
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
  const r = A.bcnf({ attrs: P[k][0], fds: P[k][1] });
  t.eq(k + " bcnf", r.result, t.get(k + " bcnf"));
  t.eq(k + " preserved", r.preserved, t.get(k + " preserved"));
  t.eq(k + " lossless", r.lossless, t.get(k + " lossless"));
  t.checkTags("ch08_bcnf", r.frames);
}
let r = A.preserve({ attrs: P.sct[0], fds: P.sct[1], dec: "Teacher Course|Student Teacher", fd: 1 }); t.eq("sct fd1 not preserved", r.ok, 0); t.checkTags("ch08_preserve", r.frames);
r = A.preserve({ attrs: P.sct[0], fds: P.sct[1], dec: "Teacher Course|Student Teacher", fd: 2 }); t.eq("sct fd2 preserved", r.ok, 1); t.checkTags("ch08_preserve", r.frames);
// сверка с ch3 от C: Teacher Course|Student Teacher запазва 1/2
t.eq("ch3 preserved", "1/2", t.get("ch3 preserved"));
t.eq("violate Petrov conflict", A.violate({ teacher: "Petrov" }).conflict, 1);
t.eq("violate Ivanov no conflict", A.violate({ teacher: "Ivanov" }).conflict, 0);
t.done();
