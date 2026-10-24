/* Раздел 8 — алчен подход: интервали, монети, аргумент за замяна, Дейкстра. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "полуотворен интервал": { cat: "Методи", t: "Полуотворен интервал [s, e)", en: "Half-open interval", d: "Съдържа началото s, но не и края e. Два интервала [s, e) и [s′, e′) се пресичат точно когато s < e′ и s′ < e.", more: "Затова [0, 2) и [2, 4) НЕ се пресичат — следващият може да започне точно в края на предишния." },
    "избор на интервали": { cat: "Методи", t: "Избор на неприпокриващи се интервали", en: "Interval scheduling", d: "Да се изберат възможно най-много интервали, никои два от които не се пресичат.", more: "Алчно: сортиране по нарастващ край и вземане на всеки съвместим — оптимално, O(n log n) с включено сортиране." },
    "канонична система монети": { cat: "Методи", t: "Канонична система номинали", en: "Canonical coin system", d: "Система номинали, за която алчното „вземи най-голямата възможна монета“ дава минимален брой монети за всяка сума.", more: "1, 2, 5, 10, 20, 50 е канонична; 1, 3, 4 не е (сума 6). Каноничността се доказва за конкретната система — не е общо правило." },
    "алгоритъм на дейкстра": { cat: "Методи", t: "Алгоритъм на Дейкстра", en: "Dijkstra's algorithm", d: "Най-къси пътища от един връх: алчно се избира най-близкият непосетен връх и разстоянието му се обявява за окончателно.", more: "Изисква неотрицателни тегла. Наивно O(V²); с двоична пирамида O((V+E) log V). Реализации: NetworkX dijkstra_path, Boost Graph Library dijkstra_shortest_paths." },
    "релаксация": { cat: "Методи", t: "Релаксация на ребро", en: "Edge relaxation", d: "Ако dist[u] + w(u,v) < dist[v], обновяваме dist[v] и предшественика на v.", more: "Основната операция и при Дейкстра, и при Белман–Форд." },
    "белман–форд": { cat: "Методи", t: "Алгоритъм на Белман–Форд", en: "Bellman–Ford", d: "Най-къси пътища от един връх чрез V−1 кръга релаксация на всички ребра; работи и с отрицателни тегла и открива отрицателни цикли.", more: "O(V·E). Не е алчен — не обявява разстояние за окончателно преди края." },
    "минимално покриващо дърво": { cat: "Методи", t: "Минимално покриващо дърво", en: "Minimum spanning tree", d: "Подмножество ребра, което свързва всички върхове без цикли с минимално общо тегло.", more: "Алчните алгоритми на Прим и Крускал го намират." },
    "кодиране на хъфман": { cat: "Методи", t: "Кодиране на Хъфман", en: "Huffman coding", d: "Оптимален префиксен код: алчно се сливат двата най-редки символа (поддървета).", more: "Пример за алчен алгоритъм с доказана оптималност." },
  });

  const NAMES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const STRATS = [
    ["end", "най-ранен край"],
    ["start", "най-ранно начало"],
    ["len", "най-къс интервал"],
    ["conf", "най-малко конфликти"],
  ];
  const stratName = (k) => (STRATS.find((x) => x[0] === k) || STRATS[0])[1];
  const fmtI = (x) => `${NAMES[x.id]}=[${x.s},${x.e})`;
  const overlap = (a, b) => a.s < b.e && b.s < a.e;

  /* "0-2 2-4" -> [{s,e,id}] */
  function parseIv(str) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error("Въведи поне един интервал във вида „0-2 2-4“.");
    if (parts.length > 14) throw new Error("Най-много 14 интервала.");
    return parts.map((p, id) => {
      const m = /^(\d+)-(\d+)$/.exec(p);
      if (!m) throw new Error(`„${p}“ не е интервал. Формат: начало-край, напр. 0-2.`);
      const s = +m[1], e = +m[2];
      if (e > 40) throw new Error("Краищата трябва да са между 0 и 40.");
      if (s >= e) throw new Error(`„${p}“: началото трябва да е по-малко от края.`);
      return { s, e, id };
    });
  }
  function keyOf(strat, x, v) {
    if (strat === "start") return x.s;
    if (strat === "len") return x.e - x.s;
    if (strat === "conf") return v.filter((y) => y.id !== x.id && overlap(x, y)).length;
    return x.e;
  }
  const sortBy = (v, key) => v.slice().sort((a, b) => key(a) - key(b) || a.id - b.id);

  /* ---------- монети / граф: помощни ---------- */
  function parseDen(str) {
    const d = S.parseNums(str, { min: 1, max: 400, minLen: 1, maxLen: 10 });
    const u = [...new Set(d)].sort((a, b) => a - b);
    if (u.length !== d.length) throw new Error("Номиналите трябва да са различни.");
    return u;
  }
  function greedyCoins(d, amount) {
    const used = [];
    for (let i = d.length - 1; i >= 0; i--) while (amount >= d[i]) { amount -= d[i]; used.push(d[i]); }
    return amount === 0 ? used : null;
  }
  function dpTable(d, amount) {
    const best = [0];
    for (let s = 1; s <= amount; s++) {
      best[s] = Infinity;
      for (let i = 0; i < d.length; i++) if (d[i] <= s && best[s - d[i]] + 1 < best[s]) best[s] = best[s - d[i]] + 1;
    }
    return best;
  }
  function dpPick(d, amount, best) {
    const used = [];
    while (amount > 0) for (let i = 0; i < d.length; i++) if (d[i] <= amount && best[amount - d[i]] + 1 === best[amount]) { used.push(d[i]); amount -= d[i]; break; }
    return used;
  }

  const VN = "ABCDEF";
  function parseGraph(str) {
    const E = [];
    const seen = new Set();
    for (const p of String(str).split(/[\s,;]+/).filter(Boolean)) {
      const m = /^([A-Fa-f])([A-Fa-f]):(-?\d+)$/.exec(p);
      if (!m) throw new Error(`„${p}“ не е ребро. Формат: AB:7 (ориентирано ребро A→B с тегло 7), върхове A–F.`);
      const u = VN.indexOf(m[1].toUpperCase()), v = VN.indexOf(m[2].toUpperCase()), w = +m[3];
      if (u === v) throw new Error(`„${p}“: примка — не се допуска.`);
      if (Math.abs(w) > 99) throw new Error("Теглата трябва да са между −99 и 99.");
      if (seen.has(u * 6 + v)) throw new Error(`Реброто ${VN[u]}→${VN[v]} е зададено два пъти.`);
      seen.add(u * 6 + v);
      E.push({ u, v, w });
    }
    if (E.length > 20) throw new Error("Най-много 20 ребра.");
    return E;
  }
  const fmtD = (x) => (x === Infinity ? "∞" : String(x));

  /* ---------- чисти функции ---------- */
  const algos = {
    parseIv,
    /* брой и избрани id за всяка стратегия (таблицата) */
    iv_all({ ivs }) {
      const v = parseIv(ivs);
      const out = {};
      for (const [k] of STRATS) {
        const r = algos.iv_select({ ivs, strat: k });
        out[k] = { count: r.result, chosen: r.chosen };
      }
      return { v, out };
    },

    iv_select({ ivs, strat }) {
      const v = parseIv(ivs);
      strat = STRATS.some((x) => x[0] === strat) ? strat : "end";
      const F = [];
      const keys = v.map((x) => keyOf(strat, x, v));
      const order = sortBy(v, (x) => keys[x.id]);
      const ordTxt = order.map((x) => `${NAMES[x.id]}(${keys[x.id]})`).join(" ");
      const chosen = [];
      const base = () => ({ v, keys, order: order.map((x) => x.id), chosen: chosen.slice(), strat });
      const kName = { end: "край", start: "начало", len: "дължина", conf: "конфликти" }[strat];
      if (strat === "end") {
        F.push({ ...base(), at: "sort", vars: { n: v.length }, msg: `Сортираме по нарастващ <b>край</b> (при равенство — по реда във входа): ${ordTxt}.`, log: "сортиране по край" });
        let last = -Infinity, m = 0;
        F.push({ ...base(), at: "init", vars: { n: v.length, m, last_end: "−∞" }, msg: "Още няма избран интервал: <code>last_end = INT_MIN</code>, всеки първи кандидат е съвместим." });
        order.forEach((x, i) => {
          F.push({ ...base(), at: "loop", cur: x.id, vars: { i, "v[i]": `[${x.s},${x.e})`, last_end: fmtD(last).replace("-Infinity", "−∞"), m }, msg: `Кандидат ${fmtI(x)} — следващият по ред на края.`, stats: { избрани: m } });
          const bad = x.s < last;
          F.push({ ...base(), at: "cmp", cur: x.id, conflictWith: bad ? chosen[chosen.length - 1] : null, vars: { i, "v[i].s": x.s, last_end: last === -Infinity ? "−∞" : last, m }, msg: `<code>v[i].s &lt; last_end</code>? ${x.s} &lt; ${last === -Infinity ? "−∞" : last} → <b>${bad}</b>. ${bad ? "Пресича последния избран." : "Започва не по-рано от края на последния — съвместим."}`, stats: { избрани: m } });
          if (bad) {
            F.push({ ...base(), at: "skip", cur: x.id, rejected: true, vars: { i, last_end: last, m }, msg: `Пропускаме ${NAMES[x.id]}.`, stats: { избрани: m }, log: `${NAMES[x.id]} ✗` });
          } else {
            chosen.push(x.id); m++; last = x.e;
            F.push({ ...base(), at: "take", cur: x.id, vars: { i, last_end: last, m }, msg: `Вземаме ${fmtI(x)}; <code>last_end = ${last}</code>. Най-ранният край оставя най-много място за следващите.`, stats: { избрани: m }, log: `${NAMES[x.id]} ✓ (край ${x.e})` });
          }
        });
        F.push({ ...base(), at: "ret", done: true, vars: { return: m }, msg: `Избрани <b>${m}</b>: ${chosen.map((id) => NAMES[id]).join(", ")}. Сортирането е O(n log n), обхождането — O(n).`, stats: { избрани: m }, log: `return ${m}` });
        return { frames: F, result: m, chosen };
      }
      F.push({ ...base(), at: "key", vars: { n: v.length, стратегия: stratName(strat) }, msg: `Ключ = <b>${kName}</b>: ${v.map((x) => `${NAMES[x.id]}:${keys[x.id]}`).join(" ")}.${strat === "conf" ? " (брой други интервали, с които се пресича)" : ""}` });
      F.push({ ...base(), at: "sort", vars: { n: v.length }, msg: `Сортираме по нарастващ ключ (при равенство — по реда във входа): ${ordTxt}.`, log: `сортиране по ${kName}` });
      F.push({ ...base(), at: "init", vars: { m: 0 }, msg: "Още няма избрани." });
      order.forEach((x, i) => {
        const m = chosen.length;
        F.push({ ...base(), at: "loop", cur: x.id, vars: { i, "v[i]": `[${x.s},${x.e})`, key: keys[x.id], m }, msg: `Кандидат ${fmtI(x)}, ключ ${keys[x.id]}.`, stats: { избрани: m } });
        let ok = true;
        if (!m) F.push({ ...base(), at: "cmp", cur: x.id, vars: { i, m }, msg: "Няма избрани — няма с какво да се пресича.", stats: { избрани: m } });
        for (let j = 0; j < m && ok; j++) {
          const c = v[chosen[j]];
          const ov = overlap(x, c);
          if (ov) ok = false;
          F.push({ ...base(), at: "cmp", cur: x.id, conflictWith: ov ? c.id : null, probe: c.id, vars: { i, j, "chosen[j]": NAMES[c.id], m }, msg: `${NAMES[x.id]} пресича ли ${fmtI(c)}? → <b>${ov}</b>.`, stats: { избрани: m } });
        }
        if (!ok) F.push({ ...base(), at: "skip", cur: x.id, rejected: true, vars: { i, m }, msg: `Пропускаме ${NAMES[x.id]}.`, stats: { избрани: m }, log: `${NAMES[x.id]} ✗` });
        else {
          chosen.push(x.id);
          F.push({ ...base(), at: "take", cur: x.id, vars: { i, m: chosen.length }, msg: `Вземаме ${fmtI(x)}.`, stats: { избрани: chosen.length }, log: `${NAMES[x.id]} ✓` });
        }
      });
      const opt = algos.iv_select({ ivs, strat: "end" }).result;
      const m = chosen.length;
      F.push({ ...base(), at: "ret", done: true, worse: m < opt, vars: { return: m, оптимум: opt }, msg: `Стратегия „${stratName(strat)}“ избра <b>${m}</b>: ${chosen.map((id) => NAMES[id]).join(", ")}. ${m < opt ? `<b>По-малко от оптимума ${opt}</b> — това е контрапример за тази стратегия.` : `Колкото оптимума (${opt}) за този вход — но един вход не доказва коректност.`}`, stats: { избрани: m }, log: `return ${m}` });
      return { frames: F, result: m, chosen };
    },

    /* аргумент за замяна: решение, започващо с first, -> замяна с най-рано завършващия */
    exchange({ ivs, first }) {
      const v = parseIv(ivs);
      const fid = NAMES.indexOf(String(first).trim().toUpperCase());
      if (fid < 0 || fid >= v.length) throw new Error(`Няма интервал „${first}“. Избери буква от A до ${NAMES[v.length - 1]}.`);
      const X = v[fid];
      const byEnd = sortBy(v, (x) => x.e);
      const g = byEnd[0];
      const rest = [];
      let last = X.e;
      for (const x of byEnd) if (x.id !== X.id && x.s >= last) { rest.push(x.id); last = x.e; }
      const O = [X.id, ...rest];
      const opt = algos.iv_select({ ivs, strat: "end" }).result;
      const F = [];
      F.push({ v, sol: O, X: X.id, g: g.id, lines: [], msg: `Решение O започва с ${fmtI(X)} и продължава с ${rest.length ? rest.map((id) => NAMES[id]).join(", ") : "нищо"} — общо <b>${O.length}</b>. ${O.length === opt ? "То е оптимално (оптимумът е " + opt + ")." : `(Оптимумът е ${opt}; аргументът работи за всяко допустимо решение.)`}` });
      if (g.id === X.id) {
        F.push({ v, sol: O, X: X.id, g: g.id, lines: [X.e], done: true, msg: `${NAMES[X.id]} вече е най-рано завършващият интервал — O започва с алчния избор, няма какво да се заменя.` });
        return { frames: F, before: O.length, after: O.length };
      }
      F.push({ v, sol: O, X: X.id, g: g.id, lines: [g.e, X.e], msg: `Най-рано завършващият е ${fmtI(g)}: край ${g.e} ≤ ${X.e} (край на ${NAMES[X.id]}). Всеки следващ интервал в O започва ≥ ${X.e}, значи и ≥ ${g.e}.` });
      const O2 = [g.id, ...rest];
      const okAll = rest.every((id) => v[id].s >= g.e) && !rest.includes(g.id);
      F.push({ v, sol: O2, X: X.id, g: g.id, lines: [g.e], replaced: true, done: true, inv: { text: `O′ е допустимо и |O′| = ${O2.length} = |O|`, ok: okAll && O2.length === O.length }, msg: `Заменяме ${NAMES[X.id]} с ${NAMES[g.id]}: O′ = ${O2.map((id) => NAMES[id]).join(", ")}. Броят не намалява и останалите са съвместими. Следователно съществува оптимално решение, което започва с алчния избор — <dfn data-g="свойство на алчния избор">свойство на алчния избор</dfn>.` });
      return { frames: F, before: O.length, after: O2.length };
    },

    coins_greedy({ den, amount }) {
      const d = parseDen(den);
      amount = S.int(amount, 0, 100, "Сумата");
      const F = [], used = [];
      let a = amount;
      F.push({ d, used: [], a, at: "enter", vars: { amount: a, cnt: 0 }, msg: `Номинали ${d.join(", ")}; сума ${amount}. Започваме от най-големия номинал.`, log: `сума ${amount}` });
      for (let i = d.length - 1; i >= 0; i--) {
        F.push({ d, used: used.slice(), a, i, at: "loop", vars: { i, "d[i]": d[i], amount: a, cnt: used.length }, msg: `Разглеждаме монета ${d[i]}.`, stats: { монети: used.length } });
        while (true) {
          const fits = a >= d[i];
          F.push({ d, used: used.slice(), a, i, at: "cmp", vars: { i, "d[i]": d[i], amount: a, cnt: used.length }, msg: `<code>amount &gt;= d[i]</code>? ${a} ≥ ${d[i]} → <b>${fits}</b>.`, stats: { монети: used.length } });
          if (!fits) break;
          a -= d[i]; used.push(d[i]);
          F.push({ d, used: used.slice(), a, i, take: true, at: "take", vars: { i, "d[i]": d[i], amount: a, cnt: used.length }, msg: `Вземаме ${d[i]} (локално най-добрият избор). Остават ${a}.`, stats: { монети: used.length }, log: `+${d[i]} → остават ${a}` });
        }
      }
      const res = a === 0 ? used.length : -1;
      F.push({ d, used: used.slice(), a, at: "ret", done: true, fail: a !== 0, vars: { amount: a, return: res }, msg: a === 0 ? `Алчно: <b>${used.length}</b> монети = ${used.join(" + ") || "0"}.` : `Остатък ${a} не може да се плати с наличните монети — алчното се проваля (връща −1), въпреки че решение може да съществува.`, stats: { монети: used.length }, log: `return ${res}` });
      return { frames: F, result: res, used };
    },

    coins_dp({ den, amount }) {
      const d = parseDen(den);
      amount = S.int(amount, 0, 100, "Сумата");
      const F = [], best = [0];
      const snap = () => best.slice();
      F.push({ d, best: snap(), amount, s: 0, at: "base", vars: { "best[0]": 0 }, msg: "best[0] = 0: сума 0 се плаща с нула монети.", log: "best[0] = 0" });
      for (let s = 1; s <= amount; s++) {
        best[s] = Infinity;
        F.push({ d, best: snap(), amount, s, at: "outer", vars: { s, "best[s]": "∞" }, msg: `Сума ${s}: пробваме всяка монета като „последна“.` });
        for (let i = 0; i < d.length; i++) {
          if (d[i] > s) continue;
          const cand = best[s - d[i]] + 1;
          const better = cand < best[s];
          F.push({ d, best: snap(), amount, s, from: s - d[i], at: "cmp", vars: { s, "d[i]": d[i], [`best[${s - d[i]}]+1`]: fmtD(cand), "best[s]": fmtD(best[s]) }, msg: `Последна монета ${d[i]}: best[${s}−${d[i]}] + 1 = ${fmtD(best[s - d[i]])} + 1 = ${fmtD(cand)} ${better ? "&lt;" : "≥"} ${fmtD(best[s])}.` });
          if (better) {
            best[s] = cand;
            F.push({ d, best: snap(), amount, s, from: s - d[i], at: "upd", vars: { s, "best[s]": cand }, msg: `best[${s}] = ${cand}.` });
          }
        }
        F[F.length - 1].log = `best[${s}] = ${fmtD(best[s])}`;
      }
      const res = best[amount] === Infinity ? -1 : best[amount];
      const pick = res > 0 ? dpPick(d, amount, best) : [];
      const g = greedyCoins(d, amount);
      F.push({ d, best: snap(), amount, s: amount, at: "ret", done: true, pick, vars: { return: res }, msg: res < 0 ? `Сума ${amount} не може да се плати.` : `Оптимум: <b>${res}</b> монети = ${pick.join(" + ") || "0"}. Алчното дава ${g ? g.length : "провал"}${g && g.length > res ? " — <b>по-лошо</b>" : ""}.`, log: `return ${res}` });
      return { frames: F, result: res, table: best.map((x) => (x === Infinity ? -1 : x)), pick };
    },

    /* най-малката сума ≤ limit, за която алчното е по-лошо (или се проваля, а решение има); 0 ако няма */
    coins_counter({ den, limit = 400 }) {
      const d = parseDen(den);
      const best = dpTable(d, limit);
      for (let s = 1; s <= limit; s++) {
        if (best[s] === Infinity) continue;
        const g = greedyCoins(d, s);
        if (!g || g.length > best[s]) return { result: s, greedy: g ? g.length : -1, opt: best[s] };
      }
      return { result: 0 };
    },

    bellman(E, src) {
      const dist = Array(6).fill(Infinity);
      dist[src] = 0;
      for (let k = 0; k < 5; k++) for (let u = 0; u < 6; u++) for (let v = 0; v < 6; v++) {
        const e = E.find((x) => x.u === u && x.v === v);
        if (e && dist[u] !== Infinity && dist[u] + e.w < dist[v]) dist[v] = dist[u] + e.w;
      }
      for (const e of E) if (dist[e.u] !== Infinity && dist[e.u] + e.w < dist[e.v]) return null;
      return dist;
    },

    dijkstra({ edges, src }) {
      const E = parseGraph(edges);
      const s0 = VN.indexOf(String(src || "A").toUpperCase());
      if (s0 < 0) throw new Error("Изходният връх трябва да е от A до F.");
      const W = (u, v) => { const e = E.find((x) => x.u === u && x.v === v); return e ? e.w : null; };
      const neg = E.some((e) => e.w < 0);
      const dist = Array(6).fill(Infinity), prev = Array(6).fill(-1), vis = Array(6).fill(false);
      const rows = [];
      const F = [];
      const snap = (o) => ({ E, dist: dist.slice(), prev: prev.slice(), vis: vis.slice(), rows: rows.map((r) => ({ ...r, d: r.d.slice() })), neg, src: s0, ...o });
      const dv = () => dist.map(fmtD);
      dist[s0] = 0;
      rows.push({ u: null, d: dist.slice() });
      F.push(snap({ at: "init", vars: { dist: dv(), src: VN[s0] }, msg: `dist[${VN[s0]}] = 0, всички останали = ∞. ${neg ? '<span class="warn">Има отрицателно тегло — Дейкстра не е гарантирано коректен!</span>' : "Всички тегла са неотрицателни."}`, log: `dist[${VN[s0]}] = 0` }));
      for (let it = 0; it < 6; it++) {
        F.push(snap({ at: "outer", vars: { it, dist: dv() }, msg: `Итерация ${it}: търсим най-близкия непосетен връх.` }));
        let u = -1;
        for (let v = 0; v < 6; v++) if (!vis[v] && (u < 0 || dist[v] < dist[u])) u = v;
        F.push(snap({ at: "pick", u, vars: { it, u: VN[u], "dist[u]": fmtD(dist[u]) }, msg: `Алчен избор: най-малкото dist сред непосетените е dist[${VN[u]}] = ${fmtD(dist[u])}.` }));
        if (dist[u] === Infinity) {
          F.push(snap({ at: "unreach", u, vars: { u: VN[u] }, msg: "Най-близкият непосетен е на разстояние ∞ — останалите върхове са недостижими. Край." , log: "break" }));
          break;
        }
        vis[u] = true;
        F.push(snap({ at: "visit", u, vars: { u: VN[u], "dist[u]": dist[u] }, msg: `Обявяваме dist[${VN[u]}] = ${dist[u]} за <b>окончателно</b> — точно тук алчността разчита на неотрицателните тегла.`, log: `посетен ${VN[u]} (${dist[u]})` }));
        for (let v = 0; v < 6; v++) {
          const w = W(u, v);
          if (w === null) continue;
          const can = !vis[v] && dist[u] + w < dist[v];
          F.push(snap({ at: "relax", u, edge: [u, v], vars: { u: VN[u], v: VN[v], "w(u,v)": w, "dist[u]+w": dist[u] + w, "dist[v]": fmtD(dist[v]) }, msg: vis[v] ? `${VN[v]} вече е посетен — не се обновява (dist[${VN[v]}] е „окончателно“).${dist[u] + w < dist[v] ? ' <span class="warn">А всъщност пътят през ' + VN[u] + " е по-къс: " + (dist[u] + w) + " &lt; " + dist[v] + "!</span>" : ""}` : `<dfn data-g="релаксация">Релаксация</dfn> ${VN[u]}→${VN[v]}: ${dist[u]} + ${w} = ${dist[u] + w} ${can ? "&lt;" : "≥"} ${fmtD(dist[v])}.`, missed: vis[v] && dist[u] + w < dist[v] }));
          if (can) {
            dist[v] = dist[u] + w; prev[v] = u;
            F.push(snap({ at: "upd", u, edge: [u, v], vars: { v: VN[v], "dist[v]": dist[v], "prev[v]": VN[u] }, msg: `dist[${VN[v]}] = ${dist[v]}, prev[${VN[v]}] = ${VN[u]}.`, log: `dist[${VN[v]}] = ${dist[v]}` }));
          }
        }
        rows.push({ u, d: dist.slice() });
      }
      const bf = algos.bellman(E, s0);
      const wrong = bf ? dist.map((x, k) => x !== bf[k]) : null;
      F.push(snap({ at: "outer", done: true, bf, wrong, vars: { dist: dv(), prev: prev.map((p) => (p < 0 ? "—" : VN[p])) }, msg: !neg ? "Готово. При неотрицателни тегла dist е точното най-късо разстояние (съвпада с Белман–Форд)." : bf ? (wrong.some(Boolean) ? `<span class="warn">Резултатът е ГРЕШЕН за ${wrong.map((x, k) => (x ? VN[k] : null)).filter(Boolean).join(", ")} — сравни с Белман–Форд. Дейкстра изисква неотрицателни тегла.</span>` : "Този път съвпадна с Белман–Форд, но при отрицателни тегла това не е гарантирано.") : '<span class="warn">Има отрицателен цикъл — най-къси пътища не съществуват; Дейкстра връща безсмислени стойности.</span>' }));
      return { frames: F, dist, prev, bf };
    },
  };

  /* ---------- рисуване ---------- */
  function timeline(v, clsOf, opt = {}) {
    const lo = Math.min(...v.map((x) => x.s)), hi = Math.max(...v.map((x) => x.e));
    const W = 640, L = 34, R = 14, rowH = 24, top = 8;
    const H = top + v.length * rowH + 26;
    const sx = (t) => L + ((t - lo) / (hi - lo || 1)) * (W - L - R);
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Времева линия на интервалите" });
    for (let t = lo; t <= hi; t++) {
      if (hi - lo > 20 && t % 2) continue;
      svg.append(S.svg("line", { x1: sx(t), y1: top, x2: sx(t), y2: H - 22, style: "stroke:var(--line-2);stroke-width:1" }));
      svg.append(S.svg("text", { x: sx(t), y: H - 6, "text-anchor": "middle", class: "wt", text: t }));
    }
    for (const t of opt.lines || []) svg.append(S.svg("line", { x1: sx(t), y1: top - 4, x2: sx(t), y2: H - 20, style: "stroke:var(--st-piv);stroke-width:2;stroke-dasharray:4 3" }));
    v.forEach((x, r) => {
      const y = top + r * rowH;
      const cls = clsOf(x) || "";
      const g = S.svg("g", { class: cls });
      g.append(S.svg("rect", { x: sx(x.s), y: y + 3, width: Math.max(4, sx(x.e) - sx(x.s)), height: rowH - 8, rx: 4, style: "fill:var(--cb,var(--panel-2));stroke:var(--c,var(--ink-2));stroke-width:1.5" }));
      g.append(S.svg("text", { x: L - 8, y: y + rowH / 2 + 3, "text-anchor": "end", text: NAMES[x.id] }));
      g.append(S.svg("text", { x: sx(x.s) + 5, y: y + rowH / 2 + 3, class: "wt", text: `[${x.s},${x.e})` }));
      if (opt.badge && opt.badge[x.id] != null) g.append(S.svg("text", { x: sx(x.e) + 5, y: y + rowH / 2 + 3, class: "wt", text: opt.badge[x.id] }));
      svg.append(g);
    });
    return svg;
  }

  const POS = [[50, 120], [190, 40], [190, 200], [370, 40], [510, 120], [370, 200]];
  function graphSvg(f, onEdge) {
    const svg = S.svg("svg", { class: "g", viewBox: "0 0 560 245", width: 560, role: "img", "aria-label": "Ориентиран граф" });
    const has = (u, v) => f.E.some((e) => e.u === u && e.v === v);
    f.E.forEach((e) => {
      const [x1, y1] = POS[e.u], [x2, y2] = POS[e.v];
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const off = has(e.v, e.u) ? 7 : 0, nx = -uy * off, ny = ux * off;
      const ax = x1 + ux * 21 + nx, ay = y1 + uy * 21 + ny, bx = x2 - ux * 23 + nx, by = y2 - uy * 23 + ny;
      let cls = "";
      if (f.edge && f.edge[0] === e.u && f.edge[1] === e.v) cls = f.missed ? "s-swap" : f.at === "upd" ? "s-done" : "s-cmp";
      else if (f.prev && f.prev[e.v] === e.u && (f.vis[e.v] || f.done)) cls = "s-act";
      if (e.w < 0 && !cls) cls = "s-swap";
      const g = S.svg("g", { class: cls, style: "cursor:pointer", onclick: () => onEdge && onEdge(e) });
      g.append(S.svg("title", { text: `${VN[e.u]}→${VN[e.v]}: ${e.w} (щракни за промяна)` }));
      g.append(S.svg("line", { x1: ax, y1: ay, x2: bx, y2: by, class: "edge " + cls }));
      g.append(S.svg("line", { x1: ax, y1: ay, x2: bx, y2: by, style: "stroke:transparent;stroke-width:14" }));
      const hx = bx, hy = by, px = -uy, py = ux;
      g.append(S.svg("polygon", { points: `${hx},${hy} ${hx - ux * 10 + px * 5},${hy - uy * 10 + py * 5} ${hx - ux * 10 - px * 5},${hy - uy * 10 - py * 5}`, style: "fill:var(--c,var(--muted))" }));
      const mx = (ax + bx) / 2 + nx * 1.6 - uy * 9, my = (ay + by) / 2 + ny * 1.6 + ux * 9;
      g.append(S.svg("rect", { x: mx - 13, y: my - 10, width: 26, height: 17, rx: 3, style: "fill:var(--panel);stroke:var(--c,var(--line))" }));
      g.append(S.svg("text", { x: mx, y: my + 3, "text-anchor": "middle", style: "font-size:12px", text: e.w }));
      svg.append(g);
    });
    POS.forEach(([x, y], k) => {
      let cls = f.vis[k] ? "s-done" : "";
      if (f.u === k) cls = "s-act";
      if (f.edge && f.edge[1] === k && !f.done) cls = f.missed ? "s-swap" : "s-cmp";
      const g = S.svg("g", { class: "node " + cls });
      g.append(S.svg("circle", { cx: x, cy: y, r: 19 }));
      g.append(S.svg("text", { x, y: y + 5, "text-anchor": "middle", style: "font-weight:700", text: VN[k] }));
      g.append(S.svg("text", { x, y: y + (y < 100 ? -26 : 36), "text-anchor": "middle", class: "wt", text: fmtD(f.dist[k]) }));
      svg.append(g);
    });
    return svg;
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="алчен подход">Алчният подход</dfn> изгражда решението стъпка по стъпка чрез <b>локално най-добър допустим избор</b>, без обикновено да преразглежда вече направените избори. Не всяка задача позволява алчна оптимална стратегия. За коректност се използват <dfn data-g="свойство на алчния избор">свойството на алчния избор</dfn> и <dfn data-g="аргумент за замяна">аргумент за замяна</dfn>.</p>
</div>

<div class="block">
  <h3>Избор на неприпокриващи се интервали</h3>
  <p class="prose">Задача (<dfn data-g="избор на интервали">избор на интервали</dfn>): от дадени <dfn data-g="полуотворен интервал">полуотворени интервали</dfn> [s, e) да се изберат възможно най-много, никои два от които не се пресичат. Алгоритъм: <b>сортираме по нарастващ край</b> и избираме всеки следващ интервал, чието начало е <b>не по-рано</b> от края на последния избран. Той е оптимален и работи за O(n log n) с включено сортиране.</p>
  <p class="prose">Пример от материала: A = [0, 2), B = [2, 4), C = [4, 6), D = [0, 5). По най-ранен край избираме A, B, C — три интервала. Изборът на D би оставил само него.</p>
  <div id="v8-iv"></div>
  <details class="hint"><summary>Хинт: защо „най-ранен край“, а не „най-ранно начало“ или „най-къс“?</summary><div>
    <p>Най-рано завършващият интервал освобождава времевата линия <b>най-рано</b> — той оставя най-много място за всички следващи. Другите правила звучат разумно, но имат контрапримери (виж бутоните): най-ранното начало може да е един дълъг интервал, който покрива всички; най-късият може да е в средата и да пресича два дълги, които иначе биха били съвместими.</p>
    <p>Таблицата под линията показва броя за всяка стратегия <b>едновременно</b>. Само „най-ранен край“ съвпада с оптимума за всеки вход — останалите понякога съвпадат, но това не е доказателство.</p>
  </div></details>
  <details class="trap"><summary>Капан: [0, 2) и [2, 4) пресичат ли се?</summary><div>
    <p>Не. Интервалите са полуотворени — краят не принадлежи на интервала. Затова условието е „начало ≥ края на последния“ (в C: пропускаме при <code>s &lt; last_end</code>). Ако бяха затворени [0, 2] и [2, 4], щяха да имат обща точка 2.</p>
  </div></details>
  <div class="key"><p class="formula">сортирай по e ↑;  вземи x, ако x.s ≥ last_end;  last_end = x.e   →   оптимално, O(n log n)</p></div>
</div>

<div class="block">
  <h3>Защо е коректно: аргумент за замяна</h3>
  <p class="prose">Основание: ако някое оптимално решение започва с друг интервал, можем да <b>заменим първия му интервал с най-рано завършващия</b>, без да намалим броя на възможните следващи. Най-рано завършващият свършва не по-късно от заменения, затова всички следващи интервали на решението остават съвместими. Повтаряйки довода за останалата част, стигаме до алчното решение.</p>
  <div id="v8-ex"></div>
  <details class="hint"><summary>Хинт: как се казва на изпита в три изречения</summary><div>
    <p>1) Нека g е интервалът с най-ранен край, а O — произволно оптимално решение с първи интервал x. 2) e(g) ≤ e(x), а всеки следващ в O започва ≥ e(x) ≥ e(g); значи O′ = O − {x} + {g} е допустимо и |O′| = |O| — <dfn data-g="свойство на алчния избор">свойство на алчния избор</dfn>. 3) След избора на g остава същата задача за интервалите, започващи ≥ e(g) — <dfn data-g="оптимална подструктура">оптимална подструктура</dfn>; по индукция алчното е оптимално.</p>
  </div></details>
