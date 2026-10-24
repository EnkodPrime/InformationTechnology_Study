const t = require("./harness")("ch08_greedy.js", "08_greedy.c");
const A = t.ch.algos;
const NAMES = "ABCDEFGHIJKLMNOP";
// интервали: всяка стратегия, брой и избрани id
for (const ivs of ["0-2 2-4 4-6 0-5", "0-10 1-2 3-4 5-6", "0-5 4-7 6-11", "0-2 2-4 4-6 6-8 1-3 1-3 1-3 5-7 5-7 5-7 3-5", "1-4 3-5 0-6 5-7 3-9 5-9 6-10 8-11 8-12 2-14 12-16"]) {
  for (const s of ["end", "start", "len", "conf"]) {
    const r = A.iv_select({ ivs, strat: s });
    const line = t.get(`iv[${ivs}].${s}`);
    t.eq(`iv[${ivs}].${s}`, `${r.result} | ${r.chosen.join(" ")}`.trim(), line.trim());
    t.checkTags(s === "end" ? "ch08_iv_end" : "ch08_iv_key", r.frames);
  }
}
// очаквани от материала
t.eq("пример A,B,C = 3", A.iv_select({ ivs: "0-2 2-4 4-6 0-5", strat: "end" }).chosen.map((i) => NAMES[i]).join(""), "ABC");
// замяна
for (const f of "ABCDEFGH") { const r = A.exchange({ ivs: "1-4 3-5 0-6 5-7 3-8 5-9 6-10 8-11", first: f }); t.eq("exchange " + f, r.after, r.before); }
// монети
for (const [d, a] of [["1,3,4", 6], ["1,2,5,10,20,50", 88], ["1,5,10,25", 63], ["1,6,10", 12], ["3,5", 7], ["1,7,10", 15]]) {
  const den = d.replace(/,/g, " ");
  const g = A.coins_greedy({ den, amount: a });
  t.eq(`coins[${d};${a}].greedy`, `${g.result} | ${g.result > 0 ? g.used.join(" ") : ""}`.trim(), t.get(`coins[${d};${a}].greedy`));
  t.checkTags("ch08_coins_greedy", g.frames);
  const o = A.coins_dp({ den, amount: a });
  t.eq(`coins[${d};${a}].dp`, `${o.result} | ${o.pick.join(" ")}`.trim(), t.get(`coins[${d};${a}].dp`));
  t.eq(`coins[${d};${a}].table`, o.table.join(" "), t.get(`coins[${d};${a}].table`));
  t.checkTags("ch08_coins_dp", o.frames);
  t.eq(`coins[${d}].counter`, A.coins_counter({ den }).result, t.get(`coins[${d}].counter`));
}
// Дейкстра / Белман–Форд
const fmt = (a) => a.map((x) => (x === Infinity ? "inf" : x)).join(" ");
for (const g of ["AB:7 AC:9 AF:14 BC:10 BD:15 CD:11 CF:2 DE:6 FE:9", "AB:2 AC:5 CB:-4 BD:3 DE:1 CF:6", "AB:4 BC:1 DE:2", "AB:1 BC:-3 CA:1 CD:2"]) {
  const r = A.dijkstra({ edges: g, src: "A" });
  t.eq(`dijkstra[${g}]`, fmt(r.dist), t.get(`dijkstra[${g}]`));
  t.eq(`prev[${g}]`, r.prev.join(" "), t.get(`prev[${g}]`));
  t.eq(`bellman[${g}]`, r.bf ? fmt(r.bf) : "negcycle", t.get(`bellman[${g}]`));
  t.checkTags("ch08_dijkstra", r.frames);
}
let maxF = 0;
for (const f of [A.iv_select({ ivs: "0-2 1-3 2-4 3-5 4-6 5-7 6-8 7-9 8-10 9-11 10-12 11-13 12-14 13-15", strat: "conf" }), A.coins_dp({ den: "1 2 5 10 20 50", amount: 100 }), A.dijkstra({ edges: "AB:1 AC:1 AD:1 AE:1 AF:1 BC:1 BD:1 BE:1 BF:1 CD:1 CE:1 CF:1 DE:1 DF:1 EF:1", src: "A" })]) maxF = Math.max(maxF, f.frames.length);
t.eq("кадри < 3000", maxF < 3000, true);
t.done();
