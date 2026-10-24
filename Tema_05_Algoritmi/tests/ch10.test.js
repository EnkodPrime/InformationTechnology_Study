const t = require("./harness")("ch10_more.js", "10_more.c");
const A = t.ch.algos;

// a) N дами
for (let n = 4; n <= 8; n++) for (const mode of ["all", "first"]) {
  const r = A.queens({ n, mode });
  t.eq(`queens ${mode} ${n}`, `${r.solutions} ${r.placed} ${r.pruned}`, t.get(`queens ${mode} ${n}`));
  t.checkTags("ch10_queens", r.frames);
}

// b) B&B и f) най-близък съсед
const M = ["0 3 4 2 7; 3 0 4 6 3; 4 4 0 5 8; 2 6 5 0 6; 7 3 8 6 0", "0 10 15 20; 10 0 35 25; 15 35 0 30; 20 25 30 0", "0 1 9 9 9; 9 0 1 9 9; 9 9 0 1 9; 9 9 9 0 1; 1 9 9 9 0"];
M.forEach((mat, k) => {
  const r = A.tsp_bb({ mat });
  t.eq(`bb ${k}`, `${r.best} ${r.nodes} ${r.cut} ${r.tours}`, t.get(`bb ${k}`));
  t.checkTags("ch10_bb", r.frames);
  const q = A.nn_tour({ mat });
  t.eq(`nn ${k}`, q.result, t.get(`nn ${k}`));
  t.checkTags("ch10_nn", q.frames);
});

// c-i) Las Vegas
for (const len of [10, 50]) {
  for (let s = 1; s <= 3; s++) { const r = A.rqs_once(len, false, true, s); t.eq(`rqs ${len} ${s}`, r.ok ? r.cmps : -1, t.get(`rqs ${len} ${s}`)); }
  t.eq(`rqs sorted det ${len}`, A.rqs_once(len, true, false, 1).cmps, t.get(`rqs sorted det ${len}`));
  t.eq(`rqs sorted rand ${len}`, A.rqs_once(len, true, true, 7).cmps, t.get(`rqs sorted rand ${len}`));
}
const rr = A.rqs_runs({ n: 50, runs: 3, pivot: "rand", input: "shuf" });
t.eq("rqs_runs 50", rr.results.join(" "), [1, 2, 3].map((s) => t.get(`rqs 50 ${s}`)).join(" "));
t.checkTags("ch10_rqs", rr.frames);

// c-ii) Monte Carlo
for (const n of [561, 97, 91, 1105, 1000003, 221]) {
  const f = A.primality({ n, bases: "2 5 7 10", test: "fermat" });
  const m = A.primality({ n, bases: "2 5 7 10", test: "mr" });
  t.eq(`prime ${n}`, `${f.result} ${m.result}`, t.get(`prime ${n}`));
  t.checkTags("ch10_fermat", f.frames); t.checkTags("ch10_mr", m.frames);
}
t.eq("powmod(7, 560, 561)", A.powmod(7, 560, 561), t.get("powmod(7, 560, 561)"));
t.eq("powmod(3, 200, 1000003)", A.powmod(3, 200, 1000003), t.get("powmod(3, 200, 1000003)"));

// d) дубликати
for (const [k, arr] of [["a1", "9 4 7 1 8 3 6 2 5 0"], ["a2", "9 4 7 1 8 3 6 2 7 0"]]) {
  const a = A.dups({ arr, method: "naive" }), b = A.dups({ arr, method: "presort" });
  t.eq(`dup ${k}`, `${a.result} ${a.cmp} ${b.result} ${b.cmp}`, t.get(`dup ${k}`));
  t.checkTags("ch10_dup_naive", a.frames); t.checkTags("ch10_dup_presort", b.frames);
}

// e) среща по средата
for (const T of [9, 30, 100, 0]) {
  const r = A.mitm({ xs: "3 34 4 12 5 2", T });
  t.eq(`mitm ${T}`, `${r.result} ${r.ma} ${r.mb} ${r.probes}`, t.get(`mitm ${T}`));
  t.checkTags("ch10_mitm", r.frames);
}
for (const T of [300, 1]) {
  const r = A.mitm({ xs: "41 67 34 0 69 24 78 58 62 64 5 45", T });
  t.eq(`mitm12 ${T}`, `${r.result} ${r.ma} ${r.mb} ${r.probes}`, t.get(`mitm12 ${T}`));
}

// f) върхово покритие и поток
const v = A.vc({ edges: "0-1 0-2 1-3 2-3 3-4 3-5" });
t.eq("vc", `${v.result} ${v.opt}`, t.get("vc")); t.checkTags("ch10_vc", v.frames);
const s = A.stream({ xs: "12 7 19 3 25 8 14" });
t.eq("stream", `${s.count} ${s.max} ${s.mean.toFixed(4)}`, t.get("stream")); t.checkTags("ch10_stream", s.frames);

// грешен вход
for (const [fn, inp] of [["queens", { n: 9, mode: "all" }], ["tsp_bb", { mat: "0 1; 1 0" }], ["mitm", { xs: "1", T: 1 }], ["vc", { edges: "0-0" }]]) {
  let threw = false; try { A[fn](inp); } catch (e) { threw = true; }
  t.eq(`грешка ${fn}`, threw, true);
}
// брой кадри
t.eq("кадри queens 8 ≤ 2501", A.queens({ n: 8, mode: "all" }).frames.length <= 2501, true);
t.eq("кадри bb 6 < 3000", A.tsp_bb({ mat: "0 12 10 19 8 14; 12 0 3 7 2 11; 10 3 0 6 20 4; 19 7 6 0 4 9; 8 2 20 4 0 5; 14 11 4 9 5 0" }).frames.length < 3000, true);
t.done();
