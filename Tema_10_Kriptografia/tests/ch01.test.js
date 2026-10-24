const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_ponyatia.js", "01_base64.c");
require("./_alpha.js")(t);
const A = t.ch.algos;
for (const s of ["ATTACK", "AT DAWN", "Ключ", "M"]) {
  const e = A.b64({ text: s, mode: "enc" });
  t.eq(`b64(${s})`, e.result, t.get(`b64(${s})`)); t.checkTags("ch01_b64enc", e.frames);
  const d = A.b64({ text: e.result, mode: "dec" });
  t.eq(`roundtrip(${s})`, d.result === s ? 1 : 0, t.get(`roundtrip(${s})`)); t.checkTags("ch01_b64dec", d.frames);
}
const bad = A.b64({ text: "QUJ", mode: "dec" });
t.eq("bad(QUJ)", bad.result, t.get("bad(QUJ)")); t.checkTags("ch01_b64dec", bad.frames);
for (const s of ["QQ=A", "Q===", "QQ==QUJD"]) { const b = A.b64({ text: s, mode: "dec" }); t.eq(`bad(${s})`, b.result, t.get(`bad(${s})`)); t.checkTags("ch01_b64dec", b.frames); }
t.done();
