const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_memory.js", "06_cache.c");
const A = t.ch.algos;
const T1 = "0 64 0 64 4 68 128 0", T2 = "W0 16 W32 0 48 W64 16 W0 80 32", T3 = "0 32 0 64 0 96 32 0";
for (const [sets, ways, block] of [[4, 1, 16], [2, 2, 16], [1, 4, 16], [8, 1, 8], [2, 4, 8]])
  for (const lru of [0, 1]) for (const wb of [0, 1]) {
    const cfg = { sets, ways, block, lru: lru ? "lru" : "fifo", wb: wb ? "wb" : "wt" };
    [["t1", T1], ["t2", T2], ["t3", T3]].forEach(([n, trace]) => {
      const k = `${n}(${sets},${ways},${block},${lru},${wb})`;
      const r = A.cache_sim(Object.assign({ trace }, cfg));
      t.eq(k, r.result, t.get(k)); t.checkTags("ch06_cache", r.frames);
    });
  }
for (const [R, C, sets, ways, block] of [[8, 8, 4, 2, 16], [8, 8, 8, 1, 16], [16, 16, 4, 2, 32], [6, 10, 2, 2, 16], [16, 4, 8, 2, 16]])
  for (const order of ["cols", "rows"]) {
    const k = `walk(${R},${C},${sets},${ways},${block},${order})`;
    const r = A.walk({ R, C, sets, ways, block, order });
    t.eq(k, r.result, t.get(k)); t.checkTags("ch06_locality", r.frames);
  }
t.eq("amat(1,0.05,80)", A.amat(1, 0.05, 80).toFixed(4), t.get("amat(1,0.05,80)"));
t.eq("amat(2,0.1,100)", A.amat(2, 0.1, 100).toFixed(4), t.get("amat(2,0.1,100)"));
t.eq("amat2", A.amat2(1, 0.05, 10, 0.2, 100).toFixed(4), t.get("amat2(1,0.05,10,0.2,100)"));
t.eq("ръководство: 5 ns", A.amat(1, 0.05, 80), 5);
t.done();
