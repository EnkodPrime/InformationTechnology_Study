/* Раздел 6 — логическо представяне на знания: валидност по таблица на истинност, modus ponens, отворен/затворен свят. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- формули: P Q R S, ! & | -> и скоби; приоритет ! > & > | > -> ---------- */
  function compile(src) {
    const s = String(src).replace(/→/g, "->").replace(/¬/g, "!").replace(/∧/g, "&").replace(/∨/g, "|");
    if (!s.trim()) throw new Error("Празна формула.");
    let p = 0;
    const ws = () => { while (s[p] === " ") p++; };
    function atom() {
      ws();
      if (s[p] === "!") { p++; const a = atom(); return (v) => !a(v); }
      if (s[p] === "(") { p++; const e = imp(); ws(); if (s[p] !== ")") throw new Error(`Липсва „)“ във „${src}“.`); p++; return e; }
      const k = "PQRS".indexOf(s[p]);
      if (k < 0 || !s[p]) throw new Error(`„${s[p] || "край"}“ във „${src}“: допустими са P Q R S ! & | -> ( ).`);
      p++;
      return (v) => v[k];
    }
    function conj() { let a = atom(); for (ws(); s[p] === "&"; ws()) { p++; const l = a, r = atom(); a = (v) => l(v) && r(v); } return a; }
    function disj() { let a = conj(); for (ws(); s[p] === "|"; ws()) { p++; const l = a, r = conj(); a = (v) => l(v) || r(v); } return a; }
    function imp() { const a = disj(); ws(); if (s[p] === "-" && s[p + 1] === ">") { p += 2; const b = imp(); return (v) => !a(v) || b(v); } return a; }
    const f = imp();
    ws();
    if (p < s.length) throw new Error(`Излишен текст „${s.slice(p)}“ във „${src}“.`);
    return f;
  }
  const usedVars = (strs) => { let m = 0; strs.forEach((x) => { for (const c of x) { const k = "PQRS".indexOf(c); if (k >= 0) m = Math.max(m, k + 1); } }); return Math.max(1, m); };

  /* ---------- чисти функции ---------- */
  const algos = {
    /** valid() от 06_logic.c */
    valid({ prem, concl }) {
      const P = String(prem).split(/[;,]/).map((x) => x.trim()).filter(Boolean);
      if (!P.length) throw new Error("Въведи поне една предпоставка (разделени с ;).");
      if (P.length > 4) throw new Error("Най-много 4 предпоставки.");
      const fp = P.map(compile), fc = compile(concl);
      const nv = usedVars([...P, concl]);
      const rows = [], F = [];
      let nrows = 0, models = 0, counter = 0, first = -1;
      const st = () => ({ редове: nrows, "модели на предпоставките": models, контрапримери: counter });
      const push = (o) => F.push(Object.assign({ rows: rows.map((r) => Object.assign({}, r)), P, concl, nv, stats: st() }, o));
      for (let a = 0; a < 1 << nv; a++) {
        const v = []; for (let k = 0; k < nv; k++) v[k] = !!((a >> (nv - 1 - k)) & 1);
        nrows++;
        const pv = fp.map((f) => f(v)), all = pv.every(Boolean);
        const row = { a, v, pv, all, c: null, kind: "" };
        rows.push(row);
        push({ at: ["row", "prem"], cur: a, vars: { ред: a, ...Object.fromEntries(v.map((x, k) => ["PQRS"[k], x ? 1 : 0])) }, msg: `Ред ${a + 1}: предпоставки ${pv.map((x) => (x ? "И" : "Л")).join(", ")}.` });
        if (!all) { row.kind = "skip"; push({ at: "skip", cur: a, msg: "Не всички предпоставки са верни — редът не може да опровергае извода.", vars: {} }); continue; }
        models++;
        row.c = fc(v);
        if (row.c) { row.kind = "ok"; push({ at: "concl", cur: a, vars: { заключение: 1 }, msg: "Всички предпоставки са верни и заключението е вярно.", log: `ред ${a + 1}: ✓` }); }
        else { counter++; if (first < 0) first = a; row.kind = "cex"; push({ at: ["cex", "concl"], cur: a, vars: { заключение: 0 }, msg: `<b>Контрапример</b>: всички предпоставки са верни, а заключението — не.`, log: `ред ${a + 1}: ✗ контрапример` }); }
      }
      const ok = counter === 0;
      push({ at: "ret", done: true, vars: { return: ok ? 1 : 0 }, inv: { text: ok ? "изводът е валиден: няма контрапример" : `невалиден: ${counter} контрапример${counter > 1 ? "а" : ""}`, ok }, msg: ok ? `Във всички ${models} реда, където предпоставките са верни, заключението също е вярно ⇒ <b>валиден</b> извод.` : `Има ред, в който предпоставките са верни, а заключението — не ⇒ <b>невалиден</b> извод.` });
      return { frames: F, valid: ok ? 1 : 0, rows: nrows, models, counter, first };
    },

    /** query() от 06_logic.c: 1 — да, 0 — не, 2 — неизвестно */
    query({ known, neg, fact, closed }) {
      const K = String(known).split(/[\s,;]+/).filter(Boolean), N = String(neg).split(/[\s,;]+/).filter(Boolean);
      const q = String(fact).trim();
      if (!q) throw new Error("Въведи факт за заявката.");
      const F = [];
      const cw = closed === true || closed === "1";
      const fr = (o) => F.push(Object.assign({ K, N, q, cw }, o));
      for (const k of K) if (k === q) { fr({ at: "yes", res: 1, msg: `„${q}“ е записан като верен ⇒ <b>да</b>.` }); return { frames: F, result: 1 }; }
      for (const k of N) if (k === q) { fr({ at: "no", res: 0, msg: `„${q}“ е записан <b>изрично</b> като неверен ⇒ <b>не</b> (и в двата модела).` }); return { frames: F, result: 0 }; }
      if (cw) { fr({ at: "cwa", res: 0, msg: `„${q}“ липсва. При <dfn data-g="затворен свят">затворен свят</dfn> липсата се приема за <b>не</b>.` }); return { frames: F, result: 0 }; }
      fr({ at: "owa", res: 2, msg: `„${q}“ липсва. При <dfn data-g="отворен свят">отворен свят</dfn> липсата <b>не доказва</b> отрицание ⇒ <b>неизвестно</b>.` });
      return { frames: F, result: 2 };
    },

    /** предикатен пример: ∀x Student(x) → Person(x) — едно прилагане на правилото към всеки обект */
    predicate({ facts }) {
      const objs = String(facts).split(/[\s,;]+/).filter(Boolean);
      if (objs.length > 10) throw new Error("Най-много 10 факта.");
      const F = [], derived = [];
      F.push({ objs, derived: [], msg: "Правило: ∀x Student(x) → Person(x). Факти: " + objs.map((o) => `Student(${S.esc(o)})`).join(", ") });
      objs.forEach((o) => { if (!/^[A-Za-zА-Яа-я]{1,12}$/.test(o)) throw new Error(`„${o}“: име от букви.`); derived.push(o); F.push({ objs, derived: derived.slice(), cur: o, msg: `x := ${o}. Student(${o}) е факт и Student(${o}) → Person(${o}) е частен случай на правилото ⇒ по <dfn data-g="modus ponens">modus ponens</dfn>: <b>Person(${o})</b>.` }); });
      return { frames: F, derived };
    },
  };

  /* ---------- рисуване ---------- */
  function drawTT(st, f) {
    st.innerHTML = "";
    const V = "PQRS".slice(0, f.nv).split("");
    const t = h("table", { class: "t grid" }, h("tr", null, ...V.map((x) => h("th", { text: x })), ...f.P.map((p) => h("th", { text: p })), h("th", { text: "⇒ " + f.concl }), h("th", { text: "" })));
    for (let a = 0; a < 1 << f.nv; a++) {
      const r = f.rows[a];
      const tr = h("tr", null);
      if (!r) { V.forEach((_, k) => tr.append(h("td", { class: "s-dim", text: (a >> (f.nv - 1 - k)) & 1 }))); f.P.forEach(() => tr.append(h("td", { class: "s-dim", text: "" }))); tr.append(h("td", { class: "s-dim" }), h("td", { class: "s-dim" })); t.append(tr); continue; }
      const cur = a === f.cur;
      r.v.forEach((x) => tr.append(h("td", { class: cur ? "s-act" : "", text: x ? 1 : 0 })));
      r.pv.forEach((x) => tr.append(h("td", { class: x ? "s-done" : "s-dim", text: x ? "И" : "Л" })));
      tr.append(h("td", { class: r.kind === "cex" ? "s-swap" : r.kind === "ok" ? "s-done" : "s-dim", text: r.c == null ? "—" : r.c ? "И" : "Л" }));
      tr.append(h("td", { style: { fontFamily: "var(--f-body)", textAlign: "left" }, text: r.kind === "cex" ? "контрапример" : r.kind === "ok" ? "модел ✓" : "не е модел" }));
      t.append(tr);
    }
    st.append(h("div", { class: "tbl-wrap" }, t));
  }
  function drawWorld(st, f) {
    st.innerHTML = "";
    const lab = { 1: ["s-done", "ДА"], 0: ["s-swap", "НЕ"], 2: ["s-cmp", "НЕИЗВЕСТНО"] };
    const box = h("div", { class: "split" });
    box.append(h("div", { class: "card" }, h("span", { class: "eyebrow", text: "записано като вярно" }), h("p", null, ...f.K.map((k) => h("span", { class: "pill " + (k === f.q ? "s-act" : ""), style: { margin: "2px" }, text: k })))),
      h("div", { class: "card" }, h("span", { class: "eyebrow", text: "записано като невярно" }), h("p", null, ...(f.N.length ? f.N.map((k) => h("span", { class: "pill " + (k === f.q ? "s-act" : ""), style: { margin: "2px" }, text: "¬" + k })) : [h("span", { class: "muted", text: "няма" })]))));
    st.append(box, h("p", { style: { fontSize: "1.1rem", marginTop: "8px" } }, `${f.cw ? "Затворен" : "Отворен"} свят: „${f.q}“? `, h("span", { class: "pill " + lab[f.res][0], text: lab[f.res][1] })));
  }
  function drawPred(st, f) {
    st.innerHTML = "";
    const t = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "x" }), h("th", { text: "Student(x)" }), h("th", { text: "Person(x)" })));
    f.objs.forEach((o) => t.append(h("tr", null, h("td", { class: o === f.cur ? "s-act" : "", text: o }), h("td", { class: "s-piv", text: "факт" }), h("td", { class: f.derived.includes(o) ? "s-done" : "s-dim", text: f.derived.includes(o) ? "изведено" : "?" }))));
    st.append(h("div", { class: "tbl-wrap" }, t));
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="представяне на знания">Представянето на знания</dfn> определя как факти и зависимости се кодират с ясна семантика и възможност за извод. Изразителността и цената на обработване трябва да се съгласуват: по-богатият език може да усложни доказването. Свободният текст не е автоматично формална <dfn data-g="база от знания">база от знания</dfn>.</p>
</div>

