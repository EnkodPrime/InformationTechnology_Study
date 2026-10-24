/* Раздел 1 — същност и моделиране на задачата: агент, състояние, граф на състоянията ↔ дърво на търсене. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- общ разбор на граф: "A B, A C 2" ---------- */
  function parseEdges(str, directed) {
    const names = [], idx = {}, adj = [];
    const id = (s) => {
      if (!/^[A-Za-z0-9_]{1,8}$/.test(s)) throw new Error(`„${s}“: името на състояние е от 1 до 8 латински букви/цифри.`);
      if (!(s in idx)) { if (names.length >= 16) throw new Error("Най-много 16 състояния."); idx[s] = names.length; names.push(s); adj.push([]); }
      return idx[s];
    };
    const items = String(str).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!items.length) throw new Error("Въведи поне един преход, напр. „A B“.");
    for (const it of items) {
      const p = it.split(/\s+/);
      if (p.length < 2 || p.length > 3) throw new Error(`„${it}“: очаква се „от до [цена]“.`);
      const a = id(p[0]), b = id(p[1]);
      adj[a].push(b);
      if (!directed && a !== b) adj[b].push(a);
    }
    return { names, idx, adj };
  }

  /* ---------- чисти функции ---------- */
  const algos = {
    /** Разгъване на графа в дърво на търсене до дълбочина D: BFS по нива.
     *  dedup = true — състояние, което вече е видяно, не се разгъва отново (графово търсене). */
    unfold({ edges, start, depth, directed, dedup }) {
      const G = parseEdges(edges, !!directed);
      if (!(start in G.idx)) throw new Error(`Началното състояние „${start}“ не е в графа.`);
      const D = S.int(depth, 1, 6, "Дълбочината");
      const tree = [{ id: 0, s: G.idx[start], parent: -1, d: 0, rep: false }];
      const seen = new Set([G.idx[start]]);
      const F = [];
      const snap = () => tree.map((n) => Object.assign({}, n));
      const st = () => ({ "възли в дървото": tree.length, "различни състояния": new Set(tree.map((n) => n.s)).size, повторения: tree.filter((n) => n.rep).length });
      F.push({ tree: snap(), cur: 0, G, msg: `Коренът на дървото е началното <dfn data-g="състояние">състояние</dfn> ${start}.`, stats: st(), log: `корен: ${start}` });
      let level = [0];
      for (let d = 0; d < D && level.length; d++) {
        const next = [];
        for (const t of level) {
          const node = tree[t];
          if (dedup && node.rep) continue;
          for (const v of G.adj[node.s]) {
            if (tree.length >= 80) throw new Error("Дървото надхвърля 80 възела — намали дълбочината.");
            const rep = seen.has(v);
            const nn = { id: tree.length, s: v, parent: t, d: d + 1, rep };
            tree.push(nn); seen.add(v);
            next.push(nn.id);
            const path = []; for (let q = nn.id; q >= 0; q = tree[q].parent) path.unshift(G.names[tree[q].s]);
            F.push({ tree: snap(), cur: nn.id, G, stats: st(),
              msg: rep ? `Възел ${path.join("→")}: състоянието <b>${G.names[v]}</b> вече е срещано — в дървото е <b>нов възел</b>, в графа е <b>същият връх</b>.${dedup ? " Графовото търсене няма да го разгъва отново." : ""}`
                : `Нов възел ${path.join("→")} (ниво ${d + 1}).`,
              log: `${"· ".repeat(d + 1)}${path.join("→")}${rep ? " (повторение)" : ""}` });
          }
        }
        level = next;
      }
      const s = st();
      F.push({ tree: snap(), cur: -1, G, stats: s, msg: `Дълбочина ${D}: в дървото има <b>${s["възли в дървото"]}</b> възела, а различните състояния са <b>${s["различни състояния"]}</b>. ${s.повторения ? `Повторенията (${s.повторения}) са работа, която графовото търсене може да спести.` : "Няма повторения при тази дълбочина."}` });
      return { frames: F, nodes: tree.length, states: s["различни състояния"], repeats: s.повторения };
    },
  };

  /* ---------- рисуване ---------- */
  function layoutGraph(G, root) {
    const n = G.names.length, lay = new Array(n).fill(-1);
    lay[root] = 0;
    const q = [root];
    const und = G.adj.map(() => []);
    G.adj.forEach((l, a) => l.forEach((b) => { und[a].push(b); und[b].push(a); }));
    while (q.length) { const u = q.shift(); for (const v of und[u]) if (lay[v] < 0) { lay[v] = lay[u] + 1; q.push(v); } }
    const maxL = Math.max(0, ...lay);
    lay.forEach((l, k) => { if (l < 0) lay[k] = maxL + 1; });
    const rows = {};
    lay.forEach((l, k) => (rows[l] = rows[l] || []).push(k));
    const W = 300, P = [];
    Object.keys(rows).forEach((l) => rows[l].forEach((k, j) => (P[k] = [W * (j + 1) / (rows[l].length + 1), 30 + l * 62])));
    return { P, H: 30 + (Math.max(...lay) + 1) * 62, W };
  }

  function drawUnfold(st, f) {
    st.innerHTML = "";
    const wrap = h("div", { class: "split", style: { alignItems: "start" } });
    // граф
    const G = f.G, L = layoutGraph(G, f.tree[0].s);
    const used = new Set(f.tree.map((n) => n.s));
    const cur = f.cur >= 0 ? f.tree[f.cur] : null;
    const gs = S.svg("svg", { class: "g", viewBox: `0 0 ${L.W} ${L.H}`, width: L.W });
    gs.append(S.svg("defs", null, S.svg("marker", { id: "ar1", markerUnits: "userSpaceOnUse", viewBox: "0 0 10 10", refX: 22, refY: 5, markerWidth: 10, markerHeight: 10, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--muted)" }))));
    const drawn = new Set();
    G.adj.forEach((l, a) => l.forEach((b) => {
      const key = Math.min(a, b) + "-" + Math.max(a, b);
      const isCur = cur && cur.parent >= 0 && f.tree[cur.parent].s === a && cur.s === b;
      if (drawn.has(key) && !isCur) return; drawn.add(key);
      gs.append(S.svg("line", { x1: L.P[a][0], y1: L.P[a][1], x2: L.P[b][0], y2: L.P[b][1], class: "edge" + (isCur ? " s-act" : ""), "marker-end": "url(#ar1)" }));
    }));
    G.names.forEach((nm, k) => {
      const cls = cur && cur.s === k ? (cur.rep ? "s-swap" : "s-act") : used.has(k) ? "s-done" : "";
      gs.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: L.P[k][0], cy: L.P[k][1], r: 16 }), S.svg("text", { x: L.P[k][0], y: L.P[k][1] + 5, "text-anchor": "middle", "font-weight": 700, text: nm })));
    });
    wrap.append(h("div", null, h("span", { class: "eyebrow", text: "Граф на състоянията — всяко състояние е един връх" }), gs));
    // дърво
    const T = f.tree, kids = T.map(() => []);
    T.forEach((n) => { if (n.parent >= 0) kids[n.parent].push(n.id); });
    const X = [];
    let leaf = 0;
    (function place(u) { if (!kids[u].length) { X[u] = leaf++; return; } kids[u].forEach(place); X[u] = (X[kids[u][0]] + X[kids[u][kids[u].length - 1]]) / 2; })(0);
    const maxD = Math.max(...T.map((n) => n.d));
    const dx = 36, W = Math.max(200, leaf * dx + 20), H = 40 + maxD * 56;
    const ts = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
    const px = (u) => 20 + X[u] * dx, py = (u) => 22 + T[u].d * 56;
    T.forEach((n) => { if (n.parent >= 0) ts.append(S.svg("line", { x1: px(n.parent), y1: py(n.parent), x2: px(n.id), y2: py(n.id), class: "edge" + (n.id === f.cur ? " s-act" : "") })); });
    T.forEach((n) => {
      const cls = n.id === f.cur ? (n.rep ? "s-swap" : "s-act") : n.rep ? "s-cmp" : "s-done";
      ts.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: px(n.id), cy: py(n.id), r: 13 }), S.svg("text", { x: px(n.id), y: py(n.id) + 4, "text-anchor": "middle", style: "font-size:11px", "font-weight": 700, text: G.names[n.s] })));
    });
    const tw = h("div", { style: { overflowX: "auto", maxWidth: "100%" } }, ts);
    wrap.append(h("div", { style: { minWidth: 0 } }, h("span", { class: "eyebrow", text: "Дърво на търсене — всеки възел е път" }), tw));
    st.append(wrap);
  }

  /* ---------- Схема 1: агент и среда ---------- */
  const AGENT = {
    env: { t: "Среда", d: "Светът, в който агентът действа. Може да е детерминирана или случайна, напълно или частично наблюдаема — всяка комбинация изисква различен модел." },
    obs: { t: "Наблюдение", d: "Това, което датчиците съобщават. <b>Не е непременно пълното състояние на света</b>: датчикът може да показва висока температура, без да показва причината." },
    st: { t: "Вътрешно състояние", d: "Агентът поддържа модел на ситуацията. Трябва да съдържа сведенията, от които зависят следващите действия; ако историята е нужна, тя трябва да е представена в състоянието." },
    kn: { t: "Знания / модел", d: "Формализирани знания (правила, мрежи, фреймове) или научен модел. Класическият символен подход работи със знания, търсене и извод; машинното обучение е друг подход и не изчерпва областта." },
    goal: { t: "Цел", d: "Спрямо нея се оценява кое действие е <dfn data-g=\"рационалност\">рационално</dfn> — най-подходящото според целта, информацията и ограниченията." },
    act: { t: "Действие", d: "Изборът се връща към средата. Рационален избор е оправдан спрямо наличната информация, но <b>не гарантира</b> успешен изход при неизвестни условия." },
  };
  function drawAgent(host, info) {
    const svg = S.svg("svg", { class: "g", viewBox: "0 0 560 230", width: 560 });
    svg.append(S.svg("defs", null, S.svg("marker", { id: "ar0", markerUnits: "userSpaceOnUse", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 10, markerHeight: 10, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--ink-2)" }))));
    const box = (k, x, y, w, hh, cls) => {
      const g = S.svg("g", { class: "node " + cls, style: "cursor:pointer", tabindex: 0, onclick: () => show(k) },
        S.svg("rect", { x, y, width: w, height: hh, rx: 6, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--ink-2));stroke-width:2" }),
        S.svg("text", { x: x + w / 2, y: y + hh / 2 + 5, "text-anchor": "middle", style: "font-size:11px", text: AGENT[k].t }));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter") show(k); });
      svg.append(g); return g;
    };
    const arrow = (x1, y1, x2, y2) => svg.append(S.svg("line", { x1, y1, x2, y2, class: "edge", style: "stroke:var(--ink-2)", "marker-end": "url(#ar0)" }));
    svg.append(S.svg("rect", { x: 200, y: 8, width: 350, height: 214, rx: 10, style: "fill:none;stroke:var(--line);stroke-dasharray:5 4" }));
    svg.append(S.svg("text", { x: 375, y: 26, "text-anchor": "middle", class: "muted", text: "АГЕНТ" }));
    const nodes = {
      env: box("env", 10, 85, 110, 56, "s-piv"),
      obs: box("obs", 215, 40, 110, 40, "s-cmp"),
      st: box("st", 340, 40, 150, 40, ""),
      kn: box("kn", 340, 100, 130, 40, ""),
      goal: box("goal", 340, 160, 130, 40, ""),
      act: box("act", 215, 160, 110, 40, "s-act"),
    };
    arrow(120, 100, 214, 62); arrow(326, 60, 338, 60); arrow(405, 81, 405, 98); arrow(405, 142, 405, 158);
    arrow(338, 180, 327, 180); arrow(214, 180, 120, 128);
    function show(k) {
      Object.entries(nodes).forEach(([kk, g]) => g.querySelector("rect").style.strokeWidth = kk === k ? "4" : "2");
      info.innerHTML = `<p><b>${AGENT[k].t}.</b> ${AGENT[k].d}</p>`;
      info.querySelectorAll("dfn[data-g]").forEach((d) => d.setAttribute("tabindex", "0"));
    }
    host.append(h("div", { style: { overflowX: "auto" } }, svg));
    show("obs");
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="интелигентна система">Интелигентната система</dfn> използва наблюдения, знания или модел, за да избира действия за постигане на цели. Класическият символен подход работи с формализирани знания, търсене и извод. <dfn data-g="ml">Машинното обучение</dfn> е друг подход и не изчерпва областта. <dfn data-g="експертна система">Експертната система</dfn> не е задължително обучаващ се модел.</p>
</div>

<div class="block">
  <h3>Схема 1 — агентът наблюдава и въздейства на средата</h3>
  <p class="prose"><dfn data-g="агент">Агентът</dfn> получава наблюдения, поддържа вътрешно състояние и избира действия спрямо цел. Щракни върху всеки блок.</p>
  <div id="v1-agent"></div>
  <div class="card" id="v1-agent-info" aria-live="polite"></div>
  <details class="hint"><summary>Хинт: измерване, предположение, заключение</summary><div>
    <p>Датчикът показва 90 °C — това е <b>измерване</b>. „Вентилаторът е спрял“ е <b>предположение</b>. „Устройството прегрява“ е <b>заключение</b> спрямо правило. Интелигентната система трябва да ги различава, защото непълното наблюдение ограничава какво може да се заключи за средата.</p>
  </div></details>
  <details class="trap"><summary>Капан: „рационален“ = „всезнаещ“ / „винаги успешен“</summary><div>
    <p><dfn data-g="рационалност">Рационалният избор</dfn> е най-подходящият според целта, информацията и ограниченията. Не предполага всезнание и не гарантира успешен действителен изход при неизвестни обстоятелства.</p>
  </div></details>
</div>

<div class="block">
  <h3>Как се описва задачата</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Елемент</th><th>Търсене на път</th><th>Игра (добавя се)</th></tr>
    <tr><td>начално <dfn data-g="състояние">състояние</dfn></td><td>откъде тръгваме</td><td>начална позиция</td></tr>
    <tr><td>действия и преходи</td><td>кои ходове са допустими и къде водят</td><td>+ <b>участници и ред на ходовете</b></td></tr>
    <tr><td>цел</td><td>кое състояние е търсено</td><td>терминални позиции</td></tr>
    <tr><td>цена</td><td>сума по пътя</td><td>+ <b>оценка на изхода</b> (печалба/загуба)</td></tr>
  </table></div>
  <p class="prose">Детерминирана или случайна, напълно или частично наблюдаема среда изисква различни модели.</p>
  <div class="key">Състоянието трябва да съдържа <b>всичко, от което зависят допустимите следващи действия и резултати</b>. Грешно избран модел не се поправя само с по-дълбоко търсене.</div>
  <details class="hint"><summary>Хинт: маршрут с гориво</summary><div>
    <p>При маршрут само текущото място може да е достатъчно за прост модел. Ако горивото ограничава достижимостта, „място“ вече не е състояние — две пристигания в един град с различно гориво имат различни продължения. Тогава състоянието е (място, гориво).</p>
  </div></details>
</div>

<div class="block">
  <h3>Схеми 2 и 3 — граф на състоянията и дърво на търсене</h3>
  <p class="prose"><dfn data-g="граф на състоянията">Графът на състоянията</dfn> съдържа състояния и преходи. <dfn data-g="дърво на търсене">Дървото на търсене</dfn> съдържа конкретни пътища на разглеждане. Състоянието D може да се достигне и през A→B→D, и през A→C→D: то е <b>един връх</b> в графа и <b>два възела</b> в дървото. Промени графа и дълбочината и виж как дървото расте по-бързо от броя на състоянията.</p>
  <div id="v1-unfold"></div>
  <details class="hint"><summary>Хинт: защо дървото може да е безкрайно при краен граф</summary><div>
    <p>При цикъл A↔B дървото съдържа A, A→B, A→B→A, A→B→A→B, … — всеки път е различен възел. Пробвай пресета „цикъл“ без отметка. Затова графовото търсене трябва да управлява повторенията и циклите — със затворено множество (раздел <a href="#tarsene">2</a>).</p>
  </div></details>
  <details class="trap"><summary>Капан: „възел“ и „състояние“ като синоними</summary><div>
    <p>Възел в дървото = път до състояние. Връх в графа = състояние. Броят възли расте с броя пътища (често експоненциално), а броят състояния е фиксиран. Разпознаването на повторенията може съществено да намали работата.</p>
  </div></details>
</div>`;

  function mount(root) {
    drawAgent(root.querySelector("#v1-agent"), root.querySelector("#v1-agent-info"));
    S.viz(root.querySelector("#v1-unfold"), {
      id: "c1u", title: "Разгъване на граф в дърво на търсене", sub: "Оранжево — повторено състояние; червено — текущият нов възел е повторение.",
      code: false,
      inputs: [
        { id: "edges", label: "Преходи (от до)", value: "A B, A C, B D, C D, D E", width: "18em" },
        { id: "start", label: "начало", value: "A", width: "4em" },
        { id: "depth", label: "дълбочина", type: "number", value: 3, width: "4em" },
        { id: "directed", label: "насочен", type: "checkbox", value: true },
        { id: "dedup", label: "не разгъвай повторения", type: "checkbox", value: false },
      ],
      presets: [
        { label: "Схема 3 (D по два пътя)", values: { edges: "A B, A C, B D, C D", start: "A", depth: 2, directed: true } },
        { label: "цикъл", values: { edges: "A B, B A", start: "A", depth: 5, directed: true, dedup: false } },
        { label: "решетка 3×3", values: { edges: "a b, b c, d e, e f, g h, h i, a d, d g, b e, e h, c f, f i", start: "a", depth: 4, directed: true } },
      ],
      legend: [["s-act", "нов възел"], ["s-cmp", "повторено състояние"], ["s-swap", "текущо повторение"], ["s-done", "разгънат"]],
      build: algos.unfold, draw: drawUnfold, speed: 2,
    });
  }

  S.chapter({ id: "modelirane", order: 1, num: "1", group: "Търсене", title: "Същност и моделиране на задачата",
    lead: "Агент, наблюдение, състояние, цел. Задачата като пространство от състояния и разликата между граф на състоянията и дърво на търсене.", html, mount, algos });
})();
