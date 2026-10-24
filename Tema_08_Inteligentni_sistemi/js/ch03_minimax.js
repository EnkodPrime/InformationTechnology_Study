/* Раздел 3 — печеливша стратегия и minimax: стойности нагоре по дървото на играта. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- дърво от вложени скоби, номерация в прав ред (както в 03_minimax.c) ---------- */
  function parseTree(str) {
    const s = String(str).trim();
    if (!s) throw new Error("Въведи дърво, напр. ((3 5) (2 9)).");
    const T = [];
    let p = 0;
    const ws = () => { while (p < s.length && /[\s,]/.test(s[p])) p++; };
    function node(d) {
      ws();
      if (T.length >= 120) throw new Error("Най-много 120 възела.");
      if (d > 6) throw new Error("Най-много 6 нива.");
      const id = T.length;
      T.push({ id, d, kids: [], leaf: false, value: null, parent: -1 });
      if (s[p] === "(") {
        p++;
        for (;;) {
          ws();
          if (p >= s.length) throw new Error("Липсва затваряща скоба.");
          if (s[p] === ")") { p++; break; }
          const c = node(d + 1);
          T[c].parent = id;
          T[id].kids.push(c);
          if (T[id].kids.length > 6) throw new Error("Най-много 6 наследника на възел.");
        }
        if (!T[id].kids.length) throw new Error("Празни скоби () — вътрешен възел без ходове.");
      } else {
        const m = /^-?\d+/.exec(s.slice(p));
        if (!m) throw new Error(`Неочакван знак „${s[p] || "край"}“ на позиция ${p + 1}.`);
        p += m[0].length;
        T[id].leaf = true; T[id].value = S.int(m[0], -99, 99, "Стойността на лист");
      }
      return id;
    }
    node(0);
    ws();
    if (p < s.length) throw new Error(`Излишен текст след дървото: „${s.slice(p, p + 10)}“.`);
    if (T[0].leaf) throw new Error("Коренът трябва да има ходове.");
    return T;
  }
  const isMax = (T, k) => T[k].d % 2 === 0;

  /* ---------- чисти функции ---------- */
  const algos = {
    parseTree,
    /** minimax(s, is_max) от 03_minimax.c — кадър на всяко маркирано действие */
    minimax({ tree }) {
      const T = parseTree(tree);
      const val = new Array(T.length).fill(null), F = [];
      let visited = 0, leaves = 0;
      const stack = [];
      const st = () => ({ "посетени възли": visited, "оценени листа": leaves });
      const push = (o) => F.push(Object.assign({ T, val: val.slice(), stack: stack.slice(), stats: st() }, o));
      const who = (k) => (isMax(T, k) ? "MAX" : "MIN");
      function mm(s) {
        visited++; stack.push(s);
        push({ at: "visit", cur: s, vars: { s, ход: who(s) }, msg: `Посещаваме възел ${s} — на ход е <b>${who(s)}</b>.` });
        if (T[s].leaf) {
          leaves++; val[s] = T[s].value;
          push({ at: ["util", "leaf"], cur: s, vars: { s, "U(s)": T[s].value }, msg: `Терминално състояние: V(s) = U(s) = <b>${T[s].value}</b>.`, log: `лист ${s}: ${T[s].value}` });
          stack.pop();
          return T[s].value;
        }
        let best = isMax(T, s) ? -Infinity : Infinity;
        push({ at: "init", cur: s, vars: { s, best: isMax(T, s) ? "−∞" : "+∞" }, msg: `${who(s)} започва с best = ${isMax(T, s) ? "−∞" : "+∞"}.` });
        for (let k = 0; k < T[s].kids.length; k++) {
          const c = T[s].kids[k];
          push({ at: "rec", cur: s, next: c, vars: { s, k, best: fmt(best) }, msg: `Ход ${k + 1} от ${T[s].kids.length}: спускаме се във възел ${c}.` });
          const v = mm(c);
          const nb = isMax(T, s) ? Math.max(best, v) : Math.min(best, v);
          push({ at: "upd", cur: s, from: c, vars: { s, v, best: fmt(nb) }, msg: `${who(s)}: best = ${isMax(T, s) ? "max" : "min"}(${fmt(best)}, ${v}) = <b>${nb}</b>.` });
          best = nb;
        }
        val[s] = best;
        push({ at: "ret", cur: s, vars: { s, return: best }, msg: `Възел ${s} (${who(s)}) връща <b>${best}</b> нагоре.`, log: `${"· ".repeat(T[s].d)}V(${s}) = ${best} (${who(s)})` });
        stack.pop();
        return best;
      }
      const v = mm(0);
      // избран ход: първото дете със стойност v
      const move = T[0].kids.findIndex((c) => val[c] === v);
      const last = F[F.length - 1];
      last.done = true; last.best = T[0].kids[move];
      last.msg = `Стойност на играта: <b>${v}</b>. MAX избира ход ${move + 1} (възел ${T[0].kids[move]}). Посетени ${visited} възела, оценени ${leaves} листа — пълният minimax вижда <b>всички</b>.`;
      return { frames: F, result: v, visited, leaves, move, nodes: T.length };
    },
  };
  const fmt = (x) => (x === Infinity ? "+∞" : x === -Infinity ? "−∞" : x);

  /* ---------- рисуване на дърво на игра ---------- */
  function drawGameTree(st, f, opt = {}) {
    st.innerHTML = "";
    const T = f.T, X = [];
    let leaf = 0;
    (function place(u) { if (!T[u].kids.length) { X[u] = leaf++; return; } T[u].kids.forEach(place); X[u] = (X[T[u].kids[0]] + X[T[u].kids[T[u].kids.length - 1]]) / 2; })(0);
    const maxD = Math.max(...T.map((n) => n.d));
    const dx = Math.max(34, Math.min(90, Math.floor(620 / Math.max(1, leaf)))), W = Math.max(240, leaf * dx + 40), dy = 74, H = 50 + maxD * dy + 20;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
    const px = (u) => 20 + dx / 2 + X[u] * dx, py = (u) => 28 + T[u].d * dy;
    const onStack = new Set(f.stack || []);
    const cut = new Set(f.cutAll || []);
    T.forEach((n) => { if (n.parent >= 0) {
      const cls = cut.has(n.id) ? "s-swap" : f.best === n.id ? "s-piv" : onStack.has(n.id) ? "s-act" : f.val[n.id] != null ? "s-done" : "";
      svg.append(S.svg("line", { x1: px(n.parent), y1: py(n.parent), x2: px(n.id), y2: py(n.id), class: "edge " + cls, style: cut.has(n.id) ? "stroke-dasharray:4 4" : null }));
    } });
    T.forEach((n) => {
      const u = n.id, x = px(u), y = py(u), mx = isMax(T, u);
      let cls = cut.has(u) ? "s-swap" : u === f.cur ? "s-act" : u === f.best ? "s-piv" : f.val[u] != null ? "s-done" : onStack.has(u) ? "s-cmp" : "";
      if (opt.dimUnvisited && f.val[u] == null && !onStack.has(u) && !cut.has(u)) cls = "s-dim";
      const r = 15;
      const shape = n.leaf ? S.svg("rect", { x: x - r, y: y - r, width: 2 * r, height: 2 * r, rx: 3, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--ink-2));stroke-width:2" })
        : S.svg("path", { d: mx ? `M${x},${y - r - 3} L${x + r + 3},${y + r - 2} L${x - r - 3},${y + r - 2} Z` : `M${x},${y + r + 3} L${x + r + 3},${y - r + 2} L${x - r - 3},${y - r + 2} Z`, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--ink-2));stroke-width:2" });
      const shown = n.leaf ? n.value : f.val[u] != null ? f.val[u] : "";
      svg.append(S.svg("g", { class: "node " + cls }, shape, S.svg("text", { x, y: y + (n.leaf ? 5 : mx ? 8 : 2), "text-anchor": "middle", "font-weight": 700, style: "font-size:12px", text: shown })));
      svg.append(S.svg("text", { x: x + (n.leaf ? 0 : 0), y: y - r - 7, "text-anchor": "middle", class: "wt", style: "font-size:9px", text: u }));
      if (opt.ab && f.ab && f.ab[u]) svg.append(S.svg("text", { x, y: y + r + 14, "text-anchor": "middle", class: "wt", style: "font-size:10px", text: `α${fmt(f.ab[u][0])} β${fmt(f.ab[u][1])}` }));
    });
    // етикети на нивата
    for (let d = 0; d < maxD; d++) svg.append(S.svg("text", { x: 4, y: 32 + d * dy, class: "muted", style: "font-size:10px", text: d % 2 ? "MIN" : "MAX" }));
    st.append(h("div", { style: { overflowX: "auto", maxWidth: "100%" } }, svg));
  }

  /* ---------- Схема 8: път ≠ стратегия (щракаема игра) ---------- */
  function strategyGame(host) {
    const OUT = { A: { x: "победа", y: "загуба" }, B: { x: "победа", y: "победа" } };
    const box = h("div", { class: "card" });
    const info = h("p", { "aria-live": "polite" });
    let our = null;
    const row1 = h("div", { class: "row" }, h("span", { class: "muted", text: "Наш ход:" }));
    const row2 = h("div", { class: "row" }, h("span", { class: "muted", text: "Отговор на противника:" }));
    const res = h("div", { class: "row", style: { marginTop: "6px" } });
    ["A", "B"].forEach((m) => row1.append(h("button", { class: "btn", onclick: () => { our = m; render(); }, text: "ход " + m })));
    ["x", "y"].forEach((r) => row2.append(h("button", { class: "btn", onclick: () => { if (!our) { info.textContent = "Първо избери наш ход."; return; } info.innerHTML = `След ход ${our} противникът отговаря с ${r} → <b>${OUT[our][r]}</b>.`; }, text: "отговор " + r })));
    function render() {
      res.innerHTML = "";
      ["A", "B"].forEach((m) => {
        const all = Object.values(OUT[m]).every((o) => o === "победа"), some = Object.values(OUT[m]).some((o) => o === "победа");
        res.append(h("span", { class: "pill " + (all ? "s-done" : some ? "s-cmp" : "s-swap"), text: `${m}: ${all ? "гарантира победа" : some ? "има път към победа, но не я гарантира" : "губи"}` }));
      });
      info.innerHTML = our ? `Избран е ход ${our}. Сега избери отговор на противника — ти играеш и срещу себе си.` : "";
    }
    box.append(row1, row2, info, res);
    const tbl = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "" }), h("th", { text: "отговор x" }), h("th", { text: "отговор y" })),
      ...["A", "B"].map((m) => h("tr", null, h("th", { text: "ход " + m }), ...["x", "y"].map((r) => h("td", { class: OUT[m][r] === "победа" ? "s-done" : "s-swap", text: OUT[m][r] })))));
    host.append(h("div", { class: "split", style: { alignItems: "start" } }, h("div", { class: "tbl-wrap" }, tbl), box));
    render();
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="стратегия">Стратегията</dfn> е правило за действие за всяка релевантна ситуация или история. <dfn data-g="печеливша стратегия">Печеливша</dfn> е тази, която гарантира победа срещу <b>всички</b> допустими действия на противника при зададените начално състояние и правила. „Често печели“ е по-слабо твърдение и не доказва печеливша стратегия.</p>
</div>

