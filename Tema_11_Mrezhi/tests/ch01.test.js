const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_klasifikacia.js", "01_topology.c");
const A = t.ch.algos;
const cases = [["star", 6, "0-2", -1], ["star", 6, "", 0], ["bus", 6, "2-3", -1], ["ring", 6, "2-3", -1], ["tree", 7, "0-1", -1], ["mesh", 6, "0-1", -1], ["mesh", 8, "", 3], ["ring", 5, "", 2]];
for (const [type, n, cut, down] of cases) {
  const r = A.topo({ type, n, cut, down: String(down) });
  const [cu, cv] = cut ? cut.split("-") : [-1, -1];
  const key = `(${type},${n},cut=${cu}-${cv},down=${down})`;
  t.eq("comps" + key, r.result, t.get("comps" + key));
  t.eq("label" + key, r.comp.join(" "), t.get("label" + key));
  t.checkTags("ch01_bfs", r.frames);
}
t.done();
