const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_queue.js", "03_queue.c");
const A = t.ch.algos;
const R = { r1: ["enq 4, enq 7, enq 2, deq, front", 6, 0, false], r2: ["enq 1, enq 2, enq 3, enq 4, deq, deq, deq, enq 5, enq 6, enq 7, enq 8, enq 9", 6, 3, false], r3: ["enq 1, enq 2, enq 3, enq 4, enq 5, deq, deq", 4, 0, true], r4: ["deq, front, enq 9, deq, deq", 3, 2, false] };
for (const k in R) { const [prog, C, head0, ow] = R[k]; const r = A.ring({ prog, C, head0, ow }); for (const f of ["out", "head", "size"]) t.eq(`${k} ${f}`, r[f], t.get(`${k} ${f}`)); t.checkTags("ch03_ring", r.frames); }
const Q = { q1: ["enq 1, enq 2, enq 3, enq 4, deq, enq 5, enq 6", 4], q2: ["deq, enq 7, deq, deq", 5] };
for (const k in Q) { const r = A.ring2({ prog: Q[k][0], C: Q[k][1] }); for (const f of ["out", "head", "tail"]) t.eq(`${k} ${f}`, r[f], t.get(`${k} ${f}`)); t.checkTags("ch03_ring2", r.frames); }
const L = { l1: "enq 4, enq 7, enq 2, deq, deq", l2: "enq 1, deq, deq, enq 5" };
for (const k in L) { const r = A.linked({ prog: L[k] }); t.eq(`${k} out`, r.out, t.get(`${k} out`)); t.eq(`${k} len`, r.len, t.get(`${k} len`)); t.eq(`${k} rear_null`, r.rearNull, t.get(`${k} rear_null`)); t.checkTags("ch03_linked", r.frames); }
const D = { d1: ["pushb 1, pushb 2, pushf 0, pushf 9, popb, popf, popf", 5], d2: ["pushf 1, pushf 2, pushf 3, pushf 4, pushb 5, popb, popb", 4] };
for (const k in D) { const r = A.deque({ prog: D[k][0], C: D[k][1] }); for (const f of ["out", "head", "size"]) t.eq(`${k} ${f}`, r[f], t.get(`${k} ${f}`)); t.checkTags("ch03_deque", r.frames); }
const o = A.order({ vals: "4 7 2" }); t.eq("order stack", o.stack, "2 7 4"); t.eq("order queue", o.queue, "4 7 2");
t.done();
