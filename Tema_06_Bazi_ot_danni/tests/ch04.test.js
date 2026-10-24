const t = require("../../tools/harness.js")(__dirname + "/..", "ch04_sql.js", "04_sql.c");
const A = t.ch.algos;
const S3 = "1 Ana; 2 Boris; 3 Vera", E3 = "1 101 6; 1 102 4; 3 101 5";
const S2 = "1 Ana; 2 Boris", E2 = "1 101 6";
const cases = [["q1", S2, E2, 0, 5, 0], ["q2", S2, E2, 0, 5, 1], ["q3", S3, E3, 0, 5, 0], ["q4", S3, E3, 1, 5, 0], ["q5", S3, E3, 2, 5, 0], ["q6", S3, E3, 1, 5, 1], ["q7", S3, E3, 2, 5, 1], ["q8", S3, "", 0, 5, 0]];
for (const [k, studs, enr, place, g, agg] of cases) {
  const r = A.query({ studs, enr, place, g, agg });
  t.eq(k, r.counts, t.get(k));
  t.eq(k + " groups", r.groups, t.get(k + " groups"));
  t.checkTags("ch04_leftjoin", r.frames);
}
t.eq("and(U,F)", A.and(1, 0), t.get("and(U,F)"));
t.eq("or(U,T)", A.or(1, 2), t.get("or(U,T)"));
t.eq("not(U)", A.not(1), t.get("not(U)"));
t.eq("ge(NULL,5)", A.ge(0, true, 5), t.get("ge(NULL,5)"));
for (const op2 of ["—", "AND", "OR", "NOT"]) for (const y of ["T", "U", "F"]) for (const xn of [true, false]) {
  const r = A.tvl({ x: 4, xnull: xn, g: 5, op2, y }); t.checkTags("ch04_tvl", r.frames);
}
t.done();
