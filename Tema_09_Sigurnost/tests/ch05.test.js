const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_prilozhenia.js", "05_app.c");
const A = t.ch.algos;
for (const s of ["Ivan", "O'Brien", "Anna-Maria", "", "Ivan2", "Ivan;", "Petar Petrov Ivanov Georgiev", "x<y"]) {
  const r = A.validate({ s, maxlen: 20 });
  t.eq(`validate [${s}]`, `${r.result} ${r.bad}`, t.get(`validate [${s}]`)); t.checkTags("ch05_validate", r.frames);
}
for (const s of ["Ivan", "Petrova", "Ivanov_Petrov", "AAAAAAAAAAAA"]) {
  const r = A.copy({ src: s, cap: 8 });
  t.eq(`checked ${s}`, `${r.result} ${r.out}`, t.get(`checked ${s}`)); t.checkTags("ch05_copy", r.frames);
}
for (const p of ["password", "parola", "abc", "Abc123", "correct horse battery", "Tr0ub4dor&3", "qwertyuiopasdfgh", "7391"]) {
  const r = A.pw({ p, salt: "q7Z1" });
  t.eq(`pw ${p}`, `${r.pool} ${r.bits.toFixed(1)}`, t.get(`pw ${p}`)); t.checkTags("ch05_pw", r.frames);
}
for (const [s, p] of [["q7Z1", "parola"], ["Lm40", "parola"], ["", "parola"], ["q7Z1", "Parola"]]) {
  t.eq(`hash ${s || "-"} ${p}`, A.pw({ p, salt: s }).hash, t.get(`hash ${s || "-"} ${p}`));
}
t.done();