</div>

<div class="block">
  <h3>Монети: локалният избор не гарантира глобален оптимум</h3>
  <p class="prose">Номинали 1, 3, 4 и сума 6. Алчно „вземи най-голямата възможна монета“: 4 + 1 + 1 — три монети. Оптимално: 3 + 3 — две. <b>Локалният избор не гарантира глобален оптимум.</b> Оптимумът вдясно е изчислен с <a href="#dp">динамично програмиране</a>: best[s] = 1 + min best[s − d] по всички d ≤ s.</p>
  <div class="split" id="v8-coins"></div>
  <div class="card" id="v8-counter"></div>
  <details class="hint"><summary>Хинт: „вземи най-голямото“ е предложение, не теорема</summary><div>
    <p>Алчният алгоритъм може да е коректен за една система номинали (<dfn data-g="канонична система монети">канонична</dfn>, напр. 1, 2, 5, 10, 20, 50) и некоректен за друга (1, 3, 4). Контрапримерът опровергава <b>универсалната</b> коректност; за други номинали алчното може да работи, но е нужно доказателство.</p>
  </div></details>
  <details class="trap"><summary>Капан: алчно срещу DP с една фраза</summary><div>
    <p>При алчния подход се прави <b>един</b> локален избор и не се връщаме. При DP се <b>сравняват алтернативи</b> чрез рекурентна зависимост — за сума s се пробва всяка монета като последна. Затова DP намира 3 + 3, а алчното не.</p>
  </div></details>
  <div class="key"><p>Контрапример → алгоритъмът не е коректен изобщо. Липса на контрапример в тестовете → нищо не доказва; нужно е доказателство (напр. аргумент за замяна).</p></div>
