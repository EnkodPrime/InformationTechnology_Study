const t = require("../../tools/harness.js")(__dirname + "/..", "ch09_ocenki.js", "09_delay.c");
const A = t.ch.algos;
// C: L байта, R bit/s, d m, v m/s, W байта  →  JS: R Mbit/s, d km, v ×1e8
for (const [n, L, R, d, v, W] of [["lan", 1500, 100, 0.1, 2, 1500], ["wan", 1500, 100, 3000, 2, 65535], ["wan_small", 1500, 100, 3000, 2, 1500], ["gbit", 1500, 1000, 10000, 2, 4e6], ["slow", 1500, 1, 0.01, 2, 1500]]) {
  const r = A.delay({ L, R, d, v, W }); t.eq(n, r.line, t.get(n)); t.checkTags("ch09_delay", r.frames);
}
t.done();
