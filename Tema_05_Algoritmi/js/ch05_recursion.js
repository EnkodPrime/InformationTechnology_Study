/* Раздел 5 — Рекурсия: базов случай, стек на извикванията, завършване, брой извиквания. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "стек на извикванията": { cat: "Методи", t: "Стек на извикванията", en: "Call stack", d: "Структура (LIFO), в която всяко незавършило извикване държи своя рамка: параметри, локални променливи и адрес на връщане.", more: "Стекът пази незавършената работа: при fact(4) рамката „4 × ?“ чака резултата на fact(3)." },
    "рамка на стека": { cat: "Методи", t: "Рамка на стека", en: "Stack frame / activation record", d: "Паметта на едно активно извикване: аргументи, локални променливи, адрес на връщане.", more: "Рекурсия с дълбочина d държи d рамки едновременно ⇒ Θ(d) памет." },
    "препълване на стека": { cat: "Методи", t: "Препълване на стека", en: "Stack overflow", d: "Изчерпване на паметта за стека — типично при твърде дълбока или безкрайна рекурсия.", more: "В C това е недефинирано поведение / срив (SIGSEGV), а не изключение." },
    "намаляваща мярка": { cat: "Методи", t: "Намаляваща мярка (рекурсия)", en: "Decreasing measure", d: "Величина на аргумента, която строго намалява при всяко рекурсивно извикване и е ограничена отдолу, така че базовият случай неизбежно се достига.", more: "Аналог на ранговата функция при цикли. За fact(n−1) мярката е n, но само при n ≥ 0." },
    "дърво на извикванията": { cat: "Методи", t: "Дърво на извикванията", en: "Recursion / call tree", d: "Дърво, в което всеки възел е едно извикване, а децата му са извикванията, които то прави.", more: "Броят възли = брой извиквания; височината = максимална дълбочина на стека." },
    "бързо степенуване": { cat: "Методи", t: "Бързо степенуване", en: "Exponentiation by squaring", d: "xⁿ = (x^⌊n/2⌋)² · (x при нечетно n): едно рекурсивно извикване за половината ⇒ Θ(log n) извиквания.", more: "Ключът е, че резултатът за n/2 се изчислява веднъж и се използва два пъти." },
    "опашкова рекурсия": { cat: "Методи", t: "Опашкова рекурсия", en: "Tail recursion", d: "Рекурсивното извикване е последното действие на функцията — няма работа след връщането.", more: "Компилаторът може (но C стандартът не задължава) да я превърне в цикъл. fact(n) = n·fact(n−1) НЕ е опашкова — умножението е след връщането." },
  });

  /* ---------- чисти функции ---------- */
  const big = (v) => String(v);
  // снимка на стека: всяка рамка {f, n, x, wait, ret}
  const snap = (st) => st.map((r) => Object.assign({}, r));

  const algos = {
    /** a) факториел — рекурсивно (стек) или итеративно */
    fact({ n, iter }) {
      n = S.int(n, 0, 20, "n");
      return iter ? algos.fact_iter(n) : algos.fact_rec(n);
    },
    fact_rec(n) {
      const F = [], st = [];
      let calls = 0, depth = 0, maxd = 0, mults = 0;
      const stats = () => ({ извиквания: calls, "дълбочина на стека": depth, "максимум": maxd, умножения: mults });
      function rec(n) {
        calls++; depth++; maxd = Math.max(maxd, depth);
        st.push({ f: "fact", n, wait: null, ret: null });
        const top = st[st.length - 1];
        F.push({ at: "enter", stack: snap(st), cur: st.length - 1, vars: { n }, stats: stats(), msg: `Извикване <code>fact(${n})</code>: нова <dfn data-g="рамка на стека">рамка</dfn> върху стека (дълбочина ${depth}).`, log: `${"  ".repeat(depth - 1)}→ fact(${n})` });
        F.push({ at: "base_test", stack: snap(st), cur: st.length - 1, vars: { n }, stats: stats(), msg: `<dfn data-g="базов случай">Базов случай</dfn>? <code>n == 0</code>: ${n} == 0 → <b>${n === 0}</b>.` });
        let r;
        if (n === 0) {
          r = 1n;
          top.ret = "1";
          F.push({ at: "base", stack: snap(st), cur: st.length - 1, vars: { n, return: "1" }, stats: stats(), msg: `0! = 1 — връщаме <b>1</b> без ново извикване. Оттук започва <b>връщането</b> в обратен ред.`, log: `${"  ".repeat(depth - 1)}← 1` });
        } else {
          top.wait = `${n} × fact(${n - 1})`;
          F.push({ at: "call", stack: snap(st), cur: st.length - 1, vars: { n, r: "?" }, stats: stats(), msg: `Рекурсивно правило: ${n}! = ${n} · (${n - 1})!. Рамката на fact(${n}) <b>чака</b> — умножението по ${n} е незавършена работа, която стекът пази.` });
          const sub = rec(n - 1);
          top.wait = null;
          mults++;
          r = BigInt(n) * sub;
          top.ret = big(r);
          F.push({ at: "mul", stack: snap(st), cur: st.length - 1, vars: { n, r: big(sub), return: big(r) }, stats: stats(), msg: `Върна се fact(${n - 1}) = ${big(sub)}. Умножението <b>при връщане</b>: ${n} · ${big(sub)} = <b>${big(r)}</b>.`, log: `${"  ".repeat(depth - 1)}← ${n}·${big(sub)} = ${big(r)}` });
        }
        st.pop(); depth--;
        return r;
      }
      const res = rec(n);
      F.push({ at: "mul", stack: [], cur: -1, done: true, vars: { "fact(n)": big(res) }, stats: stats(), msg: `Готово: ${n}! = <b>${big(res)}</b>. Извиквания: ${calls} = n + 1, максимална дълбочина ${maxd} ⇒ стекът е Θ(n).`, inv: { text: `T(n) = T(n−1) + Θ(1) = Θ(n); памет за стека Θ(n)`, ok: true } });
      if (n === 0) F[F.length - 1].at = "base";
      return { frames: F, result: big(res), calls, maxDepth: maxd };
    },
    fact_iter(n) {
      const F = [];
      let r = 1n, mults = 0;
      const stats = () => ({ умножения: mults, "дълбочина на стека": 1, "максимум": 1 });
      F.push({ at: "init", iter: true, r: "1", i: null, n, vars: { n, r: "1" }, stats: stats(), msg: `Итеративно: една променлива r = 1. Само една рамка (на fact_iter) през цялото време.`, log: "r = 1" });
      let i = 2;
      for (; i <= n; i++) {
        F.push({ at: "loop", iter: true, r: big(r), i, n, vars: { n, i, r: big(r) }, stats: stats(), msg: `<code>i &lt;= n</code>: ${i} ≤ ${n} — продължаваме.` });
        r *= BigInt(i); mults++;
        F.push({ at: "mul", iter: true, r: big(r), i, n, vars: { n, i, r: big(r) }, stats: stats(), msg: `r = r · ${i} = <b>${big(r)}</b>.`, log: `r ·= ${i} → ${big(r)}` });
      }
      F.push({ at: "loop", iter: true, r: big(r), i, n, vars: { n, i, r: big(r) }, stats: stats(), msg: `<code>i &lt;= n</code>: ${i} ≤ ${n} — невярно, цикълът свършва.` });
      F.push({ at: "ret", iter: true, done: true, r: big(r), i, n, vars: { n, return: big(r) }, stats: stats(), msg: `Връщаме <b>${big(r)}</b>. Същото време Θ(n), но <b>Θ(1)</b> допълнителна памет — няма растящ стек.`, log: `return ${big(r)}` });
      return { frames: F, result: big(r), calls: 1, maxDepth: 1 };
    },

    /** b) недостижим базов случай: стекът расте до лимит */
    bad_base({ variant, n, limit }) {
      const v = variant || "dfact_bad";
      n = S.int(n, -20, 30, "n");
      limit = S.int(limit, 5, 60, "Лимит на стека");
      if (v === "fact" && n > 20) throw new Error("За fact n ≤ 20 (иначе препълване на unsigned long long).");
      const step = v === "fact" ? 1 : 2;
      const baseOk = v === "dfact_ok" ? (k) => k <= 1 : (k) => k === 0;
      const baseTxt = v === "dfact_ok" ? "n &lt;= 1" : "n == 0";
      const F = [], st = [];
      let calls = 0, depth = 0, maxd = 0, overflow = false;
      const stats = () => ({ извиквания: calls, "дълбочина": depth, "максимум": maxd, "лимит": limit });
      const fname = v === "fact" ? "fact" : v;
      function rec(k) {
        if (depth + 1 > limit) {
          overflow = true;
          F.push({ at: "call", stack: snap(st), cur: st.length - 1, limit, overflow: true, vars: { n: k }, stats: stats(), msg: `<b>Препълване на стека</b> (stack overflow): опит за рамка №${depth + 1} при лимит ${limit}. Аргументът стигна ${k} и продължава да намалява — базовият случай <code>${baseTxt}</code> никога няма да е верен.`, inv: { text: `базов случай съществува, но НЕ е достижим от n = ${n}`, ok: false }, log: `✗ overflow при ${fname}(${k})` });
          return null;
        }
        calls++; depth++; maxd = Math.max(maxd, depth);
        st.push({ f: fname, n: k, wait: null, ret: null });
        const top = st[st.length - 1];
        F.push({ at: "enter", stack: snap(st), cur: st.length - 1, limit, vars: { n: k }, stats: stats(), msg: `Извикване <code>${fname}(${k})</code> — дълбочина ${depth} от ${limit}.`, log: `${fname}(${k})` });
        const b = baseOk(k);
        F.push({ at: "base_test", stack: snap(st), cur: st.length - 1, limit, vars: { n: k }, stats: stats(), msg: `<code>${baseTxt}</code>? при n = ${k} → <b>${b}</b>.${!b && k < 0 ? " Аргументът вече е отрицателен — мярката n не е ограничена отдолу от базовия случай." : ""}` });
        let r;
        if (b) {
          r = 1n; top.ret = "1";
          F.push({ at: "base", stack: snap(st), cur: st.length - 1, limit, vars: { n: k, return: "1" }, stats: stats(), msg: `Базов случай — връщаме 1.`, log: `← 1` });
        } else {
          top.wait = `${k} × ${fname}(${k - step})`;
          F.push({ at: "call", stack: snap(st), cur: st.length - 1, limit, vars: { n: k }, stats: stats(), msg: `Рекурсивно извикване с аргумент ${k} − ${step} = ${k - step}.` });
          const sub = rec(k - step);
          if (sub === null) return null;
          top.wait = null;
          r = BigInt(k) * sub; top.ret = big(r);
          F.push({ at: "mul", stack: snap(st), cur: st.length - 1, limit, vars: { n: k, return: big(r) }, stats: stats(), msg: `${k} · ${big(sub)} = <b>${big(r)}</b>, връщане.`, log: `← ${big(r)}` });
        }
        st.pop(); depth--;
        return r;
      }
      const res = rec(n);
      if (res !== null) F.push({ at: "mul", stack: [], cur: -1, limit, done: true, vars: { result: big(res) }, stats: stats(), msg: `Завърши: ${fname}(${n}) = <b>${big(res)}</b> с ${calls} извиквания (макс. дълбочина ${maxd}).`, inv: { text: `мярката n намалява с ${step} и достига базовия случай`, ok: true } });
      if (res !== null && calls === 1) F[F.length - 1].at = "base";
      return { frames: F, result: res === null ? null : big(res), calls, maxDepth: maxd, overflow, stopDepth: overflow ? limit + 1 : maxd };
    },

    /** c) дърво на извикванията за x^n */
    pow_tree({ variant, x, n }) {
      const v = variant || "pow_fast";
      x = S.int(x, -9, 9, "x");
      n = S.int(n, 0, 40, "n");
      const bx = BigInt(x);
      if (bx !== 0n && n > 0 && (bx < 0n ? -bx : bx) ** BigInt(n) >= 2n ** 63n) throw new Error(`|x|^n надхвърля long long (2⁶³). Намали x или n.`);
      const F = [], nodes = [];
      let calls = 0, depth = 0, maxd = 0, mults = 0;
      const stats = () => ({ извиквания: calls, умножения: mults, дълбочина: depth, "макс. дълбочина": maxd });
      const snapN = () => nodes.map((o) => ({ id: o.id, p: o.p, n: o.n, val: o.val, st: o.st }));
      function rec(k, parent, tag) {
        calls++; depth++; maxd = Math.max(maxd, depth);
        const me = { id: nodes.length, p: parent, n: k, val: null, st: "act" };
        nodes.push(me);
        F.push({ at: tag ? [tag, "enter"] : "enter", nodes: snapN(), cur: me.id, vars: { x, n: k }, stats: stats(), msg: `Извикване ${v}(x, ${k}) — възел №${calls} в <dfn data-g="дърво на извикванията">дървото</dfn>.` });
        let r;
        if (k === 0) {
          r = 1n; me.val = "1"; me.st = "done";
          F.push({ at: "base", nodes: snapN(), cur: me.id, vars: { x, n: k, return: "1" }, stats: stats(), msg: `x⁰ = 1 — базов случай.` });
        } else if (v === "pow_lin") {
          me.st = "wait";
          const s = rec(k - 1, me.id, "call");
          r = bx * s; mults++;
          me.val = big(r); me.st = "done";
          F.push({ at: "comb", nodes: snapN(), cur: me.id, vars: { x, n: k, r: big(s), return: big(r) }, stats: stats(), msg: `x · x^${k - 1} = <b>${big(r)}</b>.` });
        } else if (v === "pow_twice") {
          me.st = "wait";
          const a = rec(k >> 1, me.id, "call1");
          const b = rec(k >> 1, me.id, "call2");
          r = a * b; mults++;
          if (k % 2) { r *= bx; mults++; }
          me.val = big(r); me.st = "done";
          F.push({ at: "comb", nodes: snapN(), cur: me.id, vars: { x, n: k, a: big(a), b: big(b), return: big(r) }, stats: stats(), msg: `a · b${k % 2 ? " · x" : ""} = <b>${big(r)}</b>. Второто извикване изчисли <b>същото</b> като първото — двойна работа.` });
        } else {
          me.st = "wait";
          const hh = rec(k >> 1, me.id, "call");
          r = hh * hh; mults++;
          if (k % 2) { r *= bx; mults++; }
          me.val = big(r); me.st = "done";
          F.push({ at: "comb", nodes: snapN(), cur: me.id, vars: { x, n: k, h: big(hh), return: big(r) }, stats: stats(), msg: `h · h${k % 2 ? " · x" : ""} = <b>${big(r)}</b> — резултатът за ⌊${k}/2⌋ се използва два пъти, изчислен веднъж.` });
        }
        depth--;
        return r;
      }
      const res = rec(n, -1, null);
      const fin = F[F.length - 1];
      fin.done = true;
      fin.msg += ` <b>Общо ${calls} извиквания</b> за n = ${n}.`;
      fin.log = `${v}(${x}, ${n}) = ${big(res)}`;
      return { frames: F, result: big(res), calls, mults, maxDepth: maxd };
    },
    /** брой извиквания без кадри (за таблицата) */
    pow_calls(v, n) {
      if (n === 0) return 1;
      if (v === "pow_lin") return 1 + algos.pow_calls(v, n - 1);
      if (v === "pow_twice") return 1 + 2 * algos.pow_calls(v, n >> 1);
      return 1 + algos.pow_calls(v, n >> 1);
    },
  };

  /* ---------- рисуване ---------- */
  function drawStack(st, f) {
    st.innerHTML = "";
    const limit = f.limit;
    const compact = f.stack.length > 9;
    const wrap = h("div", { style: { display: "grid", gap: "10px", gridTemplateColumns: "minmax(0,1fr)" } });
    if (limit) {
      const pct = Math.min(100, (f.stack.length / limit) * 100);
      wrap.append(h("div", { class: "row", style: { gap: "8px" } },
        h("span", { class: "muted", style: { fontSize: ".8rem" }, text: `стек: ${f.stack.length}/${limit}` }),
        h("div", { style: { flex: "1 1 160px", height: "10px", border: "1px solid var(--line)", borderRadius: "5px", overflow: "hidden" } },
          h("div", { class: f.overflow ? "s-swap" : pct > 75 ? "s-cmp" : "s-act", style: { width: pct + "%", height: "100%", background: "var(--c)" } }))));
    }
    const col = h("div", { style: { display: "flex", flexDirection: "column", gap: compact ? "2px" : "4px", maxWidth: "460px" } });
    if (!f.stack.length) col.append(h("p", { class: "muted", text: f.done ? "Стекът е празен — всички извиквания са завършили." : "Празен стек." }));
    // върхът на стека — най-горе
    for (let k = f.stack.length - 1; k >= 0; k--) {
      const r = f.stack[k];
      const cls = f.overflow && k === f.stack.length - 1 ? "s-swap" : k === f.cur ? (r.ret != null ? "s-done" : "s-act") : "s-dim";
      const txt = `${r.f}(${r.n})`;
      const right = r.ret != null ? `връща ${r.ret}` : r.wait ? `чака: ${r.wait}` : "";
      col.append(h("div", { class: cls, style: {
        display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center",
        border: "1.5px solid var(--c, var(--line))", background: "var(--cb, var(--panel))", borderRadius: "5px",
        padding: compact ? "1px 8px" : "6px 10px", font: `${compact ? 11.5 : 13.5}px var(--f-mono)`, opacity: cls === "s-dim" ? ".75" : "1",
      } }, h("b", { text: txt }), h("span", { class: "muted", style: { overflowWrap: "anywhere", textAlign: "right" }, text: right })));
    }
    if (f.stack.length) col.append(h("div", { class: "muted", style: { fontSize: ".72rem", textAlign: "center" }, text: "▲ връх на стека · дъно ▼ (main)" }));
    wrap.append(col);
    st.append(wrap);
  }

  function drawIter(st, f) {
    st.innerHTML = "";
    const cells = [], cls = {};
    for (let k = 1; k <= Math.max(1, f.n); k++) cells.push(k);
    cells.forEach((k, j) => { if (f.i != null && k < f.i && k >= 2) cls[j] = "s-done"; if (k === f.i) cls[j] = "s-act"; if (f.done && k >= 2) cls[j] = "s-done"; });
    const box = h("div", { style: { display: "grid", gap: "10px" } });
    S.drawArray(box, cells, { cls, label: () => "", index: false, append: true });
    box.append(h("div", { class: "row" },
      h("span", { class: "pill s-act", text: "една рамка: fact_iter" }),
      h("span", { class: "pill", style: { fontFamily: "var(--f-mono)" }, text: `r = ${f.r}` })));
    st.append(box);
  }

  function layoutTree(nodes) {
    const kids = nodes.map(() => []);
    nodes.forEach((o) => { if (o.p >= 0) kids[o.p].push(o.id); });
    const pos = {};
    let leaf = 0, maxDepth = 0;
    (function place(id, d) {
      maxDepth = Math.max(maxDepth, d);
      if (!kids[id].length) { pos[id] = { x: leaf++, d }; return; }
      kids[id].forEach((c) => place(c, d + 1));
      const xs = kids[id].map((c) => pos[c].x);
      pos[id] = { x: kids[id].length === 1 ? xs[0] : (Math.min(...xs) + Math.max(...xs)) / 2, d };
    })(0, 0);
    return { pos, leaves: leaf, depth: maxDepth };
  }
  function drawTree(st, f, all) {
    st.innerHTML = "";
    // окончателното дърво определя разположението — възлите не „скачат“
    const fin = all[all.length - 1].nodes;
    const L = layoutTree(fin);
    const dx = Math.max(26, Math.min(56, 900 / Math.max(1, L.leaves))), dy = 46;
    const W = Math.max(260, L.leaves * dx + 40), H = (L.depth + 1) * dy + 20;
    const X = (id) => 20 + dx / 2 + L.pos[id].x * dx, Y = (id) => 22 + L.pos[id].d * dy;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, style: "max-height:560px" });
    fin.forEach((o) => { if (o.p >= 0) svg.append(S.svg("line", { class: "edge" + (f.nodes[o.id] ? "" : " s-dim"), x1: X(o.p), y1: Y(o.p), x2: X(o.id), y2: Y(o.id), style: f.nodes[o.id] ? null : "opacity:.25" })); });
    const r = Math.min(15, dx / 2 - 2);
    fin.forEach((o) => {
      const live = f.nodes[o.id];
      let cls = "node ";
      if (!live) cls += "s-dim";
      else if (o.id === f.cur) cls += live.st === "done" ? "s-done" : "s-act";
      else if (live.st === "done") cls += "s-done";
      else cls += "s-cmp";
      const g = S.svg("g", { class: cls, style: live ? null : "opacity:.18" }, S.svg("circle", { cx: X(o.id), cy: Y(o.id), r }),
        S.svg("text", { x: X(o.id), y: Y(o.id) + 4, "text-anchor": "middle", style: `font-size:${r > 11 ? 12 : 9}px`, text: o.n }));
      g.append(S.svg("title", { text: `n = ${o.n}${live && live.val != null ? ", връща " + live.val : ""}` }));
      svg.append(g);
    });
    st.append(svg);
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="рекурсия">Рекурсията</dfn> дефинира изчисление чрез <b>по-прости случаи на същата задача</b>. Рекурсивното определение съдържа <dfn data-g="базов случай">базов случай</dfn> и правило за рекурсивно преминаване; за да завърши, е нужна <dfn data-g="намаляваща мярка">намаляваща мярка</dfn>, която води до базовия случай.</p>
  <p>Рекурсията е <b>начин за организиране</b> на алгоритъма, а не самостоятелна гаранция за ефективност: рекурсивен алгоритъм може да е линеен, експоненциален и т.н. Определят го броят извиквания, размерът на подзадачите и работата извън тях.</p>
