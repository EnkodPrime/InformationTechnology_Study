const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_zashtita.js", "07_defense.c");
const A = t.ch.algos;
const RULES = "deny any 203.0.113.0/24 0-65535; allow tcp 0.0.0.0/0 443; allow tcp 10.0.0.0/8 22; allow udp 10.0.0.0/8 53";
const P = [["tcp", "198.51.100.7", 443], ["tcp", "203.0.113.9", 443], ["tcp", "10.1.2.3", 22], ["tcp", "198.51.100.7", 22], ["udp", "10.9.9.9", 53], ["udp", "192.0.2.1", 53]];
P.forEach(([proto, src, dport], i) => { for (const def of [0, 1]) {
  const r = A.fw({ rules: RULES, proto, src, dport, def: String(def) });
  t.eq(`fw ${i} def${def}`, `${r.action} ${r.hit} ${r.cmp}`, t.get(`fw ${i} def${def}`)); t.checkTags("ch07_fw", r.frames);
} });
const SW = "allow tcp 0.0.0.0/0 443; deny any 203.0.113.0/24 0-65535; allow tcp 10.0.0.0/8 22; allow udp 10.0.0.0/8 53";
const r2 = A.fw({ rules: SW, proto: "tcp", src: "203.0.113.9", dport: 443, def: "1" });
t.eq("fw swapped 1", `${r2.action} ${r2.hit} ${r2.cmp}`, t.get("fw swapped 1"));
const PL = ["GET /index.html", "GET /?q=<script", "q=DROP TABLE", "GET /a/../b", "q=DROP  TABLE", "GET /?q=<SCRIPT"];
PL.forEach((p, i) => { const r = A.sig({ payload: p, sigs: "<script|../|DROP TABLE" }); t.eq(`sig ${i}`, r.result, t.get(`sig ${i}`)); t.checkTags("ch07_ids", r.frames); });
for (const x of [46, 52, 120, 30]) for (const k of [2, 3]) {
  const r = A.anom({ base: "40 42 38 45 41 39 44 43", x, k });
  t.eq(`anom ${x} k${k}`, `${r.result} ${r.thr}`, t.get(`anom ${x} k${k}`)); t.checkTags("ch07_ids", r.frames);
}
let threw = 0; try { A.fw({ rules: "permit all", proto: "tcp", src: "1.2.3.4", dport: 1, def: "1" }); } catch (e) { threw = 1; } t.eq("fw rejects bad rule", threw, 1);
t.done();
