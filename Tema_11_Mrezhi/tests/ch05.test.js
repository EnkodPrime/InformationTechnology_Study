const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_ip.js", "05_ip.c");
const A = t.ch.algos;
for (const [ip, p] of [["192.168.10.34", 24], ["192.168.10.70", 26], ["10.1.2.3", 8], ["172.16.5.200", 20], ["192.0.2.7", 31], ["192.0.2.7", 32], ["198.51.100.130", 25], ["203.0.113.9", 0]]) {
  const r = A.subnet({ ip, prefix: p }); t.eq(`sub ${ip}/${p}`, r.result, t.get(`sub(${ip}/${p})`)); t.checkTags("ch05_subnet", r.frames);
}
const RT = "0.0.0.0/0 -> d\n10.0.0.0/8 -> R2\n10.1.0.0/16 -> R3\n10.1.2.0/24 -> eth1\n192.168.10.0/24 -> eth0";
for (const d of ["10.1.2.3", "10.1.9.9", "10.200.0.1", "8.8.8.8", "192.168.10.70"]) { const r = A.lpm({ routes: RT, dst: d }); t.eq("lpm " + d, r.result, t.get(`lpm(${d})`)); t.checkTags("ch05_lpm", r.frames); }
// редът в таблицата не влияе на избора (обърнат ред)
const rev = RT.split("\n").reverse().join("\n"), idx = (s, i) => s.split("\n").indexOf(RT.split("\n")[i]);
for (const d of ["10.1.2.3", "10.1.9.9", "8.8.8.8"]) { const r = A.lpm({ routes: rev, dst: d }); t.eq("lpm rev " + d, r.result, idx(rev, +t.get(`lpm(${d})`))); }
const r = A.nat({ events: "out 192.168.10.34:51000, out 192.168.10.35:51000, out 192.168.10.34:51000, out 192.168.10.34:51001, in 40001, in 45000", pub: "203.0.113.5" });
t.eq("nat1", r.res[0], t.get("nat(192.168.10.34:51000)")); t.eq("nat2", r.res[1], t.get("nat(192.168.10.35:51000)"));
t.eq("nat3", r.res[2], t.get("nat(192.168.10.34:51000) again")); t.eq("nat4", r.res[3], t.get("nat(192.168.10.34:51001)"));
t.eq("natin1", r.res[4], t.get("natin(40001)")); t.eq("natin2", r.res[5], t.get("natin(45000)"));
t.checkTags("ch05_nat", r.frames);
t.done();
