const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_sastav.js", "01_sastav.c");
const A = t.ch.algos;
const t1 = "Hello\\nOS\\n", t2 = "abcdefghijklmnopqrstuvwxyz";
for (const [name, text, mode, cap] of [["t1", t1, "none", 8], ["t1", t1, "line", 8], ["t1", t1, "full", 8], ["t2", t2, "full", 8], ["t2", t2, "line", 8], ["t2", t2, "full", 64]]) {
  const r = A.bufio({ text, mode, cap });
  t.eq(`bufio(${name},${mode},${cap})`, r.result, t.get(`bufio(${name},${mode},${cap})`));
  t.checkTags("s01_bufio", r.frames);
}
t.done();
