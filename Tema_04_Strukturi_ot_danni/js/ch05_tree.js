/* Раздел 5 — двоично дърво: обхождания, дълбочина/височина, форми, дърво за израз, представяне в масив. */
(function () {
  const S = window.Study, h = S.h;

  /** "4 2 6 1 3" по нива, "-" = липсващо дете -> {id,key,l,r} (id = позиция в реда) */
  function buildLevel(spec) {
    const t = String(spec).trim().split(/[\s,]+/).filter(Boolean);
    if (t.length > 31) throw new Error("Най-много 31 позиции.");
    t.forEach((x) => { if (x !== "-" && !/^-?\d{1,4}$/.test(x)) throw new Error(`„${x}“ не е цяло число или „-“.`); });
    if (!t.length || t[0] === "-") return null;
    let id = 0;
    const mk = (x) => ({ id: id++, key: Number(x), l: null, r: null });
    const root = mk(t[0]), q = [root];
    let i = 1, qh = 0;
    while (qh < q.length && i < t.length) {
      const p = q[qh++];
      if (i < t.length) { if (t[i] !== "-") q.push((p.l = mk(t[i]))); i++; }
      if (i < t.length) { if (t[i] !== "-") q.push((p.r = mk(t[i]))); i++; }
    }
    return root;
  }
  const height = (n) => (n ? 1 + Math.max(height(n.l), height(n.r)) : -1);
  const count = (n) => (n ? 1 + count(n.l) + count(n.r) : 0);

  const algos = {
    buildLevel,
    /** Рекурсивни обхождания с видим стек на извикванията; level-order с опашка. */
    traverse({ spec, kind }) {
      const root = buildLevel(spec);
      const F = [], out = [], stack = [], visited = new Set();
      const snap = (o) => F.push(Object.assign({ root, out: out.slice(), stack: stack.slice(), visited: [...visited], kind, stats: { посетени: out.length, "дълбочина на стека": stack.length } }, o));
      const NAME = { pre: "preorder", in: "inorder", post: "postorder" };
      if (kind === "level") {
        const q = [];
        if (root) q.push(root);
        snap({ at: "init", queue: q.map((n) => n.key), msg: root ? "enqueue(корен). Опашката (FIFO) определя реда: първо цялото ниво, после следващото." : "Празно дърво — опашката остава празна." });
        while (q.length) {
          snap({ at: "loop", queue: q.map((n) => n.key), msg: `Опашката не е празна (${q.length}).` });
          const p = q.shift();
          snap({ at: "deq", cur: p.id, queue: q.map((n) => n.key), msg: `dequeue → ${p.key}.` });
          out.push(p.key); visited.add(p.id);
          snap({ at: "visit", cur: p.id, queue: q.map((n) => n.key), msg: `Посещение: <b>${p.key}</b>.`, log: `посетен ${p.key}` });
          if (p.l) { q.push(p.l); snap({ at: "enql", cur: p.id, mark: p.l.id, queue: q.map((n) => n.key), msg: `enqueue(ляво дете ${p.l.key}).` }); }
          if (p.r) { q.push(p.r); snap({ at: "enqr", cur: p.id, mark: p.r.id, queue: q.map((n) => n.key), msg: `enqueue(дясно дете ${p.r.key}).` }); }
        }
        snap({ at: "loop", done: true, queue: [], msg: `Опашката е празна. Ред по нива: <b>${out.join(", ") || "—"}</b>. Паметта зависи от максималната ширина на ниво.` });
        return { frames: F, result: out.join(" ") || "-" };
      }
      let maxSt = 0;
      function rec(n, side) {
        if (!n) { snap({ at: "null", nullOf: side, msg: `${NAME[kind]}(NULL) → връщане веднага.` }); return; }
        stack.push(n.key); maxSt = Math.max(maxSt, stack.length);
        const vis = () => { out.push(n.key); visited.add(n.id); snap({ at: "visit", cur: n.id, msg: `Посещение: <b>${n.key}</b>.`, log: `посетен ${n.key}` }); };
        snap({ at: "null", cur: n.id, msg: `${NAME[kind]}(${n.key}): възелът не е NULL.` });
        if (kind === "pre") vis();
        snap({ at: "left", cur: n.id, mark: n.l ? n.l.id : null, msg: `Наляво от ${n.key}${n.l ? " към " + n.l.key : " (няма ляво дете)"}.` });
        rec(n.l, n.key + " ←");
        if (kind === "in") vis();
        snap({ at: "right", cur: n.id, mark: n.r ? n.r.id : null, msg: `Надясно от ${n.key}${n.r ? " към " + n.r.key : " (няма дясно дете)"}.` });
        rec(n.r, n.key + " →");
        if (kind === "post") vis();
        stack.pop();
      }
      snap({ at: "null", msg: root ? `Извикване ${NAME[kind]}(корен). Вдясно е стекът на рекурсията — паметта е O(h).` : "Празно дърво." });
      rec(root, "корен");
      snap({ done: true, msg: `Резултат: <b>${out.join(", ") || "—"}</b>. Максимална дълбочина на стека ${maxSt} = h + 1 = ${height(root) + 1} извиквания с не-NULL възел.` });
      return { frames: F, result: out.join(" ") || "-", maxSt };
    },

    /** Височина (рекурсивно) с дълбочина и височина на всеки възел. */
    height({ spec }) {
      const root = buildLevel(spec);
      const F = [], hs = {}, dep = {};
      (function d(n, k) { if (!n) return; dep[n.id] = k; d(n.l, k + 1); d(n.r, k + 1); })(root, 0);
      const snap = (o) => F.push(Object.assign({ root, hs: Object.assign({}, hs), dep }, o));
      snap({ msg: "Височина в ребра: празно поддърво = −1, лист = 0. Над всеки възел е дълбочината му (d), под него — изчислената височина (h)." });
      function rec(n) {
        if (!n) return -1;
        snap({ at: "left", cur: n.id, msg: `height(${n.key}): първо лявото поддърво.` });
        const a = rec(n.l);
        snap({ at: "right", cur: n.id, msg: `height(${n.key}): hl = ${a}; сега дясното.` });
        const b = rec(n.r);
        hs[n.id] = 1 + Math.max(a, b);
        snap({ at: "ret", cur: n.id, msg: `height(${n.key}) = 1 + max(${a}, ${b}) = <b>${hs[n.id]}</b>.`, log: `h(${n.key}) = ${hs[n.id]}` });
        return hs[n.id];
      }
      if (!root) snap({ at: "null", msg: "Празно дърво: височина −1." });
      const H = rec(root);
      const n = count(root);
      snap({ done: true, msg: `Височина на дървото: <b>${H}</b>. n = ${n} възела, ${Math.max(0, n - 1)} ребра. Максимум за тази височина: 2^(h+1) − 1 = ${H >= 0 ? 2 ** (H + 1) - 1 : 0}.` });
      return { frames: F, height: H, n };
    },

    /** Класификация на формата full / complete / perfect. */
    shape({ spec }) {
      const root = buildLevel(spec);
      const n = count(root), H = height(root);
      const badFull = [];
      (function f(x) { if (!x) return; if (!x.l !== !x.r) badFull.push(x.id); f(x.l); f(x.r); })(root);
      let complete = true, gapAt = null, after = null;
      const q = [root]; let gap = false, pos = 0;
      while (q.length) { const p = q.shift(); if (!p) { if (!gap) gapAt = pos; gap = true; pos++; continue; } if (gap) { complete = false; after = p.id; break; } q.push(p.l, p.r); pos++; }
      const full = badFull.length === 0, perfect = n === 2 ** (H + 1) - 1;
      const msg = [];
      msg.push(full ? "<b>full</b>: всеки възел има 0 или 2 деца." : `<b>не е full</b>: възел(и) с едно дете (оранжево).`);
      msg.push(complete ? "<b>complete</b>: при обход по нива няма възел след първата празна позиция." : "<b>не е complete</b>: има възел (червено) след празна позиция в реда по нива.");
      msg.push(perfect ? `<b>perfect</b>: n = ${n} = 2^(h+1) − 1.` : `<b>не е perfect</b>: n = ${n} ≠ 2^(${H}+1) − 1 = ${2 ** (H + 1) - 1}.`);
      const cls = {}; badFull.forEach((i) => (cls[i] = "s-cmp")); if (after != null) cls[after] = "s-swap";
      return { frames: [{ at: [full ? "complete" : "full"], root, cls, msg: msg.join("<br>"), stats: { n, h: H } }], full: full ? 1 : 0, complete: complete ? 1 : 0, perfect: perfect ? 1 : 0, gapAt };
    },

    /** Дърво за израз от постфиксен запис + изчисляване чрез следреден обход. */
    expr({ postfix }) {
      const toks = String(postfix).trim().split(/\s+/).filter(Boolean);
      if (!toks.length) throw new Error("Въведи постфиксен запис, напр. a b + c *");
      if (toks.length > 25) throw new Error("Най-много 25 лексеми.");
      toks.forEach((t) => { if (!/^[-+*/]$/.test(t) && !/^(-?\d{1,5}|[a-z])$/.test(t)) throw new Error(`„${t}“: позволени са цели числа, една малка буква или + − * /.`); });
      const F = [], st = [];
      let id = 0;
      const isOp = (t) => /^[-+*/]$/.test(t);
      const snapB = (o) => F.push(Object.assign({ phase: "build", forest: st.slice(), vars: { "стек": st.length } }, o));
      snapB({ msg: "Строим дървото: операнд → нов лист в стека; операция → взема два поддървета от стека и става техен корен." });
      for (const t of toks) {
        const n = { id: id++, key: t, l: null, r: null };
        if (isOp(t)) {
          if (st.length < 2) { snapB({ at: "b_r", bad: true, msg: `„${t}“ няма два операнда → грешен запис.` }); return { frames: F, result: "E" }; }
          n.r = st.pop(); snapB({ at: "b_r", msg: `„${t}“: дясното поддърво = pop.` });
          n.l = st.pop(); snapB({ at: "b_l", msg: `„${t}“: лявото поддърво = pop.` });
        }
        st.push(n); snapB({ at: "b_push", cur: n.id, msg: `push(${isOp(t) ? "поддърво с корен " + t : "лист " + t}).` });
      }
      if (st.length !== 1) { snapB({ bad: true, msg: `В края има ${st.length} поддървета → грешен запис.` }); return { frames: F, result: "E" }; }
      const root = st[0];
      const vars = {}; let auto = 2;
      toks.forEach((t) => { if (/^[a-z]$/.test(t) && !(t in vars)) vars[t] = auto++; });
      const vals = {}, ord = [];
      const snapE = (o) => F.push(Object.assign({ phase: "eval", root, vals: Object.assign({}, vals), ord: ord.slice() }, o));
      snapE({ msg: `Изчисляване = следреден обход: поддърветата преди корена.${Object.keys(vars).length ? " Променливи: " + Object.entries(vars).map(([k, v]) => `${k} = ${v}`).join(", ") + "." : ""}` });
      let err = false;
      function ev(e) {
        if (!e.l) { const v = /^[a-z]$/.test(e.key) ? vars[e.key] : Number(e.key); vals[e.id] = v; ord.push(e.key); snapE({ at: "e_leaf", cur: e.id, msg: `Лист ${e.key} = ${v}.` }); return v; }
        snapE({ at: "e_left", cur: e.id, msg: `„${e.key}“: първо лявото поддърво.` });
        const a = ev(e.l);
        snapE({ at: "e_right", cur: e.id, msg: `„${e.key}“: после дясното поддърво.` });
        const b = ev(e.r);
        let r;
        if (e.key === "+") r = a + b; else if (e.key === "-") r = a - b; else if (e.key === "*") r = a * b; else { if (b === 0) err = true; r = b ? Math.trunc(a / b) : 0; }
        vals[e.id] = r; ord.push(e.key);
        snapE({ at: "e_op", cur: e.id, msg: `Накрая коренът: ${a} ${e.key} ${b} = <b>${r}</b>.${err ? " (Деление на 0 — C кодът връща 0.)" : ""}`, log: `${a} ${e.key} ${b} = ${r}` });
        return r;
      }
      const R = ev(root);
      const pre = [], inf = [], lvl = [];
      (function p(e) { if (!e) return; pre.push(e.key); p(e.l); p(e.r); })(root);
      (function i(e) { if (!e) return; if (e.l) inf.push("("); i(e.l); inf.push(e.key); i(e.r); if (e.l) inf.push(")"); })(root);
      const q = [root]; while (q.length) { const e = q.shift(); lvl.push(e.key); if (e.l) q.push(e.l); if (e.r) q.push(e.r); }
      snapE({ done: true, msg: `Резултат: <b>${R}</b>.<br>Предред (префикс): <code>${pre.join(" ")}</code> · Следред (постфикс): <code>${ord.join(" ")}</code> · Симетричен (със скоби): <code>${inf.join(" ")}</code> · По нива: <code>${lvl.join(" ")}</code>` });
      return { frames: F, result: R, prefix: pre.join(" "), infix: inf.join(" "), vars };
    },

    /** Представяне на дърво в масив: деца на i са 2i+1, 2i+2. */
    asArray({ spec, pick }) {
      const root = buildLevel(spec);
      // позиция в масива = номер в "пълното" подреждане
      const arr = [], map = {};
      (function f(n, i) { if (!n) return; if (i > 62) throw new Error("Дървото е твърде дълбоко за масив до 63 клетки."); arr[i] = n.key; map[n.id] = i; f(n.l, 2 * i + 1); f(n.r, 2 * i + 2); })(root, 0);
      const len = arr.length;
      for (let i = 0; i < len; i++) if (arr[i] === undefined) arr[i] = null;
      const holes = arr.filter((x) => x === null).length;
      pick = S.int(pick, 0, Math.max(0, len - 1), "Индекс i");
      const l = 2 * pick + 1, r = 2 * pick + 2, p = pick ? Math.floor((pick - 1) / 2) : null;
      const inv = {}; for (const k in map) inv[map[k]] = +k;
      const cls = {}; cls[pick] = "s-act"; if (l < len && arr[l] != null) cls[l] = "s-done"; if (r < len && arr[r] != null) cls[r] = "s-done"; if (p != null) cls[p] = "s-piv";
      const tcls = {}; for (const i in cls) if (inv[i] != null) tcls[inv[i]] = cls[i];
      return { frames: [{ root, arr, cls, tcls, map, msg: `i = ${pick}${arr[pick] == null ? " (празна позиция)" : " (" + arr[pick] + ")"}: ляво дете 2i+1 = ${l}${l < len && arr[l] != null ? " (" + arr[l] + ")" : " — няма"}, дясно 2i+2 = ${r}${r < len && arr[r] != null ? " (" + arr[r] + ")" : " — няма"}, родител ⌊(i−1)/2⌋ = ${p == null ? "— (корен)" : p + " (" + arr[p] + ")"}. Масив с ${len} клетки, от които ${holes} празни.${holes ? " Празнините са цената за форма, която не е complete." : " Няма празнини — формата е complete."}`, stats: { клетки: len, празни: holes } }], len, holes };
    },
  };

  /* ---------- рисуване ---------- */
  const pills = (lab, arr, cls) => h("div", { class: "t4out" }, h("span", { class: "muted", text: lab }), ...(arr.length ? arr.map((x, i) => h("span", { class: "pill " + ((cls && cls(i)) || ""), text: String(x) })) : [h("span", { class: "muted", text: "—" })]));

  function drawTrav(st, f) {
    st.innerHTML = "";
    const cls = {}; f.visited.forEach((i) => (cls[i] = "s-done"));
    if (f.mark != null) cls[f.mark] = "s-cmp";
    if (f.cur != null) cls[f.cur] = "s-act";
    const row = h("div", { class: "t4row" });
    const tb = h("div", { class: "t4scroll" });
    T4.tree(tb, f.root, { cls, nulls: true });
    row.append(tb);
    const side = h("div", { class: "t4col" });
    if (f.kind === "level") side.append(pills("опашка (начало вляво):", f.queue || [], (i) => (i === 0 ? "s-act" : "")));
    else side.append(pills("стек на рекурсията (дъно → връх):", f.stack, (i) => (i === f.stack.length - 1 ? "s-act" : "")));
    if (f.nullOf) side.append(h("span", { class: "muted mono", style: { fontSize: ".8rem" }, text: "текущо извикване: NULL (" + f.nullOf + ")" }));
    side.append(pills("посетени:", f.out, () => "s-done"));
    row.append(side);
    st.append(row);
  }

  function drawHeight(st, f) {
    st.innerHTML = "";
    const cls = {}, sub = {}, top = {};
    for (const k in f.hs) { cls[k] = "s-done"; sub[k] = "h=" + f.hs[k]; }
    for (const k in f.dep) top[k] = "d=" + f.dep[k];
    if (f.cur != null) cls[f.cur] = "s-act";
    const tb = h("div", { class: "t4scroll" });
    T4.tree(tb, f.root, { cls, sub, top });
    st.append(tb);
  }

  function drawShape(st, f) {
    st.innerHTML = "";
    const tb = h("div", { class: "t4scroll" });
    T4.tree(tb, f.root, { cls: f.cls, nulls: true });
    st.append(tb);
  }

  function drawExpr(st, f) {
    st.innerHTML = "";
    const lab = (n) => String(n.key === "*" ? "×" : n.key === "-" ? "−" : n.key);
    if (f.phase === "build") {
      st.append(h("span", { class: "t4cap", text: "стек от поддървета (дъно вляво → връх вдясно)" }));
      const row = h("div", { class: "t4row", style: { alignItems: "flex-end" } });
      if (!f.forest.length) row.append(h("span", { class: "muted", text: "(празен)" }));
      f.forest.forEach((t, i) => { const b = h("div", { style: { border: "1px dashed var(--line)", borderRadius: "6px", padding: "2px" } }); T4.tree(b, t, { label: lab, cls: i === f.forest.length - 1 ? { [t.id]: "s-act" } : {}, dx: 36, dy: 48, r: 15 }); row.append(b); });
      st.append(row);
      return;
    }
    const cls = {}, sub = {};
    for (const k in f.vals) { cls[k] = "s-done"; sub[k] = "= " + f.vals[k]; }
    if (f.cur != null) cls[f.cur] = "s-act";
    const tb = h("div", { class: "t4scroll" });
    T4.tree(tb, f.root, { label: lab, cls, sub });
    st.append(tb, pills("следреден ред на посещение:", f.ord));
  }

  function drawArr(st, f) {
    st.innerHTML = "";
    const row = h("div", { class: "t4row" });
    const tb = h("div", { class: "t4scroll" });
    const top = {}; for (const id in f.map) top[id] = "[" + f.map[id] + "]";
    T4.tree(tb, f.root, { cls: f.tcls, top });
    const ab = h("div", { class: "t4scroll", style: { flex: "1 1 300px" } });
    S.drawArray(ab, f.arr, { cls: Object.assign({}, ...f.arr.map((v, i) => (v == null ? { [i]: "s-dim" } : {})), f.cls) });
    row.append(tb, ab);
    st.append(row);
  }

  const html = `
<div class="prose">
  <p>Дървото е йерархична структура без цикли с определен <dfn data-g="корен">корен</dfn>. Всеки некоренов възел има един родител. <dfn data-g="двоично дърво">Двоичното дърво</dfn> има най-много две различими деца — ляво и дясно. То не е непременно наредено по стойностите. <dfn data-g="лист">Лист</dfn> е възел без деца; вътрешен възел има поне едно дете. <dfn data-g="поддърво">Поддървото</dfn> с корен B включва B и всички негови <dfn data-g="потомък">потомци</dfn>, не само непосредствените деца.</p>
  <p>Всички визуализатори тук приемат дърво, зададено <b>по нива</b>: <code>4 2 6 1 3</code> е примерът от ръководството (корен 4, деца 2 и 6, деца на 2 — 1 и 3). „<code>-</code>“ означава липсващо дете: <code>1 - 2 - 3</code> е дясна верига.</p>
</div>

<div class="block">
  <h3>Четири обхода на едно и също дърво (схеми 11 и 12)</h3>
  <p class="prose"><dfn data-g="предреден обход">Предредният обход</dfn> посещава корен, ляво, дясно; <dfn data-g="симетричен обход">симетричният</dfn> — ляво, корен, дясно; <dfn data-g="следреден обход">следредният</dfn> — ляво, дясно, корен. <dfn data-g="обход по нива">Обходът по нива</dfn> използва опашка. Всички посещават n възела за Θ(n) време. Рекурсивният обход изисква O(h) стекова памет, а обходът по нива — памет според максималната ширина.</p>
  <div id="v5-tr"></div>
  <div class="key"><b>За примера 4 2 6 1 3:</b> <span class="formula">предред 4,2,1,3,6 · симетричен 1,2,3,4,6 · следред 1,3,2,6,4 · по нива 4,2,6,1,3</span></div>
  <details class="trap"><summary>Капан: „симетричният обход дава сортиран ред“</summary><div>
    <p>Нарастването при симетричния обход тук се дължи на допълнителното свойство за търсене (<a href="#bst">BST</a>). Симетричният обход на произволно двоично дърво не гарантира сортирани стойности. Пробвай бутона „не е BST“.</p>
  </div></details>
  <details class="hint"><summary>Хинт: кой ред за коя задача</summary><div>
    <p>Предред — копиране/сериализация на дърво (коренът преди децата). Следред — освобождаване на паметта и изчисляване на израз (децата преди корена). Симетричен — нареден изход от BST. По нива — най-къс път в брой ребра, обход „слой по слой“ (<dfn data-g="bfs">BFS</dfn>). Рекурсивните три са <dfn data-g="dfs">DFS</dfn> със стека на извикванията.</p>
  </div></details>
</div>

<div class="block">
  <h3>Дълбочина и височина при броене на ребра (схеми 13 и 14)</h3>
  <p class="prose">Ще измерваме <dfn data-g="дълбочина">дълбочина</dfn> и <dfn data-g="височина">височина</dfn> в ребра: коренът има дълбочина 0, а листът височина 0. При друга учебна конвенция може да се броят възлите, затова конвенцията трябва да се заяви. Дълбочина се измерва спрямо корена на цялото дърво; височина описва път надолу от разглеждания възел. Два възела могат да имат еднаква дълбочина и различна височина.</p>
  <div class="key"><span class="formula">n възела ⇒ n − 1 ребра      височина h ⇒ най-много 2^(h+1) − 1 възела</span></div>
  <div id="v5-h"></div>
  <details class="trap"><summary>Капан: „височината е 3“ — в ребра или във възли?</summary><div>
    <p>Някои учебници броят възли и получават разлика с единица. Това е различна конвенция, а не непременно грешка в изчислението. Тук празно поддърво има височина −1, затова листът получава 1 + max(−1, −1) = 0.</p>
  </div></details>
</div>

<div class="block">
  <h3>Full, complete и perfect (схема 15)</h3>
  <p class="prose">Имената се употребяват различно в някои учебници. Тук се използват изричните правила: <dfn data-g="full binary tree">full</dfn> или proper означава всеки възел да има нула или две деца; <dfn data-g="complete binary tree">complete</dfn> означава всички нива преди последното да са запълнени, а последното да се запълва отляво; <dfn data-g="perfect binary tree">perfect</dfn> означава всеки вътрешен възел да има две деца и всички листа да са на една дълбочина. Тези свойства описват формата; не определят BST подредба по ключове.</p>
  <div id="v5-shape"></div>
  <details class="trap"><summary>Капан: full и complete като синоними</summary><div>
    <p>Лявото дърво от схема 15 (<code>1 2 3 - - 4 5</code>) е full, но не complete: липсват позиции вляво на последното ниво, докато вдясно има възли. Средното (<code>1 2 3 4 5 6</code>) е complete, но не full: възелът 3 има единствено дете. Дясното (<code>1 2 3 4 5 6 7</code>) е perfect и удовлетворява и другите две правила.</p>
  </div></details>
</div>

<div class="block">
  <h3>Представяне на дърво в масив</h3>
  <p class="prose">При индексиране от нула децата на позиция i са 2i + 1 и 2i + 2, а родителят е ⌊(i − 1)/2⌋. Връзките не се пазят — изчисляват се. Така се съхранява двоичната пирамида в <a href="#dopalnenie">раздел 8</a>. За complete дърво масивът няма празнини; за изродено дърво празнините растат експоненциално с височината.</p>
  <div id="v5-arr"></div>
</div>

<div class="block">
  <h3>Дърво за израз (схема 16)</h3>
  <p class="prose">При дърво за израз вътрешните възли могат да са операции, а листата да са операнди. За (a + b) × c коренът е умножението, лявото поддърво е събирането, а дясното е c. Изпълнението трябва да получи резултата от a + b преди умножението, затова следредният обход е естествен за изчисляването. Предредът дава префиксно представяне, следредът — постфиксно. При симетричен обход скобите трябва да се възстановят според структурата, за да не се загуби групирането. Тук ключовете не образуват нареден речник: дървото моделира зависимости в израза.</p>
  <div id="v5-ex"></div>
</div>`;

  function mount(root) {
    const T = { id: "spec", label: "Дърво по нива („-“ = няма)", value: "4 2 6 1 3", width: "18em" };
    const P = [{ label: "7 възела", values: { spec: "1 2 3 4 5 6 7" } }, { label: "дясна верига", values: { spec: "1 - 2 - 3 - 4" } }, { label: "не е BST", values: { spec: "5 9 2 1 7" } }, { label: "по-голямо", values: { spec: "8 3 10 1 6 - 14 - - 4 7 13" } }];
    S.viz(root.querySelector("#v5-tr"), {
      id: "c5tr", title: "Обхождания", sub: "Синьо — текущо извикване; оранжево — следващото дете; зелено — посетен.",
      code: (inp) => ({ pre: "ch05_pre", in: "ch05_in", post: "ch05_post", level: "ch05_level" }[inp.kind]),
      inputs: [T, { id: "kind", label: "обход", type: "select", value: "pre", options: [["pre", "предреден (корен, Л, Д)"], ["in", "симетричен (Л, корен, Д)"], ["post", "следреден (Л, Д, корен)"], ["level", "по нива (опашка)"]] }],
      presets: P,
      random: () => { const n = S.randInt(5, 11), a = []; for (let i = 0; i < n; i++) a.push(i && Math.random() < 0.2 ? "-" : S.randInt(1, 60)); return { spec: a.join(" ") }; },
      legend: [["s-act", "текущ"], ["s-cmp", "следващо дете"], ["s-done", "посетен"]],
      build: algos.traverse, draw: drawTrav,
    });
    S.viz(root.querySelector("#v5-h"), {
      id: "c5h", title: "Височина (рекурсивно) и дълбочина", sub: "d над възела, h под него.", code: "ch05_height",
      inputs: [Object.assign({}, T, { value: "1 2 3 - 4 - - - - 5" })], presets: P,
      legend: [["s-act", "текущ"], ["s-done", "височината е изчислена"]],
      build: algos.height, draw: drawHeight,
    });
    S.viz(root.querySelector("#v5-shape"), {
      id: "c5sh", title: "Форма: full / complete / perfect", sub: "Резултатът е под картинката.", code: "ch05_shape",
      inputs: [Object.assign({}, T, { value: "1 2 3 - - 4 5" })],
      presets: [{ label: "full, не complete", values: { spec: "1 2 3 - - 4 5" } }, { label: "complete, не full", values: { spec: "1 2 3 4 5 6" } }, { label: "perfect", values: { spec: "1 2 3 4 5 6 7" } }, { label: "верига", values: { spec: "1 - 2 - 3" } }],
      legend: [["s-cmp", "едно дете (не full)"], ["s-swap", "възел след празнина (не complete)"]],
      build: algos.shape, draw: drawShape,
    });
    S.viz(root.querySelector("#v5-arr"), {
      id: "c5arr", title: "Дърво в масив: деца 2i+1, 2i+2", sub: "Над възела — индексът му в масива.", code: false,
      inputs: [Object.assign({}, T, { value: "1 2 3 4 5 6" }), { id: "pick", label: "индекс i", type: "number", value: 1, width: "5em", live: true }],
      presets: [{ label: "complete", values: { spec: "1 2 3 4 5 6", pick: 1 } }, { label: "верига 1-2-3-4", values: { spec: "1 - 2 - 3 - 4", pick: 2 } }],
      legend: [["s-act", "i"], ["s-done", "деца"], ["s-piv", "родител"], ["s-dim", "празна клетка"]],
      build: algos.asArray, draw: drawArr,
    });
    S.viz(root.querySelector("#v5-ex"), {
      id: "c5ex", title: "Дърво за израз: построяване със стек и изчисляване със следреден обход", sub: "Постфиксен запис; букви a…z получават стойности 2, 3, 4, …", code: "ch05_expr",
      inputs: [{ id: "postfix", label: "Постфиксен запис", value: "a b + c *", width: "18em" }],
      presets: [{ label: "(2+3)×4", values: { postfix: "2 3 + 4 *" } }, { label: "5+(1+2)×4−3", values: { postfix: "5 1 2 + 4 * + 3 -" } }, { label: "грешен", values: { postfix: "1 +" } }],
      legend: [["s-act", "текущ възел"], ["s-done", "изчислен"]],
      build: algos.expr, draw: drawExpr,
    });
  }

  S.chapter({ id: "darvo", order: 5, num: "5", group: "Дървета", title: "Двоично дърво и обхождания", lead: "Корен, деца, листа; четирите обхода стъпка по стъпка със стека/опашката; височина в ребра; full / complete / perfect; представяне в масив; дърво за израз.", html, mount, algos });
})();
