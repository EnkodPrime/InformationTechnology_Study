const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_kapsulirane.js", "03_encap.c");
const A = t.ch.algos, hx = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
const base = { path: "/status", host: "example.org", sip: "192.0.2.10", dip: "198.51.100.20", sport: 51000, dport: 80, ttl: 64 };
let r = A.encap(base);
t.eq("len", r.len, t.get("len"));
t.eq("frame", hx(r.f), t.get("frame"));
t.eq("ipcsum", ((r.f[24] << 8) | r.f[25]).toString(16).toUpperCase().padStart(4, "0"), t.get("ipcsum"));
t.eq("tcpcsum", ((r.f[50] << 8) | r.f[51]).toString(16).toUpperCase().padStart(4, "0"), t.get("tcpcsum"));
t.eq("verify ip", A.csum(r.f.slice(14, 34), 20).toString(16).toUpperCase().padStart(4, "0"), t.get("verify ip"));
t.checkTags("ch03_encap", r.frames);
// празен път/host → допълване (C: encapsulate с "" дава 64; JS минимум е "GET / HTTP/1.1\r\n\r\n" — сверяваме само, че има допълване до 64 при кратък сегмент)
r = A.encap(Object.assign({}, base, { path: "/", host: "" }));
t.eq("short frame >= 64", r.len >= 64, true);
// път
let p = A.path({ ttl: 64, hops: 2, corrupt: false });
t.eq("hop2 ttl", p.ttl, t.get("hop2 ttl"));
t.eq("hop2 ipcsum", ((p.f[24] << 8) | p.f[25]).toString(16).toUpperCase().padStart(4, "0"), t.get("hop2 ipcsum"));
t.eq("hop2 fcs", hx(p.f.slice(-4)), t.get("hop2 fcs"));
t.checkTags("ch03_hop", p.frames);
p = A.path({ ttl: 64, hops: 1, corrupt: false });
t.eq("hop1 ttl", p.ttl, t.get("hop1 ttl"));
t.eq("hop1 ipcsum", ((p.f[24] << 8) | p.f[25]).toString(16).toUpperCase().padStart(4, "0"), t.get("hop1 ipcsum"));
{ const q = A.path({ ttl: 64, hops: 2, corrupt: false }); const fr = q.frames.find((x) => x.node === "R1" && [].concat(x.at).includes("fcs"));
  t.eq("hop1 head", hx(fr.f.slice(0, 34)), t.get("hop1 head")); t.eq("hop1 fcs", hx(fr.f.slice(-4)), t.get("hop1 fcs")); }
p = A.path({ ttl: 2, hops: 2, corrupt: false });
t.eq("ttl2 hop2 dropped", p.dropped === "ttl" ? -1 : 0, t.get("ttl2 hop2"));
t.checkTags("ch03_hop", p.frames);
p = A.path({ ttl: 64, hops: 2, corrupt: true });
t.eq("corrupt dropped by FCS", p.dropped, "fcs");
t.checkTags("ch03_hop", p.frames);
// контролна сума: стъпков вариант = C
for (const bs of ["AB CD EF", "FF FF 00 01", "45 00 00 53"]) {
  const v = t.ch.algos.csum(bs.split(" ").map((x) => parseInt(x, 16)), bs.split(" ").length);
  t.eq("csum " + bs, v.toString(16).toUpperCase().padStart(4, "0"), t.get(`csum(${bs})`));
}
t.done();
