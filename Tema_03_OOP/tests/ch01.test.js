const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_model.js", "01_model.cpp");
const A = t.ch.algos;
for (const w of ["P1", "P2", "P3", "P4", "P5", "P6"]) {
  const r = A.layout({ which: w, fields: "", poly: false });
  t.eq(`sizeof(${w})`, r.size, t.get(`sizeof(${w})`));
  if (r.fields.length) t.eq(`off(${w})`, r.fields.map((f) => r.offs[f]).join(" "), t.get(`off(${w})`));
  t.checkTags("ch01_layout", r.frames);
}
let r = A.account({ script: "a.deposit(100); b.deposit(100); a == b; &a == &b; p->withdraw(30); a.withdraw(500); b.deposit(-5)" });
t.eq("acc0", r.result, t.get("acc0")); t.checkTags("ch01_account", r.frames);
r = A.account({ script: "a.deposit(50); p = &b; p->deposit(20); p->withdraw(20); a == b; p == &b" });
t.eq("acc1", r.result, t.get("acc1")); t.checkTags("ch01_account", r.frames);
r = A.account({ script: "a.deposit(10); a.balance = -100; a.get()" }); t.checkTags("ch01_account", r.frames);
r = A.access(); t.eq("access", r.result, t.get("access")); t.checkTags("ch01_access", r.frames);
/* своя структура: същите правила дават същия резултат като вградените */
r = A.layout({ which: "custom", fields: "char, double, int", poly: false }); t.eq("custom==P1", r.size, t.get("sizeof(P1)"));
r = A.layout({ which: "custom", fields: "char, int", poly: true }); t.eq("custom==P4", r.size, t.get("sizeof(P4)"));
let threw = false; try { A.layout({ which: "custom", fields: "char, foo" }); } catch (e) { threw = true; } t.eq("bad type throws", threw, true);
t.done();
