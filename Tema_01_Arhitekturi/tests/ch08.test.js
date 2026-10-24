const t = require("../../tools/harness.js")(__dirname + "/..", "ch08_perf.js", "08_perf.c");
const A = t.ch.algos;
t.eq("cpu_time(1e9,2,2e9)", A.cpu_time(1e9, 2, 2e9).toFixed(4), t.get("cpu_time(1e9,2,2e9)"));
t.eq("cpu_time(5e8,5,2e9)", A.cpu_time(5e8, 5, 2e9).toFixed(4), t.get("cpu_time(5e8,5,2e9)"));
t.eq("cpu_time(2e9,1.2,3e9)", A.cpu_time(2e9, 1.2, 3e9).toFixed(4), t.get("cpu_time(2e9,1.2,3e9)"));
const r = A.cpu_steps({ ic1: "1e9", cpi1: 2, f1: 2, ic2: "5e8", cpi2: 5, f2: 2 });
t.eq("стъпки: T_A", r.TA.toFixed(4), t.get("cpu_time(1e9,2,2e9)")); t.eq("стъпки: T_B", r.TB.toFixed(4), t.get("cpu_time(5e8,5,2e9)"));
t.checkTags("ch08_cpu_time", r.frames);
for (const f of [0.5, 0.8, 0.9, 0.95, 0.99]) for (const p of [1, 2, 4, 8, 16, 64, 1024]) {
  const k = `amdahl(${f.toFixed(2)},${p})`, s = A.amdahl_steps({ f, p, c: 0 });
  t.eq(k, s.result.toFixed(4), t.get(k)); t.checkTags("ch08_amdahl", s.frames);
}
for (const p of [1, 2, 4, 8, 16, 64, 1024]) t.eq(`amdahl_c(0.90,${p},0.01)`, A.amdahl(0.9, p, 0.01).toFixed(4), t.get(`amdahl_c(0.90,${p},0.01)`));
t.eq("f=0.8, p=4 -> 2.5", A.amdahl(0.8, 4), 2.5);
t.done();
