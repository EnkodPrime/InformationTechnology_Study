const t = require("../../tools/harness.js")(__dirname + "/..", "ch05_pipeline.js", "05_pipeline.c");
const A = t.ch.algos;
const PROGS = ["A1,2,3 A4,5,6 A7,8,9", "L1,2 A3,1,4", "A1,2,3 A4,1,5 A6,1,7 A8,1,9", "L1,2 A3,1,4 A5,3,1 S6,5", "A1,2,3 B1,4,T A5,6,7 A8,5,9",
  "A1,2,3 B1,4,N A5,6,7 A8,5,9", "L1,2 L3,4 A5,1,3 S6,5 A7,8,9", "A1,0,0 A2,0,0 A3,0,0 A4,0,0 A5,0,0 A6,0,0 A7,0,0 A1,0,0 A2,0,0 A3,0,0", "A1,2,3 A4,5,1"];
PROGS.forEach((prog, q) => {
  for (let mode = 0; mode < 8; mode++) {
    const fwd = mode & 1, pred = (mode >> 1) & 1, uni = (mode >> 2) & 1;
    const r = A.pipeline({ prog, fwd: !!fwd, predict: !!pred, unified: !!uni });
    const k = `pipe(${q},${fwd}${pred}${uni})`;
    t.eq(k, r.result, t.get(k));
    t.checkTags("ch05_pipe", r.frames);
  }
});
// числата от ръководството
t.eq("k=5,n=10 -> 14", A.ideal({ k: 5, n: 10 }).pipe, 14);
t.eq("k=5,n=10 без -> 50", A.ideal({ k: 5, n: 10 }).seq, 50);
t.eq("n=3: I1 в такт 5, I3 в такт 7", A.pipeline({ prog: "A1,0,0 A2,0,0 A3,0,0", fwd: true }).wbCycle.join(" "), "5 6 7");
t.eq("LOAD->ADD с препращане: 1 изчакване", A.pipeline({ prog: "L1,2 A3,1,4", fwd: true }).s.data_stalls, 1);
t.eq("LOAD->ADD без препращане: 2", A.pipeline({ prog: "L1,2 A3,1,4", fwd: false }).s.data_stalls, 2);
t.done();
