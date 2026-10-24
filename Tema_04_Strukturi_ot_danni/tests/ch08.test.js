const t = require("../../tools/harness.js")(__dirname + "/..", "ch08_extra.js", "08_extra.c");
const A = t.ch.algos;
const H = { h1: "push 2 7 4 10 9 8, push 1", h2: "push 5 3 8 1 9 2, pop, pop, pop", h3: "pop, push 4, pop, pop", h4: "push 9 8 7 6 5 4 3 2 1, pop, pop, pop, pop, pop, pop, pop, pop, pop" };
for (const k in H) { const r = A.heap({ prog: H[k] }); t.eq(`${k} out`, r.out, t.get(`${k} out`)); t.eq(`${k} arr`, r.arr, t.get(`${k} arr`)); t.eq(`${k} swaps`, r.swaps, t.get(`${k} swaps`)); t.checkTags("ch08_heap", r.frames); }
const V = { a1: "30 20 10", a2: "30 10 20", a3: "10 20 30", a4: "10 30 20", a5: "1 2 3 4 5 6 7", a6: "50 20 70 10 30 25 5 1" };
for (const k in V) { const r = A.avl({ keys: V[k] }); for (const f of ["pre", "in", "height", "rot"]) t.eq(`${k} ${f}`, r[f], t.get(`${k} ${f}`)); t.checkTags("ch08_avl", r.frames); }
let r = A.trie({ words: "car cat dog", query: "ca" }); t.eq("trie ca not word", r.isWord, false); t.eq("trie nodes", r.nodes, 8);
r = A.trie({ words: "car cat dog ca", query: "ca" }); t.eq("trie ca word", r.isWord, true);
t.done();