<div class="block">
  <h3>Схема 11 — съждения, предикати и правило за извод</h3>
  <div class="split">
    <div class="card"><h4><dfn data-g="логика на съжденията">Логика на съжденията</dfn></h4><p>Атомни твърдения и операции И, ИЛИ, НЕ. „Вали“ е едно цяло твърдение P — без вътрешна структура.</p></div>
    <div class="card"><h4><dfn data-g="предикатна логика">Предикатна логика</dfn></h4><p>Добавя обекти, свойства, отношения, променливи и квантори: ∀x Student(x) → Person(x). Едно правило покрива всички обекти.</p></div>
  </div>
  <div id="v6-pred"></div>
  <div class="key"><dfn data-g="modus ponens">Modus ponens</dfn>: от P и P → Q следва Q.<br><dfn data-g="коректност на извода">Коректност</dfn>: правилата не извеждат невалидни следствия. <dfn data-g="пълнота на извода">Пълнота</dfn>: могат да се изведат всички логически следствия. Нито едното не е синоним на бързина.</div>
  <details class="trap"><summary>Капан: валиден извод ≠ вярно заключение в света</summary><div>
    <p>Изводът Student(Ana), ∀x Student(x) → Person(x) ⊢ Person(Ana) е валиден <b>по формата си</b>. Дали първоначалният факт за Ana е верен в света е отделен въпрос за знанието. Коректният извод запазва истинността при верни предпоставки, но не доказва самите предпоставки.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 12 — валиден извод и обърната импликация</h3>
  <p class="prose">Изводът е валиден, ако във <b>всеки</b> ред, където всички предпоставки са верни, и заключението е вярно. Програмата обхожда таблицата на истинност и търси контрапример. Пробвай „потвърждаване на следствието“: „ако вали (P), настилката е мокра (Q)“ и „настилката е мокра“ — следва ли „вали“?</p>
  <div id="v6-tt"></div>
  <details class="hint"><summary>Хинт: как се чете контрапримерът</summary><div>
    <p>При „потвърждаване на следствието“ контрапримерът е P = 0, Q = 1: не вали, но настилката е мокра (измита е). Материалната импликация P → Q е вярна, Q е вярно, а P — не. Формалната импликация не осигурява обратната посока. Посоката е съществена, както при сводимостите в тема 5.</p>
  </div></details>
  <details class="trap"><summary>Капан: импликацията като причинност</summary><div>
    <p>Материалната импликация P → Q не твърди автоматично причинност. Тя е невярна само когато P е вярно, а Q — не. Затова „ако 2 + 2 = 5, то Луната е от сирене“ е вярна импликация.</p>
  </div></details>