</div>

<div class="block">
  <h3>Факториел и стекът на извикванията</h3>
  <div class="key"><span class="formula">0! = 1;   n! = n · (n − 1)!  за n &gt; 0</span><br><span class="formula">T(n) = T(n − 1) + Θ(1) = Θ(n)  ·  стек Θ(n)  ·  итеративно: Θ(1) допълнителна памет</span></div>
  <p class="prose">За fact(4) е нужно 4 × fact(3), за fact(3) — 3 × fact(2)… Всяко незавършило извикване държи <dfn data-g="рамка на стека">рамка</dfn> в <dfn data-g="стек на извикванията">стека на извикванията</dfn>: стекът пази <b>незавършената работа</b> („умножи по 4, когато се върне отговорът“). Връщането протича в обратен ред.</p>
  <div id="v5-fact"></div>
  <details class="hint"><summary>Хинт: защо рекурсивният факториел е Θ(n) по време и Θ(n) по памет</summary><div>
    <p>Всяко извикване прави константна работа (сравнение, едно умножение) плюс едно извикване с n − 1 ⇒ T(n) = T(n − 1) + Θ(1); разгъваме n пъти до T(0) ⇒ Θ(n). Това е при <b>единична цена на умножение</b>.</p>
    <p>Паметта: в момента на базовия случай на стека едновременно стоят n + 1 рамки — нито една не е завършила, защото всяка чака умножението си. Итеративната версия има само r и i ⇒ Θ(1) допълнителна памет. Разликата между итерация и рекурсия тук е <b>стековата памет</b>, не времето.</p>
  </div></details>
  <details class="trap"><summary>Капан: „умножението е O(1)“ при големи числа</summary><div>
    <p>Θ(n) е вярно при единична цена на умножението. При реални големи цели числа (n! има ≈ n log n бита) цената на умножението <b>не е константна</b> и общото време расте по-бързо. Тук unsigned long long спира при n = 20 (21! &gt; 2⁶⁴).</p>
    <p class="muted"><dfn data-g="опашкова рекурсия">Опашкова рекурсия</dfn> <span class="extra-tag">разширение</span>: fact не е опашкова — умножението става след връщането, затова рамката трябва да оцелее.</p>
  </div></details>
