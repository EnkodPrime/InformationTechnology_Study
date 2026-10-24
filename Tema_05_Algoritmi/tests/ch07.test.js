const t = require("./harness")("ch07_sorting_lab.js", "07_sorting.c");
const A = t.ch.algos;
const ALG = ["selection", "bubble", "insertion", "merge", "quick", "heap"];
function check(tag, items, withArr, steps) {
  for (const name of ALG) {
    const r = A.run(name, items, steps, 1e6);
    if (withArr) {
      t.eq(`${tag} ${name} keys`, r.keys, t.get(`${tag} ${name} keys`));
      t.eq(`${tag} ${name} ids`, r.ids, t.get(`${tag} ${name} ids`));
    }
    t.eq(`${tag} ${name} cmp`, r.cmp, t.get(`${tag} ${name} cmp`));
    t.eq(`${tag} ${name} swp`, r.swp, t.get(`${tag} ${name} swp`));
    t.eq(`${tag} ${name} wr`, r.wr, t.get(`${tag} ${name} wr`));
    if (steps) t.checkTags("ch07_" + name, r.frames);
  }
}
const mk = (arr) => arr.map((k, i) => ({ key: k, id: i }));
check("f1", mk([5, 3, 5, 1, 3, 9, 2, 5, 7, 1]), true, true);
check("f2", mk([8, 3, 6, 2]), true, true);
check("f0", mk([8]), true, true);
for (let ty = 0; ty < 5; ty++) for (const n of [20, 40, 200, 1000]) check(`g${ty} n${n}`, A.gen(n, ty, 777), n <= 40, n <= 40);
// стъпковият визуализатор дава същите броячи като run
const s = A.sort_steps({ algo: "merge", type: "5", n: 4, seed: 1, arr: "5 3 5 1 3 9 2 5 7 1" });
t.eq("sort_steps merge cmp", s.cmp, t.get("f1 merge cmp"));
// стабилност
const st = A.stability({ arr: "5a 3a 5b 1a 3b 9 2 5c 7 1b" });
const exp = { selection: false, bubble: true, insertion: true, merge: true, quick: false, heap: false };
st.res.forEach((r) => t.eq(`stable ${r.name}`, r.stable, exp[r.name]));
t.done();
