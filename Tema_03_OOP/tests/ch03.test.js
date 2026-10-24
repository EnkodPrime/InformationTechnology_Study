const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_inherit.js", "03_inheritance.cpp");
const A = t.ch.algos;
let r = A.upcast({ target: "all" }); t.eq("upcast", r.result, t.get("upcast")); t.checkTags("ch03_layout", r.frames);
t.eq("off(Logger)", "0 4 8 16", t.get("off(Logger)")); t.eq("sizeof(Logger)", 24, t.get("sizeof(Logger)"));
r = A.slicing({ how: "all" }); t.eq("slice", r.result, t.get("slice")); t.checkTags("ch03_slice", r.frames);
r = A.diamond({ virt: false }); t.eq("diamondA", r.result, t.get("diamondA")); t.checkTags("ch03_diamond", r.frames);
const dA = r.devices;
r = A.diamond({ virt: true }); t.eq("diamondV", r.result, t.get("diamondV")); t.checkTags("ch03_diamond", r.frames);
t.eq("devices", dA + " " + r.devices, t.get("devices"));
const c1 = A.compose({ seq: "T2" }), c2 = A.compose({ seq: "P1" });
t.eq("compose", c1.result + " " + c2.result, t.get("compose")); t.checkTags("ch03_compose", c1.frames); t.checkTags("ch03_compose", c2.frames);
const ups = [];
for (const k of ["public", "protected", "private"]) {
  r = A.inherit_access({ kind: k });
  t.eq(`outside(${k})`, r.out, t.get(`outside(${k})`));
  t.eq(`self(${k})`, r.self, t.get(`self(${k})`));
  t.eq(`inside(${k})`, r.inside, t.get(`inside(${k})`));
  ups.push(r.up);
}
t.eq("upcast_ok", ups.join(" "), t.get("upcast_ok"));
/* кадрите носят натрупаната следа като списък (draw() рисува ленти от нея) */
for (const k in A) { try { const rr = A[k]({ prog: "d1", where: "1", script: k === "shapes" ? "R 3 4" : "a(3); b = a", virt: false, mode: "virtual", seq: "T2" }); if (rr && rr.frames && rr.frames.some((f) => "ev" in f)) t.eq(k + ": ev е списък", rr.frames.every((f) => Array.isArray(f.ev)), true); } catch (e) { /* алгоритъм с други входове */ } }
t.done();