<div class="block">
  <h3>Схема 8 — съществуващ път и гарантирана стратегия</h3>
  <p class="prose">При обикновено търсене питаме дали съществува път до цел. В игра противникът също избира. И двата наши хода имат път към победа; само B я гарантира срещу двата показани отговора при точно това пълно дърво. Изиграй и двете страни.</p>
  <div id="v3-strat"></div>
  <details class="trap"><summary>Капан: „намерих добър ход, значи имам печеливша стратегия“</summary><div>
    <p>Нужно е да се отчетат всички допустими отговори на противника и нашите последващи избори. Един път е само един възможен вариант. Един красив вариант не доказва стратегия, ако противникът може да избере друго продължение.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 7 — minimax стъпка по стъпка</h3>
  <p class="prose"><dfn data-g="minimax">Minimax</dfn> е приложим в стандартния модел: крайна детерминирана игра за двама с последователни ходове, пълна информация и нулева сума. MAX (▲) избира най-голямата стойност, MIN (▼) — най-малката за MAX. Стойностите се изкачват <b>отдолу нагоре</b>: листата дават U(s), всеки вътрешен възел връща max или min на децата си. Дървото се въвежда с вложени скоби; номерът над възела е редът на обхождане.</p>
  <div id="v3-mm"></div>
  <div class="key"><span class="formula">V(s) = U(s)                 за терминално s</span><br><span class="formula">V(s) = max V(child)          ход на MAX</span><br><span class="formula">V(s) = min V(child)          ход на MIN</span><br>Пълният minimax при разклонение b и дълбочина d разглежда <b>O(b^d)</b> възли.</div>
  <details class="hint"><summary>Хинт: защо не избираме листа 9</summary><div>
    <p>Левият MIN има листа 3 и 5 и връща 3; десният — 2 и 9 и връща 2. MAX сравнява 3 и 2 и избира левия ход. Листът 9 не оправдава избор надясно: противникът не е длъжен да го предостави. Изборът на 9 би пренебрегнал интереса на противника.</p>
  </div></details>
  <details class="trap"><summary>Капан: точна стойност срещу оценка</summary><div>
    <p>При ограничена дълбочина листата на хоризонта не са терминални — стойността им идва от <dfn data-g="оценъчна функция">оценъчна функция</dfn>. Полученият ход е най-добър спрямо <b>оцененото</b> дърво, а не доказана победа в цялата игра. <dfn data-g="ефект на хоризонта">Ефектът на хоризонта</dfn> възниква, когато съществено последствие остава отвъд границата на търсене.</p>
    <p>При случайни събития се добавят вероятности и очаквани стойности (<dfn data-g="expectiminimax">expectiminimax</dfn>). Случайният ход на средата не е същият като най-неблагоприятния избор на противник.</p>
  </div></details>
  <details class="hint"><summary>Реален пример: IBM Deep Blue</summary><div>
    <p>Исторически пример за игрова система: IBM Deep Blue използва специализирано търсене и оценяване в шах. Учебният minimax обяснява избора срещу оптимален противник; реалните шахматни програми добавят множество оптимизации — първата от тях е <a href="#alfabeta">алфа-бета отсичането</a>.</p>
  </div></details>
