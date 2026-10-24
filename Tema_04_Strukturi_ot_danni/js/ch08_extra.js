/* Раздел 8 — допълнение извън основния обхват: heap, AVL, red-black, B/B+, trie, хеш. */
(function () {
  const S = window.Study, h = S.h;

  function parseProg(str, spec, maxOps = 30) {
    const parts = String(str).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > maxOps) throw new Error(`Най-много ${maxOps} операции.`);
    return parts.map((p) => {
      const t = p.replace(/[()]/g, " ").trim().split(/\s+/);
      const nm = t[0].toLowerCase();
      const key = Object.keys(spec).find((k) => k === nm || (spec[k].alias || []).includes(nm));
      if (!key) throw new Error(`Непозната операция „${t[0]}“. Допустими: ${Object.keys(spec).join(", ")}.`);
      const args = t.slice(1).map((x) => { const v = Number(x); if (!Number.isInteger(v) || Math.abs(v) > 999) throw new Error(`„${x}“ в „${p}“ не е цяло число между −999 и 999.`); return v; });
      if (spec[key].args === "many" ? !args.length : args.length !== spec[key].args) throw new Error(`Грешен брой аргументи: „${p}“.`);
      return { name: key, args, text: p };
    });
  }

  // дърво от масив (heap) за рисуване: id = индекс
  const heapTree = (a) => { const mk = (i) => (i < a.length ? { id: i, key: a[i], l: mk(2 * i + 1), r: mk(2 * i + 2) } : null); return mk(0); };

  const algos = {
    heap({ prog }) {
      const ops = parseProg(prog, { push: { args: "many", alias: ["insert"] }, pop: { args: 0, alias: ["extract"] } });
      const a = [], out = [], F = [];
      let swaps = 0;
      const snap = (o) => F.push(Object.assign({ a: a.slice(), out: out.slice(), stats: { n: a.length, размени: swaps } }, o));
      snap({ msg: "Празна min-пирамида." });
      ops.forEach((op, k) => {
        const log = `${k + 1}. ${op.text}`;
        if (op.name === "push") {
          op.args.forEach((x) => {
            if (a.length >= 63) throw new Error("Най-много 63 елемента.");
            let i = a.length; a.push(x);
            snap({ at: "put", cls: { [i]: "s-done" }, msg: `push(${x}): заема следващата свободна позиция ${i} — формата остава complete.`, log: `push ${x}` });
            while (i > 0) {
              const p = (i - 1) >> 1;
              snap({ at: "up", cls: { [i]: "s-act", [p]: "s-cmp" }, msg: `родител a[${p}] = ${a[p]} ≤ a[${i}] = ${a[i]}? → <b>${a[p] <= a[i]}</b>.` });
              if (a[p] <= a[i]) { snap({ at: "upok", cls: { [i]: "s-done" }, msg: "Редът е възстановен." }); break; }
              [a[p], a[i]] = [a[i], a[p]]; swaps++;
              snap({ at: "upswap", cls: { [p]: "s-swap", [i]: "s-swap" }, msg: `Размяна — ${a[p]} се изкачва на позиция ${p}.` });
              i = p;
            }
          });
        } else {
          if (!a.length) { out.push("E"); snap({ at: "empty", msg: "pop от празна → -1.", log }); return; }
          const m = a[0]; out.push(String(m));
          snap({ at: "min", cls: { 0: "s-done" }, msg: `Минимумът е в корена: <b>${m}</b>.`, log });
          const last = a.pop();
          if (a.length) { a[0] = last; snap({ at: "last", cls: { 0: "s-act" }, msg: `Последният (${last}) заема корена; сега се спуска.` }); }
          let i = 0;
          for (;;) {
            if (!a.length) break;
            const l = 2 * i + 1, r = l + 1; let mm = i;
            if (l < a.length && a[l] < a[mm]) mm = l;
            if (r < a.length && a[r] < a[mm]) mm = r;
            const c = { [i]: "s-act" }; if (l < a.length) c[l] = "s-cmp"; if (r < a.length) c[r] = "s-cmp";
            snap({ at: ["down", "pick"], cls: c, msg: `По-малкото дете на позиция ${i}: ${l < a.length ? a[l] : "—"} / ${r < a.length ? a[r] : "—"}.` });
            if (mm === i) { snap({ at: "downok", cls: { [i]: "s-done" }, msg: "Няма по-малко дете — редът е възстановен." }); break; }
            [a[i], a[mm]] = [a[mm], a[i]]; swaps++;
            snap({ at: "downswap", cls: { [i]: "s-swap", [mm]: "s-swap" }, msg: `Размяна с ${a[i]}.` });
            i = mm;
          }
        }
      });
      const ino = []; (function f(i) { if (i >= a.length) return; f(2 * i + 1); ino.push(a[i]); f(2 * i + 2); })(0);
      snap({ done: true, msg: `Масив: [${a.join(", ")}]. Симетричен обход: ${ino.join(", ") || "—"} — <b>не</b> е непременно сортиран: heap не е BST.` });
      return { frames: F, out: out.join(" ") || "-", arr: a.join(" ") || "-", swaps };
    },

    avl({ keys }) {
      const ks = S.parseNums(keys, { minLen: 1, maxLen: 20, min: -999, max: 999 });
      let nid = 0, rot = 0;
      const F = [];
      const ht = (t) => (t ? t.h : -1);
      const upd = (t) => { t.h = 1 + Math.max(ht(t.l), ht(t.r)); };
      const bf = (t) => ht(t.l) - ht(t.r);
      let root = null;
      const cl = (n) => (n ? { id: n.id, key: n.key, h: n.h, l: cl(n.l), r: cl(n.r) } : null);
      const snap = (o) => F.push(Object.assign({ root: cl(root), stats: { ротации: rot, височина: ht(root) } }, o));
      const rr = (y) => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); rot++; return x; };
      const rl = (x) => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); rot++; return y; };
      // вмъкване с връщане по пътя; снимки след всяка проверка/ротация
      function ins(t, key, setParent) {
        if (!t) { const n = { id: nid++, key, h: 0, l: null, r: null }; setParent(n); snap({ at: "new", cur: n.id, msg: `Нов лист ${key}.` }); return n; }
        if (key === t.key) { snap({ at: "dup", cur: t.id, msg: `${key} вече е в дървото.` }); return t; }
        if (key < t.key) t.l = ins(t.l, key, (n) => (t.l = n)); else t.r = ins(t.r, key, (n) => (t.r = n));
        upd(t);
        const b = bf(t);
        snap({ at: "upd", cur: t.id, msg: `Връщаме се през ${t.key}: h = ${t.h}, balance factor = h(L) − h(R) = ${ht(t.l)} − (${ht(t.r)}) = <b>${b}</b>.${Math.abs(b) > 1 ? " Нарушение!" : ""}` });
        let nt = t, kind = null;
        if (b > 1 && key < t.l.key) { kind = "LL"; nt = rr(t); }
        else if (b < -1 && key > t.r.key) { kind = "RR"; nt = rl(t); }
        else if (b > 1) { kind = "LR"; t.l = rl(t.l); setParent(t); snap({ at: "LR", cur: t.id, msg: `Ляво-дясно: първо лява ротация при ${t.l.l.key} — ${t.l.key} се издига.` }); nt = rr(t); }
        else if (b < -1) { kind = "RL"; t.r = rr(t.r); setParent(t); snap({ at: "RL", cur: t.id, msg: `Дясно-ляво: първо дясна ротация при ${t.r.r.key} — ${t.r.key} се издига.` }); nt = rl(t); }
        if (kind) {
          setParent(nt);
          const nm = { LL: "ляво-ляво → дясна ротация", RR: "дясно-дясно → лява ротация", LR: "… после дясна ротация", RL: "… после лява ротация" }[kind];
          snap({ at: kind, cur: nt.id, rotated: true, msg: `Случай ${kind}: ${nm}. ${nt.key} е новият корен на поддървото; симетричният ред е запазен.`, log: `${kind} при ${t.key}` });
        }
        return nt;
      }
      snap({ msg: "Празно AVL дърво. Над всеки възел е balance factor." });
      ks.forEach((k) => { snap({ at: "goleft", msg: `insert(${k}): BST вмъкване надолу, проверка на баланса нагоре.`, log: `insert ${k}` }); root = ins(root, k, (n) => (root = n)); });
      const pre = [], ino = [];
      (function p(t) { if (!t) return; pre.push(t.key); p(t.l); p(t.r); })(root);
      (function i(t) { if (!t) return; i(t.l); ino.push(t.key); i(t.r); })(root);
      snap({ at: "ok", done: true, msg: `Край. Височина ${ht(root)} за n = ${ino.length} (⌊log₂ n⌋ = ${Math.floor(Math.log2(ino.length))}); ротации ${rot}. Симетричен ред: ${ino.join(" ")}.` });
      return { frames: F, pre: pre.join(" "), in: ino.join(" "), height: ht(root), rot };
    },

    trie({ words, query }) {
      const ws = String(words).split(/[\s,]+/).filter(Boolean);
      if (ws.length > 12) throw new Error("Най-много 12 думи.");
      ws.forEach((w) => { if (!/^[a-z]{1,8}$/.test(w)) throw new Error(`„${w}“: само малки латински букви, до 8.`); });
      query = String(query).trim();
      if (!/^[a-z]{0,8}$/.test(query)) throw new Error("Заявката: малки латински букви.");
      let id = 0;
      const root = { id: id++, ch: "", end: false, kids: {} };
      ws.forEach((w) => { let n = root; for (const c of w) { if (!n.kids[c]) n.kids[c] = { id: id++, ch: c, end: false, kids: {} }; n = n.kids[c]; } n.end = true; });
      const F = [], path = [root.id];
      F.push({ root, path: path.slice(), msg: `Trie с ${ws.length} думи и ${id} възела. Търсим „${query}“ символ по символ.` });
      let n = root, ok = true;
      for (let i = 0; i < query.length; i++) {
        const c = query[i];
        if (!n.kids[c]) { ok = false; F.push({ root, path: path.slice(), miss: true, msg: `Няма ребро „${c}“ — „${query}“ не е нито дума, нито префикс.` }); break; }
        n = n.kids[c]; path.push(n.id);
        F.push({ root, path: path.slice(), msg: `„${query.slice(0, i + 1)}“ — ребро „${c}“.` });
      }
      if (ok) {
        const under = []; (function col(x, pre) { if (x.end) under.push(pre); Object.keys(x.kids).sort().forEach((c) => col(x.kids[c], pre + c)); })(n, query);
        F.push({ root, path, hit: n.end, done: true, msg: n.end ? `„${query}“ е <b>записан ключ</b> (маркер за край). Думи с този префикс: ${under.join(", ")}.` : `„${query}“ е път/префикс, но <b>не е записан ключ</b> — няма маркер за край. Думи с този префикс: ${under.join(", ") || "—"}.` });
      }
      return { frames: F, nodes: id, isWord: ok && n.end };
    },
  };

  /* ---------- рисуване ---------- */
  function drawHeap(st, f) {
    st.innerHTML = "";
    const row = h("div", { class: "t4row" });
    const tb = h("div", { class: "t4scroll" });
    const top = {}; f.a.forEach((_, i) => (top[i] = "[" + i + "]"));
    T4.tree(tb, heapTree(f.a), { cls: f.cls, top, emptyText: "Празна пирамида." });
    const ab = h("div", { class: "t4col t4scroll", style: { flex: "1 1 280px" } }, h("span", { class: "t4cap", text: "масив (деца на i: 2i+1, 2i+2)" }));
    S.drawArray(ab, f.a.length ? f.a : [null], { cls: f.a.length ? f.cls : { 0: "s-dim" }, append: true });
    ab.append(h("div", { class: "t4out" }, h("span", { class: "muted", text: "изведени:" }), ...(f.out.length ? f.out.map((x) => h("span", { class: "pill " + (x === "E" ? "s-swap" : "s-done"), text: x })) : [h("span", { class: "muted", text: "—" })])));
    row.append(tb, ab);
    st.append(row);
  }

  function drawAvl(st, f) {
    st.innerHTML = "";
    const cls = {}, top = {};
    (function w(t) { if (!t) return; const b = (t.l ? t.l.h : -1) - (t.r ? t.r.h : -1); top[t.id] = (b > 0 ? "+" : "") + b; if (Math.abs(b) > 1) cls[t.id] = "s-swap"; w(t.l); w(t.r); })(f.root);
    if (f.cur != null) cls[f.cur] = f.rotated ? "s-done" : cls[f.cur] || "s-act";
    const tb = h("div", { class: "t4scroll" });
    T4.tree(tb, f.root, { cls, top, emptyText: "Празно дърво." });
    st.append(tb);
  }

  function drawTrie(st, f) {
    st.innerHTML = "";
    const conv = (n) => { const ks = Object.keys(n.kids).sort(); return { id: n.id, key: n.ch || "·", end: n.end, kids: ks.map((c) => conv(n.kids[c])) }; };
    const T = conv(f.root);
    // общо дърво: рисуваме по листа
    let x = 0; const pos = {}; let maxD = 0;
    (function lay(n, d) { maxD = Math.max(maxD, d); if (!n.kids.length) { pos[n.id] = { x: x++, d }; return; } n.kids.forEach((c) => lay(c, d + 1)); const xs = n.kids.map((c) => pos[c.id].x); pos[n.id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, d }; })(T, 0);
    const dx = 40, dy = 50, R = 15, W = Math.max(x, 1) * dx + 40, H = maxD * dy + 50;
    const sv = S.svg, svg = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, style: "max-width:none" });
    const P = (id) => ({ x: 20 + R + pos[id].x * dx, y: 20 + pos[id].d * dy });
    const onPath = new Set(f.path);
    (function e(n) { n.kids.forEach((c) => { const a = P(n.id), b = P(c.id); svg.append(sv("line", { x1: a.x, y1: a.y + R, x2: b.x, y2: b.y - R, class: "edge " + (onPath.has(c.id) ? "s-cmp" : "") })); e(c); }); })(T);
    (function d(n) {
      const p = P(n.id);
      let cls = onPath.has(n.id) ? "s-cmp" : "";
      if (f.done && n.id === f.path[f.path.length - 1]) cls = f.hit ? "s-done" : "s-swap";
      const g = sv("g", { class: "node " + cls });
      g.append(sv("circle", { cx: p.x, cy: p.y, r: R, style: n.end ? "stroke-width:4" : "" }));
      g.append(sv("text", { x: p.x, y: p.y + 4.5, "text-anchor": "middle", style: "font-weight:600", text: n.key }));
      svg.append(g);
      n.kids.forEach(d);
    })(T);
    const tb = h("div", { class: "t4scroll" }); tb.append(svg);
    st.append(tb, h("p", { class: "muted", style: { fontSize: ".8rem" }, text: "Удебелен кръг = маркер за край на дума. Символът е този на влизащото ребро; коренът „·“ е празният префикс." }));
  }

  // статични схеми: red-black, B, B+
  function rbFigure(host) {
    // валиден пример: 20(B) 10(B) 30(R) 25(B) 40(B) 5(R) — черни височини еднакви
    const T = { id: 0, key: 20, l: { id: 1, key: 10, l: { id: 5, key: 5, l: null, r: null }, r: null }, r: { id: 2, key: 30, l: { id: 3, key: 25, l: null, r: null }, r: { id: 4, key: 40, l: null, r: null } } };
    const color = { 0: "B", 1: "B", 2: "R", 3: "B", 4: "B", 5: "R" };
    const cls = {}; for (const k in color) cls[k] = color[k] === "R" ? "s-swap" : "";
    T4.tree(host, T, { cls, label: (n) => n.key + color[n.id], nulls: true });
  }
  function bFigure(host, plus) {
    const sv = S.svg, W = 560, H = plus ? 150 : 140;
    const svg = sv("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, style: "max-width:100%;height:auto" });
    const box = (x, y, keys, cls) => { const w = keys.length * 34 + 6; const g = sv("g", { class: "node lnode " + (cls || "") }); g.append(sv("rect", { x, y, width: w, height: 30, rx: 4 })); keys.forEach((k, i) => { if (i) g.append(sv("line", { x1: x + 3 + i * 34, y1: y, x2: x + 3 + i * 34, y2: y + 30, class: "div" })); g.append(sv("text", { x: x + 20 + i * 34, y: y + 20, "text-anchor": "middle", text: k })); }); svg.append(g); return { x, w }; };
    const top = box(230, 10, ["20", "40"], "s-piv");
    const leaves = plus ? [["5", "12", "17"], ["20", "27", "33"], ["40", "51", "66"]] : [["5", "12", "17"], ["25", "33"], ["51", "66"]];
    const xs = [40, 220, 400];
    leaves.forEach((k, i) => {
      const b = box(xs[i], 95, k);
      svg.append(sv("line", { x1: top.x + 3 + i * 34 + (i ? 0 : 6), y1: 40, x2: b.x + b.w / 2, y2: 95, class: "edge arr" }));
      if (plus && i < 2) { svg.append(sv("line", { x1: b.x + b.w, y1: 110, x2: xs[i + 1] - 2, y2: 110, class: "edge arr" })); svg.append(T4.arrowHead(xs[i + 1], 110, 0)); }
    });
    svg.append(sv("text", { x: 10, y: 30, class: "wt", text: plus ? "вътрешен: разделители" : "вътрешен: ключове-записи" }));
    if (plus) svg.append(sv("text", { x: 10, y: 145, class: "wt", text: "листата пазят записите и са свързани за диапазони" }));
    host.append(svg);
  }

  const html = `
<p class="prose"><span class="extra-tag">извън конспекта</span> Целият раздел е допълнение към основния обхват. По опорния план тези структури се споменават <b>само при въпрос</b>.</p>

<div class="block">
  <h3>Двоична пирамида (heap) — приоритет вместо търсене (схеми 25 и 26)</h3>
  <p class="prose"><dfn data-g="binary heap">Binary heap</dfn> съчетава <dfn data-g="complete binary tree">complete</dfn> форма с heap правило. При <dfn data-g="min-heap">min-heap</dfn> родителят е по-малък или равен на децата; при <dfn data-g="max-heap">max-heap</dfn> е по-голям или равен. Min-heap с масив [2, 7, 4, 10, 9, 8] има минимум 2 в корена, но не е BST: лявото му дете 7 е по-голямо от 2. Правилото за heap не подрежда цялото ляво поддърво преди корена. Heap е честа реализация на <dfn data-g="приоритетна опашка">приоритетна опашка</dfn>.</p>
  <div id="v8-heap"></div>
  <div class="key"><span class="formula">деца на i: 2i+1, 2i+2   peek min: O(1)   push / pop: O(log n)   произволно търсене: O(n)</span></div>
  <details class="trap"><summary>Капан: heap и „heap“ паметта</summary><div>
    <p>Heap тук е структура за приоритети; думата heap при динамично разпределяне на памет назовава друго понятие. Общото име не означава, че malloc използва тази двоична форма. Реална реализация: Python <code>heapq</code> (heapify, heappush, heappop — min-heap API); C++ <code>std::priority_queue</code> е адаптер за приоритетна опашка.</p>
  </div></details>
</div>

<div class="block">
  <h3>AVL дърво и ротации (схеми 21 и 22)</h3>
  <p class="prose"><dfn data-g="avl">AVL</dfn> е BST с допълнително правило: за всеки възел височините на лявото и дясното поддърво се различават най-много с 1. <dfn data-g="balance factor">Balance factor</dfn> = h(left) − h(right) ∈ {−1, 0, +1}, като празно поддърво има височина −1. След добавяне на 30, 20 и 10 при 30 разликата става 2 и трябва дясна <dfn data-g="ротация">ротация</dfn>: 20 става корен, 10 остава вляво, 30 застава вдясно. При 30, 10, 20 възниква случай ляво-дясно: първо лява ротация при 10, след това дясна при 30. Поддържаните AVL операции търсене, вмъкване и изтриване имат най-лоша цена O(log n).</p>
  <div id="v8-avl"></div>
  <details class="hint"><summary>Хинт: ротацията не променя реда</summary><div>
    <p>Ротацията променя връзките, без да променя логическия ред на ключовете: при дясна ротация около y с ляво дете x, дясното поддърво на x (ключове между x и y) става ляво поддърво на y. Симетричният обход преди и след е един и същ — виж го в края на всяко изпълнение.</p>
  </div></details>
</div>

<div class="block">
  <h3>Червено-черно дърво (схема 23)</h3>
  <p class="prose"><dfn data-g="red-black tree">Red-black tree</dfn> също е BST, но използва цветови инварианти: коренът е черен, липсващите <dfn data-g="nil">NIL</dfn> деца са черни, червен възел няма червено дете и всички пътища от даден възел до неговите NIL листа имат еднакъв брой черни възли. Цветът е служебна информация; той не описва стойността на ключа. След добавяне или изтриване може да са нужни преоцветяване и ротации. Тези правила ограничават височината до O(log n), но не изискват AVL разлика най-много 1 при всеки възел. AVL и red-black са различни начини да се поддържа ефективно BST, а не степени на една и съща класификация. В Java <code>java.util.TreeMap</code> е конкретна реализация чрез red-black tree.</p>
  <div class="t4scroll" id="f8-rb"></div>
  <p class="muted">Валиден пример (R = червен, B = черен; ∅ са черните NIL). Всеки път от корена до NIL минава през еднакъв брой черни възли; 30R има само черни деца.</p>
</div>

<div class="block">
  <h3>B-дърво и B+ дърво (схеми 27 и 28)</h3>
  <p class="prose"><dfn data-g="b-tree">B-tree</dfn> е многоразклонено дърво за търсене: един възел съдържа няколко наредени ключа и може да има повече от две деца. Възел [20 | 40] разделя три области: под 20, между 20 и 40 и над 40. Листата са на едно ниво. При <dfn data-g="b+ tree">B+ tree</dfn> вътрешните ключове насочват търсенето, а записите са в листата; равенство с разделителя насочва надясно и не приключва търсенето. Листата са свързани за последователно преминаване: за диапазон 12…27 се намира първият подходящ лист и се продължава. При запълнен възел вмъкване може да предизвика разделяне, <dfn data-g="split">split</dfn> — различно от двоична ротация. Голямото разклоняване намалява броя нива и посетените страници при блоков достъп — затова B-tree индексите са в базите от данни (тема 6).</p>
  <div class="t4mini"><div><span class="t4cap">B-дърво</span><div id="f8-b"></div></div><div><span class="t4cap">B+ дърво</span><div id="f8-bp"></div></div></div>
</div>

<div class="block">
  <h3>Trie — търсене по части от ключа (схема 29)</h3>
  <p class="prose"><dfn data-g="trie">Trie</dfn> организира търсене по части от представянето на ключа. При буквено trie ребрата са символи, а пътят от корена изписва префикс. Крайният маркер показва завършена дума: достигането на префикс не означава автоматично, че той е записан ключ. При постоянна цена за избор на дете търсенето на ключ с дължина L е O(L).</p>
  <div id="v8-trie"></div>
</div>

<div class="block">
  <h3>Хеш таблица и какво да се сравнява между типовете</h3>
  <p class="prose">Хеш таблицата преобразува ключ в позиция и обработва колизии — случаи, когато различни ключове водят към едно място. При подходящи предпоставки средният достъп е близък до константен, но няма обща гаранция за сортиран ред и всяка най-лоша операция. Хешът за структура от данни не е непременно криптографски хеш. <code>std::unordered_map</code> използва хеширане; не е двоично дърво за търсене и няма гаранция за ред.</p>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Структура</th><th>Договор (какво гарантира)</th><th>Не гарантира</th></tr>
    <tr><td>Общо дърво / дърво за израз</td><td>йерархия; зависимости в израза</td><td>наредба по ключ</td></tr>
    <tr><td>BST</td><td>ред между целите поддървета</td><td>малка височина</td></tr>
    <tr><td>AVL / red-black</td><td>BST + O(log n) височина</td><td>една и съща форма за едни и същи ключове</td></tr>
    <tr><td>Heap</td><td>приоритет (минимум/максимум) в корена</td><td>BST ред, бързо произволно търсене</td></tr>
    <tr><td>B / B+</td><td>много ключове в страница, листа на едно ниво</td><td>двоичност</td></tr>
    <tr><td>Trie</td><td>търсене O(L) по символи; общи префикси</td><td>сравнение на целия ключ с разделител</td></tr>
    <tr><td>Хеш таблица</td><td>среден достъп близо до константен при предпоставки</td><td>ред; най-лош случай</td></tr>
  </table></div>
  <p class="prose">Една удобна на вид форма не доказва автоматично правилото на никой от тях. Проверките за празна структура, единствен елемент, препълване, дублиран ключ и коректно освобождаване са част от коректността.</p>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v8-heap"), {
      id: "c8heap", title: "Min-heap в масив", sub: "операции: <code>push x …</code>, <code>pop</code>", code: "ch08_heap",
      inputs: [{ id: "prog", label: "Програма", value: "push 2 7 4 10 9 8, push 1", width: "22em" }],
      presets: [{ label: "push, 3 × pop", values: { prog: "push 5 3 8 1 9 2, pop, pop, pop" } }, { label: "heap sort 9..1", values: { prog: "push 9 8 7 6 5 4 3 2 1, pop, pop, pop, pop, pop, pop, pop, pop, pop" } }],
      random: () => ({ prog: `push ${S.randArray(8, 1, 60).join(" ")}, pop, pop` }),
      legend: [["s-act", "текущ"], ["s-cmp", "сравнява се"], ["s-swap", "размяна"], ["s-done", "на място / минимум"]],
      build: algos.heap, draw: drawHeap,
    });
    S.viz(root.querySelector("#v8-avl"), {
      id: "c8avl", title: "AVL вмъкване", sub: "Над възела — balance factor; червено — нарушение.", code: "ch08_avl",
      inputs: [{ id: "keys", label: "Ключове в реда на вмъкване", value: "30 20 10", width: "18em" }],
      presets: [{ label: "30 10 20 (LR)", values: { keys: "30 10 20" } }, { label: "10 20 30 (RR)", values: { keys: "10 20 30" } }, { label: "10 30 20 (RL)", values: { keys: "10 30 20" } }, { label: "1..7", values: { keys: "1 2 3 4 5 6 7" } }, { label: "смесено", values: { keys: "50 20 70 10 30 25 5 1" } }],
      random: () => ({ keys: [...new Set(S.randArray(10, 1, 99))].join(" ") }),
      legend: [["s-act", "проверява се"], ["s-swap", "|bf| > 1"], ["s-done", "след ротация"]],
      build: algos.avl, draw: drawAvl,
    });
    rbFigure(root.querySelector("#f8-rb"));
    bFigure(root.querySelector("#f8-b"), false);
    bFigure(root.querySelector("#f8-bp"), true);
    S.viz(root.querySelector("#v8-trie"), {
      id: "c8trie", title: "Trie: префикс срещу записан ключ", sub: "Думи с малки латински букви.", code: false,
      inputs: [{ id: "words", label: "Думи", value: "car cat dog", width: "18em" }, { id: "query", label: "търси", value: "ca", width: "7em" }],
      presets: [{ label: "+ ca", values: { words: "car cat dog ca", query: "ca" } }, { label: "липсва", values: { query: "cow" } }],
      legend: [["s-cmp", "път"], ["s-done", "записан ключ"], ["s-swap", "само префикс / липсва"]],
      build: algos.trie, draw: drawTrie,
    });
  }

  S.chapter({ id: "dopalnenie", order: 8, num: "8", group: "Разширение (извън конспекта)", title: "Допълнение: heap, AVL, red-black, B/B+, trie", lead: "Структури, които се споменават само при въпрос: приоритет в корена, балансиране чрез ротации, многоразклонени страници и търсене по символи.", html, mount, algos });
})();
