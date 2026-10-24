const t = require("./harness")("ch09_dp.js", "09_dp.c");
const A = t.ch.algos;
for (const n of [0, 1, 2, 5, 7, 10, 20, 25, 30]) {
  for (const memo of [false, true]) {
    const r = A.fib_tree({ n, memo });
    const tag = memo ? "memo" : "naive";
    t.eq(`fib_${tag}(${n})`, r.result, t.get(`fib_${tag}(${n})`));
    t.eq(`fib_${tag}_calls(${n})`, r.calls, t.get(`fib_${tag}_calls(${n})`));
    if (n <= 7) t.checkTags(memo ? "ch09_fib_memo" : "ch09_fib_naive", r.frames);
  }
  // формулата 2F(n+1) − 1
  t.eq(`2F(${n + 1})-1`, 2 * A.fib_iter({ n: n + 1, variant: "table" }).result - 1, t.get(`fib_naive_calls(${n})`));
  const tb = A.fib_iter({ n, variant: "table" }), tw = A.fib_iter({ n, variant: "two" });
  t.eq(`fib_table(${n})`, tb.result, t.get(`fib_table(${n})`)); t.checkTags("ch09_fib_table", tb.frames);
  t.eq(`fib_two(${n})`, tw.result, t.get(`fib_two(${n})`)); t.checkTags("ch09_fib_two", tw.frames);
}
t.eq("fib_table(60)", A.fib_iter({ n: 60, variant: "table" }).result, t.get("fib_table(60)"));
for (const [items, W] of [["2:3 3:4", 5], ["2:3 3:4 4:5 5:6", 5], ["2:3 3:4 4:5 5:6", 6], ["1:1 3:4 4:5 5:7", 7], ["4:5 3:4", 2]]) {
  const k = `[${items};${W}]`;
  const r = A.knap2d({ items, W });
  t.eq("knap" + k, r.result, t.get("knap" + k));
  t.eq("knap_items" + k, r.taken.join(" ") || "-", t.get("knap_items" + k));
  t.eq("knap_table" + k, r.table.flat().join(" "), t.get("knap_table" + k));
  t.checkTags("ch09_knap2d", r.frames);
  for (const dir of ["down", "up"]) {
    const q = A.knap1d({ items, W, dir });
    t.eq(`knap1d_${dir}${k}`, q.result, t.get(`knap1d_${dir}${k}`));
    t.checkTags("ch09_knap1d", q.frames);
  }
}
t.eq("материал: W=5 → 7", A.knap2d({ items: "2:3 3:4", W: 5 }).result, 7);
let maxF = 0;
for (const r of [A.fib_tree({ n: 7, memo: false }), A.knap2d({ items: "1:1 2:2 3:3 4:4 5:5 6:6", W: 15 }), A.knap1d({ items: "1:1 2:2 3:3 4:4 5:5 6:6", W: 15, dir: "up" }), A.fib_iter({ n: 60, variant: "two" })]) maxF = Math.max(maxF, r.frames.length);
t.eq("кадри < 3000", maxF < 3000, true);
t.done();
