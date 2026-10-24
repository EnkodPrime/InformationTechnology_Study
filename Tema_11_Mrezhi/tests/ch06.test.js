const t = require("../../tools/harness.js")(__dirname + "/..", "ch06_transport.js", "06_transport.c");
const A = t.ch.algos;
// TCP: всички редове "seg = ..." от C, в реда на изпълнение
const cseg = t.cout.split("\n").filter((l) => l.startsWith("seg = ")).map((l) => l.slice(6).split(" | ")[0]);
const fmt = (s) => `${s.dir} ${s.flags} seq=${s.seq} ack=${s.ack} len=${s.len}`;
let r = A.tcp({ x: 1000, y: 5000, n: 100, listening: true });
let r2 = A.tcp({ x: 1000, y: 5000, n: 0, listening: false });
const js = r.segs.concat(r2.segs).map(fmt);
t.eq("tcp segments count", js.length, cseg.length);
js.forEach((s, i) => t.eq("seg " + i, s, cseg[i]));
// състоянията след всеки сегмент
const cst = t.cout.split("\n").filter((l) => l.startsWith("seg = ")).map((l) => l.split(" | ")[1]);
const jst = []; for (const R of [r, r2]) { const seen = new Set(); R.frames.forEach((f) => { if (f.sg && !seen.has(f.sg)) { seen.add(f.sg); jst.push(`C=${f.cs} S=${f.ss}`); } }); }
jst.forEach((s, i) => t.eq("state " + i, s, cst[i]));
t.checkTags("ch06_tcp", r.frames); t.checkTags("ch06_tcp", r2.frames);
// рамкиране
const cuts = ["10", "1 4 5", "2 2 2 4", "7 3"];
cuts.forEach((c, i) => { const q = A.frame({ msgs: "AB CD XYZ", cuts: c }); t.eq("frame" + i, q.res, t.get("frame" + i)); t.checkTags("ch06_frame", q.frames); });
// ARQ
for (const [m, N, W, L] of [["gbn", 8, 4, "2"], ["sr", 8, 4, "2"], ["gbn", 10, 4, "2,5"], ["sr", 10, 4, "2,5"], ["gbn", 6, 3, ""], ["gbn", 10, 1, "0,1,7"], ["gbn", 10, 5, "0,1,7"], ["sr", 10, 5, "0,1,7"]]) {
  const q = A.arq({ N, W, lost: L.replace(/,/g, " "), mode: m });
  t.eq(`${m}(${N},${W},{${L}})`, `${q.tx} to=${q.to}`, t.get(`${m}(${N},${W},{${L}})`)); t.checkTags("ch06_arq", q.frames);
}
t.done();
