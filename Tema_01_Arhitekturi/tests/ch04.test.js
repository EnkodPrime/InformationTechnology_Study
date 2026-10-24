const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_isa.js", "04_isa.c");
const A = t.ch.algos, P = A.PROGS;
const map = { isa_sum: "sum", isa_modes: "modes", isa_lms: "lms", isa_array: "array", isa_max: "max", isa_r0: "r0", isa_bad: "bad" };
for (const k in map) {
  const r = A.run_isa({ prog: P[map[k]].prog.replace(/\n/g, " | "), mem: P[map[k]].mem });
  t.eq(k, r.result, t.get(k));
  t.checkTags("ch04_cpu", r.frames);
}
// безкраен цикъл: JS спира при 300 инструкции, без да гърми
const inf = A.run_isa({ prog: "top: JMP top", mem: "" });
t.eq("безкраен цикъл спира", inf.steps, 300);
t.eq("C: безкраен цикъл", t.get("isa_inf").split(" ")[0], "1");
for (const bad of ["ADD R1, R2", "LOAD R1, 5", "JMP nowhere", "FOO R1", "LI R9, #1"]) {
  let e = ""; try { A.run_isa({ prog: bad, mem: "" }); } catch (x) { e = x.message; } t.eq("грешка: " + bad, e.length > 0, true);
}
t.done();
