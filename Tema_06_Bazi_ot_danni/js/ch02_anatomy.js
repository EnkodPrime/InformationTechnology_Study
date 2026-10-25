/* Раздел 2 — допълнение: анатомия на релацията.
   T6.anatomy(host): речник на съответствията, интерактивна таблица с подсветка на всяко понятие,
   релацията като подмножество на декартовото произведение на домейните и проверка на домейн. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "схема на релация": { cat: "Релационен модел", t: "Схема на релация", en: "Relation schema (heading)", d: "Името на релацията и множеството от двойки атрибут : домейн. Записва се R(A₁:D₁, …, Aₙ:Dₙ).", more: "Схемата е постоянна; съдържанието (множеството кортежи) се променя. В SQL схемата се задава с CREATE TABLE." },
    "степен на релация": { cat: "Релационен модел", t: "Степен (арност)", en: "Degree, arity", d: "Броят на атрибутите в схемата на релацията.", more: "Релация със степен 2 е бинарна, със степен 3 — тернарна. В таблицата — броят колони." },
    "мощност на релация": { cat: "Релационен модел", t: "Мощност (кардиналност)", en: "Cardinality", d: "Броят на кортежите в релацията в даден момент.", more: "Мощността се променя при всяко вмъкване и изтриване; степента — само при промяна на схемата." },
    "стойност на атрибут": { cat: "Релационен модел", t: "Стойност на атрибут", en: "Attribute value", d: "Един елемент от домейна, записан в даден кортеж за даден атрибут.", more: "В таблицата — една клетка. В релационния модел стойността е атомарна спрямо операциите на модела." },
  });

  const DOMAINS = {
    SID: { name: "D_SID", set: "цели числа 1 … 99999", test: (v) => /^\d+$/.test(v) && +v >= 1 && +v <= 99999, sql: "INTEGER CHECK (sid BETWEEN 1 AND 99999)" },
    Name: { name: "D_Име", set: "низове с дължина 1 … 40", test: (v) => v.length >= 1 && v.length <= 40, sql: "VARCHAR(40) NOT NULL" },
    Prog: { name: "D_Програма", set: "{Информатика, КН, Математика}", test: (v) => ["Информатика", "КН", "Математика"].includes(v), sql: "VARCHAR(20) CHECK (prog IN ('Информатика','КН','Математика'))" },
    Year: { name: "D_Курс", set: "{1, 2, 3, 4}", test: (v) => ["1", "2", "3", "4"].includes(v), sql: "SMALLINT CHECK (year BETWEEN 1 AND 4)" },
  };
  const COLS = ["SID", "Name", "Prog", "Year"];
  const ROWS = [["1", "Ana", "Информатика", "2"], ["2", "Boris", "КН", "1"], ["3", "Vera", "Информатика", "3"], ["4", "Georgi", "Математика", "2"]];

  const TERMS = [
    { k: "rel", t: "Релация", g: "релация", sql: "Таблица (TABLE)", file: "Файл", d: "Цялата таблица: <b>множество</b> от кортежи с една и съща схема. Редът на кортежите не носи смисъл и няма повторения." },
    { k: "schema", t: "Схема на релацията", g: "схема на релация", sql: "Заглавие / CREATE TABLE", file: "Структура на записа", d: "Името и атрибутите с техните домейни: <span class=\"mono\">Student(SID:D_SID, Name:D_Име, Prog:D_Програма, Year:D_Курс)</span>. Не съдържа данни." },
    { k: "attr", t: "Атрибут", g: "атрибут", sql: "Колона (COLUMN)", file: "Поле", d: "Именувана характеристика. Идентифицира се по <b>име</b>, не по позиция — затова редът на колоните е без значение." },
    { k: "tuple", t: "Кортеж", g: "кортеж", sql: "Ред (ROW)", file: "Запис", d: "Един факт: по една стойност за всеки атрибут. Математически е множество от двойки атрибут–стойност." },
    { k: "value", t: "Стойност", g: "стойност на атрибут", sql: "Клетка", file: "Стойност на поле", d: "Един елемент на домейна в конкретен кортеж. Атомарна спрямо модела (1НФ)." },
    { k: "domain", t: "Домейн", g: "домейн", sql: "Тип + ограничения (CHECK, NOT NULL)", file: "Тип на полето", d: "Множеството допустими стойности на атрибута. Два атрибута могат да имат един домейн." },
    { k: "degree", t: "Степен (арност)", g: "степен на релация", sql: "Брой колони", file: "Брой полета", d: "Броят атрибути. Тук: 4. Променя се само при промяна на схемата." },
    { k: "card", t: "Мощност (кардиналност)", g: "мощност на релация", sql: "Брой редове", file: "Брой записи", d: "Броят кортежи сега. Тук: 4. Променя се при всяко INSERT / DELETE." },
    { k: "key", t: "Ключ", g: "кандидатен ключ", sql: "PRIMARY KEY / UNIQUE", file: "Ключово поле", d: "Минимално множество атрибути, по което кортежите се различават. Тук: {SID}." },
  ];

  function anatomy(host) {
    host.innerHTML = "";
    let sel = "rel", selRow = 1, selCol = 2;

    /* --- съответствия --- */
    const corr = h("table", { class: "t" }, h("tr", null, ...["Релационен модел (математически)", "SQL", "Файлова / практическа", "Какво означава"].map((x) => h("th", { text: x }))));
    TERMS.forEach((T) => corr.append(h("tr", { "data-k": T.k, style: { cursor: "pointer" }, onclick: () => pick(T.k) },
      h("td", null, h("dfn", { "data-g": T.g, tabindex: "0", text: T.t })), h("td", { text: T.sql }), h("td", { text: T.file }), h("td", { html: T.d }))));

    /* --- интерактивна таблица --- */
    const btns = h("div", { class: "row" });
    const bmap = {};
    TERMS.forEach((T) => { const b = h("button", { class: "btn", type: "button", "aria-pressed": "false", onclick: () => pick(T.k), text: T.t }); bmap[T.k] = b; btns.append(b); });
    const stage = h("div", { style: { display: "grid", gap: "10px", minWidth: "0" } });
    const expl = h("div", { class: "key" });

    function pick(k) { sel = k; draw(); }

    function draw() {
      Object.entries(bmap).forEach(([k, b]) => b.setAttribute("aria-pressed", k === sel ? "true" : "false"));
      corr.querySelectorAll("tr[data-k]").forEach((tr) => (tr.style.background = tr.dataset.k === sel ? "var(--accent-soft)" : ""));
      stage.innerHTML = "";
      const tb = h("table", { class: "t grid t6", style: { fontSize: ".95rem" } });
      const relCls = sel === "rel" ? "s-act" : "";
      // заглавие (схема)
      const hr = h("tr");
      COLS.forEach((c, j) => {
        let cls = "";
        if (sel === "schema" || sel === "degree") cls = "s-piv";
        if ((sel === "attr" || sel === "domain") && j === selCol) cls = "s-act";
        if (sel === "key" && j === 0) cls = "s-done";
        if (sel === "value" && j === selCol) cls = "s-cmp";
        const th = h("th", { class: cls, style: { cursor: "pointer" }, title: "Избери атрибут", onclick: () => { selCol = j; if (!["attr", "domain", "value"].includes(sel)) sel = "attr"; draw(); } }, c);
        if (sel === "degree") th.append(h("div", { class: "mono", style: { fontSize: ".7rem" }, text: `#${j + 1}` }));
        hr.append(th);
      });
      tb.append(hr);
      ROWS.forEach((r, i) => {
        const tr = h("tr", { style: { cursor: "pointer" }, onclick: () => { selRow = i; if (!["tuple", "value"].includes(sel)) sel = "tuple"; draw(); } });
        r.forEach((v, j) => {
          let cls = relCls;
          if (sel === "tuple" && i === selRow) cls = "s-act";
          if ((sel === "attr") && j === selCol) cls = "s-act";
          if (sel === "domain" && j === selCol) cls = "s-cmp";
          if (sel === "value" && i === selRow && j === selCol) cls = "s-act";
          if (sel === "value" && (i === selRow) !== (j === selCol)) cls = "s-dim";
          if (sel === "key" && j === 0) cls = "s-done";
          if (sel === "card") cls = "s-cmp";
          tr.append(h("td", { class: cls, onclick: (e) => { if (sel === "value") { e.stopPropagation(); selRow = i; selCol = j; draw(); } } }, v));
        });
        if (sel === "card") tr.append(h("td", { class: "mono muted", style: { border: "none", background: "transparent" }, text: `${i + 1}` }));
        tb.append(tr);
      });
      const tblBox = h("div", { class: "tbl-wrap" }, tb);
      const side = h("div", { style: { display: "grid", gap: "6px", alignContent: "start", minWidth: "0" } });
      const T = TERMS.find((x) => x.k === sel);
      if (sel === "tuple") {
        const r = ROWS[selRow];
        side.append(h("span", { class: "eyebrow", text: "Кортежът математически" }),
          h("div", { class: "mono", text: `⟨${r.join(", ")}⟩` }),
          h("div", { class: "mono", style: { fontSize: ".85rem" }, text: "{ " + COLS.map((c, j) => `${c}: ${r[j]}`).join(", ") + " }" }),
          h("p", { class: "muted", style: { fontSize: ".85rem" }, text: "Вторият запис е по-точен: стойността е свързана с името на атрибута, затова редът на колоните не е част от кортежа." }));
      } else if (sel === "attr" || sel === "domain") {
        const c = COLS[selCol], D = DOMAINS[c];
        const vals = [...new Set(ROWS.map((r) => r[selCol]))];
        side.append(h("span", { class: "eyebrow", text: sel === "attr" ? `Атрибут ${c}` : `Домейн на ${c}` }),
          h("div", null, h("b", { text: D.name + " = " }), h("span", { class: "mono", text: D.set })),
          h("div", null, "Стойности, които се срещат сега: ", h("span", { class: "mono", text: "{" + vals.join(", ") + "}" })),
          h("div", { class: "muted", style: { fontSize: ".85rem" } }, "В SQL: ", h("code", { text: D.sql })),
          h("p", { class: "muted", style: { fontSize: ".85rem" }, text: "Домейнът е всичко допустимо, не само използваното. Срещаните стойности са подмножество на домейна." }));
      } else if (sel === "value") {
        side.append(h("span", { class: "eyebrow", text: "Стойност" }),
          h("div", null, h("span", { class: "mono", text: `${COLS[selCol]} = ${ROWS[selRow][selCol]}` }), ` в кортежа с SID = ${ROWS[selRow][0]}`),
          h("div", { class: "muted", style: { fontSize: ".85rem" } }, `∈ ${DOMAINS[COLS[selCol]].name} = ${DOMAINS[COLS[selCol]].set}`));
      } else if (sel === "degree") side.append(h("span", { class: "eyebrow", text: "Степен" }), h("div", { class: "t6-res", text: `степен = ${COLS.length} (кватернарна релация)` }));
      else if (sel === "card") side.append(h("span", { class: "eyebrow", text: "Мощност" }), h("div", { class: "t6-res", text: `мощност = ${ROWS.length}` }), h("p", { class: "muted", style: { fontSize: ".85rem" }, text: "Добави ред в долния пример за домейни — мощността расте, степента остава 4." }));
      else if (sel === "schema") side.append(h("span", { class: "eyebrow", text: "Схема" }), h("div", { class: "mono", style: { fontSize: ".85rem" }, text: "Student(SID: D_SID, Name: D_Име, Prog: D_Програма, Year: D_Курс)" }));
      else if (sel === "key") side.append(h("span", { class: "eyebrow", text: "Ключ" }), h("div", { class: "mono", text: "{SID}" }), h("p", { class: "muted", style: { fontSize: ".85rem" }, text: "{SID, Name} също различава кортежите, но не е минимално — то е суперключ, не кандидатен ключ." }));
      else side.append(h("span", { class: "eyebrow", text: "Релация" }), h("div", { class: "mono", text: "Student = { " + ROWS.map((r) => "⟨" + r.join(", ") + "⟩").join(", ") + " }" }));
      stage.append(h("div", { class: "split" }, tblBox, side));
      expl.innerHTML = `<b>${T.t}</b> — SQL: ${T.sql}. ${T.d}`;
    }

    /* --- декартово произведение --- */
    const D1 = ["Ana", "Boris", "Vera"], D2 = ["БД", "ОС", "Мрежи"];
    const chosen = new Set(["Ana|БД", "Ana|ОС", "Boris|БД", "Vera|Мрежи"]);
    const prodBox = h("div", { style: { display: "grid", gap: "10px", minWidth: "0" } });
    function drawProd() {
      prodBox.innerHTML = "";
      const g = h("table", { class: "t grid t6" }, h("tr", null, h("th", { text: "D_Студент × D_Курс" }), ...D2.map((c) => h("th", { text: c }))));
      D1.forEach((s) => g.append(h("tr", null, h("th", { text: s }), ...D2.map((c) => {
        const k = s + "|" + c, on = chosen.has(k);
        return h("td", { class: on ? "s-done" : "", style: { cursor: "pointer" }, title: "Включи / изключи кортежа", onclick: () => { on ? chosen.delete(k) : chosen.add(k); drawProd(); } }, on ? "✓" : "·");
      }))));
      const rel = { name: `Enroll ⊆ D_Студент × D_Курс  ·  мощност ${chosen.size} от ${D1.length * D2.length}`, cols: ["Студент", "Курс"], rows: [...chosen].sort().map((k) => k.split("|")) };
      prodBox.append(h("div", { class: "split" }, h("div", { style: { display: "grid", gap: "6px", minWidth: "0" } },
        h("span", { class: "eyebrow", text: `Декартово произведение: ${D1.length} × ${D2.length} = ${D1.length * D2.length} възможни кортежа` }), h("div", { class: "tbl-wrap" }, g),
        h("span", { class: "muted", style: { fontSize: ".85rem" }, text: "Щракни клетка, за да включиш или изключиш кортежа." })), window.T6.table(rel)));
    }

    /* --- проверка на домейн --- */
    const rowsDom = ROWS.map((r) => r.slice());
    const inputs = COLS.map((c, j) => h("input", { type: "text", id: "anat-in-" + c, value: ["5", "Dimitar", "Физика", "2"][j], "aria-label": c, style: { width: j === 1 ? "8em" : j === 2 ? "9em" : "5em" } }));
    const domMsg = h("div", { class: "viz-msg" });
    const domTbl = h("div");
    function drawDom() { domTbl.innerHTML = ""; domTbl.append(window.T6.table({ name: `Student · степен ${COLS.length} · мощност ${rowsDom.length}`, cols: COLS, rows: rowsDom }, { pk: [0] })); }
    const addBtn = h("button", { class: "btn primary", type: "button", text: "INSERT", onclick: () => {
      const vals = inputs.map((x) => x.value.trim());
      const bad = COLS.map((c, j) => (DOMAINS[c].test(vals[j]) ? null : `${c} = „${vals[j]}“ ∉ ${DOMAINS[c].name} ${DOMAINS[c].set}`)).filter(Boolean);
      if (!bad.length && rowsDom.some((r) => r[0] === vals[0])) bad.push(`SID = ${vals[0]} вече съществува — нарушен ключ`);
      if (bad.length) { domMsg.innerHTML = `<div class="warn"><b>Отказано.</b> ${bad.map(S.esc).join("; ")}.</div>`; return; }
      rowsDom.push(vals); drawDom(); domMsg.innerHTML = `<div><b>Вмъкнато.</b> Мощността стана ${rowsDom.length}; степента остава ${COLS.length}.</div>`;
    } });

    host.append(
      h("h3", { text: "Анатомия на релацията" }),
      h("p", { class: "prose", html: "Едни и същи неща имат три имена: в релационната теория, в SQL и в практиката с файлове. Щракни понятие — съответната част на таблицата се подсвечва. Щракането върху ред или колона също избира." }),
      h("div", { class: "tbl-wrap" }, corr),
      h("div", { class: "viz", style: { padding: "12px 14px", display: "grid", gap: "12px" } }, btns, stage, expl),
      h("h3", { text: "Релацията е подмножество на декартовото произведение" }),
      h("p", { class: "prose", html: "Декартовото произведение на домейните изброява <b>всички възможни</b> кортежи. Релацията избира онези от тях, които са <b>верни факти</b> в предметната област. Затова мощността ѝ е най-много произведението от мощностите на домейните." }),
      h("div", { class: "viz", style: { padding: "12px 14px" } }, prodBox),
      h("div", { class: "key" }, h("b", { text: "Формално" }), h("p", { class: "formula", text: "R ⊆ D₁ × D₂ × … × Dₙ ;  степен = n ;  мощност = |R| ≤ |D₁|·|D₂|·…·|Dₙ|" })),
      h("h3", { text: "Домейнът ограничава стойностите" }),
      h("p", { class: "prose", text: "Опитай да вмъкнеш кортеж. СУБД проверява всяка стойност срещу домейна на атрибута (в SQL — тип и CHECK) и ключа." }),
      h("div", { class: "viz", style: { padding: "12px 14px", display: "grid", gap: "10px" } },
        h("div", { class: "row" }, ...inputs.map((x, j) => h("label", { class: "field" }, h("span", { text: COLS[j] + " ∈ " + DOMAINS[COLS[j]].name }), x)), addBtn,
          h("button", { class: "btn ghost", type: "button", text: "Валиден пример", onclick: () => { ["5", "Dimitar", "КН", "4"].forEach((v, j) => (inputs[j].value = v)); } })),
        domMsg, domTbl),
      h("details", { class: "trap" }, h("summary", { text: "Капан: „релация“ = „връзка между таблици“" }), h("div", null, h("p", { html: "Не. Релацията е <b>самата таблица</b> — множеството кортежи. Връзката между два вида обекти (студент–програма) е предметна връзка (relationship), която в релационния модел се представя чрез външен ключ или чрез отделна релация." }))),
      h("details", { class: "trap" }, h("summary", { text: "Капан: „домейнът са стойностите в колоната“" }), h("div", null, h("p", { text: "Не. Домейнът е множеството на допустимите стойности. Ако никой студент не е от „Математика“, тя пак е в домейна — може да бъде вмъкната." }))),
    );
    draw(); drawProd(); drawDom();
  }

  window.T6.anatomy = anatomy;
})();