</div>

<div class="block">
  <h3>Други приложения: Дейкстра</h3>
  <p class="prose">Други алчни алгоритми: <dfn data-g="алгоритъм на дейкстра">Дейкстра</dfn> за най-къси пътища при <b>неотрицателни тегла</b>, Прим и Крускал за <dfn data-g="минимално покриващо дърво">минимално покриващо дърво</dfn>, <dfn data-g="кодиране на хъфман">кодиране на Хъфман</dfn>. Реални реализации: NetworkX <code>dijkstra_path</code>, Boost Graph Library <code>dijkstra_shortest_paths</code>.</p>
  <p class="prose muted">Графът е ориентиран (AB:7 е ребро A→B). Щракни върху ребро, за да смениш теглото му. Вариантът е O(V²) — без пирамида, за простота.</p>
  <div id="v8-dij"></div>
  <div id="v8-edit" class="row" hidden></div>
  <details class="hint"><summary>Хинт: къде точно е алчността и защо отрицателното тегло я чупи</summary><div>
    <p>Алчният избор е „най-близкият непосетен връх u“ — dist[u] се обявява за <b>окончателно</b>. Довод: всеки друг път до u минава през непосетен връх с dist ≥ dist[u], а продължаването му само добавя неотрицателни тегла. С отрицателно ребро този довод пада: по-дълъг в началото път може да стане по-къс по-късно — но u вече е „заключен“.</p>
    <p><dfn data-g="белман–форд">Белман–Форд</dfn> <span class="extra-tag">извън конспекта</span> не е алчен: релаксира всички ребра V−1 пъти и затова работи с отрицателни тегла (без отрицателни цикли).</p>
  </div></details>
  <details class="trap"><summary>Капан: „Дейкстра работи за всеки граф“</summary><div>
    <p>Не. Изискването е <b>неотрицателни тегла</b>. Пресетът „отрицателно ребро“ показва грешен резултат, въпреки че няма отрицателен цикъл.</p>
  </div></details>
  <div class="key"><p class="formula">u = argmin{dist[v] : v непосетен};  посети u;  за (u,v): dist[v] = min(dist[v], dist[u] + w)   — само при w ≥ 0</p></div>
