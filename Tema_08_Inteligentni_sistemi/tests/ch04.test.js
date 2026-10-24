const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_alfabeta.js", "03_minimax.c");
const A = t.ch.algos;
const TREES = { t1: "((3 5) (2 9))", t2: "((3 12 8) (2 4 6) (14 5 2))", t3: "(((5 6) (7 4 5)) ((3)) ((6) (6 9)) ((7) (5)) ((9 8) (6)))", t4: "(((3 17) (2 12)) ((15) (25 0)) ((2 5) (3)) ((2 14)))", t5: "((2 9) (3 5))", t6: "((8 9) (5 6) (2 3))", t7: "((2 3) (5 6) (8 9))" };
for (const k in TREES) {
  const r = A.alphabeta({ tree: TREES[k], order: "given" });
  t.eq(`${k} alphabeta`, r.result, t.get(`${k} alphabeta`));
  t.eq(`${k} = minimax`, r.result, t.get(`${k} minimax`));
  t.eq(`${k} ab visited`, r.visited, t.get(`${k} ab visited`));
  t.eq(`${k} ab leaves`, r.leaves, t.get(`${k} ab leaves`));
  t.eq(`${k} ab cut`, r.cut, t.get(`${k} ab cut`));
  t.checkTags("ch04_alphabeta", r.frames);
}
// подредба: t7 пренареден „най-добрият първи“ е t6
t.eq("reorder best t7", A.reorder({ tree: TREES.t7, order: "best" }), TREES.t6);
const rw = A.alphabeta({ tree: TREES.t6, order: "worst" }); t.eq("worst t6 visits all", rw.visited, t.get("t6 nodes")); t.eq("worst t6 value", rw.result, t.get("t6 minimax"));
const rb = A.alphabeta({ tree: TREES.t7, order: "best" });
t.eq("t7 best visited = t6", rb.visited, t.get("t6 ab visited"));
const c = A.compare({ tree: TREES.t3 });
t.eq("compare same value", new Set(c.rows.map((r) => r.v)).size, 1);
t.done();
