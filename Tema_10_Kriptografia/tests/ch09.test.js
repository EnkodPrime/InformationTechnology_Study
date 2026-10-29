/* Раздел 9 — асиметрични ключове: RSA (Евклид, степенуване), Дифи–Хелман, разлагане — сверка с c/08_asym.c. */
const t = require("../../tools/harness.js")(__dirname + "/..", "ch09_asimetrichni.js", "08_asym.c");
const A = t.ch.algos;
const CASES = [["r1", 61, 53, 17, 65], ["r2", 11, 13, 7, 42], ["r3", 46337, 46327, 65537, 123456789], ["r4", 3, 11, 3, 4]];
for (const [tag, p, q, e, m] of CASES) {
  const k = A.keygen({ p, q, e });
  t.eq(`${tag} n`, k.n, t.get(`${tag} n`)); t.eq(`${tag} phi`, k.phi, t.get(`${tag} phi`)); t.eq(`${tag} d`, k.d, t.get(`${tag} d`));
  t.checkTags("ch09_egcd", k.frames);
  const c = A.crypt({ p, q, e, m, op: "enc" });
  t.eq(`${tag} c`, c.a, t.get(`${tag} c`)); t.eq(`${tag} m2`, c.b, t.get(`${tag} m2`)); t.checkTags("ch09_modpow", c.frames);
  const s = A.crypt({ p, q, e, m, op: "sig" });
  t.eq(`${tag} sig`, s.a, t.get(`${tag} sig`)); t.eq(`${tag} ver`, s.b, t.get(`${tag} ver`)); t.checkTags("ch09_modpow", s.frames);
  const at = A.attack({ n: p * q, e });
  t.eq(`${tag} factor`, at.f, t.get(`${tag} factor`)); t.checkTags("ch09_factor", at.frames);
  t.eq(`${tag} attack d`, at.frames[at.frames.length - 1].rec.d, t.get(`${tag} d`));
}
const bad = A.keygen({ p: 61, q: 53, e: 13 });
t.eq("bad d", bad.d, t.get("bad d")); t.checkTags("ch09_egcd", bad.frames);
t.eq("inv(3,7)", A.modInverse(3, 7), t.get("inv(3,7)")); t.eq("inv(4,8)", A.modInverse(4, 8), t.get("inv(4,8)"));
[[23, 5, 6, 15], [2147483647, 16807, 123456, 654321], [467, 2, 153, 197]].forEach(([p, g, a, b], i) => {
  const r = A.dh({ p, g, a, b, mitm: false });
  t.eq(`dh${i} A`, r.A, t.get(`dh${i} A`)); t.eq(`dh${i} B`, r.B, t.get(`dh${i} B`));
  t.eq(`dh${i} sA`, r.sA, t.get(`dh${i} sA`)); t.eq(`dh${i} sB`, r.sB, t.get(`dh${i} sB`));
  const mm = A.dh({ p, g, a, b, mitm: true, x: 13 });
  t.eq(`dh${i} mitm ключ Алиса = X^a`, mm.sA, A.modPow(A.modPow(g, 13, p), a, p));
});
for (const n of [91, 2147483647, 1022117]) { const r = A.attack({ n, e: 17 }); t.eq(`factor(${n})`, r.f, t.get(`factor(${n})`)); t.checkTags("ch09_factor", r.frames); }
for (const x of [46337, 46327, 2147483647]) t.eq(`prime(${x})`, A.isPrime(x) ? 1 : 0, t.get(`prime(${x})`));
t.eq("frames attack 2^31", A.attack({ n: 2147483647, e: 3 }).frames.length < 400, true);
let threw = 0; for (const bad of [{ p: 60, q: 53, e: 17 }, { p: 61, q: 61, e: 17 }, { p: 61, q: 53, e: 9999 }]) { try { A.keygen(bad); } catch (e) { threw++; } }
t.eq("invalid inputs throw", threw, 3);
t.done();
