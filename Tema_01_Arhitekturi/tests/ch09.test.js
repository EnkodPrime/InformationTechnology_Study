const t = require("../../tools/harness.js")(__dirname + "/..", "ch09_extra.js", "08_perf.c");
const A = t.ch.algos;
for (const v of ["12345678", "DEADBEEF", "00000001"]) for (const order of ["little", "big"]) {
  const r = A.to_bytes({ v: "0x" + v, order });
  t.eq(`bytes(${v},${order})`, r.result, t.get(`bytes(${v},${order})`)); t.checkTags("ch08_endian", r.frames);
}
t.done();
