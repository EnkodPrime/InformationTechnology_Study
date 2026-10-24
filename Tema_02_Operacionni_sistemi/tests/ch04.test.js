const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_sinhronizacia.js", "04_sinhronizacia.c");
const A = t.ch.algos;
for (const [k, m, sc] of [[1, 0, "ABABAB"], [1, 0, "AAABBB"], [3, 0, "AABBAABBAB"], [1, 1, "ABABABABAB"], [3, 1, "AABBAABBAB"]]) {
  const r = A.race({ k, mutex: !!m, sched: sc });
  const key = `race(${k},${m},${sc})`;
  t.eq(key, r.result, t.get(key));
  if (m) t.eq(key + ".blocked", r.blocked, t.get(key + ".blocked"));
  t.checkTags("s04_race", r.frames);
}
const sc = ["PPPPPPCCCCCC", "CCPPPPPPPPPPPPPPPPPPCCCCCC", "PPPPPPPPPPPPPPPPPPPPPPPPPPPP", "PCPCPCPCPCPCPCPCPCPCPC"], caps = [2, 2, 3, 1];
sc.forEach((s, i) => {
  const r = A.pc({ cap: caps[i], sched: s });
  t.eq(`pc${i}.produced`, r.produced, t.get(`pc${i}.produced`));
  t.eq(`pc${i}.consumed`, r.consumed, t.get(`pc${i}.consumed`));
  t.eq(`pc${i}.count`, r.count, t.get(`pc${i}.count`));
  t.eq(`pc${i}.pblocked`, r.pb, t.get(`pc${i}.pblocked`));
  t.eq(`pc${i}.cblocked`, r.cb, t.get(`pc${i}.cblocked`));
  t.eq(`pc${i}.sum`, r.sum, t.get(`pc${i}.sum`));
  t.checkTags("s04_pc", r.frames);
});
t.eq("pthread counter", "200000", t.get("pthread_mutex.counter"));
t.done();