</div>`;

  function mount(root) {
    strategyGame(root.querySelector("#v3-strat"));
    S.viz(root.querySelector("#v3-mm"), {
      id: "c3m", title: "Minimax по дървото на играта", sub: "▲ MAX, ▼ MIN, ■ лист. Синьо — текущ; оранжево — в стека на рекурсията; зелено — стойността е изчислена; виолетово — избраният ход.",
      code: "ch03_minimax",
      inputs: [{ id: "tree", label: "Дърво (вложени скоби)", value: "((3 5) (2 9))", width: "26em" }],
      presets: [
        { label: "3 5 срещу 2 9", values: { tree: "((3 5) (2 9))" } },
        { label: "3×3", values: { tree: "((3 12 8) (2 4 6) (14 5 2))" } },
        { label: "дълбочина 3", values: { tree: "(((3 17) (2 12)) ((15) (25 0)) ((2 5) (3)) ((2 14)))" } },
        { label: "път ≠ стратегия (1/−1)", values: { tree: "((1 -1) (1 1))" } },
      ],
      random: () => { const r = () => S.randInt(-9, 20); const b = S.randInt(2, 3); return { tree: "(" + Array.from({ length: b }, () => "(" + Array.from({ length: S.randInt(2, 3) }, () => "(" + Array.from({ length: S.randInt(1, 3) }, r).join(" ") + ")").join(" ") + ")").join(" ") + ")" }; },
      legend: [["s-act", "текущ"], ["s-cmp", "в стека"], ["s-done", "изчислен"], ["s-piv", "избран ход"]],
      build: algos.minimax, draw: (st, f) => drawGameTree(st, f), speed: 1,
    });
  }

  S.Tema08 = Object.assign(S.Tema08 || {}, { drawGameTree, fmt });
  S.chapter({ id: "minimax", order: 3, num: "3", group: "Печеливши стратегии", title: "Печеливша стратегия и minimax",
    lead: "Стратегия срещу всеки отговор на противника, а не един път. Minimax изкачва стойностите от листата до корена: max на ход на MAX, min на ход на MIN.", html, mount, algos });
})();
