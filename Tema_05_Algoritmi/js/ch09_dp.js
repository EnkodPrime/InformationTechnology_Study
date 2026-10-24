/* Раздел 9 — динамично програмиране: Фибоначи (наивно, мемоизация, таблица), раница 0/1, три парадигми. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "дърво на извикванията": { cat: "Методи", t: "Дърво на рекурсивните извиквания", en: "Recursion tree", d: "Всеки възел е едно извикване на функцията, децата му са извикванията, които то прави.", more: "Повтарящи се етикети в дървото = припокриващи се подзадачи — сигнал за DP." },
    "раница 0/1": { cat: "Методи", t: "Задача за раницата 0/1", en: "0/1 knapsack", d: "Дадени са тегла wᵢ, стойности vᵢ и вместимост W; всеки предмет се взима най-много веднъж; търси се максимална обща стойност при общо тегло ≤ W.", more: "DP: D(i,c) = max{D(i−1,c), vᵢ + D(i−1,c−wᵢ)}; O(nW) време — псевдополиномиално. Вариантът за разпознаване е NP-пълен." },
    "неограничена раница": { cat: "Методи", t: "Неограничена раница", en: "Unbounded knapsack", d: "Вариант на раницата, в който всеки предмет може да се вземе произволен брой пъти.", more: "С едномерен масив се получава, ако вместимостта се обхожда НАГОРЕ — тогава dp[c−w] вече съдържа същия предмет." },
    "обратно проследяване": { cat: "Методи", t: "Обратно проследяване (traceback)", en: "Traceback", d: "Възстановяване на самия избор (не само на оптималната стойност) чрез обхождане на DP таблицата от отговора назад.", more: "При раницата: ако D(i,c) ≠ D(i−1,c), предмет i е взет и c намалява с wᵢ. При едномерен масив тази информация се губи — нужна е допълнителна." },
    "състояние на dp": { cat: "Методи", t: "Състояние на DP", en: "DP state", d: "Параметрите, които определят една подзадача (напр. i и c при раницата).", more: "Трябва да съдържа достатъчно сведения за бъдещото решение — иначе таблицата решава друга задача." },
    "lru_cache": { cat: "Методи", t: "functools.lru_cache (Python)", en: "LRU cache decorator", d: "Декоратор, който пази резултатите на функция по аргументите ѝ — мемоизация.", more: "Кеширането е коректно само ако същите аргументи означават същата подзадача (функцията няма скрито състояние)." },
  });

  const PHI = (1 + Math.sqrt(5)) / 2;
  const MAXDRAW = 7;

  /* наивна / мемоизирана рекурсия: само броене (за n > MAXDRAW) */
  function countNaive(n) { let c = 0; const f = (k) => { c++; return k < 2 ? k : f(k - 1) + f(k - 2); }; const r = f(n); return { r, c }; }
  function countMemo(n) { let c = 0; const m = Array(n + 1).fill(-1); const f = (k) => { c++; if (m[k] !== -1) return m[k]; if (k < 2) return (m[k] = k); const a = f(k - 1), b = f(k - 2); return (m[k] = a + b); }; const r = f(n); return { r, c }; }

  function parseItems(str) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error("Въведи поне един предмет във вида тегло:стойност, напр. „2:3 3:4“.");
    if (parts.length > 6) throw new Error("Най-много 6 предмета.");
    return parts.map((p) => {
      const m = /^(\d+):(\d+)$/.exec(p);
      if (!m) throw new Error(`„${p}“ не е предмет. Формат: тегло:стойност, напр. 2:3.`);
      const w = +m[1], v = +m[2];
      if (w < 1 || w > 15) throw new Error("Теглата трябва да са от 1 до 15.");
      if (v > 99) throw new Error("Стойностите трябва да са от 0 до 99.");
      return { w, v };
    });
  }

  const algos = {
    countNaive, countMemo,

    fib_tree({ n, memo }) {
      n = S.int(n, 0, 30, "n");
      memo = memo === true || memo === "true" || memo === "1";
      const theo = 2 * countMemo(n + 1).r - 1;  // 2F(n+1) − 1
      if (n > MAXDRAW) {
        const r = memo ? countMemo(n) : countNaive(n);
        const other = memo ? countNaive(n) : countMemo(n);
        const F = [{ at: "ret", big: true, n, memo, calls: r.c, other: other.c, vars: { n, "F(n)": r.r }, stats: { извиквания: r.c }, msg: `n = ${n} > ${MAXDRAW}: дървото не се рисува, само броим. ${memo ? `С мемоизация: <b>${r.c}</b> извиквания (= 2n − 1). Без нея биха били ${other.c}.` : `Наивно: <b>${r.c}</b> извиквания = 2F(${n + 1}) − 1 = ${theo}. С мемоизация биха били ${other.c}.`}` }];
        return { frames: F, result: r.r, calls: r.c };
      }
      const nodes = [], F = [];
      const mem = Array(n + 1).fill(-1);
      const cnt = Array(n + 1).fill(0);
      let calls = 0;
      const snap = (o) => ({ n, memo, nodes: nodes.map((x) => ({ ...x })), cnt: cnt.slice(), mem: mem.slice(), stats: { извиквания: calls }, ...o });
      function rec(k, parent, depth) {
        calls++; cnt[k]++;
        const id = nodes.length;
        nodes.push({ id, k, parent, depth, state: "act", val: null });
        F.push(snap({ cur: id, at: "enter", vars: { n: k, calls }, msg: `Извикване F(${k}) — №${calls}.${cnt[k] > 1 ? ` <b>F(${k}) се пресмята за ${cnt[k]}-и път.</b>` : ""}` }));
        if (memo && mem[k] !== -1) {
          nodes[id].state = "hit"; nodes[id].val = mem[k];
          F.push(snap({ cur: id, at: "hit", vars: { n: k, [`memo[${k}]`]: mem[k] }, msg: `memo[${k}] = ${mem[k]} — <b>от кеша</b>, без нови извиквания. Възелът е лист.`, log: `F(${k}) = ${mem[k]} (кеш)` }));
          return mem[k];
        }
        if (k < 2) {
          nodes[id].state = "done"; nodes[id].val = k;
          if (memo) mem[k] = k;
          F.push(snap({ cur: id, at: "base", vars: { n: k, return: k }, msg: `Базов случай: F(${k}) = ${k}.`, log: `F(${k}) = ${k}` }));
          return k;
        }
        F.push(snap({ cur: id, at: "left", vars: { n: k }, msg: `F(${k}) вика F(${k - 1}).` }));
        nodes[id].state = "wait";
        const a = rec(k - 1, id, depth + 1);
        nodes[id].state = "act";
        F.push(snap({ cur: id, at: "right", vars: { n: k, a }, msg: `F(${k - 1}) = ${a}. Сега F(${k}) вика F(${k - 2})${memo ? " — вече е в кеша" : " — тази подзадача вече е решавана, но наивната версия не помни"}.` }));
        nodes[id].state = "wait";
        const b = rec(k - 2, id, depth + 1);
        const r = a + b;
        if (memo) mem[k] = r;
        nodes[id].state = "done"; nodes[id].val = r;
        F.push(snap({ cur: id, at: "ret", vars: { n: k, a, b, return: r }, msg: `F(${k}) = ${a} + ${b} = <b>${r}</b>${memo ? `; memo[${k}] = ${r}` : ""}.`, log: `F(${k}) = ${r}` }));
        return r;
      }
      if (memo) F.push({ n, memo, nodes: [], cnt: cnt.slice(), mem: mem.slice(), at: "init", vars: { n }, msg: `memo[0..${n}] = −1 („не е пресметнато“).`, stats: { извиквания: 0 } });
      const r = rec(n, -1, 0);
      F[F.length - 1].final = true;
      F[F.length - 1].msg += memo ? ` Общо <b>${calls}</b> извиквания (2n − 1) — линейно.` : ` Общо <b>${calls}</b> извиквания = 2F(${n + 1}) − 1 = ${theo}.`;
      // позиции от крайното дърво
      const kids = nodes.map(() => []);
      nodes.forEach((x) => { if (x.parent >= 0) kids[x.parent].push(x.id); });
      const pos = [];
      let leaf = 0;
      const place = (id) => { if (!kids[id].length) { pos[id] = leaf++; return; } kids[id].forEach(place); pos[id] = (pos[kids[id][0]] + pos[kids[id][kids[id].length - 1]]) / 2; };
      place(0);
      return { frames: F, result: r, calls, pos, leaves: leaf, depth: Math.max(...nodes.map((x) => x.depth)) };
    },

    fib_iter({ n, variant }) {
      n = S.int(n, 0, 60, "n");
      const F = [];
      if (variant === "two") {
        let prev = 0, cur = 1;
        F.push({ at: "init", two: [prev, cur], i: 1, vars: { prev, cur }, msg: "prev = F(0) = 0, cur = F(1) = 1.", log: "prev=0, cur=1" });
        if (n === 0) { F.push({ at: "zero", two: [0, 1], i: 0, done: true, vars: { return: 0 }, msg: "n = 0 → връщаме 0." }); return { frames: F, result: 0 }; }
        for (let i = 2; i <= n; i++) {
          F.push({ at: "loop", two: [prev, cur], i: i - 1, vars: { i, prev, cur }, msg: `i = ${i}: пазим само F(${i - 2}) и F(${i - 1}).` });
          const next = prev + cur;
          F.push({ at: "step", two: [prev, cur], next, i: i - 1, vars: { i, prev, cur, next }, msg: `next = ${prev} + ${cur} = ${next} = F(${i}).` });
          prev = cur; cur = next;
          F.push({ at: "shift", two: [prev, cur], i, vars: { i, prev, cur }, msg: `Изместваме: prev = F(${i - 1}) = ${prev}, cur = F(${i}) = ${cur}. Старото F(${i - 2}) се забравя.`, log: `F(${i}) = ${cur}` });
        }
        F.push({ at: "ret", two: [prev, cur], i: n, done: true, vars: { return: cur }, msg: `F(${n}) = <b>${cur}</b> с Θ(1) допълнителна памет — три променливи независимо от n.` });
        return { frames: F, result: cur };
      }
      const T = Array(n + 1).fill(null);
      T[0] = 0; if (n > 0) T[1] = 1;
      F.push({ at: "init", T: T.slice(), i: -1, vars: { "F[0]": 0, "F[1]": n > 0 ? 1 : "—" }, msg: "Базови стойности F[0] = 0, F[1] = 1.", log: "F[0]=0, F[1]=1" });
      for (let i = 2; i <= n; i++) {
        F.push({ at: "loop", T: T.slice(), i, vars: { i }, msg: `i = ${i}: F[${i - 1}] и F[${i - 2}] вече са попълнени — редът отляво надясно гарантира това.` });
        T[i] = T[i - 1] + T[i - 2];
        F.push({ at: "step", T: T.slice(), i, vars: { i, "F[i-1]": T[i - 1], "F[i-2]": T[i - 2], "F[i]": T[i] }, msg: `F[${i}] = F[${i - 1}] + F[${i - 2}] = ${T[i - 1]} + ${T[i - 2]} = <b>${T[i]}</b>.`, log: `F[${i}] = ${T[i]}` });
      }
      F.push({ at: "ret", T: T.slice(), i: n, done: true, vars: { return: T[n] }, msg: `F(${n}) = <b>${T[n]}</b>. Θ(n) време, Θ(n) памет за таблицата.` });
      return { frames: F, result: T[n] };
    },

    knap2d({ items, W }) {
      const it = parseItems(items);
      W = S.int(W, 0, 15, "Вместимостта W");
      const n = it.length;
      const D = Array.from({ length: n + 1 }, () => Array(W + 1).fill(null));
      const F = [];
      const snap = (o) => ({ it, W, D: D.map((r) => r.slice()), ...o });
      for (let c = 0; c <= W; c++) D[0][c] = 0;
      F.push(snap({ at: "base", row: 0, vars: { "D[0][*]": 0 }, msg: "D(0, c) = 0: без предмети стойността е 0 за всяка вместимост.", log: "ред 0 = 0" }));
      let cells = 0;
      for (let i = 1; i <= n; i++) {
        const { w, v } = it[i - 1];
        F.push(snap({ at: "row", row: i, vars: { i, [`w${i}`]: w, [`v${i}`]: v }, msg: `Предмет ${i}: тегло ${w}, стойност ${v}.` }));
        for (let c = 0; c <= W; c++) {
          cells++;
          D[i][c] = D[i - 1][c];
          if (w > c) {
            F.push(snap({ at: ["skip", "fits"], cur: [i, c], up: [i - 1, c], win: "up", vars: { i, c, [`w${i}`]: w, "D[i-1][c]": D[i - 1][c] }, msg: `c = ${c}: w${i} = ${w} &gt; ${c} — предметът не се побира. D(${i},${c}) = D(${i - 1},${c}) = <b>${D[i][c]}</b>.`, stats: { клетки: cells } }));
            continue;
          }
          const take = v + D[i - 1][c - w];
          const better = take > D[i - 1][c];
          F.push(snap({ at: ["cmp", "take"], cur: [i, c], up: [i - 1, c], diag: [i - 1, c - w], vars: { i, c, "не взимаме": D[i - 1][c], взимаме: `${v}+${D[i - 1][c - w]}=${take}` }, msg: `c = ${c}: max{ D(${i - 1},${c}) = ${D[i - 1][c]}, v${i} + D(${i - 1},${c - w}) = ${v} + ${D[i - 1][c - w]} = ${take} }.`, stats: { клетки: cells } }));
          if (better) D[i][c] = take;
          F.push(snap({ at: better ? "upd" : "skip", cur: [i, c], up: [i - 1, c], diag: [i - 1, c - w], win: better ? "diag" : "up", vars: { i, c, "D[i][c]": D[i][c] }, msg: `D(${i},${c}) = <b>${D[i][c]}</b> — ${better ? `взимаме предмет ${i}` : take === D[i - 1][c] ? "равенство — оставяме „не взимаме“" : `не взимаме предмет ${i}`}.`, stats: { клетки: cells } }));
        }
        F[F.length - 1].log = `ред ${i}: ${D[i].join(" ")}`;
      }
      F.push(snap({ at: "ret", cur: [n, W], vars: { return: D[n][W] }, msg: `Оптималната стойност е D(${n},${W}) = <b>${D[n][W]}</b>. Сега обратно проследяване — кои предмети?`, stats: { клетки: cells }, log: `return ${D[n][W]}` }));
      const taken = [], path = [];
      let c = W;
      for (let i = n; i >= 1; i--) {
        path.push([i, c]);
        const t = D[i][c] !== D[i - 1][c];
        F.push(snap({ at: "tbcmp", cur: [i, c], up: [i - 1, c], path: path.slice(), taken: taken.slice(), vars: { i, c, "D[i][c]": D[i][c], "D[i-1][c]": D[i - 1][c] }, msg: `D(${i},${c}) = ${D[i][c]} ${t ? "≠" : "="} D(${i - 1},${c}) = ${D[i - 1][c]} → предмет ${i} ${t ? "<b>е взет</b>" : "не е взет"}.` }));
        if (t) {
          taken.push(i); c -= it[i - 1].w;
          F.push(snap({ at: "tbtake", cur: [i - 1, c], path: path.slice(), taken: taken.slice(), vars: { i, c }, msg: `Взимаме предмет ${i} (${it[i - 1].w}:${it[i - 1].v}); вместимостта става ${c}.`, log: `взет ${i}` }));
        }
      }
      path.push([0, c]);
      const sorted = taken.slice().sort((a, b) => a - b);
      F.push(snap({ at: "ret", done: true, path: path.slice(), taken: taken.slice(), vars: { взети: sorted.join(", ") || "—" }, msg: `Взети предмети: <b>${sorted.join(", ") || "няма"}</b>, общо тегло ${sorted.reduce((s, k) => s + it[k - 1].w, 0)} ≤ ${W}, стойност ${D[n][W]}.` }));
      return { frames: F, result: D[n][W], taken: sorted, table: D };
    },

    knap1d({ items, W, dir }) {
      const it = parseItems(items);
      W = S.int(W, 0, 15, "Вместимостта W");
      const down = dir !== "up";
      const dp = Array(W + 1).fill(0);
      const F = [];
      const src = Array.from({ length: W + 1 }, () => []);   // кои предмети (с повторение) стоят зад dp[c]
      const snap = (o) => ({ dp: dp.slice(), W, it, down, src: src.map((x) => x.slice()), ...o });
      F.push(snap({ at: "init", vars: { W }, msg: `dp[0..${W}] = 0. Посока: c ${down ? "НАДОЛУ (0/1)" : "НАГОРЕ (неограничена)"}.` }));
      it.forEach(({ w, v }, i) => {
        F.push(snap({ at: "item", item: i, vars: { i: i + 1, w, v }, msg: `Предмет ${i + 1} (${w}:${v}). Обхождаме c ${down ? `от ${W} надолу до ${w}` : `от ${w} нагоре до ${W}`}.` }));
        const cs = [];
        if (down) for (let c = W; c >= w; c--) cs.push(c); else for (let c = w; c <= W; c++) cs.push(c);
        for (const c of cs) {
          const cand = v + dp[c - w];
          const fresh = !down && src[c - w].includes(i);
          F.push(snap({ at: ["cmp", down ? "down" : "up"], item: i, c, from: c - w, reuse: fresh, vars: { c, "dp[c]": dp[c], [`v+dp[${c - w}]`]: `${v}+${dp[c - w]}=${cand}` }, msg: `dp[${c}]: ${dp[c]} срещу ${v} + dp[${c - w}] = ${cand}.${fresh ? ` <span class="warn">dp[${c - w}] вече е обновен в ТОЗИ ред и съдържа предмет ${i + 1} — той ще се вземе пак!</span>` : down ? ` dp[${c - w}] е още от предишния ред (c − w &lt; c, а вървим надолу).` : ""}` }));
          if (cand > dp[c]) {
            dp[c] = cand; src[c] = src[c - w].concat([i]);
            F.push(snap({ at: "upd", item: i, c, from: c - w, reuse: fresh, vars: { c, "dp[c]": dp[c] }, msg: `dp[${c}] = ${dp[c]} (предмети: ${src[c].map((k) => k + 1).join("+")}).`, log: `dp[${c}] = ${dp[c]}` }));
          }
        }
      });
      F.push(snap({ at: "ret", done: true, c: W, vars: { return: dp[W] }, msg: `dp[${W}] = <b>${dp[W]}</b> (${src[W].map((k) => k + 1).join("+") || "нищо"}). ${down ? "Всеки предмет е използван най-много веднъж — раница 0/1." : src[W].length !== new Set(src[W]).size ? "<b>Предмет е използван повече от веднъж</b> — това е неограничена раница, друга задача!" : "За този вход повторение не се е получило, но посоката нагоре решава неограничената раница."}` }));
      return { frames: F, result: dp[W] };
    },
  };

  /* ---------- рисуване ---------- */
  function drawTree(st, f, res) {
    st.innerHTML = "";
    if (f.big) {
      const naive = f.memo ? f.other : f.calls, memo = f.memo ? f.calls : f.other;
      st.append(h("div", { class: "split" },
        h("div", { class: "card" }, h("span", { class: "eyebrow", text: "наивно" }), h("h4", { class: "mono", text: naive.toLocaleString("bg") + " извиквания" }), h("p", { text: `≈ Θ(φⁿ), φ ≈ ${PHI.toFixed(3)}` })),
        h("div", { class: "card" }, h("span", { class: "eyebrow", text: "с мемоизация" }), h("h4", { class: "mono", text: memo + " извиквания" }), h("p", { text: "2n − 1 → Θ(n)" }))));
      return;
    }
    const L = res.leaves, D = res.depth;
    const cw = 40, rh = 52, W = Math.max(200, L * cw + 20), H = (D + 1) * rh + 10;
    const X = (id) => 10 + cw / 2 + res.pos[id] * cw, Y = (d) => 24 + d * rh;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Дърво на извикванията" });
    const hi = f.hiK;
    f.nodes.forEach((x) => { if (x.parent >= 0) svg.append(S.svg("line", { x1: X(x.parent), y1: Y(x.depth - 1) + 15, x2: X(x.id), y2: Y(x.depth) - 15, class: "edge" + (x.id === f.cur ? " s-act" : "") })); });
    f.nodes.forEach((x) => {
      let cls = x.state === "hit" ? "s-cmp" : x.state === "done" ? "s-done" : x.state === "wait" ? "" : "s-act";
      if (x.id === f.cur) cls = x.state === "hit" ? "s-cmp" : "s-act";
      if (hi != null && x.k === hi && x.id !== f.cur) cls = "s-piv";
      const g = S.svg("g", { class: "node " + cls });
      g.append(S.svg("circle", { cx: X(x.id), cy: Y(x.depth), r: 16 }));
      g.append(S.svg("text", { x: X(x.id), y: Y(x.depth) + 4, "text-anchor": "middle", style: "font-size:11.5px;font-weight:700", text: `F${x.k}` }));
      if (x.val != null) g.append(S.svg("text", { x: X(x.id) + 13, y: Y(x.depth) - 14, class: "wt", style: "font-size:10.5px", text: x.state === "hit" ? `=${x.val}⚡` : `=${x.val}` }));
      svg.append(g);
    });
    st.append(svg);
    const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "k" }), ...f.cnt.map((_, k) => h("th", { text: k }))),
      h("tr", null, h("th", { text: "извиквания F(k)" }), ...f.cnt.map((c, k) => h("td", { class: hi === k ? "s-piv" : c > 1 && !f.memo ? "s-swap" : "", text: c }))));
    if (f.memo) tb.append(h("tr", null, h("th", { text: "memo[k]" }), ...f.mem.map((m) => h("td", { class: m >= 0 ? "s-done" : "", text: m < 0 ? "−1" : m }))));
    st.append(h("div", { class: "tbl-wrap", style: { marginTop: "8px" } }, tb));
  }

  function drawKnap(st, f) {
    st.innerHTML = "";
    const n = f.it.length;
    const at = (p, i, c) => p && p[0] === i && p[1] === c;
    const inPath = (i, c) => f.path && f.path.some((p) => p[0] === i && p[1] === c);
    const tb = h("table", { class: "t grid" });
    tb.append(h("tr", null, h("th", { text: "i \\ c" }), ...Array.from({ length: f.W + 1 }, (_, c) => h("th", { text: c }))));
    for (let i = 0; i <= n; i++) {
      const lab = i ? `${i}  (${f.it[i - 1].w}:${f.it[i - 1].v})` : "0";
      const tr = h("tr", null, h("th", { class: f.taken && f.taken.includes(i) ? "s-done" : "", style: { whiteSpace: "nowrap" }, text: lab }));
      for (let c = 0; c <= f.W; c++) {
        let cls = "";
        if (inPath(i, c)) cls = "s-done";
        if (at(f.up, i, c)) cls = f.win === "up" ? "s-done" : "s-cmp";
        if (at(f.diag, i, c)) cls = f.win === "diag" ? "s-done" : "s-piv";
        if (at(f.cur, i, c)) cls = "s-act";
        tr.append(h("td", { class: cls, text: f.D[i][c] == null ? "" : f.D[i][c] }));
      }
      tb.append(tr);
    }
    st.append(h("div", { class: "tbl-wrap" }, tb));
    if (f.taken) st.append(h("p", { class: "mono", style: { marginTop: "6px" }, html: "взети: " + (f.taken.length ? f.taken.slice().sort((a, b) => a - b).map((k) => `<span class="pill s-done">${k} (${f.it[k - 1].w}:${f.it[k - 1].v})</span>`).join(" ") : "—") }));
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="динамично програмиране">Динамичното програмиране</dfn> (DP) разлага задачата на подзадачи, чиито резултати се <b>запазват</b> за повторно използване. Подходящо е, когато има <dfn data-g="припокриващи се подзадачи">припокриващи се подзадачи</dfn> и <dfn data-g="оптимална подструктура">оптимална подструктура</dfn>. Две реализации: <dfn data-g="мемоизация">мемоизация</dfn> (отгоре надолу) и <dfn data-g="таблично изчисление">таблично изчисление</dfn> (отдолу нагоре).</p>
</div>

<div class="block">
  <h3>Фибоначи: дървото на извикванията</h3>
  <p class="prose">F(0) = 0; F(1) = 1; F(n) = F(n−1) + F(n−2). Наивната рекурсия прави <b>експоненциален</b> брой извиквания, Θ(φⁿ), където φ = (1 + √5)/2 — точно 2F(n+1) − 1. Причината се вижда в <dfn data-g="дърво на извикванията">дървото на извикванията</dfn>: едни и същи подзадачи се решават многократно. Със запазване на резултатите времето е Θ(n), паметта — Θ(n).</p>
  <div id="v9-tree"></div>
  <details class="hint"><summary>Хинт: какво точно прави мемоизацията с дървото</summary><div>
    <p>Всяко F(k) се пресмята <b>веднъж</b>. Второто извикване на F(k) намира memo[k] ≠ −1 и връща веднага — възелът става лист („от кеша“, оранжев). Остава една „гръбнака“ F(n) → F(n−1) → … → F(1) плюс по един лист от кеша: 2n − 1 извиквания.</p>
    <p>Рекурсия и DP <b>не се изключват</b>: рекурсивна функция с мемоизация е типична реализация на DP. В Python <code>functools.lru_cache</code> прави точно това — пази резултатите (<dfn data-g="lru_cache">мемоизация</dfn>) <span class="extra-tag">извън конспекта</span>. Кеширането изисква същите аргументи да означават същата подзадача.</p>
  </div></details>
  <details class="trap"><summary>Капан: „динамично“ = динамично заделена памет?</summary><div>
    <p>Не. „Динамично програмиране“ няма връзка с <code>malloc</code>. Таблицата може да е статичен масив. Същността е запазване и повторно използване на резултати от подзадачи.</p>
  </div></details>
  <div class="key"><p class="formula">наивно: 2F(n+1) − 1 = Θ(φⁿ) извиквания;   мемо: Θ(n) време, Θ(n) памет</p></div>
</div>

<div class="block">
  <h3>Таблично (отдолу нагоре) и с две променливи</h3>
  <p class="prose">Табличният подход избира <b>ред</b>, в който зависимостите са готови: F[0], F[1], F[2], … Мемоизацията пресмята при поискване и запомня. Итеративно с две стойности е достатъчна Θ(1) допълнителна памет. Оценките предполагат единична цена на аритметиката.</p>
  <div id="v9-iter"></div>
  <details class="hint"><summary>Хинт: защо две променливи стигат</summary><div>
    <p>F[i] зависи само от F[i−1] и F[i−2]. След като F[i] е пресметнато, F[i−2] вече не трябва на никого — може да се забрави. Това е общ трик: ако рекурентната зависимост гледа само k реда назад, пазим k реда.</p>
  </div></details>
</div>

<div class="block">
  <h3>Раница 0/1</h3>
  <p class="prose"><dfn data-g="раница 0/1">Раница 0/1</dfn>: тегла wᵢ, стойности vᵢ, вместимост W; всеки предмет най-много веднъж. D(i, c) е максималната стойност от първите i предмета при вместимост c — това е <dfn data-g="състояние на dp">състоянието</dfn>.</p>
  <div class="key"><p class="formula">D(0, c) = 0<br>D(i, c) = D(i−1, c),  ако wᵢ &gt; c<br>D(i, c) = max{ D(i−1, c),  vᵢ + D(i−1, c−wᵢ) },  ако wᵢ ≤ c</p></div>
  <p class="prose">Пример от материала: предмети 2:3 и 3:4, вместимост 5 — двата предмета дават стойност 7. Време O(nW), памет O(nW).</p>
  <div id="v9-knap"></div>
  <details class="hint"><summary>Хинт: двете клетки, от които зависи текущата</summary><div>
    <p>Оранжевата клетка D(i−1, c) е „<b>не взимаме</b> предмет i“ — същата вместимост, предмети до i−1. Лилавата D(i−1, c−wᵢ) + vᵢ е „<b>взимаме</b> го“ — заплащаме wᵢ от вместимостта. Зелената е победителят. Това е сравнението на алтернативи, което алчният подход не прави.</p>
    <p><dfn data-g="обратно проследяване">Обратното проследяване</dfn>: ако D(i, c) ≠ D(i−1, c), предмет i е взет и c −= wᵢ. Ако трябва да се възстанови изборът, може да е нужна допълнителна информация — двумерната таблица я дава.</p>
  </div></details>
  <details class="trap"><summary>Капан: O(nW) полиномиално ли е? А NP-пълнотата?</summary><div>
    <p>O(nW) е <dfn data-g="псевдополиномиален алгоритъм">псевдополиномиално</dfn>: W се записва с само Θ(log W) бита, така че nW е <b>експоненциално</b> спрямо дължината на входа. Затова това, че вариантът за разпознаване на раница 0/1 е <dfn data-g="np-пълна">NP-пълен</dfn>, не противоречи на O(nW) решението — и точно затова такъв алгоритъм не доказва P = NP.</p>
    <p>Състоянието трябва да съдържа достатъчно сведения за бъдещото решение — иначе таблицата решава друга задача. Тук (i, c) стига: остатъчната вместимост е всичко, което бъдещите избори трябва да знаят.</p>
  </div></details>
</div>

<div class="block">
  <h3>Едномерен масив: посоката на обхождане е съществена</h3>
  <p class="prose">Паметта може да падне до O(W) с подходящ ред на обновяване. При едномерен масив вместимостта се обхожда <b>надолу</b>: dp[c − w] още пази стойността от предишния ред. Иначе същият предмет се използва повторно в един ред — това е друг вариант на задачата (<dfn data-g="неограничена раница">неограничена раница</dfn>).</p>
  <div id="v9-1d"></div>
  <div class="key"><p class="formula">0/1: for c = W … w   dp[c] = max(dp[c], v + dp[c−w])<br>неограничена: for c = w … W   (същият ред!)</p></div>
</div>

<div class="block">
  <h3>Три парадигми една до друга</h3>
  <p class="prose"><a href="#razdelyai">Разделяй и владей</a>: подзадачите обикновено са <b>независими</b>. DP: еднакви подзадачи се срещат многократно и резултатите се използват повторно. <a href="#alchen">Алчен подход</a>: прави се локален избор; при DP се сравняват алтернативи.</p>
  <div class="cards" id="v9-par"></div>
  <div id="v9-par-fig"></div>
</div>
<div id="quiz9"></div>`;

  const PAR = [
    { k: "dc", t: "Разделяй и владей", s: "дърво без повторения", d: "Merge Sort върху [0,8): всяка подзадача е различен подмасив — няма какво да се запомня. Резултатите се комбинират." },
    { k: "dp", t: "Динамично програмиране", s: "DAG — споделени подзадачи", d: "Фибоначи F(6): всяка подзадача F(k) е един възел, към който водят няколко стрелки. Пресмята се веднъж, ползва се многократно." },
    { k: "gr", t: "Алчен подход", s: "една верига от избори", d: "Интервали A, B, C, D: на всяка стъпка един локален избор, без връщане. Алтернативите не се сравняват." },
  ];
  function parFig(k) {
    const svg = S.svg("svg", { class: "g", viewBox: "0 0 600 230", width: 600, role: "img", "aria-label": "Схема" });
    const node = (x, y, t, cls = "", r = 18) => { const g = S.svg("g", { class: "node " + cls }); g.append(S.svg("circle", { cx: x, cy: y, r }), S.svg("text", { x, y: y + 4, "text-anchor": "middle", style: "font-size:11px", text: t })); svg.append(g); };
    const line = (x1, y1, x2, y2, cls = "") => svg.append(S.svg("line", { x1, y1, x2, y2, class: "edge " + cls }));
    if (k === "dc") {
      const lv = [[[0, 8]], [[0, 4], [4, 8]], [[0, 2], [2, 4], [4, 6], [6, 8]], Array.from({ length: 8 }, (_, i) => [i, i + 1])];
      const P = (d, j) => [ (j + 0.5) * (600 / lv[d].length), 26 + d * 58 ];
      lv.forEach((row, d) => row.forEach((_, j) => { if (d) { const [x, y] = P(d, j), [px, py] = P(d - 1, j >> 1); line(px, py + 18, x, y - 18); } }));
      lv.forEach((row, d) => row.forEach(([a, b], j) => { const [x, y] = P(d, j); node(x, y, b - a === 1 ? `${a}` : `${a}-${b}`, d === 0 ? "s-act" : "", 19); }));
    } else if (k === "dp") {
      const X = (i) => 40 + (6 - i) * 87;
      for (let i = 6; i >= 2; i--) { line(X(i) + 18, 115, X(i - 1) - 18, 115, "s-act"); svg.append(S.svg("path", { d: `M${X(i)} 97 Q ${(X(i) + X(i - 2)) / 2} 30 ${X(i - 2)} 97`, class: "edge s-piv" })); }
      for (let i = 6; i >= 0; i--) node(X(i), 115, `F${i}`, i < 2 ? "s-done" : "");
      svg.append(S.svg("text", { x: 300, y: 190, "text-anchor": "middle", class: "wt", text: "7 възела вместо 25 в дървото: F(k) се пресмята веднъж" }));
      svg.append(S.svg("text", { x: 300, y: 210, "text-anchor": "middle", class: "wt", text: "синьо: F(k) → F(k−1)   лилаво: F(k) → F(k−2)" }));
    } else {
      const steps = [["старт", ""], ["A [0,2)", "s-done"], ["B [2,4)", "s-done"], ["C [4,6)", "s-done"]];
      steps.forEach(([t, c], i) => { const x = 60 + i * 160; if (i) line(x - 160 + 34, 90, x - 34, 90, "s-act"); const g = S.svg("g", { class: "node " + c }); g.append(S.svg("rect", { x: x - 34, y: 72, width: 68, height: 36, rx: 6, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--ink-2));stroke-width:2" }), S.svg("text", { x, y: 94, "text-anchor": "middle", style: "font-size:11.5px", text: t })); svg.append(g); });
      svg.append(S.svg("text", { x: 220, y: 150, "text-anchor": "middle", class: "wt", text: "D [0,5) — отхвърлен, никога не се преразглежда" }));
      svg.append(S.svg("text", { x: 300, y: 195, "text-anchor": "middle", class: "wt", text: "без таблица, без връщане: един избор на стъпка" }));
    }
    return svg;
  }

  function mount(root) {
    let hiK = "";
    const tv = S.viz(root.querySelector("#v9-tree"), {
      id: "dp-tree", title: "Дърво на извикванията F(n)", sub: `Синьо — текущо, зелено — върнато, оранжево — от кеша, лилаво — избраната подзадача. При n &gt; ${MAXDRAW} само се броят извикванията.`,
      code: (i) => (i.memo ? "ch09_fib_memo" : "ch09_fib_naive"),
      inputs: [
        { id: "n", label: "n (0–30)", type: "number", value: 5, width: "5em" },
        { id: "memo", label: "с мемоизация", type: "checkbox", value: false },
        { id: "hl", label: "оцвети F(k)", type: "select", value: "3", options: [["", "—"], ...Array.from({ length: 8 }, (_, k) => [String(k), `F(${k})`])] },
      ],
      presets: [{ label: "n = 7", values: { n: 7, memo: false } }, { label: "n = 7 с мемо", values: { n: 7, memo: true } }, { label: "n = 30 (само брой)", values: { n: 30 } }],
      legend: [["s-act", "текущо"], ["s-done", "върнато"], ["s-cmp", "от кеша"], ["s-piv", "избрана F(k)"]],
      build(i) { hiK = i.hl; return algos.fib_tree(i); },
      draw(st, f, { res }) { drawTree(st, { ...f, hiK: hiK === "" ? null : +hiK }, res); },
    });
    void tv;

    S.viz(root.querySelector("#v9-iter"), {
      id: "dp-iter", title: "Фибоначи отдолу нагоре", sub: "Стрелките показват от кои клетки идва текущата.",
      code: (i) => (i.variant === "two" ? "ch09_fib_two" : "ch09_fib_table"),
      inputs: [{ id: "n", label: "n (0–60)", type: "number", value: 10, width: "5em" }, { id: "variant", label: "Вариант", type: "select", value: "table", options: [["table", "таблица F[0..n] — Θ(n) памет"], ["two", "две променливи — Θ(1) памет"]] }],
      legend: [["s-act", "F[i]"], ["s-cmp", "F[i−1], F[i−2]"], ["s-done", "готово"]],
      build: algos.fib_iter,
      draw(st, f) {
        st.innerHTML = "";
        if (f.two) {
          const box = h("div", { class: "row" });
          const cell = (name, val, cls) => h("div", { style: { display: "grid", gap: "4px", justifyItems: "center" } }, h("span", { class: "eyebrow", text: name }), h("div", { class: "cell " + cls, style: { width: "auto", minWidth: "64px", padding: "0 8px" }, text: String(val) }));
          box.append(cell(`prev = F(${Math.max(0, f.i - 1)})`, f.two[0], f.at === "step" ? "s-cmp" : ""), h("span", { text: "+" }), cell(`cur = F(${f.i})`, f.two[1], f.at === "step" ? "s-cmp" : f.at === "shift" ? "s-done" : ""), h("span", { text: "→" }), cell("next", f.next ?? "", f.at === "step" ? "s-act" : ""));
          st.append(box, h("p", { class: "muted", style: { marginTop: "8px" }, text: "Паметта не расте с n: три променливи." }));
          return;
        }
        const vis = f.T.length > 16 ? Math.max(0, Math.min(f.i - 8, f.T.length - 16)) : 0;
        const arr = f.T.slice(vis, vis + 16);
        const cls = {};
        arr.forEach((_, k) => { const g = k + vis; if (g === f.i) cls[k] = f.done ? "s-done" : "s-act"; else if (f.at === "step" && (g === f.i - 1 || g === f.i - 2)) cls[k] = "s-cmp"; });
        S.drawArray(st, arr.map((x) => (x == null ? "" : x)), { cls, label: (k) => k + vis, dim: (k) => arr[k] == null });
        st.querySelectorAll(".cell").forEach((c) => { c.style.width = "auto"; c.style.minWidth = "44px"; c.style.padding = "0 6px"; });
        if (f.at === "step") st.append(h("p", { class: "mono", text: `F[${f.i}] ← F[${f.i - 1}] + F[${f.i - 2}]` }));
        if (vis > 0) st.append(h("p", { class: "muted", text: `показани са клетки ${vis}…${vis + arr.length - 1}` }));
      },
    });

    S.viz(root.querySelector("#v9-knap"), {
      id: "dp-knap", title: "Раница 0/1 — таблица D(i, c)", sub: "Оранжево — D(i−1,c) „не взимаме“; лилаво — D(i−1,c−wᵢ) „взимаме“; зелено — победителят и пътят на проследяването.",
      code: "ch09_knap2d",
      inputs: [{ id: "items", label: "Предмети тегло:стойност", value: "2:3 3:4", width: "15em" }, { id: "W", label: "W (0–15)", type: "number", value: 5, width: "5em" }],
      presets: [
        { label: "Материал: 2:3 3:4, W=5", values: { items: "2:3 3:4", W: 5 } },
        { label: "4 предмета, W=5", values: { items: "2:3 3:4 4:5 5:6", W: 5 } },
        { label: "1:1 3:4 4:5 5:7, W=7", values: { items: "1:1 3:4 4:5 5:7", W: 7 } },
      ],
      random: () => ({ items: Array.from({ length: S.randInt(3, 5) }, () => `${S.randInt(1, 6)}:${S.randInt(1, 12)}`).join(" "), W: S.randInt(5, 12) }),
      legend: [["s-act", "текуща D(i,c)"], ["s-cmp", "D(i−1,c)"], ["s-piv", "D(i−1,c−wᵢ)"], ["s-done", "по-добрата / проследяване"]],
      build: algos.knap2d,
      draw: drawKnap,
    });

    S.viz(root.querySelector("#v9-1d"), {
      id: "dp-1d", title: "Раница с едномерен масив dp[c]", sub: "Смени посоката и сравни резултата при един и същ вход.",
      code: "ch09_knap1d",
      inputs: [
        { id: "items", label: "Предмети тегло:стойност", value: "2:3", width: "13em" },
        { id: "W", label: "W (0–15)", type: "number", value: 6, width: "5em" },
        { id: "dir", label: "Посока на c", type: "select", value: "down", options: [["down", "c надолу (0/1, правилно)"], ["up", "c нагоре (неограничена раница)"]] },
      ],
      presets: [
        { label: "2:3, W=6 · надолу", values: { items: "2:3", W: 6, dir: "down" } },
        { label: "2:3, W=6 · нагоре", values: { items: "2:3", W: 6, dir: "up" } },
        { label: "4 предмета, W=6 · нагоре", values: { items: "2:3 3:4 4:5 5:6", W: 6, dir: "up" } },
      ],
      legend: [["s-act", "dp[c]"], ["s-cmp", "dp[c−w] от предишния ред"], ["s-swap", "dp[c−w] вече съдържа същия предмет"], ["s-done", "резултат"]],
      build: algos.knap1d,
      draw(st, f) {
        st.innerHTML = "";
        const cls = {};
        if (f.from != null) cls[f.from] = f.reuse ? "s-swap" : "s-cmp";
        if (f.c != null) cls[f.c] = f.done ? "s-done" : "s-act";
        S.drawArray(st, f.dp, { cls });
        st.append(h("p", { class: "mono", html: `съдържание на dp[c]: ${f.src.map((s, c) => (s.length ? `${c}:{${s.map((k) => k + 1).join("+")}}` : null)).filter(Boolean).join("  ") || "—"}` }));
      },
    });

    const par = root.querySelector("#v9-par"), fig = root.querySelector("#v9-par-fig");
    const btns = PAR.map((p, i) => h("button", { class: "card", "aria-pressed": i === 1 ? "true" : "false", onclick: () => pick(i) }, h("span", { class: "eyebrow", text: p.s }), h("h4", { text: p.t }), h("p", { text: p.d })));
    par.append(...btns);
    function pick(i) {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      fig.innerHTML = "";
      fig.append(h("div", { class: "viz", style: { padding: "12px" } }, parFig(PAR[i].k)));
    }
    pick(1);

    S.quiz(root.querySelector("#quiz9"), [
      { q: "Колко извиквания прави наивната рекурсия за F(5)?", options: ["5", "9", "15", "32"], correct: 2, why: "2F(6) − 1 = 2·8 − 1 = 15. С мемоизация са 2·5 − 1 = 9. Провери в първия визуализатор." },
      { q: "Защо раница 0/1 за O(nW) не доказва P = NP?", options: ["Защото O(nW) е експоненциално в n", "Защото W се записва с Θ(log W) бита — O(nW) е псевдополиномиално спрямо дължината на входа", "Защото раницата не е в NP", "Защото DP не е детерминиран алгоритъм"], correct: 1, why: "Полиномиалността се мери спрямо битовата дължина на входа. nW = n·2^(log W) расте експоненциално спрямо броя битове на W." },
      { q: "При едномерен масив за раница 0/1 вместимостта се обхожда…", options: ["нагоре, иначе резултатът е по-малък", "надолу, иначе същият предмет се използва повторно в един ред", "в произволен ред", "два пъти"], correct: 1, why: "Надолу dp[c−w] още е от предишния ред. Нагоре вече е обновен с текущия предмет — получава се неограничена раница." },
      { q: "Кое твърдение е вярно?", options: ["Рекурсията и DP се изключват", "„Динамично“ означава динамично заделена памет", "Рекурсивна функция с мемоизация е типична реализация на DP", "DP изисква независими подзадачи"], correct: 2, why: "Мемоизацията е DP отгоре надолу. Независимите подзадачи са белег на „разделяй и владей“, не на DP." },
      { q: "По какво DP се различава от алчния подход?", options: ["DP прави един локален избор", "DP сравнява алтернативи чрез рекурентна зависимост", "Алчният подход винаги е по-точен", "Няма разлика"], correct: 1, why: "D(i,c) = max{не взимаме, взимаме} — двете алтернативи се сравняват. Алчният избира една и не се връща." },
    ]);
  }

  S.chapter({ id: "dp", order: 9, num: "9", group: "Задължителни парадигми", title: "Динамично програмиране", lead: "Припокриващи се подзадачи и оптимална подструктура: запази веднъж пресметнатото — Фибоначи от Θ(φⁿ) до Θ(n), раница 0/1 за O(nW).", html, mount, algos });
})();
