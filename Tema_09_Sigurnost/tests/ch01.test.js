const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_celi.js", "01_access.c");
const A = t.ch.algos;
const C = [["alice", 1, "read", "grades", 1], ["alice", 1, "write", "grades", 1], ["alice", 1, "write", "grades", 0], ["alice", 0, "read", "grades", 1],
  ["bob", 1, "write", "grades", 1], ["admin", 1, "write", "grades", 1], ["admin", 1, "write", "syllabus", 1], ["eve", 1, "read", "grades", 1]];
let logs = 0;
for (const [u, pw, op, obj, srv] of C) {
  const k = `access ${u} ${pw} ${op} ${obj} ${srv}`;
  const r = A.access({ user: u, pw: !!pw, op, obj, srv: !!srv });
  t.eq(k, r.result, t.get(k)); t.eq(k + " cmp", r.cmp, t.get(k + " cmp")); t.checkTags("ch01_access", r.frames);
  logs += r.nlog;
}
t.eq("log entries", logs, t.get("log entries"));
const R = [[4, 5, "C", 0], [4, 5, "C", 8], [4, 5, "I", 8], [4, 5, "C", 21], [5, 5, "A", 31], [2, 2, "I", 0], [3, 3, "A", 2]];
const PI = { C: 0, I: 1, A: 2 };
for (const [L, I, p, m] of R) {
  const r = A.risk({ L, I, prop: p, mfa: !!(m & 1), patch: !!(m & 2), least: !!(m & 4), backup: !!(m & 8), encrypt: !!(m & 16) });
  const k = `risk ${L} ${I} ${PI[p]} ${m}`;
  t.eq(k, `${r.L} ${r.I} ${r.level}`, t.get(k)); t.checkTags("ch01_risk", r.frames);
}
let threw = 0; try { A.risk({ L: 9, I: 1, prop: "C" }); } catch (e) { threw = 1; } t.eq("risk rejects L=9", threw, 1);
t.done();
