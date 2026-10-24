/* Раздел 6 — двоично дърво за търсене: търсене, вмъкване, изтриване (3 случая), височина. */
(function () {
  const S = window.Study, h = S.h;

  function parseProg(str, maxOps = 30) {
    const spec = { ins: ["insert"], find: ["search"], del: ["delete", "remove"], min: [], max: [] };
    const parts = String(str).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > maxOps) throw new Error(`Най-много ${maxOps} операции.`);
    let total = 0;
    const ops = parts.map((p) => {
      const t = p.replace(/[()]/g, " ").trim().split(/\s+/);
      const nm = t[0].toLowerCase();
      const key = Object.keys(spec).find((k) => k === nm || spec[k].includes(nm));
      if (!key) throw new Error(`Непозната операция „${t[0]}“. Допустими: ins, find, del, min, max.`);
      const args = t.slice(1).map((x) => { const v = Number(x); if (!Number.isInteger(v) || Math.abs(v) > 999) throw new Error(`„${x}“ в „${p}“ не е цяло число между −999 и 999.`); return v; });
      if ((key === "min" || key === "max") && args.length) throw new Error(`„${key}“ е без аргументи.`);
      if (key !== "min" && key !== "max" && !args.length) throw new Error(`„${key}“ изисква поне един ключ: „${p}“.`);
      total += args.length || 1;
      return { name: key, args, text: p };
    });
    if (total > 60) throw new Error("Най-много 60 ключа общо.");
    return ops;
  }

  const clone = (n) => (n ? { id: n.id, key: n.key, l: clone(n.l), r: clone(n.r) } : null);
  const height = (n) => (n ? 1 + Math.max(height(n.l), height(n.r)) : -1);

  const algos = {
    bst({ prog }) {
      const ops = parseProg(prog);
      let root = null, nid = 1, cmp = 0;
      const out = [], F = [];
      const snap = (o) => F.push(Object.assign({ root: clone(root), out: out.slice(), stats: { сравнения: cmp, височина: height(root) } }, o));
      snap({ msg: "Празно дърво (root = NULL). Политика за равни ключове: дубликат не се вмъква." });
      // връзка към възел: {get,set}
      const rootLink = { get: () => root, set: (v) => (root = v) };
      const childLink = (n, side) => ({ get: () => n[side], set: (v) => (n[side] = v) });

      ops.forEach((op, k) => {
        const log = `${k + 1}. ${op.text}`;
        if (op.name === "min" || op.name === "max") {
          if (!root) { out.push("E"); snap({ at: op.name, msg: `${op.name}: празно дърво.`, log }); return; }
          const side = op.name === "min" ? "l" : "r";
          let r = root; const path = [r.id];
          snap({ at: op.name, cur: r.id, path: path.slice(), msg: `${op.name}: следваме ${side === "l" ? "левите" : "десните"} връзки от корена.`, log });
          while (r[side]) { r = r[side]; path.push(r.id); snap({ at: op.name, cur: r.id, path: path.slice(), msg: `→ ${r.key}` }); }
          out.push(String(r.key));
          snap({ at: op.name, cur: r.id, path, found: r.id, msg: `${op.name === "min" ? "Минимум" : "Максимум"}: <b>${r.key}</b> (няма ${side === "l" ? "ляво" : "дясно"} дете).` });
          return;
        }
        op.args.forEach((key) => {
          if (op.name === "find") {
            let r = root, d = 0; const path = [];
            snap({ at: "s_loop", msg: `find(${key}): тръгваме от корена.`, log: `${op.name} ${key}` });
            while (r) {
              path.push(r.id); cmp++;
              snap({ at: "s_eq", cur: r.id, path: path.slice(), msg: `${key} == ${r.key}? → <b>${key === r.key}</b>.` });
              if (key === r.key) { out.push(String(d)); snap({ at: "s_eq", cur: r.id, path, found: r.id, msg: `Намерено на дълбочина <b>${d}</b> (${path.length} посетени възела).` }); return; }
              cmp++;
              const left = key < r.key;
              snap({ at: left ? "s_left" : "s_right", cur: r.id, path: path.slice(), cut: (left ? r.r : r.l) ? (left ? r.r : r.l).id : null, msg: `${key} &lt; ${r.key}? → <b>${left}</b> ⇒ ${left ? "наляво; цялото дясно поддърво отпада" : "надясно; цялото ляво поддърво отпада"}.` });
              r = left ? r.l : r.r; d++;
            }
            out.push("nf");
            snap({ at: "s_none", path, msg: `Стигнахме NULL → ${key} липсва. Посетени ${path.length} възела ≤ h + 1.` });
          } else if (op.name === "ins") {
            let link = rootLink; const path = [];
            snap({ at: "i_loop", msg: `insert(${key}): същият път като търсенето до празна позиция.`, log: `${op.name} ${key}` });
            while (link.get()) {
              const r = link.get(); path.push(r.id); cmp++;
              if (key === r.key) { out.push("dup"); snap({ at: "i_dup", cur: r.id, path, msg: `${key} вече е в дървото → отказ (политика за дубликати).` }); return; }
              cmp++;
              const left = key < r.key;
              snap({ at: "i_go", cur: r.id, path: path.slice(), msg: `${key} ${left ? "&lt;" : "&gt;"} ${r.key} ⇒ ${left ? "наляво" : "надясно"}.` });
              link = childLink(r, left ? "l" : "r");
            }
            const n = { id: nid++, key, l: null, r: null };
            snap({ at: "i_new", path, msg: `Празна позиция. Нов възел ${key}.` });
            link.set(n);
            snap({ at: "i_link", path, found: n.id, msg: `*link = n. Височина на дървото: ${height(root)}.` });
          } else {
            let link = rootLink; const path = [];
            snap({ at: "d_find", msg: `delete(${key}): намираме възела.`, log: `${op.name} ${key}` });
            while (link.get() && link.get().key !== key) { const r = link.get(); path.push(r.id); cmp += 2; snap({ at: "d_find", cur: r.id, path: path.slice(), msg: `${key} ${key < r.key ? "&lt;" : "&gt;"} ${r.key}.` }); link = childLink(r, key < r.key ? "l" : "r"); }
            if (!link.get()) { out.push("nf"); snap({ at: "d_none", path, msg: `${key} липсва → -1.` }); return; }
            cmp++;
            const x = link.get(); path.push(x.id);
            if (!x.l && !x.r) {
              snap({ at: "d_c0", cur: x.id, del: x.id, path, msg: `<b>Случай 1 — лист.</b> ${key} няма деца.` });
              link.set(null);
              snap({ at: "d_leaf", path, msg: "Откачаме: връзката от родителя става NULL. free." });
            } else if (!x.l || !x.r) {
              const c = x.l || x.r;
              snap({ at: ["d_c1", "d_c0"], cur: x.id, del: x.id, mark: c.id, path, msg: `<b>Случай 2 — едно дете</b> (${c.key}). Детето заема мястото на ${key}; цялото му поддърво се премества нагоре.` });
              link.set(c);
              snap({ at: "d_one", found: c.id, path, msg: "*link = детето. Редът се запазва: цялото поддърво беше от същата страна на родителя." });
            } else {
              snap({ at: ["d_c2", "d_c0", "d_c1"], cur: x.id, del: x.id, path, msg: `<b>Случай 3 — две деца.</b> Търсим симетричния наследник: най-малкия в дясното поддърво.` });
              let s = childLink(x, "r");
              snap({ at: "d_succ0", cur: x.id, mark: s.get().id, del: x.id, msg: `Тръгваме от дясното дете ${s.get().key}.` });
              while (s.get().l) { s = childLink(s.get(), "l"); snap({ at: "d_succ", cur: x.id, mark: s.get().id, del: x.id, msg: `→ наляво: ${s.get().key}.` }); }
              const y = s.get();
              snap({ at: "d_succ", cur: x.id, mark: y.id, del: x.id, msg: `Наследник y = <b>${y.key}</b>: няма ляво дете${y.r ? ", има дясно (" + y.r.key + ")" : ""}.` });
              x.key = y.key;
              snap({ at: "d_copy", cur: x.id, mark: y.id, msg: `Пренасяме ключа: възелът става ${y.key}. Сега има два възела ${y.key} — старият трябва да се премахне.` });
              s.set(y.r);
              snap({ at: "d_unlink", found: x.id, msg: `Откачаме y от старото му място (*s = y->right). y имаше най-много едно дете — случай 1 или 2.` });
            }
            snap({ at: "d_free", msg: `free. Симетричният обход остава нареден; височина: ${height(root)}.` });
          }
        });
      });
      const ino = [], pre = [];
      (function a(n) { if (!n) return; a(n.l); ino.push(n.key); a(n.r); })(root);
      (function b(n) { if (!n) return; pre.push(n.key); b(n.l); b(n.r); })(root);
      snap({ done: true, msg: `Край. Симетричен обход: <b>${ino.join(" ") || "—"}</b>. Височина ${height(root)}, сравнения ${cmp}.` });
      return { frames: F, out: out.join(" ") || "-", in: ino.join(" ") || "-", pre: pre.join(" ") || "-", height: height(root), cmp };
    },

    /** Балансирано срещу изродено — едни и същи ключове в различен ред. */
    shapes({ keys, find }) {
      const ks = S.parseNums(keys, { minLen: 1, maxLen: 31, min: -999, max: 999 });
      if (new Set(ks).size !== ks.length) throw new Error("Ключовете трябва да са различни.");
      find = S.int(find, -999, 999, "Търсеният ключ");
      const ins = (t, k, id) => { if (!t) return { id, key: k, l: null, r: null }; if (k < t.key) t.l = ins(t.l, k, id); else t.r = ins(t.r, k, id); return t; };
      let A = null; ks.forEach((k, i) => (A = ins(A, k, i)));
      const sorted = ks.slice().sort((a, b) => a - b);
      let B = null, id = 100;
      (function bal(lo, hi) { if (lo > hi) return; const m = lo + ((hi - lo) >> 1); B = ins(B, sorted[m], id++); bal(lo, m - 1); bal(m + 1, hi); })(0, sorted.length - 1);
      const path = (t) => { const p = []; while (t) { p.push(t.id); if (find === t.key) break; t = find < t.key ? t.l : t.r; } return p; };
      const pA = path(A), pB = path(B);
      const n = ks.length;
      return { frames: [{ A, B, pA, pB, msg: `n = ${n}. В реда на въвеждане: височина <b>${height(A)}</b>, търсенето на ${find} посещава ${pA.length} възела. Балансирано (средата първа): височина <b>${height(B)}</b> = ⌊log₂ n⌋ = ${Math.floor(Math.log2(n))}, посещава ${pB.length}. Симетричният ред е един и същ.` }], hA: height(A), hB: height(B), vA: pA.length, vB: pB.length };
    },
  };

  /* ---------- рисуване ---------- */
  function drawBst(st, f) {
    st.innerHTML = "";
    const cls = {}, edge = {};
    (f.path || []).forEach((id) => { cls[id] = "s-cmp"; edge[id] = "s-cmp"; });
    if (f.cut != null) (function dim(n) { if (!n) return; cls[n.id] = "s-dim"; dim(n.l); dim(n.r); })(find(f.root, f.cut));
    if (f.mark != null) cls[f.mark] = "s-piv";
    if (f.del != null) cls[f.del] = "s-swap";
    if (f.cur != null && f.cur !== f.del) cls[f.cur] = "s-act";
    if (f.found != null) cls[f.found] = "s-done";
    const tb = h("div", { class: "t4scroll" });
    T4.tree(tb, f.root, { cls, edge, emptyText: "Празно дърво (root = NULL)." });
    st.append(tb);
    st.append(h("div", { class: "t4out" }, h("span", { class: "muted", text: "изход (find → дълбочина):" }), ...(f.out.length ? f.out.map((x) => h("span", { class: "pill " + (x === "nf" || x === "dup" || x === "E" ? "s-swap" : ""), text: x })) : [h("span", { class: "muted", text: "—" })])));
  }
  function find(n, id) { if (!n) return null; if (n.id === id) return n; return find(n.l, id) || find(n.r, id); }

  function drawShapes(st, f) {
    st.innerHTML = "";
    const g = h("div", { class: "t4mini" });
    const one = (title, t, p) => {
      const c = h("div", { class: "t4col" }, h("span", { class: "t4cap", text: `${title} · височина ${height(t)}` }));
      const cls = {}, edge = {}; p.forEach((id) => { cls[id] = "s-cmp"; edge[id] = "s-cmp"; });
      if (p.length) cls[p[p.length - 1]] = "s-done";
      const b = h("div", { class: "t4scroll" }); T4.tree(b, t, { cls, edge, dx: 34, dy: 40, r: 14 }); c.append(b);
      return c;
    };
    g.append(one("в реда на въвеждане", f.A, f.pA), one("балансирано (средата първа)", f.B, f.pB));
    st.append(g);
  }

  const html = `
<div class="prose">
  <p>Двоичното дърво за търсене, <dfn data-g="bst">BST</dfn>, добавя инвариант: ключовете в лявото поддърво са по-малки, а в дясното — по-големи от ключа във възела. За равни ключове е нужна изрична политика, например брояч или отделни записи; тук дубликатът се отказва. Не е достатъчно да се сравняват само непосредствените деца — свойството важи за целите поддървета.</p>
  <p>Търсенето сравнява ключа с текущия възел и продължава само в съответното поддърво. Вмъкването следва същия път до празна позиция. Времето е O(h). При балансирана височина h = O(log n) операциите са логаритмични; при изродено дърво h = n − 1 и най-лошата цена е O(n).</p>
</div>

<div class="block">
  <h3>Търсене, вмъкване, изтриване — свои операции (схеми 17 и 18)</h3>
  <p class="prose">Въведи програма, напр. <code>ins 4 2 6 1 3, find 3, del 2</code>. При търсене пътят е оранжев, а отхвърленото поддърво посивява — инвариантът позволява да се изключи цяло поддърво. Кодът вдясно/долу съдържа всички операции; подсветката прескача към изпълняваната функция.</p>
  <div id="v6-bst"></div>
  <div class="key"><span class="formula">търсене / вмъкване / изтриване: O(h)      h ∈ [⌊log₂ n⌋, n − 1]</span><br>Изтриване: <b>1)</b> лист — откачаме; <b>2)</b> едно дете — детето заема мястото; <b>3)</b> две деца — пренасяме ключа на симетричния наследник (най-малкия в дясното поддърво) и премахваме наследника от старото му място (той има най-много едно дете).</div>
  <details class="hint"><summary>Хинт: защо симетричният наследник няма ляво дете</summary><div>
    <p>Той е <b>най-малкият</b> в дясното поддърво — намира се, като се тръгне надясно веднъж и после само наляво докато може. Ако имаше ляво дете, то щеше да е по-малко от него и пак в дясното поддърво — противоречие. Затова премахването му от старата позиция е случай 1 или 2. Може да се използва и симетричният предшественик (най-големият в лявото поддърво).</p>
    <p>Не трябва да се изтрие произволен лист: възстановената структура трябва да пази реда на всички поддървета. Пренасянето на ключ и полезен запис трябва да следва договора на реализацията (ако други указатели сочат към възела, пренасянето на стойността може да ги обърка).</p>
  </div></details>
  <details class="trap"><summary>Капан: проверка само на непосредствените деца</summary><div>
    <p>Дървото с корен 5, ляво дете 3 и дясно дете на 3 със стойност 8 (<code>5 3 - - 8</code> по нива) удовлетворява „ляво дете &lt; родител &lt; дясно дете“ за всеки възел поотделно, но 8 е в лявото поддърво на 5. Търсенето на 8 тръгва надясно от 5 и не го намира. Инвариантът е за целите поддървета.</p>
  </div></details>
</div>

<div class="block">
  <h3>Едни и същи ключове — различна височина (схеми 19 и 20)</h3>
  <p class="prose">При обикновено BST последователността на вмъкване има значение. Ключовете 1, 2, 3, 4, 5, 6, 7, добавени в този ред без балансиране, образуват дясна верига с височина 6. Последователността 4, 2, 6, 1, 3, 5, 7 дава височина 2. В двете дървета има едни и същи седем ключа и един и същ симетричен ред. Търсенето на 7 във веригата посещава седем възела, а в другото дърво следва 4 → 6 → 7, тоест три. Това е конкретният смисъл на зависимостта O(h).</p>
  <div id="v6-sh"></div>
  <details class="trap"><summary>Капан: „BST дава O(log n)“ и „сортиран обход = балансирано“</summary><div>
    <p>Самото BST правило не гарантира малка височина. Една верига може да е правилно BST и да даде сортиран обход, но да има линейна височина. Обратно, малка височина не доказва BST правило: произволно разместени ключове могат да имат същата добре разклонена форма.</p>
    <p>Пълно, съвършено и балансирано дърво са различни понятия и не трябва да се използват като синоними. „Двоично“ ограничава броя деца, BST задава ред на ключовете, а балансът ограничава формата или височината. AVL и червено-черните дървета ограничават височината чрез допълнителни правила и ротации — <a href="#dopalnenie">раздел 8</a>.</p>
  </div></details>
  <details class="hint"><summary>Хинт: std::map</summary><div>
    <p><code>std::map</code> е нареден асоциативен контейнер с гаранции за логаритмични основни операции. Често се реализира чрез червено-черно дърво, но стандартният интерфейс не задължава конкретно това вътрешно дърво.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v6-bst"), {
      id: "c6bst", title: "Двоично дърво за търсене", sub: "операции: <code>ins k …</code>, <code>find k …</code>, <code>del k …</code>, <code>min</code>, <code>max</code>",
      code: "ch06_bst",
      inputs: [
        { id: "prog", label: "Програма", value: "ins 4 2 6 1 3, find 3, find 5", width: "26em" },
      ],
      presets: [
        { label: "трите случая на изтриване", values: { prog: "ins 50 30 70 20 40 60 80, del 20, del 30, del 50" } },
        { label: "наследник с дясно дете", values: { prog: "ins 8 3 10 1 6 14 4 7 13, del 3, del 8, min, max, ins 6" } },
        { label: "изродено 1..7", values: { prog: "ins 1 2 3 4 5 6 7, find 7" } },
      ],
      random: () => { const k = [...new Set(S.randArray(9, 1, 60))]; return { prog: `ins ${k.join(" ")}, find ${k[S.randInt(0, k.length - 1)]}, del ${k[0]}, del ${k[S.randInt(1, k.length - 1)]}` }; },
      legend: [["s-act", "текущ"], ["s-cmp", "път"], ["s-dim", "отхвърлено поддърво"], ["s-swap", "изтрива се"], ["s-piv", "наследник / дете"], ["s-done", "намерен / нов"]],
      build: algos.bst, draw: drawBst,
    });
    S.viz(root.querySelector("#v6-sh"), {
      id: "c6sh", title: "Ред на вмъкване и височина", sub: "Вляво — ключовете в реда на въвеждане; вдясно — същите ключове, вмъкнати балансирано.", code: false,
      inputs: [{ id: "keys", label: "Ключове (различни)", value: "1 2 3 4 5 6 7", width: "18em" }, { id: "find", label: "търси", type: "number", value: 7, width: "5em" }],
      presets: [{ label: "4 2 6 1 3 5 7", values: { keys: "4 2 6 1 3 5 7" } }, { label: "15 нарастващи", values: { keys: "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15", find: 15 } }],
      random: () => { const k = [...new Set(S.randArray(12, 1, 99))]; return { keys: k.join(" "), find: k[S.randInt(0, k.length - 1)] }; },
      legend: [["s-cmp", "път на търсене"], ["s-done", "намерен"]],
      build: algos.shapes, draw: drawShapes,
    });
  }

  S.chapter({ id: "bst", order: 6, num: "6", group: "Дървета", title: "Двоично дърво за търсене", lead: "BST инвариантът за целите поддървета; търсене и вмъкване по един път; трите случая на изтриване; O(h), а не винаги O(log n).", html, mount, algos });
})();
