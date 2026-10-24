const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_posrednik.js", "03_arp.c");
const A = t.ch.algos;
const SC = { s1: "r 1 01, s 1, r 1 66, s 1, r 1 01, s 1", s2: "s 1, r 1 66, r 20 66, s 1, s 20", s3: "r 1 01, r 66 66, r 1 66, s 1, s 66" };
for (let m = 0; m < 3; m++) for (const k in SC) {
  const r = A.arp({ events: SC[k], mode: m });
  t.eq(`${k} m${m} delivered`, r.delivered, t.get(`${k} m${m} delivered`));
  t.eq(`${k} m${m} dropped`, r.dropped, t.get(`${k} m${m} dropped`));
  t.eq(`${k} m${m} kept`, r.kept, t.get(`${k} m${m} kept`));
  t.eq(`${k} m${m} gw`, r.gw, t.get(`${k} m${m} gw`));
  t.checkTags("ch03_arp", r.frames);
}
let threw = 0; try { A.arp({ events: "x 1", mode: 0 }); } catch (e) { threw = 1; } t.eq("arp rejects bad event", threw, 1);
t.done();
