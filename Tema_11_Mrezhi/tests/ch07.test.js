const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_uslugi.js", "07_dns.c");
const A = t.ch.algos;
for (const n of ["www.example.org", "example.org", "a.b.example.com"]) { const r = A.qname({ name: n }); t.eq("qname " + n, r.bytes, t.get(`qname(${n})`)); t.checkTags("ch07_qname", r.frames); }
const Q = ["www.example.org@0", "www.example.org@10", "api.example.org@20", "www.example.com@30", "nope.example.org@40", "api.example.org@100", "www.example.org@290", "www.example.org@400"];
const r = A.dns({ queries: Q.join(", ") });
Q.forEach((q, i) => t.eq("dns " + q, r.res[i], t.get(`dns(${q})`)));
t.checkTags("ch07_resolve", r.frames);
// DORA и HTTP нямат C — проверка на поведението
let d = A.dora({ lease: 3600, t: 1800 }); t.eq("dora renew", d.frames.some((f) => f.renew), true);
d = A.dora({ lease: 3600, t: 0 }); t.eq("dora 4 msgs", d.frames[d.frames.length - 1].M.length, 4);
t.eq("http 201", A.http({ method: "POST", path: "/measurements", host: "h", body: '{"temperature":23.5}' }).status, "201 Created");
t.eq("http 404", A.http({ method: "GET", path: "/x", host: "h", body: "" }).status, "404 Not Found");
t.done();
