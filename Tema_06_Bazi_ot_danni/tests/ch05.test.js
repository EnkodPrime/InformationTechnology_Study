const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_fd.js", "05_fd.c");
const fs = require("fs"), vm = require("vm");
vm.runInContext(fs.readFileSync(__dirname + "/../js/t06_fd.js", "utf8"), t.ctx);
const A = t.ch.algos;
const P = {
  ENR: ["StudentID StudentName CourseID CourseName Grade", "StudentID->StudentName; CourseID->CourseName; StudentID,CourseID->Grade"],
  SCT: ["Student Course Teacher", "Student,Course->Teacher; Teacher->Course"],
  ABC: ["A B C", "A->B; B->C"],
  PER: ["NationalID Country DocumentNo Name", "NationalID->Country,DocumentNo,Name; Country,DocumentNo->NationalID"],
  BIG: ["A B C D E F", "A,B->C; C->D; D->A; E->F; B,D->E"],
};
const cl = [["cl1", "ABC", "A"], ["cl2", "ABC", "B"], ["cl3", "ENR", "StudentID"], ["cl4", "ENR", "StudentID,CourseID"], ["cl5", "SCT", "Student,Teacher"], ["cl6", "SCT", "Teacher"], ["cl7", "BIG", "A,B"], ["cl8", "BIG", "B,C"], ["cl9", "PER", "Country,DocumentNo"]];
for (const [k, p, x] of cl) {
  const r = A.closure({ attrs: P[p][0], fds: P[p][1], x });
  t.eq(k, r.result, t.get(k)); t.eq(k + " passes", r.passes, t.get(k + " passes")); t.eq(k + " checks", r.checks, t.get(k + " checks"));
  t.checkTags("ch05_closure", r.frames);
}
const ks = [["k1", P.ABC], ["k2", P.ENR], ["k3", P.SCT], ["k4", P.PER], ["k5", P.BIG], ["k6", ["A B C D", ""]]];
for (const [k, [attrs, fds]] of ks) {
  const r = A.keys({ attrs, fds });
  t.eq(k, r.result, t.get(k)); t.eq(k + " closures", r.closures, t.get(k + " closures"));
  t.checkTags("ch05_keys", r.frames);
}
const rows = "StudentID StudentName CourseID CourseName Grade|1 Ana C1 Bazi 6|1 Ana C2 Algo 5|2 Boris C1 Bazi 4|3 Ana C2 Algo 3";
const hs = [["h1", "StudentID", "StudentName"], ["h2", "StudentName", "StudentID"], ["h3", "CourseName", "CourseID"], ["h4", "CourseID", "Grade"]];
for (const [k, x, y] of hs) {
  const r = A.holds({ rows, x, y });
  t.eq(k, `${r.ok} ${r.pi} ${r.pj}`, t.get(k)); t.checkTags("ch05_holds", r.frames);
}
let threw = 0; try { A.closure({ attrs: "A B", fds: "A->Z", x: "A" }); } catch (e) { threw = 1; } t.eq("unknown attr throws", threw, 1);
t.done();
