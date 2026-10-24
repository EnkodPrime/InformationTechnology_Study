const t = require("../../tools/harness.js")(__dirname + "/..", "ch11_bluetooth.js", "11_ble.c");
const A = t.ch.algos;
for (const b of ["64", "32", "C8"]) { const r = A.gatt({ kind: "battery", val: b }); t.eq("battery " + b, r.result, t.get(`battery(${b})`)); t.checkTags("ch11_gatt", r.frames); }
for (const b of ["FA 00", "00 FA", "E9 00"]) { const r = A.gatt({ kind: "temp", val: b }); t.eq("temp " + b, `${r.result} ${r.js}`, t.get(`temp(${b})`)); t.checkTags("ch11_gatt", r.frames); }
t.eq("mesh all relays reach 5", A.mesh({ ttl: 5, relays: "A B C D E F G" }).reached, 5);
t.eq("mesh ttl0 reaches 0 lamps", A.mesh({ ttl: 0, relays: "A B C D" }).reached, 0);
t.done();
