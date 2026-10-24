const t = require("./harness")("ch01_algorithm.js", "01_algorithm.c");
const A = t.ch.algos, arr = "7 3 9 4 1 8";
let r = A.linear_search({ arr, key: 4 }); t.eq("linear_search(4)", r.result, t.get("linear_search(4)")); t.checkTags("linear_search", r.frames);
r = A.linear_search({ arr, key: 5 }); t.eq("linear_search(5)", r.result, t.get("linear_search(5)")); t.checkTags("linear_search", r.frames);
for (const [a, b] of [[84, 18], [1071, 462], [17, 5]]) { r = A.gcd_euclid({ a, b }); t.eq(`gcd(${a}, ${b})`, r.result, t.get(`gcd(${a}, ${b})`)); t.checkTags("gcd_euclid", r.frames); }
r = A.is_even_partial({ x: 6, cap: 10 }); t.eq("is_even(6) halts", r.halted ? 1 : 0, t.get("is_even(6)")); t.checkTags("is_even_partial", r.frames);
r = A.is_even_partial({ x: 7, cap: 10 }); t.eq("is_even(7) never halts", r.halted, false);
t.done();