</div>
<div id="quiz8"></div>`;

  function mount(root) {
    /* --- интервали --- */
    const PRESETS_IV = [
      { label: "Пример A,B,C,D", values: { ivs: "0-2 2-4 4-6 0-5", strat: "end" } },
      { label: "Контрапример: начало", values: { ivs: "0-10 1-2 3-4 5-6", strat: "start" }, title: "Един дълъг интервал започва най-рано и покрива всички" },
      { label: "Контрапример: най-къс", values: { ivs: "0-5 4-7 6-11", strat: "len" }, title: "Къс интервал в средата пресича два дълги" },
      { label: "Контрапример: конфликти", values: { ivs: "0-2 2-4 4-6 6-8 1-3 1-3 1-3 5-7 5-7 5-7 3-5", strat: "conf" }, title: "Интервалът с най-малко конфликти не е в оптималното решение" },
    ];
    S.viz(root.querySelector("#v8-iv"), {
      id: "g-iv", title: "Избор на интервали — четири стратегии", sub: "Зелено — избран, червено — пресича избран, синьо — текущ кандидат.",
      code: (i) => (i.strat === "end" ? "ch08_iv_end" : "ch08_iv_key"),
      inputs: [
        { id: "ivs", label: "Интервали [s,e) като s-e", value: "0-2 2-4 4-6 0-5", width: "22em" },
        { id: "strat", label: "Стратегия", type: "select", value: "end", options: STRATS },
      ],
      presets: PRESETS_IV,
      random: () => ({ ivs: Array.from({ length: S.randInt(5, 9) }, () => { const s = S.randInt(0, 12); return `${s}-${s + S.randInt(1, 5)}`; }).join(" ") }),
      legend: [["s-act", "кандидат"], ["s-done", "избран"], ["s-swap", "конфликт"], ["s-dim", "отхвърлен"]],
      build(i) {
        const r = algos.iv_select(i);
        r.all = algos.iv_all(i).out;
        return r;
      },
      draw(st, f, { res, frames, i }) {
        st.innerHTML = "";
        const rejected = new Set(frames.slice(0, i + 1).filter((x) => x.rejected).map((x) => x.cur));
        const rank = {};
        f.order.forEach((id, k) => (rank[id] = `#${k + 1} ключ ${f.keys[id]}`));
        st.append(timeline(f.v, (x) => {
          if (f.chosen.includes(x.id)) return x.id === f.conflictWith ? "s-swap" : "s-done";
          if (x.id === f.cur) return f.rejected ? "s-swap" : "s-act";
          if (rejected.has(x.id)) return "s-dim";
          return "";
        }, { badge: rank }));
        const opt = res.all.end.count;
        const tb = h("table", { class: "t" }, h("tr", null, h("th", { text: "стратегия" }), h("th", { text: "брой" }), h("th", { text: "избрани" }), h("th", { text: "оптимална?" })));
        for (const [k, nm] of STRATS) {
          const a = res.all[k];
          tb.append(h("tr", { class: k === f.strat ? "s-act" : "" },
            h("td", { html: (k === f.strat ? "▸ " : "") + nm }),
            h("td", { class: "mono", text: a.count }),
            h("td", { class: "mono", text: a.chosen.map((id) => NAMES[id]).join(", ") }),
            h("td", null, h("span", { class: "pill " + (a.count === opt ? "s-done" : "s-swap"), text: k === "end" ? "винаги (доказано)" : a.count === opt ? "тук — да" : `не: ${a.count} < ${opt}` }))));
        }
        st.append(h("div", { class: "tbl-wrap", style: { marginTop: "10px" } }, tb));
      },
    });

    /* --- аргумент за замяна --- */
    const exV = S.viz(root.querySelector("#v8-ex"), {
      id: "g-ex", title: "Аргумент за замяна", sub: "Избери с коя буква започва „оптималното“ решение O. Последната стъпка заменя първия му интервал с най-рано завършващия.",
      code: false,
      inputs: [
        { id: "ivs", label: "Интервали", value: "1-4 3-5 0-6 5-7 3-8 5-9 6-10 8-11", width: "20em" },
        { id: "first", label: "O започва с", type: "select", value: "B", options: NAMES.slice(0, 8).split("") },
      ],
      presets: [{ label: "Пример A,B,C,D (започни с D)", values: { ivs: "0-2 2-4 4-6 0-5", first: "D" } }],
      build: algos.exchange,
      draw(st, f) {
        st.innerHTML = "";
        st.append(timeline(f.v, (x) => {
          if (x.id === f.g && f.replaced) return "s-done";
          if (x.id === f.X && !f.replaced) return f.lines.length > 1 ? "s-swap" : "s-act";
          if (x.id === f.g) return "s-piv";
          if (f.sol.includes(x.id)) return "s-done";
          return "s-dim";
        }, { lines: f.lines }));
        st.append(h("p", { class: "muted", style: { marginTop: "6px" }, text: `Решение: ${f.sol.map((id) => NAMES[id]).join(", ")}  (|O| = ${f.sol.length}). Пунктирните линии са краищата на заменения и на най-рано завършващия.` }));
      },
      legend: [["s-swap", "заменян първи интервал"], ["s-piv", "най-ранен край (алчен избор)"], ["s-done", "в решението"]],
    });
    // обнови списъка с букви според броя интервали
    const exSel = exV.root.querySelector("select");
    const exIn = exV.root.querySelector("input");
    const syncLetters = () => {
      let n = 0;
      try { n = parseIv(exIn.value).length; } catch (e) { return; }
      const cur = exSel.value;
      exSel.innerHTML = "";
      for (let k = 0; k < n; k++) exSel.append(h("option", { value: NAMES[k], text: NAMES[k], selected: NAMES[k] === cur ? true : null }));
    };
    exIn.addEventListener("change", syncLetters);
    exV.root.querySelectorAll(".viz-inputs .btn.ghost").forEach((b) => b.addEventListener("click", () => { syncLetters(); exSel.value = "D"; exV.apply(); }));
    syncLetters();

    /* --- монети --- */
    const host = root.querySelector("#v8-coins");
    const gHost = h("div"), dHost = h("div");
    host.append(gHost, dHost);
    const coinPresets = [
      { label: "1,3,4 · 6", values: { den: "1 3 4", amount: 6 } },
      { label: "Канонична 1…50 · 88", values: { den: "1 2 5 10 20 50", amount: 88 } },
      { label: "Неканонична 1,7,10 · 15", values: { den: "1 7 10", amount: 15 } },
    ];
    const gv = S.viz(gHost, {
      id: "g-coin", title: "Алчно: най-голямата възможна монета", code: "ch08_coins_greedy",
      inputs: [{ id: "den", label: "Номинали", value: "1 3 4", width: "11em" }, { id: "amount", label: "Сума (≤100)", type: "number", value: 6, width: "5em" }],
      presets: coinPresets,
      legend: [["s-act", "текущ номинал"], ["s-done", "взета монета"]],
      build: algos.coins_greedy,
      draw(st, f) {
        st.innerHTML = "";
        const cls = {};
        if (f.i != null) cls[f.i] = f.take ? "s-done" : "s-act";
        st.append(h("p", { class: "muted", text: "Номинали:" }));
        S.drawArray(st, f.d, { cls, append: true });
        st.append(h("p", { class: "mono", html: `остава: <b>${f.a}</b> · монети: ${f.used.length ? f.used.map((c) => `<span class="pill s-done">${c}</span>`).join(" ") : "—"}` }));
        if (f.fail) st.append(h("p", { class: "warn", text: "Алчното заседна с ненулев остатък." }));
      },
    });
    const dv = S.viz(dHost, {
      id: "g-coindp", title: "Оптимум: таблица best[s] (DP)", code: "ch08_coins_dp",
      inputs: [{ id: "den", label: "Номинали", value: "1 3 4", width: "11em" }, { id: "amount", label: "Сума (≤100)", type: "number", value: 6, width: "5em" }],
      presets: coinPresets,
      legend: [["s-act", "текуща сума s"], ["s-cmp", "best[s − d]"], ["s-done", "оптимален избор"]],
      build: algos.coins_dp,
      draw(st, f) {
        st.innerHTML = "";
        const cls = {};
        if (f.done && f.pick) { let a = f.amount; cls[a] = "s-done"; f.pick.forEach((c) => { a -= c; cls[a] = "s-done"; }); }
        else { if (f.from != null) cls[f.from] = "s-cmp"; cls[f.s] = "s-act"; }
        S.drawArray(st, f.best.map((x) => (x === Infinity ? "∞" : x)), { cls, dim: (k) => k > f.s });
        const pad = f.amount + 1 - f.best.length;
        if (pad > 0) st.querySelector(".arr").append(...Array.from({ length: pad }, (_, k) => h("div", { class: "cell s-dim" }, "", h("span", { class: "ix", text: f.best.length + k }))));
        if (f.done && f.pick) st.append(h("p", { class: "mono", html: `оптимално: ${f.pick.map((c) => `<span class="pill s-done">${c}</span>`).join(" ") || "—"}` }));
      },
    });
    // синхронизирай двата визуализатора
    const link = (a, b) => a.root.querySelectorAll(".viz-inputs input").forEach((el) => el.addEventListener("change", () => {
      const vals = {}; a.root.querySelectorAll(".viz-inputs input").forEach((x) => (vals[x.id.split("-").pop()] = x.value)); b.setValues(vals); b.apply();
    }));
    link(gv, dv); link(dv, gv);
    [gv, dv].forEach((a, k) => a.root.querySelectorAll(".viz-inputs .btn").forEach((btn, bi) => btn.addEventListener("click", () => {
      const other = k ? gv : dv;
      const vals = {}; a.root.querySelectorAll(".viz-inputs input").forEach((x) => (vals[x.id.split("-").pop()] = x.value));
      other.setValues(vals); other.apply();
    })));

    const cBox = root.querySelector("#v8-counter");
    const cIn = h("input", { type: "text", value: "1 3 4", "aria-label": "Номинали", style: { width: "12em" } });
    const cOut = h("p", { "aria-live": "polite" });
    const run = () => {
      try {
        const r = algos.coins_counter({ den: cIn.value });
        if (!r.result) { cOut.innerHTML = "До сума 400 алчното винаги дава оптимума за тези номинали. (Това е проверка, не доказване за всички суми.)"; return; }
        cOut.innerHTML = `Най-малката сума, за която алчното е по-лошо: <b>${r.result}</b> — алчно ${r.greedy < 0 ? "се проваля" : r.greedy + " монети"}, оптимум ${r.opt}.`;
        if (r.result <= 100) { const vals = { den: cIn.value, amount: r.result }; gv.setValues(vals); dv.setValues(vals); gv.apply(); dv.apply(); cOut.innerHTML += " Визуализаторите горе са настроени на нея."; }
      } catch (e) { cOut.innerHTML = `<span class="warn">${S.esc(e.message)}</span>`; }
    };
    cBox.append(h("h4", { text: "Намери контрапример" }),
      h("p", { class: "muted", text: "Търси най-малката сума (до 400), за която алчното дава повече монети от оптимума или заседне, въпреки че решение има." }),
      h("div", { class: "row" }, cIn, h("button", { class: "btn primary", text: "Намери контрапример", onclick: run }),
        h("button", { class: "btn ghost", text: "1 2 5 10 20 50", onclick: () => { cIn.value = "1 2 5 10 20 50"; run(); } }),
        h("button", { class: "btn ghost", text: "1 6 10", onclick: () => { cIn.value = "1 6 10"; run(); } })), cOut);
    run();

    /* --- Дейкстра --- */
    const edit = root.querySelector("#v8-edit");
    let dij = null;
    function onEdge(e) {
      edit.hidden = false; edit.innerHTML = "";
      const inp = h("input", { type: "number", value: e.w, style: { width: "6em" }, "aria-label": "Тегло" });
      const rewrite = (fn) => {
        const field = dij.root.querySelector(".viz-inputs input");
        const parts = field.value.split(/[\s,;]+/).filter(Boolean);
        const out = [];
        for (const p of parts) { const m = /^([A-Fa-f])([A-Fa-f]):/.exec(p); if (m && VN.indexOf(m[1].toUpperCase()) === e.u && VN.indexOf(m[2].toUpperCase()) === e.v) { const r = fn(); if (r) out.push(r); } else out.push(p); }
        dij.setValues({ edges: out.join(" ") }); dij.apply(); edit.hidden = true;
      };
      edit.append(h("span", { html: `Тегло на <b>${VN[e.u]}→${VN[e.v]}</b>:` }), inp,
        h("button", { class: "btn primary", text: "Запиши", onclick: () => rewrite(() => `${VN[e.u]}${VN[e.v]}:${Number(inp.value) | 0}`) }),
        h("button", { class: "btn", text: "Изтрий реброто", onclick: () => rewrite(() => null) }),
        h("button", { class: "btn ghost", text: "Отказ", onclick: () => (edit.hidden = true) }));
      inp.focus(); inp.select();
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") rewrite(() => `${VN[e.u]}${VN[e.v]}:${Number(inp.value) | 0}`); });
    }
    dij = S.viz(root.querySelector("#v8-dij"), {
      id: "g-dij", title: "Алгоритъм на Дейкстра (O(V²))", sub: "Числото до всеки връх е текущото dist. Таблицата показва dist след всяка итерация.",
      code: "ch08_dijkstra",
      inputs: [
        { id: "edges", label: "Ребра u v : тегло", value: "AB:7 AC:9 AF:14 BC:10 BD:15 CD:11 CF:2 DE:6 FE:9", width: "19em" },
        { id: "src", label: "Изход", type: "select", value: "A", options: VN.split("") },
      ],
      presets: [
        { label: "Неотрицателни тегла", values: { edges: "AB:7 AC:9 AF:14 BC:10 BD:15 CD:11 CF:2 DE:6 FE:9", src: "A" } },
        { label: "Отрицателно ребро", values: { edges: "AB:2 AC:5 CB:-4 BD:3 DE:1 CF:6", src: "A" }, title: "Без отрицателен цикъл, но Дейкстра греши" },
        { label: "Недостижими върхове", values: { edges: "AB:4 BC:1 DE:2", src: "A" } },
      ],
      legend: [["s-act", "избран u / дърво на пътищата"], ["s-done", "посетен (окончателен)"], ["s-cmp", "релаксира се"], ["s-swap", "отрицателно / пропусната подобрение"]],
      build: algos.dijkstra,
      draw(st, f) {
        st.innerHTML = "";
        st.append(graphSvg(f, onEdge));
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "след посещение" }), ...VN.split("").map((c) => h("th", { text: c }))));
        f.rows.forEach((r, k) => tb.append(h("tr", null, h("td", { text: r.u == null ? "начало" : `${k}. ${VN[r.u]}` }),
          ...r.d.map((x, j) => h("td", { class: r.u === j ? "s-done" : "", text: fmtD(x) })))));
        if (f.done && f.neg) {
          if (f.bf) tb.append(h("tr", null, h("td", { html: "<b>Белман–Форд</b>" }), ...f.bf.map((x, j) => h("td", { class: f.wrong[j] ? "s-swap" : "s-done", text: fmtD(x) }))));
          else tb.append(h("tr", null, h("td", { html: "<b>Белман–Форд</b>" }), h("td", { colspan: 6, class: "s-swap", text: "отрицателен цикъл" })));
        }
        st.append(h("div", { class: "tbl-wrap", style: { marginTop: "8px" } }, tb));
        if (f.neg) st.append(h("p", { class: "warn", text: "⚠ Има ребро с отрицателно тегло: Дейкстра изисква неотрицателни тегла — резултатът може да е грешен." }));
      },
    });

    S.quiz(root.querySelector("#quiz8"), [
      { q: "Коя алчна стратегия е оптимална за максимален брой неприпокриващи се интервали?", options: ["Най-ранно начало", "Най-къс интервал", "Най-ранен край", "Най-малко конфликти"], correct: 2, why: "Сортираме по нарастващ край и вземаме всеки съвместим. Другите правила имат контрапримери — виж пресетите в първия визуализатор." },
      { q: "Номинали 1, 3, 4, сума 6. Какво дава алчното „най-голямата монета“?", options: ["3 + 3 (2 монети)", "4 + 1 + 1 (3 монети)", "4 + 2 (2 монети)", "Не намира решение"], correct: 1, why: "Алчното взема 4, после 1 и 1. Оптимумът е 3 + 3. Локалният избор не гарантира глобален оптимум." },
      { q: "Как се доказва коректността на алчния избор за интервалите?", options: ["С тестове върху много случайни входове", "С аргумент за замяна: първият интервал на оптимално решение се заменя с най-рано завършващия, без броят да намалее", "Чрез сравняване на всички подмножества", "Не може да се докаже"], correct: 1, why: "Аргументът за замяна показва свойството на алчния избор; заедно с оптималната подструктура дава индукция." },
      { q: "Защо Дейкстра може да сгреши при отрицателно тегло?", options: ["Защото сортира върховете неправилно", "Защото обявява dist[u] за окончателно, а по-късно отрицателно ребро би могло да го намали", "Защото не може да обработи ориентирани графи", "Не може — работи за всички тегла"], correct: 1, why: "Алчният избор „най-близкият непосетен е окончателен“ разчита на това, че продължаването на път не го скъсява — вярно само при неотрицателни тегла." },
      { q: "По какво се различава алчният подход от динамичното програмиране?", options: ["Алчният е винаги по-бавен", "При алчния се прави локален избор; при DP се сравняват алтернативи с рекурентна зависимост", "DP не използва подзадачи", "Няма разлика"], correct: 1, why: "Алчният избира една възможност и не се връща. DP пресмята всички алтернативи за подзадачите и взема най-добрата." },
    ]);
  }

  S.chapter({ id: "alchen", order: 8, num: "8", group: "Задължителни парадигми", title: "Алчен подход", lead: "Локално най-добър избор на всяка стъпка — кога води до оптимум (интервали, Дейкстра) и кога не (монети 1, 3, 4).", html, mount, algos });
})();
