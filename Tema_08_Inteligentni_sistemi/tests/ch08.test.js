const t = require("../../tools/harness.js")(__dirname + "/..", "ch08_pravila.js", "08_rules.c");
const A = t.ch.algos;
const KB1 = "R1: T>80 -> прегряване; R2: липсва_захранване -> провери_захранващия_път; R3: има_захранване & не_отговаря -> провери_връзката; R4: не_отговаря -> рестартирай; R5: прегряване & провери_връзката -> спри_и_охлади";
const KB2 = "R1: A & B -> C\nR2: C -> D\nR3: D & E -> G\nR4: F -> G\nR5: G -> H";
const KB3 = "R1: P -> Q; R2: Q -> P; R3: S -> P";
const FW = { f1: [KB1, "T=90 има_захранване не_отговаря", 0, 1], f2: [KB1, "T=90 има_захранване не_отговаря", 1, 1], f3: [KB1, "T=70 липсва_захранване", 0, 1], f4: [KB2, "A B E", 0, 1], f5: [KB2, "F", 1, 1], f6: [KB1, "T=90 има_захранване не_отговаря", 0, 0], f7: [KB2, "A B E", 1, 1] };
for (const k in FW) {
  const [rules, facts, strategy, refraction] = FW[k];
  const r = A.forward({ rules, facts, strategy, refraction: !!refraction, limit: 12 });
  t.eq(`${k} result`, r.result, t.get(`${k} result`));
  t.eq(`${k} wm`, r.wm, t.get(`${k} wm`));
  t.eq(`${k} fired`, r.fired, t.get(`${k} fired`));
  t.eq(`${k} cycles`, r.cycles, t.get(`${k} cycles`));
  t.eq(`${k} tests`, r.tests, t.get(`${k} tests`));
  t.checkTags("ch08_forward", r.frames);
}
const BW = { b1: [KB1, "T=90 има_захранване не_отговаря", "спри_и_охлади"], b2: [KB1, "T=70 има_захранване не_отговаря", "спри_и_охлади"], b3: [KB2, "A B E", "H"], b4: [KB2, "F", "H"], b5: [KB3, "S", "Q"], b6: [KB3, "", "Q"] };
for (const k in BW) {
  const [rules, facts, goal] = BW[k];
  const r = A.backward({ rules, facts, goal });
  t.eq(`${k} proved`, r.proved, t.get(`${k} proved`));
  t.eq(`${k} wm`, r.wm, t.get(`${k} wm`));
  t.eq(`${k} fired`, r.fired, t.get(`${k} fired`));
  t.eq(`${k} calls`, r.calls, t.get(`${k} calls`));
  t.eq(`${k} tests`, r.tests, t.get(`${k} tests`));
  t.checkTags("ch08_backward", r.frames);
}
for (const bad of ["A B", "R1: -> X", "R1: A ->"]) { try { A.forward({ rules: bad, facts: "", strategy: 0, refraction: true }); t.eq("bad " + bad, 0, 1); } catch (e) { t.eq("bad " + bad, 1, 1); } }
const ex = A.explain(A.backward({ rules: KB1, facts: "T=90 има_захранване не_отговаря", goal: "спри_и_охлади" }).E, "спри_и_охлади");
t.eq("explain rule", ex.rule, "R5");
t.done();
