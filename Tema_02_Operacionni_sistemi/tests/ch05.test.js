const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_deadlock.js", "05_deadlock.c");
const A = t.ch.algos;
for (const [nm, hold, want] of [["g1", "1 2", "2 1"], ["g2", "1 2 -", "2 3 -"], ["g3", "1 2 3 4", "2 3 1 1"]]) {
  const r = A.cycle({ hold, want });
  t.eq(nm + ".cycle", r.cycle, t.get(nm + ".cycle"));
  t.checkTags("s05_cycle", r.frames);
}
const base = { avail: "3 3 2", max: "7 5 3; 3 2 2; 9 0 2; 2 2 2; 4 3 3", alloc: "0 1 0; 2 0 0; 3 0 2; 2 1 1; 0 0 2" };
let r = A.banker({ ...base, req: "" });
t.eq("b0.safe", r.safe, t.get("b0.safe")); t.eq("b0.order", r.order, t.get("b0.order")); t.checkTags("s05_banker", r.frames);
r = A.banker({ ...base, req: "P1: 1 0 2" });
t.eq("b1.req", r.req, t.get("b1.req")); t.eq("b1.safe", r.safe, t.get("b1.safe")); t.eq("b1.order", r.order, t.get("b1.order")); t.checkTags("s05_banker", r.frames);
const b1 = { avail: "2 3 0", max: base.max, alloc: "0 1 0; 3 0 2; 3 0 2; 2 1 1; 0 0 2" };
r = A.banker({ ...b1, req: "P0: 0 2 0" }); t.eq("b2.req", r.req, t.get("b2.req")); t.checkTags("s05_banker", r.frames);
r = A.banker({ ...b1, req: "P4: 3 3 0" }); t.eq("b3.req", r.req, t.get("b3.req")); t.checkTags("s05_banker", r.frames);
r = A.banker({ ...base, req: "P0: 8 0 0" }); t.eq("b4.req", r.req, t.get("b4.req")); t.checkTags("s05_banker", r.frames);
t.done();
