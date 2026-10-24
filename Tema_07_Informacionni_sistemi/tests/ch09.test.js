const t = require("../../tools/harness.js")(__dirname + "/..", "ch09_migracia.js", "09_migration.c");
const A = t.ch.algos;
t.eq("bgn_to_eur(12000)", A.bgn_to_eur(12000), t.get("bgn_to_eur(12000)"));
t.eq("bgn_to_eur(9999)", A.bgn_to_eur(9999), t.get("bgn_to_eur(9999)"));
const rows = "1 101 12000; 2 102 5000; 3 103 25000; 4 101 3000; 5 104 9999";
for (const b of ["none", "noconv", "fkshift", "dupid", "drop", "fktypo"]) {
  const r = A.accept({ rows, bug: b });
  t.eq(`accept(${b})`, `${r.mask} rows=${r.rows}`, t.get(`accept(${b})`));
  t.checkTags("ch09_accept", r.frames);
}
t.done();
