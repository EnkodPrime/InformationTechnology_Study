const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_templates.js", "07_templates.cpp");
const A = t.ch.algos;
let r = A.larger({ script: "larger(3, 7); larger(2.5, 1.0)" });
t.eq("larger(3,7)", r.res[0], t.get("larger(3,7)")); t.eq("larger(2.5,1.0)", r.res[1], t.get("larger(2.5,1.0)"));
t.eq("s1.n", r.inst.length, t.get("s1.n")); r.inst.forEach((s, i) => t.eq("s1." + i, s, t.get("s1." + i))); t.checkTags("ch07_larger", r.frames);
r = A.larger({ script: "larger('a', 'z'); larger(10, -4); larger<double>(3, 2.5); larger<const char*>(\"abc\", \"abd\"); larger(5L, 9L)" });
const K = ["larger('a','z')", "larger(10,-4)", "larger<double>(3,2.5)", "larger<const char*>(\"abc\",\"abd\")", "larger(5L,9L)"];
K.forEach((k, i) => t.eq(k, r.res[i], t.get(k)));
t.eq("s2.n", r.inst.length, t.get("s2.n")); r.inst.forEach((s, i) => t.eq("s2." + i, s, t.get("s2." + i))); t.checkTags("ch07_larger", r.frames);
r = A.larger({ script: "larger(3, 7); larger(1, 2); larger(9, 8)" }); t.eq("same T once", r.inst.length, 1);
r = A.larger({ script: "larger(3, 2.5)" }); t.eq("conflict", r.res[0], "ERR"); t.checkTags("ch07_larger", r.frames);
for (const [T, N] of [["char", 4], ["short", 4], ["int", 4], ["double", 4], ["char", 10], ["int", 3], ["double", 1], ["Big", 2]]) {
  r = A.stack({ T, N }); t.eq(`sizeof(Stack<${T},${N}>)`, r.size, t.get(`sizeof(Stack<${T},${N}>)`)); t.checkTags("ch07_stack", r.frames);
}
t.done();
