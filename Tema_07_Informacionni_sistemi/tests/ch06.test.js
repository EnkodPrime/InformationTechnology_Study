const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_iziskvania.js", "06_requirements.c");
const A = t.ch.algos;
const T = "420 380 1900 650 2400 510 880 1200 700 1750 300 950 610 1490 2050 560 830 1020 400 1300";
for (const [name, offset, limit, pct] of [["nfr(server)", 0, 2000, 95], ["nfr(server,90)", 0, 2000, 90], ["nfr(client,90)", 300, 2000, 90], ["nfr(limit2500)", 0, 2500, 95]]) {
  const r = A.nfr_check({ times: T, offset, limit, pct });
  t.eq(name, `${r.ok}/${r.n} ${r.verdict}`, t.get(name));
  t.checkTags("ch06_nfr", r.frames);
}
for (const id of ["N1", "R1", "R2", "D1", "D2", "D3", "C1", "C2", "T1", "T2", "T3"]) {
  const r = A.impact({ start: id });
  t.eq(`impact(${id})`, r.out.join(" "), t.get(`impact(${id})`));
  t.checkTags("ch06_impact", r.frames);
}
let threw = false; try { A.nfr_check({ times: "1 x", offset: 0, limit: 10, pct: 50 }); } catch (e) { threw = true; } t.eq("грешен вход", threw, true);
t.done();
