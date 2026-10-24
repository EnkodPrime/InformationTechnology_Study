const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_logika.js", "06_logic.c");
const A = t.ch.algos;
const C = { mp: ["P; P -> Q", "Q"], ac: ["Q; P -> Q", "P"], mt: ["!Q; P -> Q", "!P"], hs: ["P -> Q; Q -> R", "P -> R"], da: ["!P; P -> Q", "!Q"], ds: ["P | Q; !P", "Q"] };
for (const k in C) {
  const r = A.valid({ prem: C[k][0], concl: C[k][1] });
  for (const f of ["valid", "rows", "models", "counter", "first"]) t.eq(`${k} ${f}`, r[f], t.get(`${k} ${f}`));
  t.checkTags("ch06_valid", r.frames);
}
const q = ["подаден(doc1)", "подаден(doc2)", "подаден(doc3)"];
q.forEach((f, i) => {
  for (const [cw, nm] of [[false, "owa"], [true, "cwa"]]) {
    const r = A.query({ known: "подаден(doc1)", neg: "подаден(doc3)", fact: f, closed: cw });
    t.eq(`q${i + 1} ${nm}`, r.result, t.get(`q${i + 1} ${nm}`));
    t.checkTags("ch06_world", r.frames);
  }
});
try { A.valid({ prem: "P &", concl: "Q" }); t.eq("err", 0, 1); } catch (e) { t.eq("err", 1, 1); }
try { A.valid({ prem: "X", concl: "Q" }); t.eq("err2", 0, 1); } catch (e) { t.eq("err2", 1, 1); }
t.eq("pred", A.predicate({ facts: "Ana Ivan" }).derived.join(","), "Ana,Ivan");
t.done();
