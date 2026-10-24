const t = require("../../tools/harness.js")(__dirname + "/..", "ch02_tarsene.js", "02_search.c");
const A = t.ch.algos;
const G = {
  g1: ["S A 1, S B 4, A B 2, A C 5, B C 1, C G 3", "S=5 A=4 B=2 C=1 G=0", false],
  g2: ["S A 1, S B 5, A G 10, B G 2", "S=6 A=1 B=2 G=0", true],
  g3: ["S A 1, A B 1, B G 1, S C 1, C D 1, D E 1, E G 1, S G 9", "", false],
  g4: ["S A 1, S B 2, A C 4, B C 1, C G 5", "S=6 A=5 B=6 C=4 G=0", true],
  g6: ["S A 1, S B 2, A G 6, B G 4", "S=0 A=1 B=9 G=0", true],
  g5: ["S A 1, A B 1, B S 1, G S 1", "", true],
};
for (const tag in G) for (const mode of ["bfs", "dfs", "ucs", "greedy", "astar"]) {
  const [edges, heur, directed] = G[tag];
  const r = A.search({ edges, heur, start: "S", goal: "G", mode, directed });
  t.eq(`${tag} ${mode} cost`, r.cost, t.get(`${tag} ${mode} cost`));
  t.eq(`${tag} ${mode} expanded`, r.expanded, t.get(`${tag} ${mode} expanded`));
  t.eq(`${tag} ${mode} order`, r.order, t.get(`${tag} ${mode} order`));
  t.eq(`${tag} ${mode} path`, r.path, t.get(`${tag} ${mode} path`));
  t.checkTags("ch02_search", r.frames);
}
// допустимост: g6 е недопустима при B
const r6 = A.search({ edges: G.g6[0], heur: G.g6[1], start: "S", goal: "G", mode: "astar", directed: true });
t.eq("g6 notAdm", r6.notAdm.join(","), "B");
t.eq("g6 opt", r6.opt, 6);
// грешен вход
try { A.search({ edges: "S A x", heur: "", start: "S", goal: "A", mode: "bfs" }); t.eq("err", "no", "throw"); } catch (e) { t.eq("err", "throw", "throw"); }
const c = A.criteria({ gA: 9, hA: 1, gB: 2, hB: 3 });
t.eq("criteria greedy", c.rows[1].w, "A"); t.eq("criteria astar", c.rows[2].w, "B");
t.done();
