const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_parallel.js", "03_parallel.c");
const A = t.ch.algos;
for (let n = 0; n <= 19; n++) {
  const s = A.vec_add({ n, W: 4, mode: "sisd" });
  t.eq(`sisd(${n})`, s.result, t.get(`sisd(${n})`)); t.checkTags("ch03_simd", s.frames);
  for (const W of [2, 4, 8]) {
    const v = A.vec_add({ n, W, mode: "simd" });
    t.eq(`simd(${n},${W})`, `${v.result} ${v.sum}`, t.get(`simd(${n},${W})`)); t.checkTags("ch03_simd", v.frames);
    t.eq(`формула(${n},${W})`, v.result, Math.floor(n / W) + (n % W));
  }
}
const C = [["a1q0", "4 3 2", "", 1, 0], ["a1q1", "4 3 2", "", 1, 1], ["a1q2", "4 3 2", "", 1, 2], ["a2q1", "4 3 2", "", 2, 1], ["a3q2", "4 3 2", "", 3, 2],
  ["b2q1", "3 3 3 3", "B<A D<C", 2, 1], ["b4q0", "3 3 3 3", "B<A D<C", 4, 0], ["c2q2", "5 1 4 2 3 2", "C<A E<B F<D", 2, 2], ["c3q1", "5 1 4 2 3 2", "C<A E<B F<D", 3, 1], ["c1q3", "5 1 4 2 3 2", "C<A E<B F<D", 1, 3], ["d1q1", "9 9 9 9 9 9", "", 1, 1]];
for (const [k, lens, deps, cores, q] of C) {
  const r = A.round_robin({ lens, deps, cores, q });
  t.eq("rr_" + k, r.result, t.get("rr_" + k)); t.checkTags("ch03_rr", r.frames);
}
let e = ""; try { A.round_robin({ lens: "2 2", deps: "A<B B<A", cores: 2, q: 0 }); } catch (x) { e = x.message; } t.eq("цикъл", /цикъл/.test(e), true);
t.done();
