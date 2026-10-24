const t = require("../../tools/harness.js")(__dirname + "/..", "ch10_dopalnenie.js", null);
const A = t.ch.algos;
const m = (x) => A.membership({ a: 15, b: 22, c: 28, d: 33, x }).mu;
t.eq("mu 10", m(10), 0); t.eq("mu 25", m(25), 1); t.eq("mu 18.5", m(18) .toFixed(4), (3 / 7).toFixed(4)); t.eq("mu 30", m(30), 0.6); t.eq("mu 40", m(40), 0);
try { A.membership({ a: 5, b: 1, c: 2, d: 3, x: 0 }); t.eq("err", 0, 1); } catch (e) { t.eq("err", 1, 1); }
t.done();
