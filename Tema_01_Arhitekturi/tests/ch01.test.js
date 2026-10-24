const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_arch.js", "01_bus.c");
const A = t.ch.algos;
for (const p of ["LAAS", "AAAA", "LLLL", "LASALASA", "L", "SALSAL"])
  for (const arch of ["vonneumann", "harvard"]) {
    const r = A.run_bus({ prog: p, arch });
    t.eq(`${arch}(${p})`, r.result.join(" "), t.get(`${arch}(${p})`));
    t.checkTags("ch01_bus", r.frames);
  }
// формулите от хинта
for (const p of ["LAAS", "AAAA", "LLLL", "SALSAL"]) {
  const ls = p.replace(/A/g, "").length;
  t.eq(`fN(${p})`, A.run_bus({ prog: p, arch: "vonneumann" }).result[0], p.length + ls);
  t.eq(`H(${p})`, A.run_bus({ prog: p, arch: "harvard" }).result[0], p.length + (p.at(-1) === "A" ? 0 : 1));
}
let err = ""; try { A.run_bus({ prog: "LXA", arch: "harvard" }); } catch (e) { err = e.message; } t.eq("грешен вход", err.length > 0, true);
t.done();
