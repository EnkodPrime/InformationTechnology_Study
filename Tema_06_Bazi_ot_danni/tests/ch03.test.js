const t = require("../../tools/harness.js")(__dirname + "/..", "ch03_algebra.js", "03_algebra.c");
const A = t.ch.algos;
const STUD = "sid name pid|1 Ana INF|2 Boris MAT|3 Vera INF|4 Galin FIZ";
const PROG = "pid pname|INF Informatika|MAT Matematika|PED Pedagogika";
const ENR = "sid cid grade|1 C1 6|1 C2 5|2 C1 4|3 C2 3";
const R1 = "A B C|1 x p|2 x q|3 y p", R2 = "A B C|2 x q|3 y p|4 z r";
const fmt = (r) => r.rows.map((x) => x.join(",")).join(";");
const KEY = { sel: "ch03_select", proj: "ch03_project", prod: "ch03_product", join: "ch03_join", union: "ch03_setops", diff: "ch03_setops", inter: "ch03_setops" };
function chk(name, args) {
  const r = A.run(args);
  t.eq(name, fmt(r), t.get(name));
  t.eq(name + " cols", r.cols.join(","), t.get(name + " cols"));
  t.eq(name + " cmp", r.cmp, t.get(name + " cmp"));
  t.checkTags(KEY[args.op], r.frames);
}
chk("sel1", { op: "sel", R: STUD, cond: "pid = INF" });
chk("sel2", { op: "sel", R: STUD, cond: "sid > 2" });
chk("sel3", { op: "sel", R: ENR, cond: "grade >= 5" });
chk("sel4", { op: "sel", R: ENR, cond: "cid != C1" });
chk("pr1", { op: "proj", R: STUD, cols: "pid", bag: false });
chk("pr2", { op: "proj", R: STUD, cols: "pid", bag: true });
chk("pr3", { op: "proj", R: ENR, cols: "cid sid", bag: false });
chk("px1", { op: "prod", R: "sid name|1 Ana|2 Boris", S: "cid title|C1 Bazi|C2 Algo|C3 Mrezhi" });
chk("px2", { op: "prod", R: STUD, S: PROG });
chk("j1", { op: "join", R: STUD, S: PROG });
chk("j2", { op: "join", R: STUD, S: ENR });
chk("j3", { op: "join", R: "A B|1 x|2 x", S: "B C|x p|x q" });
chk("u1", { op: "union", R: R1, S: R2 });
chk("d1", { op: "diff", R: R1, S: R2 });
chk("i1", { op: "inter", R: R1, S: R2 });
chk("d2", { op: "diff", R: R2, S: R1 });
let threw = 0; try { A.run({ op: "union", R: R1, S: "A B|1 x" }); } catch (e) { threw = 1; }
t.eq("compat2 (incompatible throws)", threw ? 0 : 1, t.get("compat2"));
threw = 0; try { A.run({ op: "sel", R: STUD, cond: "zzz = 1" }); } catch (e) { threw = 1; } t.eq("bad attr throws", threw, 1);
threw = 0; try { A.run({ op: "sel", R: "A B|1 x|1 x", cond: "A = 1" }); } catch (e) { threw = 1; } t.eq("dup row throws", threw, 1);
t.done();
