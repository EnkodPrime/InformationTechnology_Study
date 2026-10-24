const t = require("./harness")("ch04_pnp.js", "04_pnp.c");
const A = t.ch.algos;
const G = { house: [5, "02 24 41 13 30 21"], petal: [5, "01 02 03 04 12 34"], hex: [6, "03 31 15 52 24 40 01 45"], star: [6, "01 02 03 04 05 12"], sept: [7, "04 41 15 52 26 63 30 12 56"], k4: [4, "01 02 03 12 13 23"] };
for (const [g, cert] of [["house", "0 2 4 1 3"], ["house", "0 2 1 4 3"], ["house", "0 2 4 1"], ["house", "0 2 2 1 3"], ["house", "0 1 2 3 4"], ["hex", "0 3 1 5 2 4"], ["hex", "0 1 5 2 4 3"], ["sept", "0 4 1 5 2 6 3"]]) {
  const r = A.ham_verify({ n: G[g][0], edges: G[g][1], cert }); t.eq(`verify ${g} [${cert}]`, r.result, t.get(`verify ${g} [${cert}]`)); t.checkTags("ch04_ham_verify", r.frames);
}
for (const g of ["house", "petal", "hex", "star", "sept", "k4"]) {
  const r = A.ham_search({ n: G[g][0], edges: G[g][1] }); t.eq(`search ${g}`, `${r.result} ${r.tried}${r.result ? " " + r.cyc : ""}`, t.get(`search ${g}`)); t.checkTags("ch04_ham_search", r.frames);
}
for (const [f, x] of [["1 -2 | 2 3 | -1 -3", "110"], ["1 -2 | 2 3 | -1 -3", "111"], ["1 2 | -1 2 | 1 -2 | -1 -2", "11"], ["1 2 3 | -1 -2 | -2 -3 | -1 -3 | 2", "010"], ["1 | -1 2 | -2 3 | -3 4 | -4 5 | -5 -1", "11111"]]) {
  let r = A.sat_eval({ formula: f, x }); t.eq(`eval [${f}] ${x}`, r.result, t.get(`eval [${f}] ${x}`)); t.checkTags("ch04_sat_eval", r.frames);
  r = A.sat_brute({ formula: f }); t.eq(`brute [${f}]`, `${r.result} ${r.tried}`, t.get(`brute [${f}]`)); t.checkTags("ch04_sat_brute", r.frames);
}
for (const g of ["house", "petal", "hex", "star", "sept"]) { const r = A.reduce({ n: G[g][0], edges: G[g][1] }); t.eq(`reduce ${g}`, r.result, t.get(`reduce ${g}`)); t.checkTags("ch04_reduce", r.frames); }
t.done();
