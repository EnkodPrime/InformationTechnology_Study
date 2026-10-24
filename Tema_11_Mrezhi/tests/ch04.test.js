const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_lan.js", "04_lan.c");
const A = t.ch.algos;
let r = A.sw({ seq: "A>B@0, B>A@1, C>FF@2, A>C@0, D>A@3, A>E@0, B>A@3", ports: 4 });
r.outs.forEach((o, i) => t.eq("sw" + i, `${o.join(" ")} (${o.length})`.trim(), t.get(`sw${i} out`)));
t.eq("sw table", r.tab.map((e) => `${e.mac}:${e.port}`).join(" "), t.get("sw table"));
t.checkTags("ch04_switch", r.frames);
r = A.sw({ seq: "A>B@0, B>A@0, A>B@0", ports: 4 }); t.eq("filter", r.outs[2].length, 0); t.checkTags("ch04_switch", r.frames);
for (const [me, p, d, g] of [["192.168.10.34", 24, "192.168.10.77", "192.168.10.1"], ["192.168.10.34", 24, "198.51.100.20", "192.168.10.1"], ["192.168.10.70", 26, "192.168.10.130", "192.168.10.65"], ["192.168.10.70", 26, "192.168.10.100", "192.168.10.65"]]) {
  r = A.arp({ me, prefix: p, dst: d, gw: g }); t.eq(`nh ${me}/${p}->${d}`, r.result, t.get(`nh(${me}/${p} -> ${d})`)); t.checkTags("ch04_arp", r.frames);
}
for (const s of ["123456789", "abc"]) { r = A.crc({ text: s }); t.eq("crc " + s, r.result, t.get(`crc(${s})`)); t.checkTags("ch04_crc", r.frames); }
r = A.crc({ text: "\x00" }); t.eq("crc 00", r.result, t.get("crc(00)"));
t.done();
