const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_pamet.js", "06_pamet.c");
const A = t.ch.algos;
for (const [nm, psize, tlb, table, acc] of [["m", 4096, 4, "5W 2W 7W 10W", "12345"],
  ["x", 4096, 2, "5W 2R - 10C", "12345 12400 100 8200 w8200 4100 w4100 70000"],
  ["y", 256, 2, "3W 1C 4W 9W", "0 w256 512 0 768 256 1024"]]) {
  const r = A.mmu({ psize, tlb, table, acc });
  for (const k of ["phys", "hits", "misses", "faults", "invalid"]) t.eq(nm + "." + k, r[k], t.get(nm + "." + k));
  t.checkTags("s06_translate", r.frames);
}
t.eq("manual 41017", A.mmu({ psize: 4096, tlb: 1, table: "0W 0W 0W 10W", acc: "12345" }).phys, 41017);
t.done();
