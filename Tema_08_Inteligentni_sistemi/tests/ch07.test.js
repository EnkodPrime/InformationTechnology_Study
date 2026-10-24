const t = require("../../tools/harness.js")(__dirname + "/..", "ch07_mrezhi.js", "07_frames.c");
const A = t.ch.algos;
const Q = [["канарче", "лети", 0], ["пингвин", "лети", 0], ["Туити", "диша", 0], ["Туити", "цвят", 0], ["пингвин", "цвят", 0], ["Туити", "лети", 0], ["пингвин", "покритие", 0], ["канарче", "плува", 0], ["крило", "лети", 0], ["крило", "лети", 1], ["хриле", "плува", 1], ["крило", "брой", 0]];
for (const [f, s, w] of Q) {
  const r = A.lookup({ frame: f, slot: s, wrong: !!w });
  const k = `${f}.${s}${w ? " wrong" : ""}`;
  t.eq(k, r.value, t.get(k));
  t.eq(k + " from", r.from, t.get(k + " from"));
  t.eq(k + " steps", r.steps, t.get(k + " steps"));
  t.checkTags("ch07_lookup", r.frames);
}
t.eq("frameView пингвин лети", A.frameView("пингвин").лети.v, "не");
t.eq("frameView shadow", A.frameView("пингвин").лети.shadowed.length, 1);
t.done();
