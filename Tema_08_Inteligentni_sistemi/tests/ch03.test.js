const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_minimax.js", "03_minimax.c");
const A = t.ch.algos;
const TREES = { t1: "((3 5) (2 9))", t2: "((3 12 8) (2 4 6) (14 5 2))", t3: "(((5 6) (7 4 5)) ((3)) ((6) (6 9)) ((7) (5)) ((9 8) (6)))", t4: "(((3 17) (2 12)) ((15) (25 0)) ((2 5) (3)) ((2 14)))", t5: "((2 9) (3 5))", t6: "((8 9) (5 6) (2 3))", t7: "((2 3) (5 6) (8 9))" };
for (const k in TREES) {
  const r = A.minimax({ tree: TREES[k] });
  t.eq(`${k} minimax`, r.result, t.get(`${k} minimax`));
  t.eq(`${k} nodes`, r.nodes, t.get(`${k} nodes`));
  t.eq(`${k} mm visited`, r.visited, t.get(`${k} mm visited`));
  t.eq(`${k} mm leaves`, r.leaves, t.get(`${k} mm leaves`));
  t.eq(`${k} move`, r.move, t.get(`${k} move`));
  t.checkTags("ch03_minimax", r.frames);
}
for (const bad of ["", "((3 5)", "(()", "(3 x)", "5"]) { try { A.minimax({ tree: bad }); t.eq("bad " + bad, "ok", "throw"); } catch (e) { t.eq("bad " + bad, "throw", "throw"); } }
t.done();
