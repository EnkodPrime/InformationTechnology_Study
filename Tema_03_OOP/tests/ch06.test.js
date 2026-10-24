const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_operators.js", "06_operators.cpp");
const A = t.ch.algos, V = { a: "2 3", b: "4 1", c: "1 -1", d: "0 2" };
const run = (expr) => A.complex(Object.assign({ expr }, V));
let r = run("a + b"); t.eq("manual", r.result, t.get("manual")); t.checkTags("ch06_complex", r.frames);
const E = { e1: "a + b * c", e2: "(a + b) * c", e3: "a - b - c", e5: "a * a * a" };
for (const k in E) { r = run(E[k]); t.eq(k, `${r.result} [${r.order}]`, t.get(k)); t.checkTags("ch06_complex", r.frames); }
r = run("a * b + c * d"); t.eq("e4", r.result, t.get("e4"));
t.eq("comm a+b==b+a", run("a + b").result === run("b + a").result ? 1 : 0, t.get("comm").split(" ")[0]);
t.eq("comm a-b==b-a", run("a - b").result === run("b - a").result ? 1 : 0, t.get("comm").split(" ")[1]);
let threw = false; try { run("a ** b"); } catch (e) { threw = true; } t.eq("** throws", threw, true);
t.done();
