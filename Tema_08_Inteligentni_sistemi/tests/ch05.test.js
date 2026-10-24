const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_nim.js", "05_nim.c");
const A = t.ch.algos;
const C = { n6: [6, "1 2 3", "0"], n12: [12, "1 2 3", "0"], m6: [6, "1 2 3", "1"], m13: [13, "1 2 3", "1"], s20: [20, "1 3 4", "0"], t15: [15, "2 5", "0"] };
for (const k in C) {
  const [N, moves, misere] = C[k];
  const r = A.retro({ N, moves, misere });
  t.eq(`${k} pattern`, r.pattern, t.get(`${k} pattern`));
  t.eq(`${k} best`, r.best, t.get(`${k} best`));
  t.checkTags("ch05_retro", r.frames);
  const g = A.game({ N, moves, misere });
  t.eq(`${k} game`, g.seq, t.get(`${k} game`));
  t.eq(`${k} first wins`, g.first, t.get(`${k} first wins`));
}
// кратните на 4 са губещи
const r = A.retro({ N: 40, moves: "1 2 3", misere: "0" });
t.eq("mult4", r.win.every((w, n) => (w === 0) === (n % 4 === 0)), true);
const m = A.retro({ N: 40, moves: "1 2 3", misere: "1" });
t.eq("4k+1", m.win.every((w, n) => (w === 0) === (n % 4 === 1)), true);
try { A.retro({ N: 0, moves: "1", misere: "0" }); t.eq("err", 0, 1); } catch (e) { t.eq("err", 1, 1); }
t.done();
