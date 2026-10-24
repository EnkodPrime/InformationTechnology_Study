const t = require("./harness")("ch02_computability.js", "02_computability.c");
const A = t.ch.algos;
const cases = [["", "A", "F"], ["", "A", "G"], ["", "A", "H"], ["", "C", "B"], ["DF EF", "A", "F"], ["DF EF FG", "A", "F"], ["AB AC", "A", "G"]];
for (const [cut, s, tt] of cases) {
  const k = `(${s},${tt}|${cut})`;
  let r = A.bfs({ s, t: tt, cut, mode: "dec" }); t.eq("reach" + k, r.reach, t.get("reach" + k)); t.checkTags("ch02_bfs", r.frames);
  r = A.bfs({ s, t: tt, cut, mode: "opt" }); t.eq("dist" + k, r.dist, t.get("dist" + k)); t.checkTags("ch02_bfs", r.frames);
  r = A.bfs({ s, t: tt, cut, mode: "search" }); t.eq("path" + k, r.path, t.get("path" + k)); t.checkTags("ch02_bfs", r.frames);
}
for (const [p, x, lim] of [["collatz", 27, 200], ["collatz", 27, 100], ["collatz", 6, 8], ["collatz", 6, 7], ["collatz", 6, 200], ["collatz", 0, 50], ["is_even", 6, 50], ["is_even", 7, 50], ["countdown", 5, 50], ["forever", 0, 50]]) {
  const r = A.semi({ prog: p, x, limit: lim });
  t.eq(`semi ${p}(${x},${lim})`, `${r.result} ${r.steps}`, t.get(`semi ${p}(${x},${lim})`)); t.checkTags("ch02_semi", r.frames);
  for (const f of r.frames) if (!t.ctx.CSRC[f.pkey].tags[f.pAt]) { t.eq("tag " + f.pkey + "@" + f.pAt, 0, 1); break; }
}
t.eq("collatz(27) steps", A.semi({ prog: "collatz", x: 27, limit: 600 }).steps, t.get("collatz(27)"));
for (const rows of ["1010 0110 1101 0011", "00000 00000 00000 00000 00000", "110100 011001 101011 000110 111111 010101"]) {
  const r = A.diag({ rows }); t.eq(`diag(${rows})`, `${r.d} ${r.result}`, t.get(`diag(${rows})`)); t.checkTags("ch02_diag", r.frames);
}
t.done();
