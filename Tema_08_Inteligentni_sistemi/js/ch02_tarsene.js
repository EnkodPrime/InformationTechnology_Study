/* Раздел 2 — търсене и евристики: BFS, DFS, uniform-cost, greedy best-first, A* върху редактируем граф. */
(function () {
  const S = window.Study, h = S.h;

  const MODES = ["bfs", "dfs", "ucs", "greedy", "astar"];
  const MN = { bfs: "BFS (опашка)", dfs: "DFS (стек)", ucs: "Uniform-cost (мин. g)", greedy: "Greedy best-first (мин. h)", astar: "A* (мин. f = g + h)" };

  function parseGraph(edges, heur, directed) {
    const names = [], idx = {}, adj = [], hv = [];
    const id = (s) => {
      if (!/^[A-Za-z0-9_]{1,8}$/.test(s)) throw new Error(`„${s}“: името е от 1 до 8 латински букви/цифри.`);
      if (!(s in idx)) { if (names.length >= 16) throw new Error("Най-много 16 състояния."); idx[s] = names.length; names.push(s); adj.push([]); hv.push(0); }
      return idx[s];
    };
    const items = String(edges).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!items.length) throw new Error("Въведи поне един преход: „от до цена“.");
    for (const it of items) {
      const p = it.split(/\s+/);
      if (p.length < 2 || p.length > 3) throw new Error(`„${it}“: очаква се „от до [цена]“.`);
      const w = p.length === 3 ? S.int(p[2], 1, 99, `Цената в „${it}“`) : 1;
      const a = id(p[0]), b = id(p[1]);
      adj[a].push([b, w]);
      if (!directed) adj[b].push([a, w]);
      if (adj[a].length > 15 || adj[b].length > 15) throw new Error("Твърде много преходи от едно състояние.");
    }
    for (const tok of String(heur).split(/[\s,;]+/).filter(Boolean)) {
      const m = /^([A-Za-z0-9_]{1,8})=(-?\d+)$/.exec(tok);
      if (!m) throw new Error(`„${tok}“: евристиката се задава като Име=число.`);
      if (!(m[1] in idx)) throw new Error(`Евристика за непознато състояние „${m[1]}“.`);
      hv[idx[m[1]]] = S.int(m[2], 0, 999, "h");
    }
    return { names, idx, adj, h: hv };
  }

  /** точната остатъчна цена h*(n) — Дейкстра от целта по обърнатите ребра (за проверката на допустимост) */
  function exactRemaining(G, goal) {
    const n = G.names.length, d = new Array(n).fill(Infinity), done = new Array(n).fill(false);
    d[goal] = 0;
    for (;;) {
      let u = -1;
      for (let k = 0; k < n; k++) if (!done[k] && d[k] < Infinity && (u < 0 || d[k] < d[u])) u = k;
      if (u < 0) break;
      done[u] = true;
      G.adj.forEach((l, a) => l.forEach(([b, w]) => { if (b === u && d[u] + w < d[a]) d[a] = d[u] + w; }));
    }
    return d;
  }

  /* ---------- чисти функции ---------- */
  const algos = {
    /** Същата графова процедура като search() в 02_search.c */
    search({ edges, heur, start, goal, mode, directed }) {
      const G = parseGraph(edges, heur, !!directed);
      if (!(start in G.idx)) throw new Error(`Началото „${start}“ не е в графа.`);
      if (!(goal in G.idx)) throw new Error(`Целта „${goal}“ не е в графа.`);
      const M = MODES.indexOf(mode);
      if (M < 0) throw new Error("Непознат режим.");
      const s0 = G.idx[start], t = G.idx[goal], n = G.names.length;
      const key = (e) => [e.seq, -e.seq, e.g, G.h[e.node], e.g + G.h[e.node]][M];
      const closed = new Array(n).fill(false), parent = new Array(n).fill(-1);
      let fr = [], seq = 0, expanded = 0;
      const order = [], F = [];
      const st = () => ({ разгънати: expanded, "във фронта": fr.length });
      const push = (o) => F.push(Object.assign({ G, fr: fr.map((e) => Object.assign({}, e)), closed: closed.slice(), parent: parent.slice(), order: order.slice(), mode, stats: st() }, o));
      fr.push({ node: s0, g: 0, parent: -1, seq: seq++ });
      push({ at: "init", cur: s0, vars: { start, goal }, msg: `Фронтът съдържа само началото ${start} с g = 0.`, log: `фронт: ${start}` });
      let cost = -1, finalNode = -1;
      while (fr.length) {
        push({ at: "loop", vars: { "|фронт|": fr.length }, msg: `Фронтът не е празен (${fr.length}). Избираме по критерия на ${MN[mode]}.` });
        let b = 0;
        for (let i = 1; i < fr.length; i++) { const kb = key(fr[b]), ki = key(fr[i]); if (ki < kb || (ki === kb && fr[i].seq < fr[b].seq)) b = i; }
        const e = fr[b];
        push({ at: "pick", pick: e.node, vars: { node: G.names[e.node], g: e.g, h: G.h[e.node], f: e.g + G.h[e.node] }, msg: `Избран: <b>${G.names[e.node]}</b> — ${{ bfs: "най-рано добавеният (опашка)", dfs: "най-късно добавеният (стек)", ucs: `най-малко g = ${e.g}`, greedy: `най-малко h = ${G.h[e.node]}`, astar: `най-малко f = ${e.g} + ${G.h[e.node]} = ${e.g + G.h[e.node]}` }[mode]}.` });
        fr.splice(b, 1);
        closed[e.node] = true; parent[e.node] = e.parent; expanded++; order.push(e.node);
        push({ at: "expand", cur: e.node, vars: { node: G.names[e.node], g: e.g }, msg: `${G.names[e.node]} се изважда и маркира като приключен.`, log: `разгъва ${G.names[e.node]} (g=${e.g})` });
        push({ at: "goaltest", cur: e.node, vars: { node: G.names[e.node], goal }, msg: `Проверка за цел <b>при изваждане</b>: ${G.names[e.node]} ${e.node === t ? "= цел" : "≠ " + goal}.` });
        if (e.node === t) { cost = e.g; finalNode = t; push({ at: "found", cur: t, path: true, vars: { cost }, msg: `Целта е достигната с цена <b>${cost}</b>.`, log: `цел, цена ${cost}` }); break; }
        for (const [v, w] of G.adj[e.node]) {
          const ng = e.g + w;
          push({ at: "nbr", cur: e.node, edge: [e.node, v], vars: { u: G.names[e.node], v: G.names[v], "g+w": ng }, msg: `Преход ${G.names[e.node]}→${G.names[v]} с цена ${w}: g(${G.names[v]}) = ${e.g} + ${w} = ${ng}.` });
          if (closed[v]) { push({ at: "closed", cur: e.node, edge: [e.node, v], vars: { v: G.names[v] }, msg: `${G.names[v]} вече е приключен — не се отваря повторно.` }); continue; }
          const f = fr.findIndex((x) => x.node === v);
          if (f < 0) { fr.push({ node: v, g: ng, parent: e.node, seq: seq++ }); push({ at: "push", cur: e.node, edge: [e.node, v], vars: { v: G.names[v], g: ng }, msg: `${G.names[v]} влиза във фронта (g = ${ng}).`, log: `  + ${G.names[v]} g=${ng}` }); }
          else if ((mode === "ucs" || mode === "astar") && ng < fr[f].g) { const old = fr[f].g; fr[f].g = ng; fr[f].parent = e.node; push({ at: "relax", cur: e.node, edge: [e.node, v], vars: { v: G.names[v], "старо g": old, "ново g": ng }, msg: `${G.names[v]} е във фронта с g = ${old}; новият път е по-евтин → g = ${ng}, родител ${G.names[e.node]}.`, log: `  ↓ ${G.names[v]} g=${ng}` }); }
        }
      }
      let path = [];
      if (cost >= 0) for (let v = finalNode; v >= 0; v = parent[v]) path.unshift(G.names[v]);
      // допустимост и съгласуваност (само за отчета под сцената)
      const hs = exactRemaining(G, t);
      const notAdm = G.names.filter((_, k) => hs[k] < Infinity && G.h[k] > hs[k]);
      const notCons = [];
      G.adj.forEach((l, a) => l.forEach(([b, w]) => { if (G.h[a] > w + G.h[b]) notCons.push(`${G.names[a]}→${G.names[b]}`); }));
      const opt = hs[s0] < Infinity ? hs[s0] : -1;
      if (cost < 0) push({ at: "fail", vars: { return: -1 }, msg: "Фронтът е празен — целта е недостижима.", log: "няма път" });
      const last = F[F.length - 1];
      last.done = true; last.pathNodes = path.map((x) => G.idx[x]);
      last.msg += ` Път: <b>${path.join(" → ") || "—"}</b>. Оптимална цена: ${opt < 0 ? "няма път" : opt}${cost >= 0 && opt >= 0 ? (cost === opt ? " — намереният е оптимален." : ` — <span class="warn">намереният (${cost}) НЕ е оптимален.</span>`) : ""}`;
      F.forEach((fr2) => { fr2.hstar = hs; fr2.notAdm = notAdm; fr2.notCons = notCons; });
      return { frames: F, cost, expanded, order: order.map((k) => G.names[k]).join(" "), path: path.join(" ") || "-", notAdm, notCons, opt };
    },

    /** Схема 6: кой кандидат избира всеки критерий */
    criteria({ gA, hA, gB, hB }) {
      const a = { g: S.int(gA, 0, 999, "g(A)"), h: S.int(hA, 0, 999, "h(A)") }, b = { g: S.int(gB, 0, 999, "g(B)"), h: S.int(hB, 0, 999, "h(B)") };
      const pick = (x, y) => (x < y ? "A" : y < x ? "B" : "равни");
      const rows = [
        { c: "Uniform-cost: g", A: a.g, B: b.g, w: pick(a.g, b.g) },
        { c: "Greedy: h", A: a.h, B: b.h, w: pick(a.h, b.h) },
        { c: "A*: f = g + h", A: a.g + a.h, B: b.g + b.h, w: pick(a.g + a.h, b.g + b.h) },
      ];
      return { frames: [{ rows, msg: rows[1].w !== rows[2].w ? `Greedy избира <b>${rows[1].w}</b>, а A* — <b>${rows[2].w}</b>: различните критерии избират различен кандидат.` : `Тук greedy и A* избират един и същ кандидат (${rows[2].w}).` }], rows };
    },
  };

  /* ---------- рисуване ---------- */
  function layout(G, root) {
    const n = G.names.length, lay = new Array(n).fill(-1);
    lay[root] = 0;
    const q = [root];
    while (q.length) { const u = q.shift(); for (const [v] of G.adj[u]) if (lay[v] < 0) { lay[v] = lay[u] + 1; q.push(v); } }
    const maxL = Math.max(0, ...lay);
    lay.forEach((l, k) => { if (l < 0) lay[k] = maxL + 1; });
    const cols = {};
    lay.forEach((l, k) => (cols[l] = cols[l] || []).push(k));
    const nc = Math.max(...lay) + 1, rowsMax = Math.max(...Object.values(cols).map((c) => c.length));
    const W = Math.max(320, nc * 110), H = Math.max(180, rowsMax * 100 + 20), P = [];
    Object.keys(cols).forEach((l) => cols[l].forEach((k, j) => (P[k] = [50 + l * 110, H * (j + 1) / (cols[l].length + 1)])));
    return { P, W, H };
  }

  function drawSearch(st, f) {
    st.innerHTML = "";
    const G = f.G, L = layout(G, G.idx[Object.keys(G.idx)[0]] ?? 0);
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${L.W} ${L.H}`, width: L.W });
    svg.append(S.svg("defs", null, S.svg("marker", { id: "ar2", markerUnits: "userSpaceOnUse", viewBox: "0 0 10 10", refX: 24, refY: 5, markerWidth: 10, markerHeight: 10, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--muted)" }))));
    const inFr = new Set(f.fr.map((e) => e.node));
    const pathSet = new Set();
    if (f.pathNodes) for (let i = 1; i < f.pathNodes.length; i++) pathSet.add(f.pathNodes[i - 1] + "-" + f.pathNodes[i]);
    const treeE = new Set();
    f.parent.forEach((p, v) => { if (p >= 0 && f.closed[v]) treeE.add(p + "-" + v); });
    f.fr.forEach((e) => { if (e.parent >= 0) treeE.add(e.parent + "-" + e.node); });
    const drawn = {};
    G.adj.forEach((l, a) => l.forEach(([b, w]) => {
      const k = a + "-" + b, kr = b + "-" + a;
      const isCur = f.edge && f.edge[0] === a && f.edge[1] === b;
      const cls = pathSet.has(k) ? "s-piv" : isCur ? "s-act" : treeE.has(k) ? "s-done" : "";
      if (drawn[kr] !== undefined && !cls) return;
      drawn[k] = 1;
      const [x1, y1] = L.P[a], [x2, y2] = L.P[b];
      svg.append(S.svg("line", { x1, y1, x2, y2, class: "edge " + cls, "marker-end": "url(#ar2)" }));
      svg.append(S.svg("text", { x: (x1 + x2) / 2 + 4, y: (y1 + y2) / 2 - 5, class: "wt", text: w }));
    }));
    G.names.forEach((nm, k) => {
      const cls = f.pathNodes && f.pathNodes.includes(k) ? "s-piv" : f.cur === k ? "s-act" : f.pick === k ? "s-act" : f.closed[k] ? "s-done" : inFr.has(k) ? "s-cmp" : "";
      const [x, y] = L.P[k];
      svg.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: x, cy: y, r: 18 }), S.svg("text", { x, y: y + 5, "text-anchor": "middle", "font-weight": 700, text: nm })));
      if (f.mode === "greedy" || f.mode === "astar") svg.append(S.svg("text", { x: x + 20, y: y - 18, class: "wt", style: "fill:var(--st-piv)", text: `h=${G.h[k]}` }));
    });
    st.append(h("div", { style: { overflowX: "auto" } }, svg));
    // фронт
    const tbl = h("table", { class: "t grid" }, h("tr", null, ...["във фронта", "g", "h", "f=g+h", "родител", "ред"].map((x) => h("th", { text: x }))));
    if (!f.fr.length) tbl.append(h("tr", null, h("td", { colspan: 6, class: "muted", text: "празен" })));
    f.fr.forEach((e) => tbl.append(h("tr", null, h("td", { class: e.node === f.pick ? "s-act" : "", text: G.names[e.node] }), h("td", { text: e.g }), h("td", { text: G.h[e.node] }), h("td", { text: e.g + G.h[e.node] }), h("td", { text: e.parent >= 0 ? G.names[e.parent] : "—" }), h("td", { text: e.seq }))));
    const ord = h("p", { class: "muted", style: { fontSize: ".8rem" } }, "Ред на разгъване: ", h("b", { text: f.order.map((k) => G.names[k]).join(" → ") || "—" }));
    st.append(h("div", { class: "tbl-wrap", style: { marginTop: "8px" } }, tbl), ord);
    if (f.mode === "astar" || f.mode === "greedy") {
      const hs = f.hstar;
      const box = h("p", { style: { fontSize: ".8rem" } });
      box.append(h("span", { class: "muted", text: "h* (точна остатъчна цена): " }), G.names.map((nm, k) => `${nm}=${hs[k] === Infinity ? "∞" : hs[k]}`).join("  "));
      box.append(h("br"), f.notAdm.length ? h("span", { class: "warn", text: `Недопустима: h надценява при ${f.notAdm.join(", ")}.` }) : h("span", { style: { color: "var(--st-done)" }, text: "Допустима: h ≤ h* навсякъде." }));
      box.append(" ", f.notCons.length ? h("span", { class: "warn", text: `Несъгласувана при ${f.notCons.join(", ")} (h(n) > c + h(n′)).` }) : h("span", { style: { color: "var(--st-done)" }, text: "Съгласувана." }));
      st.append(box);
    }
  }

  function drawCriteria(st, f) {
    st.innerHTML = "";
    const t = h("table", { class: "t grid" }, h("tr", null, ...["критерий", "A", "B", "избира"].map((x) => h("th", { text: x }))));
    f.rows.forEach((r) => t.append(h("tr", null, h("td", { style: { textAlign: "left", fontFamily: "var(--f-body)" }, text: r.c }), h("td", { class: r.w === "A" ? "s-done" : "", text: r.A }), h("td", { class: r.w === "B" ? "s-done" : "", text: r.B }), h("td", { text: r.w }))));
    st.append(h("div", { class: "tbl-wrap" }, t));
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Търсенето в <dfn data-g="пространство от състояния">пространство от състояния</dfn> поддържа <b>фронт</b> — кандидати за разгъване. Всички алгоритми по-долу са <b>една и съща графова процедура</b>; различава ги само <b>кой елемент от фронта се изважда</b>. Затова в C кодът е един, а режимът сменя само функцията <code>pick</code>.</p>
</div>

<div class="block">
  <h3>Схеми 4–5 — BFS, DFS, uniform-cost, greedy и A* върху един граф</h3>
  <p class="prose"><dfn data-g="bfs">BFS</dfn> разширява по нива (опашка) и намира път с минимален брой преходи; при еднаква положителна цена на преходите това е и най-евтиният път. <dfn data-g="dfs">DFS</dfn> следва клон (стек). <dfn data-g="uniform-cost search">Uniform-cost</dfn> избира най-малкото g, <dfn data-g="greedy best-first">greedy best-first</dfn> — най-малкото h, <dfn data-g="a*">A*</dfn> — най-малкото f = g + h. Смени режима и сравни реда на разгъване и цената.</p>
  <div id="v2-search"></div>
  <div class="key"><span class="formula">f(n) = g(n) + h(n)</span>  — g: натрупана цена; h: оценка на оставащата.<br>
  <dfn data-g="допустима евристика">Допустима</dfn>: h(n) ≤ h*(n).  <dfn data-g="съгласувана евристика">Съгласувана</dfn>: h(n) ≤ c(n,n′) + h(n′) за всеки преход (при h(цел) = 0 тя е и допустима).<br>Допустимостта стига за оптималност на A* като <b>дървовидно</b> търсене (или графово с повторно отваряне). Графовият A* <b>без</b> повторно отваряне на приключени възли — като тук — е оптимален при <b>съгласувана</b> h; с допустима, но несъгласувана h може да върне по-скъп път.</div>
  <details class="hint"><summary>Хинт: какво показват пресетите</summary><div>
    <p><b>„BFS ≠ най-евтин“</b>: BFS намира S→A→G (2 прехода, цена 11), а uniform-cost и A* — S→B→G (цена 7). Най-малко ребра не означава най-малка обща цена.</p>
    <p><b>„недопустима h“</b>: оптималният път е S→B→G с цена 6, но h(B) = 9 надценява истинската остатъчна цена h*(B) = 4. A* изважда G през A с f = 7 &lt; f(B) = 11 и връща цена 7 — неоптимално. Намали h(B) до 4 или по-малко и A* намира 6.</p>
    <p><b>„DFS и дълъг клон“</b>: DFS следва последния добавен клон и намира пряката, скъпа връзка S→G.</p>
  </div></details>
  <details class="trap"><summary>Капан: проверка за цел при добавяне вместо при изваждане</summary><div>
    <p>Тук целта се проверява, когато възелът се <b>извади</b> от фронта. Ако uniform-cost или A* спрат при първото <b>добавяне</b> на целта, могат да върнат по-скъп път — по-евтиният може още да не е разгърнат. При BFS с еднакви цени ранната проверка е безопасна оптимизация.</p>
  </div></details>
  <details class="trap"><summary>Капан: „евристиката е вероятност“ / „евристично = произволно“</summary><div>
    <p><dfn data-g="евристика">Евристиката</dfn> може да има ясна математическа дефиниция и доказани свойства. Не е вероятност, освен ако моделът изрично я дефинира така. Трябва да е в <b>същите единици</b> като целевата функция: въздушното разстояние е допустима оценка за дължина на маршрут, но не и за време.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 6 — различните критерии избират различен кандидат</h3>
  <p class="prose">До A вече сме платили 9 и очакваме още 1; до B сме платили 2 и очакваме още 3. Алчното по h избира A, а A* сравнява 10 с 5 и предпочита B. Примерът показва избора, без сам по себе си да доказва точността на оценките.</p>
  <div id="v2-crit"></div>
</div>

<div class="block">
  <h3>От път към стратегия</h3>
  <p class="prose">Търсенето на път предполага, че <b>ние</b> избираме всички следващи действия. При противник част от решенията се вземат от друг участник. Тогава е нужна <dfn data-g="стратегия">стратегия</dfn>, която реагира на неговите ходове, а не един предварително избран път — това е темата на <a href="#minimax">раздел 3</a>.</p>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v2-search"), {
      id: "c2s", title: "Графово търсене с избираем критерий", sub: "Оранжево — във фронта; зелено — приключен; синьо — текущ; виолетово — намереният път.",
      code: "ch02_search",
      inputs: [
        { id: "edges", label: "Преходи (от до цена)", value: "S A 1, S B 4, A B 2, A C 5, B C 1, C G 3", width: "20em" },
        { id: "heur", label: "h (Име=число)", value: "S=5 A=4 B=2 C=1 G=0", width: "13em" },
        { id: "start", label: "начало", value: "S", width: "4em" },
        { id: "goal", label: "цел", value: "G", width: "4em" },
        { id: "mode", label: "критерий", type: "select", value: "astar", options: MODES.map((m) => [m, MN[m]]) },
        { id: "directed", label: "насочен", type: "checkbox", value: false },
      ],
      presets: [
        { label: "BFS ≠ най-евтин", values: { edges: "S A 1, S B 5, A G 10, B G 2", heur: "S=6 A=1 B=2 G=0", directed: true, start: "S", goal: "G", mode: "bfs" } },
        { label: "greedy подведен", values: { edges: "S A 1, S B 2, A C 4, B C 1, C G 5", heur: "S=6 A=5 B=6 C=4 G=0", directed: true, start: "S", goal: "G", mode: "greedy" } },
        { label: "DFS и дълъг клон", values: { edges: "S A 1, A B 1, B G 1, S C 1, C D 1, D E 1, E G 1, S G 9", heur: "", directed: false, start: "S", goal: "G", mode: "dfs" } },
        { label: "недопустима h", values: { edges: "S A 1, S B 2, A G 6, B G 4", heur: "S=0 A=1 B=9 G=0", directed: true, start: "S", goal: "G", mode: "astar" } },
      ],
      legend: [["s-cmp", "във фронта"], ["s-act", "избран / текущ"], ["s-done", "приключен"], ["s-piv", "намерен път"]],
      build: algos.search, draw: drawSearch, speed: 1,
    });
    S.viz(root.querySelector("#v2-crit"), {
      id: "c2c", title: "Сравнение на критериите", code: false,
      inputs: [
        { id: "gA", label: "g(A)", type: "number", value: 9, width: "5em", live: true }, { id: "hA", label: "h(A)", type: "number", value: 1, width: "5em", live: true },
        { id: "gB", label: "g(B)", type: "number", value: 2, width: "5em", live: true }, { id: "hB", label: "h(B)", type: "number", value: 3, width: "5em", live: true },
      ],
      build: algos.criteria, draw: drawCriteria,
    });
  }

  S.chapter({ id: "tarsene", order: 2, num: "2", group: "Търсене", title: "Търсене и евристики",
    lead: "Една графова процедура, пет критерия за избор от фронта. BFS и DFS без евристика; uniform-cost, greedy и A* с цена и оценка; допустимост и съгласуваност.", html, mount, algos });
})();
