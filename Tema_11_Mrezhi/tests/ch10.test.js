const t = require("../../tools/harness.js")(__dirname + "/..", "ch10_industrial.js", "10_industrial.c");
const A = t.ch.algos;
[["0x100 0x180"], ["0x7F0 0x123 0x124 0x0FF"], ["0x555 0x554 0x55C"]].forEach(([ids], k) => {
  const r = A.can({ ids }); t.eq("can" + k, `win ${r.win} lost ${r.lost.join(" ")}`, t.get("can" + k)); t.checkTags("ch10_can", r.frames);
});
let r = A.modbus({ unit: 1, addr: 0, count: 1, tid: 1 }); t.eq("rtu(1,0,1)", r.rtu, t.get("rtu(1,0,1)")); t.eq("tcp(1,1,0,1)", r.tcp, t.get("tcp(1,1,0,1)")); t.checkTags("ch10_modbus", r.frames);
r = A.modbus({ unit: 17, addr: 107, count: 3, tid: 1 }); t.eq("rtu(17,107,3)", r.rtu, t.get("rtu(17,107,3)"));
r = A.crc16({ bytes: "01 03 02 00 FA" }); t.eq("crc resp", r.result, t.get("crc(01 03 02 00 FA)")); t.checkTags("ch10_crc16", r.frames);
r = A.crc16({ bytes: "01 03 00 00 00 01" }); t.eq("crc manual", r.result, "84 0A");
t.done();