</div>

<div class="block">
  <h3>Базов случай ≠ завършване</h3>
  <p class="prose">Наличието на базов случай <b>не доказва</b> сам по себе си, че до него се стига. Определение с fact(n − 1) изисква отделно отношение към нула и отрицателни входове: при n &lt; 0 аргументът се отдалечава от 0. Вариантът <code>n · f(n − 2)</code> с базов случай само <code>n == 0</code> прескача нулата при нечетно n. Стекът расте до лимита → <dfn data-g="препълване на стека">препълване на стека</dfn>.</p>
  <div id="v5-bad"></div>
  <details class="hint"><summary>Хинт: как се доказва завършване на рекурсия</summary><div>
    <p>Посочва се <dfn data-g="намаляваща мярка">мярка</dfn> μ(аргумент) с цели неотрицателни стойности, която строго намалява при всяко извикване, и се показва, че всеки аргумент с най-малка мярка попада в базов случай. За fact: μ(n) = n, но само за n ≥ 0 — затова предусловието „n ≥ 0“ е част от коректността. За n · f(n − 2) правилният базов случай е <code>n &lt;= 1</code>.</p>
  </div></details>
  <details class="trap"><summary>Капан: „има базов случай, значи спира“</summary><div>
    <p>Грешно. Нужни са и двете: базов случай <b>и</b> доказателство, че всяка верига от извиквания достига до него (намаляваща мярка, ограничена отдолу). В C безкрайната рекурсия не е „изключение“ — това е препълване на стека и срив.</p>
  </div></details>
