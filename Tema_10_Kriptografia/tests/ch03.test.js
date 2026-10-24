const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_razbarkvane.js", "03_invariants.c");
require("./_alpha.js")(t);
const A = t.ch.algos;
// преобразуванията в главата дават същите шифротекстове като C примерите
for (const [kind, ct] of [["caesar", "DWWDFN"], ["trans", "AATCTK"], ["vig", "LXFOPV"]]) {
  const p = A.pattern({ alpha: "lat", text: "ATTACK", kind });
  t.eq(`pattern(ATTACK,${ct})`, p.same, t.get(`pattern(ATTACK,${ct})`)); t.checkTags("ch03_pattern", p.frames);
  const c = A.counts({ alpha: "lat", text: "ATTACK", kind });
  t.eq(`counts(ATTACK,${ct})`, c.same, t.get(`counts(ATTACK,${ct})`)); t.checkTags("ch03_counts", c.frames);
}
t.eq("pat(ATTACK)", A.pattern({ alpha: "lat", text: "ATTACK", kind: "caesar" }).px.join(" "), t.get("pat(ATTACK)"));
// продуктовият шифър пази формата на честотите
t.eq("product shape", A.counts({ alpha: "lat", text: "ATTACKATDAWN", kind: "product" }).shape, 1);
t.done();
