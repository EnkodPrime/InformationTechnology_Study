/* Раздел 8 е концептуален (без C код) — проверяваме само чистата функция за колизии. */
const t = require("../../tools/harness.js")(__dirname + "/..", "ch08_savremenna.js", null);
const A = t.ch.algos;
for (const bits of [2, 4, 6, 8, 10]) {
  const r = A.collide({ bits, seed: 0 });
  t.eq(`collision found n=${bits}`, r.at > 0 && r.at <= (1 << bits) + 1, true);
  t.eq(`frames < 3000 n=${bits}`, r.frames.length < 3000, true);
}
t.done();