</div>

<div class="block">
  <h3>Броят извиквания определя сложността</h3>
  <p class="prose">Три рекурсивни реализации на xⁿ. Всичките са рекурсивни и всичките са коректни — различават се по <dfn data-g="дърво на извикванията">дървото на извикванията</dfn>. Сложността идва от <b>броя на извикванията</b> (и работата във всяко), не от самия факт, че има рекурсия.</p>
  <div id="v5-pow"></div>
  <div class="tbl-wrap"><table class="t grid" id="t5-pow"></table></div>
  <div class="key"><span class="formula">pow_lin:   C(n) = C(n − 1) + 1   ⇒ n + 1 = Θ(n) извиквания</span><br>
    <span class="formula">pow_twice: C(n) = 2·C(n/2) + 1  ⇒ Θ(n) извиквания (две еднакви подзадачи!)</span><br>
    <span class="formula">pow_fast:  C(n) = C(n/2) + 1    ⇒ ⌊log₂ n⌋ + 2 (n ≥ 1) = Θ(log n) извиквания</span></div>
  <details class="hint"><summary>Хинт: защо pow_twice не печели нищо, въпреки че „дели наполовина“</summary><div>
    <p>Делението наполовина намалява <b>размера</b> на подзадачата, но pow_twice прави <b>две</b> подзадачи с еднакъв размер n/2 ⇒ на ниво k има 2ᵏ възела, нивата са ⌊log₂ n⌋ + 2 (до n = 0) ⇒ общо 2<sup>⌊log₂ n⌋+2</sup> − 1 извиквания — между 2n + 1 и 4n − 1 (при n = 2ᵏ: 4n − 1). <dfn data-g="бързо степенуване">Бързото степенуване</dfn> забелязва, че двете подзадачи са <b>една и съща</b>, изчислява я веднъж и използва резултата два пъти ⇒ една подзадача на ниво ⇒ Θ(log n).</p>
    <p>Същата идея (не изчислявай една подзадача два пъти) е в основата на <a href="#dp">динамичното програмиране</a>: рекурсия + <dfn data-g="мемоизация">мемоизация</dfn> е DP — двете не се изключват.</p>
  </div></details>
  <details class="trap"><summary>Капан: „рекурсията е бавна“ / „рекурсията е ефективна“</summary><div>
    <p>И двете са грешни като общи твърдения. Рекурсията е начин за организиране. Наивната рекурсия за числата на Фибоначи е експоненциална заради повтарящи се подзадачи; Merge Sort е Θ(n log n); бързото степенуване е Θ(log n). Анализът минава през рекурентно уравнение за конкретния алгоритъм.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v5-fact"), {
      id: "c5fact", title: "fact(n) — стек на извикванията", sub: "Рамките се добавят при извикване и се махат при връщане с изчислената стойност.",
      code: (i) => (i.iter ? "ch05_fact_iter" : "ch05_fact_rec"),
      inputs: [{ id: "n", label: "n (0…20)", type: "number", value: 4, width: "6em" }, { id: "iter", label: "итеративна версия", type: "checkbox", value: false }],
      presets: [{ label: "n = 0 (базов)", values: { n: 0 } }, { label: "n = 6", values: { n: 6 } }, { label: "n = 20", values: { n: 20 } }],
      legend: [["s-act", "текуща рамка"], ["s-dim", "чакаща рамка"], ["s-done", "връща стойност"]],
      stageHeight: 200,
      build: (i) => algos.fact(i),
      draw(st, f) { if (f.iter) drawIter(st, f); else drawStack(st, f); },
    });

    S.viz(root.querySelector("#v5-bad"), {
      id: "c5bad", title: "Недостижим базов случай → препълване на стека", sub: "Моделиран стек с лимит (реалният е няколко MB).",
      code: (i) => (i.variant === "fact" ? "ch05_fact_rec" : "ch05_" + i.variant),
      inputs: [
        { id: "variant", label: "вариант", type: "select", value: "dfact_bad", options: [["dfact_bad", "n·f(n−2), базов само n == 0"], ["dfact_ok", "n·f(n−2), базов n <= 1"], ["fact", "fact(n) с отрицателен вход"]] },
        { id: "n", label: "n", type: "number", value: 7, width: "6em" },
        { id: "limit", label: "лимит на стека", type: "number", value: 40, width: "6em" },
      ],
      presets: [{ label: "n = 8 (четно — спира)", values: { variant: "dfact_bad", n: 8 } }, { label: "n = 7 (нечетно — прескача 0)", values: { variant: "dfact_bad", n: 7 } }, { label: "поправено, n = 7", values: { variant: "dfact_ok", n: 7 } }, { label: "fact(−3)", values: { variant: "fact", n: -3 } }],
      legend: [["s-act", "текуща рамка"], ["s-swap", "препълване"], ["s-done", "връща"]],
      speed: 2, stageHeight: 220,
      build: (i) => algos.bad_base(i),
      draw: drawStack,
    });

    S.viz(root.querySelector("#v5-pow"), {
      id: "c5pow", title: "Дърво на извикванията за xⁿ", sub: "Числото във възела е n. Жълто — чака подзадачи, зелено — върнал стойност (посочи възел за стойността).",
      code: (i) => "ch05_" + i.variant,
      inputs: [
        { id: "variant", label: "реализация", type: "select", value: "pow_fast", options: [["pow_lin", "линейна x·x^(n−1)"], ["pow_twice", "две извиквания за n/2"], ["pow_fast", "бързо степенуване"]] },
        { id: "x", label: "x (−9…9)", type: "number", value: 2, width: "5em" },
        { id: "n", label: "n (0…40)", type: "number", value: 13, width: "5em" },
      ],
      presets: [{ label: "n = 16", values: { n: 16, x: 2 } }, { label: "n = 31", values: { n: 31, x: 2 } }, { label: "(−3)⁷", values: { x: -3, n: 7 } }],
      legend: [["s-act", "текущо извикване"], ["s-cmp", "чака подзадачи"], ["s-done", "върнато"]],
      speed: 2, stageHeight: 200,
      build: (i) => algos.pow_tree(i),
      draw: (st, f, ctx) => drawTree(st, f, ctx.frames),
    });

    const tb = root.querySelector("#t5-pow");
    const ns = [1, 2, 4, 8, 16, 32, 64, 1024];
    tb.append(h("tr", null, h("th", { text: "n" }), ...ns.map((n) => h("th", { text: n }))));
    [["pow_lin", "линейна"], ["pow_twice", "две за n/2"], ["pow_fast", "бързо"]].forEach(([v, t]) =>
      tb.append(h("tr", null, h("th", { text: t }), ...ns.map((n) => h("td", { class: v === "pow_fast" ? "s-done" : "", text: algos.pow_calls(v, n) })))));

  }

  S.chapter({ id: "rekursia", order: 5, num: "5", group: "Задължителни парадигми", title: "Рекурсия", lead: "Базов случай, рекурсивно правило и намаляваща мярка. Какво пази стекът, кога рекурсията не спира и защо броят извиквания — а не рекурсията — определя сложността.", html, mount, algos });
})();
