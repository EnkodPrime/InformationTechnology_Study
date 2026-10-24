/* Раздел 4 — алфа-бета отсичане: α, β по пътя, отсечени клони, влияние на реда на ходовете. */
(function () {
  const S = window.Study, h = S.h;
  const fmt = (x) => (x === Infinity ? "+∞" : x === -Infinity ? "−∞" : x);

  /* разбор — същият формат и номерация като в 03_minimax.c (самостоятелно копие за тестовете) */
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
          T[c].parent = id; T[id].kids.push(c);
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
    node(0); ws();
    if (p < s.length) throw new Error(`Излишен текст след дървото: „${s.slice(p, p + 10)}“.`);
    if (T[0].leaf) throw new Error("Коренът трябва да има ходове.");
    return T;
  }
  const isMax = (T, k) => T[k].d % 2 === 0;
  function mmValue(T, s) { if (T[s].leaf) return T[s].value; const v = T[s].kids.map((c) => mmValue(T, c)); return isMax(T, s) ? Math.max(...v) : Math.min(...v); }
  function toStr(T, s) { return T[s].leaf ? String(T[s].value) : "(" + T[s].kids.map((c) => toStr(T, c)).join(" ") + ")"; }
  const subtree = (T, s) => [s, ...T[s].kids.flatMap((c) => subtree(T, c))];

  /* ---------- чисти функции ---------- */
  const algos = {
    /** пренарежда ходовете: best — най-добрият за играча на ход първи; worst — най-лошият първи */
    reorder({ tree, order }) {
      const T = parseTree(tree);
      if (order === "given") return toStr(T, 0);
      (function rec(s) {
        if (T[s].leaf) return;
        T[s].kids.forEach(rec);
        const sign = (isMax(T, s) ? -1 : 1) * (order === "best" ? 1 : -1);
        T[s].kids.sort((a, b) => sign * (mmValue(T, a) - mmValue(T, b)));
      })(0);
      return toStr(T, 0);
    },

    /** alphabeta(s, α, β, is_max) от 03_minimax.c */
    alphabeta({ tree, order }) {
      const src = order && order !== "given" ? algos.reorder({ tree, order }) : tree;
      const T = parseTree(src);
      const val = new Array(T.length).fill(null), ab = new Array(T.length).fill(null), F = [];
      const cutRoots = [], cutAll = [], stack = [];
      let visited = 0, leaves = 0;
      const st = () => ({ "посетени възли": visited, "оценени листа": leaves, "отсечени възли": cutAll.length, "всички възли": T.length });
      const push = (o) => F.push(Object.assign({ T, val: val.slice(), ab: ab.map((x) => (x ? x.slice() : null)), stack: stack.slice(), cutAll: cutAll.slice(), stats: st() }, o));
      const who = (k) => (isMax(T, k) ? "MAX" : "MIN");
      function rec(s, alpha, beta) {
        visited++; stack.push(s); ab[s] = [alpha, beta];
        push({ at: "visit", cur: s, vars: { s, ход: who(s), α: fmt(alpha), β: fmt(beta) }, msg: `Възел ${s} (${who(s)}) получава граници α = ${fmt(alpha)}, β = ${fmt(beta)}.` });
        if (T[s].leaf) {
          leaves++; val[s] = T[s].value;
          push({ at: ["util", "leaf"], cur: s, vars: { s, "U(s)": T[s].value }, msg: `Лист: стойност <b>${T[s].value}</b>.`, log: `лист ${s}: ${T[s].value}` });
          stack.pop(); return T[s].value;
        }
        const mx = isMax(T, s);
        let best = mx ? -Infinity : Infinity;
        push({ at: "init", cur: s, vars: { s, best: fmt(best), α: fmt(alpha), β: fmt(beta) }, msg: `${who(s)}: best = ${fmt(best)}.` });
        for (let k = 0; k < T[s].kids.length; k++) {
          const c = T[s].kids[k];
          push({ at: "rec", cur: s, next: c, vars: { s, k, α: fmt(alpha), β: fmt(beta) }, msg: `Спускаме се в ход ${k + 1} (възел ${c}) с α = ${fmt(alpha)}, β = ${fmt(beta)}.` });
          const v = rec(c, alpha, beta);
          if (mx) { best = Math.max(best, v); alpha = Math.max(alpha, best); }
          else { best = Math.min(best, v); beta = Math.min(beta, best); }
          ab[s] = [alpha, beta];
          push({ at: mx ? "updmax" : "updmin", cur: s, from: c, vars: { s, v, best, α: fmt(alpha), β: fmt(beta) }, msg: mx ? `MAX: best = ${best}; α = max(α, best) = <b>${fmt(alpha)}</b> — MAX вече си е осигурил поне толкова.` : `MIN: best = ${best}; β = min(β, best) = <b>${fmt(beta)}</b> — MIN може да задържи резултата най-много до толкова.` });
          const cut = alpha >= beta;
          push({ at: "test", cur: s, vars: { α: fmt(alpha), β: fmt(beta), "α ≥ β": cut }, msg: `α ≥ β? ${fmt(alpha)} ≥ ${fmt(beta)} → <b>${cut}</b>.${cut ? "" : " Продължаваме със следващия ход."}` });
          if (cut) {
            const rest = T[s].kids.slice(k + 1);
            if (rest.length) {
              rest.forEach((r) => { cutRoots.push(r); cutAll.push(...subtree(T, r)); });
              push({ at: "cut", cur: s, vars: { отсечени: rest.join(" ") }, msg: mx
                ? `<b>Отсичане</b> в MAX възел ${s}: MAX вече има ≥ ${fmt(alpha)}, а MIN по-горе няма да допусне повече от ${fmt(beta)}. Ходове ${rest.join(", ")} не могат да променят избора.`
                : `<b>Отсичане</b> в MIN възел ${s}: тук MIN може да задържи ≤ ${fmt(beta)}, а MAX по-горе вече има ${fmt(alpha)}. MAX няма да избере този клон — останалите ходове (${rest.join(", ")}) не могат да го направят по-добър.`,
                log: `✂ при ${s}: ${rest.join(", ")}` });
            } else push({ at: "cut", cur: s, vars: {}, msg: "α ≥ β, но няма оставащи ходове за отсичане." });
            break;
          }
        }
        val[s] = best;
        push({ at: "ret", cur: s, vars: { s, return: best }, msg: `Възел ${s} връща <b>${best}</b>.`, log: `${"· ".repeat(T[s].d)}V(${s}) = ${best}` });
        stack.pop(); return best;
      }
      const v = rec(0, -Infinity, Infinity);
      const full = mmValue(T, 0);
      const last = F[F.length - 1];
      last.done = true;
      last.inv = { text: `стойността ${v} съвпада с пълния minimax (${full})`, ok: v === full };
      last.msg = `Стойност <b>${v}</b>. Посетени ${visited} от ${T.length} възела, оценени ${leaves} листа; отсечени ${cutAll.length} възела.`;
      return { frames: F, result: v, visited, leaves, cut: cutRoots.join(" ") || "-", nodes: T.length, tree: src };
    },

    /** сравнение по ред на ходовете: посетени възли при пълен minimax и при алфа-бета */
    compare({ tree }) {
      const rows = ["given", "best", "worst"].map((o) => {
        const src = algos.reorder({ tree, order: o });
        const T = parseTree(src);
        const r = algos.alphabeta({ tree: src, order: "given" });
        return { o, src, all: T.length, ab: r.visited, leaves: r.leaves, allLeaves: T.filter((n) => n.leaf).length, v: r.result };
      });
      return { frames: [{ rows }], rows };
    },
  };

  /* ---------- рисуване ---------- */
  function drawAB(st, f) {
    const D = S.Tema08 && S.Tema08.drawGameTree;
    if (!D) { st.textContent = "Липсва рисуването на дърво (раздел 3)."; return; }
    D(st, f, { ab: true });
  }
  function drawCompare(st, f) {
    st.innerHTML = "";
    const N = { given: "както е въведено", best: "най-добрият ход първи", worst: "най-лошият ход първи" };
    const t = h("table", { class: "t grid" }, h("tr", null, ...["ред на ходовете", "дърво", "възли: пълен minimax", "възли: алфа-бета", "листа: minimax → α-β", "стойност"].map((x) => h("th", { text: x }))));
    f.rows.forEach((r) => t.append(h("tr", null, h("td", { style: { textAlign: "left", fontFamily: "var(--f-body)" }, text: N[r.o] }), h("td", { style: { textAlign: "left", fontSize: ".75rem" }, text: r.src }), h("td", { text: r.all }),
      h("td", { class: r.ab < r.all ? "s-done" : "s-swap", text: r.ab }), h("td", { text: `${r.allLeaves} → ${r.leaves}` }), h("td", { text: r.v }))));
    st.append(h("div", { class: "tbl-wrap" }, t));
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="алфа-бета отсичане">Алфа-бета отсичането</dfn> пропуска клонове, които не могат да променят minimax стойността. <b>α</b> е вече осигурена долна граница за MAX по текущия път, <b>β</b> — горна граница, наложена от MIN. При <b>α ≥ β</b> оставащите наследници в съответния възел могат да бъдат пропуснати.</p>
</div>

<div class="block">
  <h3>Схема 9 — кои клони се отрязват и защо</h3>
  <p class="prose">След първия ход MAX вече може да получи 3 (α = 3). Във втория MIN вижда вариант 2 (β = 2): резултатът на този клон няма да е по-голям от 2, а MAX вече има 3. Другият лист 9 не променя избора и се отсича. Под всеки възел са текущите му α и β; отсечените поддървета са червени с прекъсната линия.</p>
  <div id="v4-ab"></div>
  <div class="key">α — „MAX вече си е осигурил поне α“. β — „MIN вече може да задържи най-много β“. <b>α ≥ β</b> ⇒ този възел не може да повлияе на избора по-горе. Отсичането <b>запазва</b> minimax стойността на същото дърво при същите оценки.</div>
  <details class="hint"><summary>Хинт: как се предават границите</summary><div>
    <p>Границите вървят <b>надолу</b> като параметри (α, β на родителя), а стойностите — <b>нагоре</b> като върнат резултат. MAX вдига α, MIN сваля β. Отсичане в MIN възел (β ≤ α) се нарича още α-отсичане, а в MAX възел (α ≥ β) — β-отсичане; имената не са съществени, условието е едно.</p>
  </div></details>
  <details class="trap"><summary>Капан: „алфа-бета намира друга (приблизителна) стойност“</summary><div>
    <p>Не. Стойността в корена е <b>същата</b> като при пълния minimax — виж проверката в края на всяко изпълнение. Пропуснатите клони не биха променили избора. Междинните стойности на вътрешни възли обаче могат да са само граници, а не точни minimax стойности.</p>
  </div></details>
</div>

<div class="block">
  <h3>Влияние на реда на ходовете</h3>
  <p class="prose">Подредбата на ходовете определя колко рано се появяват силни граници. Таблицата пуска алфа-бета върху едно и също дърво с три подредби на децата (стойността винаги е една и съща).</p>
  <div id="v4-cmp"></div>
  <div class="key"><span class="formula">благоприятен ред: от порядък O(b^(d/2))</span><br><span class="formula">най-лош ред:      O(b^d) — нищо не се отсича</span></div>
  <details class="trap"><summary>Капан: „алфа-бета е полиномиална“</summary><div>
    <p>Грешно общо твърдение. Алфа-бета оптимизира търсене, което в най-лошия случай остава експоненциално по дълбочината. Дори идеалното O(b^(d/2)) е експоненциално — само показателят е наполовина (на практика: двойно по-дълбоко търсене за същото време).</p>
  </div></details>
  <details class="hint"><summary>Хинт: откъде знаем „най-добрия ход първи“</summary><div>
    <p>Тук подредбата използва вече изчислените minimax стойности — само за да покаже ефекта. В реална програма те не са известни предварително; редът се отгатва евристично (например от по-плитко търсене). Затова ефектът е между двете граници.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v4-ab"), {
      id: "c4ab", title: "Алфа-бета отсичане по дървото", sub: "Под възлите: текущи α и β. Червено, прекъснато — отсечено.",
      code: "ch04_alphabeta",
      inputs: [
        { id: "tree", label: "Дърво (вложени скоби)", value: "((3 5) (2 9))", width: "24em" },
        { id: "order", label: "ред на ходовете", type: "select", value: "given", options: [["given", "както е въведено"], ["best", "най-добрият първи"], ["worst", "най-лошият първи"]] },
      ],
      presets: [
        { label: "3 5 срещу 2 9", values: { tree: "((3 5) (2 9))", order: "given" } },
        { label: "3×3", values: { tree: "((3 12 8) (2 4 6) (14 5 2))", order: "given" } },
        { label: "дълбочина 3", values: { tree: "(((5 6) (7 4 5)) ((3)) ((6) (6 9)) ((7) (5)) ((9 8) (6)))", order: "given" } },
        { label: "обърнат ред (2 9 първо)", values: { tree: "((2 9) (3 5))", order: "given" } },
      ],
      random: () => { const r = () => S.randInt(0, 20); return { tree: "(" + Array.from({ length: 3 }, () => "(" + Array.from({ length: 3 }, () => "(" + Array.from({ length: 2 }, r).join(" ") + ")").join(" ") + ")").join(" ") + ")", order: "given" }; },
      legend: [["s-act", "текущ"], ["s-cmp", "в стека"], ["s-done", "оценен"], ["s-swap", "отсечен"]],
      build: algos.alphabeta, draw: drawAB, speed: 1,
    });
    S.viz(root.querySelector("#v4-cmp"), {
      id: "c4c", title: "Колко възла спестява подредбата", code: false,
      inputs: [{ id: "tree", label: "Дърво", value: "(((5 6) (7 4 5)) ((3)) ((6) (6 9)) ((7) (5)) ((9 8) (6)))", width: "28em" }],
      presets: [{ label: "3×3", values: { tree: "((3 12 8) (2 4 6) (14 5 2))" } }, { label: "3×2", values: { tree: "((2 3) (5 6) (8 9))" } }],
      build: algos.compare, draw: drawCompare,
    });
  }

  S.chapter({ id: "alfabeta", order: 4, num: "4", group: "Печеливши стратегии", title: "Алфа-бета отсичане",
    lead: "Същата minimax стойност с по-малко работа: α и β по пътя, условие α ≥ β, отсечени клони — и защо редът на ходовете решава колко се спестява.", html, mount, algos });
})();
