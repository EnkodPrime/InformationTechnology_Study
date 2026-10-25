/* Раздел 8б — Пътят на нормализацията: едни и същи данни от ненормализирана таблица до 5НФ.
   На всеки етап: таблиците, кое правило е нарушено, какво се премахва, измерима полза и цена. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "ненормализирана таблица": { cat: "Нормализация", t: "Ненормализирана таблица (UNF)", en: "Unnormalized form", d: "Таблица, в която клетка съдържа повтаряща се група или списък от стойности.", more: "Не е релация в смисъла на модела: стойностите не са атомарни спрямо операциите му." },
  });

  /* ---------- факти от предметната област ----------
     ФЗ: SID → Име, Програма;  Програма → Декан;  Курс → Заглавие;  SID, Курс → Преподавател, Оценка;  Преподавател → Курс
     МЗ: SID ↠ Телефон (телефоните не зависят от курса) */
  const STUD = [
    { sid: "S1", name: "Ana", prog: "Информатика", phones: ["0881", "0882"], en: [["БД", "Петров", "6"], ["ОС", "Иванов", "5"]] },
    { sid: "S2", name: "Boris", prog: "КН", phones: ["0893"], en: [["БД", "Димитров", "4"]] },
    { sid: "S3", name: "Vera", prog: "Информатика", phones: ["0874"], en: [["ОС", "Иванов", "6"], ["БД", "Петров", "5"]] },
  ];
  const DEAN = { "Информатика": "Петрова", "КН": "Стоянов" };
  const TITLE = { "БД": "Бази от данни", "ОС": "Операционни системи" };

  const tbl = (name, cols, key, rows, note) => ({ name, cols, key, rows, note });
  const flat = () => {
    const rows = [];
    STUD.forEach((s) => s.en.forEach(([c, t, g]) => s.phones.forEach((p) => rows.push([s.sid, s.name, s.prog, DEAN[s.prog], c, TITLE[c], t, g, p]))));
    return rows;
  };
  const uniq = (rows) => { const seen = new Set(); return rows.filter((r) => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; }); };

  const STAGES = [
    {
      k: "UNF", t: "Ненормализирана таблица", short: "UNF",
      tables: [tbl("Student", ["SID", "Име", "Програма", "Декан", "Курсове", "Телефони"], ["SID"],
        STUD.map((s) => [s.sid, s.name, s.prog, DEAN[s.prog], s.en.map(([c, t, g]) => `${c} (${TITLE[c]}, ${t}, ${g})`).join("; "), s.phones.join(", ")]))],
      rule: "Няма — изходните данни, както са събрани във формуляр или електронна таблица.",
      problem: "Клетките „Курсове“ и „Телефони“ съдържат списъци. Не може да се зададе заявка „всички студенти с оценка 6 по БД“ с операциите на модела, нито ограничение върху оценката.",
      removes: "—",
      gain: "Изглежда компактно, но е само текст: базата не „знае“ какво има в клетките.",
      cost: "Заявките и ограниченията не виждат отделните курсове, оценки и телефони.",
    },
    {
      k: "1NF", t: "1НФ: атомарни стойности", short: "1НФ",
      tables: [tbl("Enrollment", ["SID", "Име", "Програма", "Декан", "Курс", "Заглавие", "Преподавател", "Оценка", "Телефон"], ["SID", "Курс", "Телефон"], flat())],
      rule: "Всяка клетка съдържа една стойност от домейна си.",
      problem: "Всички факти в една таблица. Ключ: {SID, Курс, Телефон}. Името, програмата и деканът зависят само от SID — част от ключа (частична зависимост). Заглавието зависи само от Курс.",
      removes: "Списъците в клетките. Всяка стойност вече е адресуема: σ Оценка = 6 ∧ Курс = 'БД' работи.",
      gain: "Заявки и ограничения върху всяка стойност.",
      cost: "Много повече повторения: Ana се повтаря 4 пъти (2 курса × 2 телефона).",
    },
    {
      k: "2NF", t: "2НФ: без частични зависимости", short: "2НФ",
      tables: [
        tbl("Student", ["SID", "Име", "Програма", "Декан"], ["SID"], STUD.map((s) => [s.sid, s.name, s.prog, DEAN[s.prog]])),
        tbl("Course", ["Курс", "Заглавие"], ["Курс"], Object.entries(TITLE)),
        tbl("Enroll", ["SID", "Курс", "Преподавател", "Оценка"], ["SID", "Курс"], STUD.flatMap((s) => s.en.map(([c, t, g]) => [s.sid, c, t, g]))),
        tbl("EnrollPhone", ["SID", "Курс", "Телефон"], ["SID", "Курс", "Телефон"], STUD.flatMap((s) => s.en.flatMap(([c]) => s.phones.map((p) => [s.sid, c, p])))),
      ],
      rule: "1НФ + никой непървичен атрибут не зависи от част от кандидатен ключ.",
      problem: "Student(SID, Име, Програма, Декан): Програма → Декан е транзитивна зависимост — деканът се повтаря за всеки студент от програмата.",
      removes: "SID → Име, Програма, Декан;  Курс → Заглавие;  SID, Курс → Преподавател, Оценка — всяка зависимост отива в таблица, където детерминантът е ключ.",
      gain: "Името на студента и заглавието на курса се пазят по веднъж. Нов курс може да се въведе без студенти.",
      cost: "Четири таблици; за пълния изглед е нужно съединение.",
    },
    {
      k: "3NF", t: "3НФ: без транзитивни зависимости", short: "3НФ",
      tables: [
        tbl("Student", ["SID", "Име", "Програма"], ["SID"], STUD.map((s) => [s.sid, s.name, s.prog])),
        tbl("Programme", ["Програма", "Декан"], ["Програма"], Object.entries(DEAN)),
        tbl("Course", ["Курс", "Заглавие"], ["Курс"], Object.entries(TITLE)),
        tbl("Enroll", ["SID", "Курс", "Преподавател", "Оценка"], ["SID", "Курс"], STUD.flatMap((s) => s.en.map(([c, t, g]) => [s.sid, c, t, g]))),
        tbl("EnrollPhone", ["SID", "Курс", "Телефон"], ["SID", "Курс", "Телефон"], STUD.flatMap((s) => s.en.flatMap(([c]) => s.phones.map((p) => [s.sid, c, p])))),
      ],
      rule: "2НФ + за всяка нетривиална X → A: X е суперключ или A е първичен атрибут.",
      problem: "Enroll(SID, Курс, Преподавател, Оценка): Преподавател → Курс (всеки преподавател води един курс). Курс е първичен атрибут (част от ключа {SID, Курс}), затова 3НФ го допуска, но BCNF — не: Преподавател не е суперключ.",
      removes: "Програма → Декан отива в Programme.",
      gain: "Смяна на декан — една клетка. Програма може да съществува без студенти; изтриването на последния студент не губи декана.",
      cost: "Още една таблица.",
    },
    {
      k: "BCNF", t: "BCNF: всеки детерминант е ключ", short: "BCNF",
      tables: [
        tbl("Student", ["SID", "Име", "Програма"], ["SID"], STUD.map((s) => [s.sid, s.name, s.prog])),
        tbl("Programme", ["Програма", "Декан"], ["Програма"], Object.entries(DEAN)),
        tbl("Course", ["Курс", "Заглавие"], ["Курс"], Object.entries(TITLE)),
        tbl("Teaches", ["Преподавател", "Курс"], ["Преподавател"], uniq(STUD.flatMap((s) => s.en.map(([c, t]) => [t, c])))),
        tbl("Enroll", ["SID", "Преподавател", "Оценка"], ["SID", "Преподавател"], STUD.flatMap((s) => s.en.map(([, t, g]) => [s.sid, t, g]))),
        tbl("EnrollPhone", ["SID", "Курс", "Телефон"], ["SID", "Курс", "Телефон"], STUD.flatMap((s) => s.en.flatMap(([c]) => s.phones.map((p) => [s.sid, c, p])))),
      ],
      rule: "За всяка нетривиална X → A: X е суперключ.",
      problem: "EnrollPhone(SID, Курс, Телефон) няма нетривиални ФЗ — в BCNF е. Но SID ↠ Телефон: за всеки курс телефоните се повтарят. Това е многозначна зависимост, която BCNF не вижда.",
      removes: "Преподавател → Курс отива в Teaches; Enroll пази (SID, Преподавател, Оценка).",
      gain: "Кой курс води преподавателят — един ред. Преподавател може да се въведе, преди да има студенти.",
      cost: "Зависимостта SID, Курс → Преподавател вече не се проверява в една таблица (не е запазена) — правилото „по един преподавател на курс за студент“ изисква съединение или тригер. Затова на практика понякога се спира на 3НФ.",
    },
    {
      k: "4NF", t: "4НФ: без независими многозначни факти", short: "4НФ",
      tables: [
        tbl("Student", ["SID", "Име", "Програма"], ["SID"], STUD.map((s) => [s.sid, s.name, s.prog])),
        tbl("Programme", ["Програма", "Декан"], ["Програма"], Object.entries(DEAN)),
        tbl("Course", ["Курс", "Заглавие"], ["Курс"], Object.entries(TITLE)),
        tbl("Teaches", ["Преподавател", "Курс"], ["Преподавател"], uniq(STUD.flatMap((s) => s.en.map(([c, t]) => [t, c])))),
        tbl("Enroll", ["SID", "Преподавател", "Оценка"], ["SID", "Преподавател"], STUD.flatMap((s) => s.en.map(([, t, g]) => [s.sid, t, g]))),
        tbl("StudentPhone", ["SID", "Телефон"], ["SID", "Телефон"], STUD.flatMap((s) => s.phones.map((p) => [s.sid, p]))),
      ],
      rule: "За всяка нетривиална X ↠ Y: X е суперключ.",
      problem: "При зададените зависимости в схемата няма нетривиални зависимости на съединение, които да не следват от ключовете ⇒ тя е и в 5НФ.",
      removes: "SID ↠ Телефон: телефоните отиват в StudentPhone. Двойките (SID, Курс) от EnrollPhone вече се получават от Enroll ⋈ Teaches, затова EnrollPhone отпада.",
      gain: "Нов телефон — един ред вместо по един за всеки курс. Студент без записани курсове може да има телефон.",
      cost: "Няма нова цена спрямо BCNF.",
    },
    {
      k: "5NF", t: "5НФ: цикличното правило", short: "5НФ",
      extra: true,
      tables: [
        tbl("Offer (един факт, не е в 5НФ)", ["Преподавател", "Курс", "Програма"], ["Преподавател", "Курс", "Програма"], [["Петров", "БД", "КН"], ["Петров", "ОС", "Информатика"], ["Иванов", "БД", "Информатика"], ["Петров", "БД", "Информатика"]]),
        tbl("Може_да_води", ["Преподавател", "Курс"], ["Преподавател", "Курс"], [["Петров", "БД"], ["Петров", "ОС"], ["Иванов", "БД"]]),
        tbl("Преподава_в", ["Преподавател", "Програма"], ["Преподавател", "Програма"], [["Петров", "КН"], ["Петров", "Информатика"], ["Иванов", "Информатика"]]),
        tbl("Курс_в_програма", ["Курс", "Програма"], ["Курс", "Програма"], [["БД", "КН"], ["ОС", "Информатика"], ["БД", "Информатика"]]),
      ],
      rule: "Всяка нетривиална зависимост на съединение следва от кандидатните ключове.",
      problem: "Схемата от 4НФ вече е в 5НФ. За да видим 5НФ, добавяме нов вид факт: кой преподавател кой курс води в коя програма, при правилото: може да води курса ∧ преподава в програмата ∧ курсът е в програмата ⇒ води го там.",
      removes: "Зависимостта на съединение *(ПК, ПП, КП): Offer се заменя с трите двойни таблици; Offer = съединението им.",
      gain: "Нов факт „Иванов преподава в КН“ — един ред; изведените тройки се получават от съединението, без да се въвеждат ръчно и без риск да се пропуснат.",
      cost: "Три таблици и тройно съединение за въпроса „кой какво води къде“. Валидно само докато правилото важи.",
    },
  ];

  /* ---------- измерими показатели (чисти функции) ---------- */
  const cells = (st) => st.tables.reduce((s, t) => s + t.rows.length * t.cols.length, 0);
  const rows = (st) => st.tables.reduce((s, t) => s + t.rows.length, 0);
  /** колко клетки съдържат стойността v (в UNF — и като част от списък) */
  const copies = (st, v) => st.tables.reduce((s, t) => s + t.rows.reduce((a, r) => a + r.filter((x) => String(x) === v || (st.k === "UNF" && String(x).includes(v))).length, 0), 0);
  /** редове за обновяване при смяна на стойност в колона col */
  const updRows = (st, col, v) => st.tables.reduce((s, t) => {
    if (st.k === "UNF") return s + t.rows.filter((r) => r.some((x) => String(x).includes(v))).length; // стойността може да е вътре в списък
    const j = t.cols.indexOf(col); return j < 0 ? s : s + t.rows.filter((r) => String(r[j]) === v).length;
  }, 0);
  /** може ли да се запише факт с атрибути given, ако нуждата е need: има таблица с need ⊆ cols и ключ ⊆ given */
  const canInsert = (st, given, need) => st.tables.some((t) => need.every((c) => t.cols.includes(c)) && t.key.every((c) => given.includes(c)));
  /** нов телефон за студент: брой нови редове */
  const phoneRows = (st, sid) => {
    if (st.k === "UNF") return 0; // само редакция на клетка
    let n = 0;
    st.tables.forEach((t) => {
      const jp = t.cols.indexOf("Телефон"), js = t.cols.indexOf("SID");
      if (jp < 0 || js < 0) return;
      const others = t.cols.map((_, j) => j).filter((j) => j !== jp);
      n += new Set(t.rows.filter((r) => r[js] === sid).map((r) => JSON.stringify(others.map((j) => r[j])))).size;
    });
    return n;
  };
  /** след изтриване на всички редове на студента остава ли стойността v */
  const survivesDelete = (st, sid, v) => st.tables.some((t) => { const js = t.cols.indexOf("SID"); return t.rows.some((r) => (js < 0 || r[js] !== sid) && r.some((x) => String(x) === v || (st.k === "UNF" && String(x).includes(v)))); });

  function metrics(st) {
    return {
      tables: st.tables.length, rows: rows(st), cells: cells(st),
      deanCopies: copies(st, "Петрова"), titleCopies: copies(st, "Бази от данни"), anaCopies: copies(st, "Ana"),
      updDean: updRows(st, "Декан", "Петрова"), updTitle: updRows(st, "Заглавие", "Бази от данни"),
      newPhone: phoneRows(st, "S1"),
      insProg: canInsert(st, ["Програма", "Декан"], ["Програма", "Декан"]),
      insCourse: canInsert(st, ["Курс", "Заглавие"], ["Курс", "Заглавие"]),
      delBorisKeepsDean: survivesDelete(st, "S2", "Стоянов"),
    };
  }
  const algos = { STAGES, metrics, flat };

  const html = `
<div class="prose">
  <p>Едни и същи данни за трима студенти минават през всички нормални форми. На всеки етап виждаш таблиците, коя зависимост се премахва и какво печелим — в брой повторения, редове за обновяване и възможни или невъзможни операции.</p>
</div>
<div class="key"><b>Зависимости в предметната област</b>
  <p class="formula">SID → Име, Програма · Програма → Декан · Курс → Заглавие · SID, Курс → Преподавател, Оценка · Преподавател → Курс · SID ↠ Телефон</p>
  <p class="muted">Последната е многозначна: телефоните на студента не зависят от курса. Нормализацията следва точно тези правила — с други правила разлагането би било различно.</p>
</div>
<div id="jr-viz"></div>
<div class="block">
  <h3>Показателите по етапи</h3>
  <div id="jr-chart"></div>
  <div class="tbl-wrap" id="jr-tbl"></div>
  <details class="hint"><summary>Как да четеш таблицата</summary><div>
    <p><b>Повторения на „Петрова“</b> — колко пъти деканът е записан; всяко копие е място за несъответствие. <b>Редове за обновяване</b> — колко реда трябва да се променят при смяна на декана или на заглавието на курс. <b>Нов телефон</b> — колко реда трябва да се добавят. Последните три реда показват дали дадена операция е изобщо възможна без измислени стойности.</p>
    <p>Общият брой клетки не винаги намалява: разлагането добавя колони за връзка (ключове). Ползата е в премахнатите аномалии, не непременно в по-малко байтове.</p>
  </div></details>
  <details class="trap"><summary>Капан: „по-висока нормална форма е винаги по-добре“</summary><div>
    <p>Всяка стъпка добавя таблици и съединения. При BCNF загубихме проверката SID, Курс → Преподавател в една таблица. Нормализацията се прави до формата, при която аномалиите, които имат значение за задачата, са премахнати; за отчети понякога съзнателно се денормализира.</p>
  </div></details>
</div>`;

  function mount(root) {
    const T6 = window.T6;
    const ALL = STAGES.map(metrics);
    const yes = (b) => (b ? "да" : "не");

    let jApi = null;
    jApi = S.viz(root.querySelector("#jr-viz"), {
      id: "journey", title: "От сурови данни до 5НФ", sub: "Щракни бутон с нормалната форма или използвай стрелките отдолу.", code: false, speed: 0,
      build: () => ({ frames: STAGES.map((st, i) => ({ i, msg: `<b>${st.t}</b>` })) }),
      draw(stage, f) {
        const st = STAGES[f.i], m = ALL[f.i], prev = f.i > 0 ? ALL[f.i - 1] : null;
        stage.innerHTML = "";
        const steps = h("div", { class: "row", role: "tablist", "aria-label": "Нормална форма", style: { marginBottom: "10px", gap: "6px" } },
          ...STAGES.map((x, j) => h("button", { type: "button", role: "tab", class: "btn" + (j === f.i ? " primary" : ""), "aria-selected": j === f.i ? "true" : "false",
            title: x.t, style: { minWidth: "64px", justifyContent: "center", fontWeight: "600" }, onclick: () => jApi && jApi.go(j) },
            j < f.i ? "✓ " + x.short : x.short)),
          h("span", { class: "muted", style: { fontSize: ".82rem", alignSelf: "center" }, text: "← щракни нормална форма" }));
        const tables = h("div", { class: "t6-row" }, ...st.tables.map((t) => T6.table({ name: `${t.name} · ${t.rows.length} ред${t.rows.length === 1 ? "" : "а"}`, cols: t.cols, rows: t.rows }, { pk: t.key.map((c) => t.cols.indexOf(c)) })));
        const delta = (a, b) => (prev == null ? "" : a === b ? "" : a < b ? ` (−${b - a})` : ` (+${a - b})`);
        const cards = h("div", { class: "cards" },
          h("div", { class: "card" }, h("span", { class: "eyebrow", text: "Правило" }), h("p", { text: st.rule })),
          h("div", { class: "card" }, h("span", { class: "eyebrow", text: "Какво премахнахме" }), h("p", { text: st.removes })),
          h("div", { class: "card" }, h("span", { class: "eyebrow", text: "Полза" }), h("p", { text: st.gain })),
          h("div", { class: "card" }, h("span", { class: "eyebrow", text: "Цена" }), h("p", { text: st.cost })));
        const next = h("div", { class: "key", style: { borderLeftColor: "var(--st-cmp)", background: "var(--st-cmp-bg)" } }, h("b", { text: f.i < STAGES.length - 1 ? "Какво остава → следваща стъпка" : "Наблюдение" }), h("p", { text: st.problem }));
        const stats = st.extra ? h("p", { class: "muted", text: "Този етап въвежда нов вид факт. Показателите за основните данни остават като в 4НФ (таблицата „Показателите по етапи“ по-долу)." }) :
          h("div", { class: "stats" },
            h("span", null, "таблици: ", h("b", { text: m.tables })), h("span", null, "редове: ", h("b", { text: m.rows + delta(m.rows, prev && prev.rows) })),
            h("span", null, "„Петрова“ записана: ", h("b", { text: m.deanCopies + delta(m.deanCopies, prev && prev.deanCopies) })),
            h("span", null, "„Ana“ записана: ", h("b", { text: m.anaCopies + delta(m.anaCopies, prev && prev.anaCopies) })),
            h("span", null, "нов телефон на Ana: ", h("b", { text: st.k === "UNF" ? "редакция на клетка" : m.newPhone + " ред(а)" })));
        stats.style.marginTop = "8px";
        stage.append(steps, tables, stats, cards, next);
        if (st.k === "1NF") stage.append(h("details", { class: "hint", open: true }, h("summary", { text: "Защо 1НФ има повече редове от UNF" }), h("div", null, h("p", { text: "Двата списъка (курсове и телефони) се разгъват едновременно — всеки курс с всеки телефон. Ana: 2 курса × 2 телефона = 4 реда. Това разгъване ще бъде премахнато чак в 4НФ." }))));
        if (st.k === "BCNF") stage.append(h("details", { class: "trap", open: true }, h("summary", { text: "Цената на BCNF" }), h("div", null, h("p", { text: "В 3НФ правилото „студентът има един преподавател за даден курс“ (SID, Курс → Преподавател) се проверява от ключа на Enroll. След разлагането то обхваща две таблици и вече не е ограничение на една таблица." }))));
      },
    });

    // таблица с показатели
    const cols = STAGES.filter((s) => !s.extra);
    const t = h("table", { class: "t" }, h("tr", null, h("th", { text: "показател" }), ...cols.map((s) => h("th", { text: s.short }))));
    const R = [
      ["таблици", (m) => m.tables], ["редове", (m) => m.rows], ["клетки", (m) => m.cells],
      ["„Петрова“ (декан) записана", (m) => m.deanCopies], ["„Бази от данни“ записано", (m) => m.titleCopies],
      ["редове за смяна на декана", (m) => m.updDean], ["редове за смяна на заглавие", (m) => m.updTitle],
      ["нов телефон на Ana — нови редове", (m, s) => (s.k === "UNF" ? "клетка" : m.newPhone)],
      ["нова програма без студенти?", (m) => yes(m.insProg)], ["нов курс без студенти?", (m) => yes(m.insCourse)],
      ["изтриване на Boris запазва декана на КН?", (m) => yes(m.delBorisKeepsDean)],
    ];
    R.forEach(([lab, fn]) => t.append(h("tr", null, h("td", { text: lab }), ...cols.map((s, i) => { const v = fn(ALL[i], s); return h("td", { class: "mono " + (v === "не" ? "warn" : ""), text: v }); }))));
    root.querySelector("#jr-tbl").append(t);
    // лентова диаграма на повторенията
    const chart = root.querySelector("#jr-chart");
    const max = Math.max(...cols.map((_, i) => ALL[i].deanCopies + ALL[i].anaCopies + ALL[i].titleCopies));
    chart.append(h("div", { class: "row", style: { alignItems: "flex-end", gap: "18px", minHeight: "150px" } }, ...cols.map((s, i) => {
      const m = ALL[i], seg = (v, col, lab) => h("div", { title: `${lab}: ${v}`, style: { height: (v / max) * 120 + "px", background: `var(${col})`, opacity: ".85" } });
      return h("div", { style: { display: "grid", justifyItems: "center", gap: "4px", width: "56px" } },
        h("b", { class: "mono", style: { fontSize: ".8rem" }, text: m.deanCopies + m.anaCopies + m.titleCopies }),
        h("div", { style: { width: "34px", display: "flex", flexDirection: "column-reverse" } }, seg(m.anaCopies, "--st-act", "Ana"), seg(m.deanCopies, "--st-cmp", "Петрова"), seg(m.titleCopies, "--st-piv", "Бази от данни")),
        h("span", { class: "mono", style: { fontSize: ".8rem" }, text: s.short }));
    })), h("div", { class: "legend", style: { marginTop: "6px" } },
      h("span", { class: "s-act" }, h("i"), "копия на „Ana“"), h("span", { class: "s-cmp" }, h("i"), "копия на „Петрова“"), h("span", { class: "s-piv" }, h("i"), "копия на „Бази от данни“")));
  }

  S.chapter({ id: "patnf", order: 8.6, num: "8б", group: "Зависимости и нормализация", title: "Пътят: от сурови данни до 5НФ", lead: "Едни и същи данни през UNF, 1НФ, 2НФ, 3НФ, BCNF, 4НФ и 5НФ — какво се премахва на всяка стъпка и каква е ползата.", html, mount, algos });
})();
