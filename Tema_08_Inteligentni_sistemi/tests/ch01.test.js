const t = require("../../tools/harness.js")(__dirname + "/..", "ch01_modelirane.js", null);
const A = t.ch.algos;
let r = A.unfold({ edges: "A B, A C, B D, C D", start: "A", depth: 2, directed: true, dedup: false });
t.eq("schema3 nodes", r.nodes, 5); t.eq("schema3 states", r.states, 4); t.eq("schema3 repeats", r.repeats, 1);
r = A.unfold({ edges: "A B, B A", start: "A", depth: 5, directed: true, dedup: false });
t.eq("cycle nodes", r.nodes, 6); t.eq("cycle states", r.states, 2);
r = A.unfold({ edges: "A B, B A", start: "A", depth: 5, directed: true, dedup: true });
t.eq("cycle dedup nodes", r.nodes, 3);
t.done();