</div>

<div class="block">
  <h3>Отворен и затворен свят</h3>
  <p class="prose">При <dfn data-g="отворен свят">отворен свят</dfn> липсата на факт не доказва неговото отрицание. При <dfn data-g="затворен свят">затворен свят</dfn> липсващият факт се приема за невярно твърдение в зададения контекст. Изборът променя резултатите от извода и трябва да е определен <b>предварително</b>.</p>
  <div id="v6-world"></div>
  <details class="trap"><summary>Капан: „не е потвърден“ = „доказано не е“</summary><div>
    <p>Ако системата не знае дали документ е подаден, „не е потвърден“ и „доказано не е подаден“ са различни състояния с различни последствия. Базата може да е непълна. Затвореният свят е удобен за справочник (влак, който не е в разписанието, не тръгва), но опасен, когато данните са непълни.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v6-pred"), {
      id: "c6p", title: "∀x Student(x) → Person(x)", code: false,
      inputs: [{ id: "facts", label: "Student(…) за", value: "Ana Ivan", width: "14em" }],
      build: algos.predicate, draw: drawPred, speed: 0,
    });
    S.viz(root.querySelector("#v6-tt"), {
      id: "c6t", title: "Проверка на валидност по таблица на истинност", sub: "Променливи P Q R S; операции ! & | -> (или ¬ ∧ ∨ →). Предпоставките се разделят с „;“.",
      code: "ch06_valid",
      inputs: [
        { id: "prem", label: "Предпоставки", value: "P; P -> Q", width: "16em" },
        { id: "concl", label: "Заключение", value: "Q", width: "8em" },
      ],
      presets: [
        { label: "modus ponens", values: { prem: "P; P -> Q", concl: "Q" } },
        { label: "потвърждаване на следствието", values: { prem: "Q; P -> Q", concl: "P" } },
        { label: "modus tollens", values: { prem: "!Q; P -> Q", concl: "!P" } },
        { label: "отричане на предпоставката", values: { prem: "!P; P -> Q", concl: "!Q" } },
        { label: "верига", values: { prem: "P -> Q; Q -> R", concl: "P -> R" } },
        { label: "дизюнктивен силогизъм", values: { prem: "P | Q; !P", concl: "Q" } },
      ],
      legend: [["s-act", "текущ ред"], ["s-done", "вярно / модел"], ["s-swap", "контрапример"], ["s-dim", "не е модел"]],
      build: algos.valid, draw: drawTT, speed: 1,
    });
    S.viz(root.querySelector("#v6-world"), {
      id: "c6w", title: "Заявка към база от факти", code: "ch06_world",
      inputs: [
        { id: "known", label: "верни факти", value: "подаден(doc1)", width: "14em" },
        { id: "neg", label: "изрично неверни", value: "подаден(doc3)", width: "14em" },
        { id: "fact", label: "заявка", value: "подаден(doc2)", width: "12em" },
        { id: "closed", label: "затворен свят", type: "checkbox", value: false },
      ],
      presets: [{ label: "doc1", values: { fact: "подаден(doc1)" } }, { label: "doc2", values: { fact: "подаден(doc2)" } }, { label: "doc3", values: { fact: "подаден(doc3)" } }],
      build: algos.query, draw: drawWorld,
    });
  }

  S.chapter({ id: "logika", order: 6, num: "6", group: "Представяне на знания", title: "Логическо представяне на знания",
    lead: "Съждения и предикати, modus ponens, валидност чрез търсене на контрапример, обърнатата импликация и разликата между отворен и затворен свят.", html, mount, algos });
})();
