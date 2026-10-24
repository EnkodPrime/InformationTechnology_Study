const t = require("../../tools/harness.js")(__dirname + "/..", "ch08_internet.js", "08_url.c");
const A = t.ch.algos;
for (const u of ["https://example.org/course?id=5", "http://example.org:8080/a/b#top", "https://api.example.org", "ftp://example.org/x", "https://example.org:99999/"]) {
  const r = A.url({ u }); t.eq("url " + u, r.result, t.get(`url(${u})`)); t.checkTags("ch08_url", r.frames);
}
t.eq("cold h1 RTT", A.open({ ver: "h1", rtt: 40, dnsCache: false, reuse: false }).rtts, 5);
t.eq("cold h3 RTT", A.open({ ver: "h3", rtt: 40, dnsCache: false, reuse: false }).rtts, 4);
t.eq("warm RTT", A.open({ ver: "h1", rtt: 40, dnsCache: true, reuse: true }).rtts, 2);
t.done();
