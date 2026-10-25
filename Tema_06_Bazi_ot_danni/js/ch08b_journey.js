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

  /* ---------- цветове: един цвят = един факт (зависимост) ---------- */
  const FACTS = [
    { k: "stu", var: "--st-act", t: "SID → Име, Програма" },
    { k: "dean", var: "--st-cmp", t: "Програма → Декан" },
    { k: "title", var: "--st-piv", t: "Курс → Заглавие" },
    { k: "enr", var: "--st-done", t: "SID, Курс → Преподавател, Оценка" },
    { k: "teach", var: "--tk-type", t: "Преподавател → Курс" },
    { k: "phone", var: "--st-swap", t: "SID ↠ Телефон" },
    { k: "offer", var: "--tk-pp", t: "Преподавател–Курс–Програма (5НФ)" },
  ];
  const BY_COL = { "Име": "stu", "Програма": "stu", "Декан": "dean", "Заглавие": "title", "Курсове": "enr", "Преподавател": "enr", "Оценка": "enr", "Телефон": "phone", "Телефони": "phone" };
  /** Цвят на колона в таблица: ключовите колони са неутрални (освен телефона и 5НФ). */
  function factOf(st, t, c) {
    if (st.k === "5NF") return "offer";
    if (t.name === "Teaches" && c === "Курс") return "teach";
    if (c === "Телефон" || c === "Телефони") return "phone";
    if (t.key.includes(c)) return null;
    return BY_COL[c] || null;
  }
  /** Преходи към етапа: кои колони идват отнякъде и кои таблици са нови. */
  const MOVES = {
    "1NF": [{ cols: ["Курс", "Заглавие", "Преподавател", "Оценка"], from: "Student.Курсове", to: "Enrollment", how: "списъкът се разгъва в отделни колони и редове" }, { cols: ["Телефон"], from: "Student.Телефони", to: "Enrollment", how: "по един телефон на ред" }],
    "2NF": [{ cols: ["Име", "Програма", "Декан"], from: "Enrollment", to: "Student", how: "зависят само от SID" }, { cols: ["Заглавие"], from: "Enrollment", to: "Course", how: "зависи само от Курс" }, { cols: ["Преподавател", "Оценка"], from: "Enrollment", to: "Enroll", how: "зависят от SID, Курс" }, { cols: ["Телефон"], from: "Enrollment", to: "EnrollPhone", how: "остатъкът от ключа" }],
    "3NF": [{ cols: ["Декан"], from: "Student", to: "Programme", how: "Програма → Декан (транзитивна)" }],
    "BCNF": [{ cols: ["Курс"], from: "Enroll", to: "Teaches", how: "Преподавател → Курс; детерминантът не е ключ" }],
    "4NF": [{ cols: ["Телефон"], from: "EnrollPhone", to: "StudentPhone", how: "SID ↠ Телефон; EnrollPhone отпада" }],
    "5NF": [{ cols: ["Преподавател", "Курс", "Програма"], from: "Offer", to: "Може_да_води, Преподава_в, Курс_в_програма", how: "зависимост на съединение" }],
  };
  /** Външни ключове на всеки етап: [таблица, колони, реферирана таблица, колони]. */
  const FKS = {
    "2NF": [["Enroll", ["SID"], "Student", ["SID"]], ["Enroll", ["Курс"], "Course", ["Курс"]], ["EnrollPhone", ["SID", "Курс"], "Enroll", ["SID", "Курс"]]],
    "3NF": [["Student", ["Програма"], "Programme", ["Програма"]], ["Enroll", ["SID"], "Student", ["SID"]], ["Enroll", ["Курс"], "Course", ["Курс"]], ["EnrollPhone", ["SID", "Курс"], "Enroll", ["SID", "Курс"]]],
    "BCNF": [["Student", ["Програма"], "Programme", ["Програма"]], ["Teaches", ["Курс"], "Course", ["Курс"]], ["Enroll", ["SID"], "Student", ["SID"]], ["Enroll", ["Преподавател"], "Teaches", ["Преподавател"]], ["EnrollPhone", ["SID"], "Student", ["SID"]], ["EnrollPhone", ["Курс"], "Course", ["Курс"]]],
    "4NF": [["Student", ["Програма"], "Programme", ["Програма"]], ["Teaches", ["Курс"], "Course", ["Курс"]], ["Enroll", ["SID"], "Student", ["SID"]], ["Enroll", ["Преподавател"], "Teaches", ["Преподавател"]], ["StudentPhone", ["SID"], "Student", ["SID"]]],
  };
  const css = `
table.t6 th.jr{background:color-mix(in srgb,var(--jc) 26%,var(--panel));box-shadow:inset 0 3px 0 var(--jc)}
table.t6 td.jr{background:color-mix(in srgb,var(--jc) 11%,var(--panel))}
table.t6 th.jr-in{outline:2px dashed var(--jc);outline-offset:-3px}
table.t6 th.jr-out{background-image:repeating-linear-gradient(135deg,transparent 0 6px,color-mix(in srgb,var(--jc,var(--muted)) 22%,transparent) 6px 9px)}
.jr-to{display:block;font:600 .64rem var(--f-body);color:var(--ink-2)}
.jr-from{display:block;font:600 .64rem var(--f-body);color:var(--jc);letter-spacing:.02em}
.t6-rel.jr-newt{outline:2px solid var(--accent);outline-offset:4px;border-radius:4px}
.t6-rel .jr-badge{font:700 .66rem var(--f-body);color:var(--accent-ink);background:var(--accent);border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:1px}
.jr-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:5px;border:1.5px solid var(--jc);background:color-mix(in srgb,var(--jc) 14%,var(--panel));font:600 .8rem var(--f-mono)}
.jr-moves{display:grid;gap:6px;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:var(--panel-2)}
.jr-move{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;font-size:.86rem}
.jr-move .jr-arr{font:700 1rem var(--f-mono);color:var(--muted)}
.jr-legend{display:flex;flex-wrap:wrap;gap:6px}
@keyframes jrflash{from{box-shadow:inset 0 3px 0 var(--jc),0 0 0 4px color-mix(in srgb,var(--jc) 55%,transparent)}to{box-shadow:inset 0 3px 0 var(--jc),0 0 0 0 transparent}}
table.t6 th.jr-in{animation:jrflash 1.2s ease-out 2}
@media (prefers-reduced-motion:reduce){table.t6 th.jr-in{animation:none}}`;
  if (typeof document !== "undefined") document.head.append(h("style", { html: css }));
  const jvar = (k) => (FACTS.find((f) => f.k === k) || {}).var;

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
  <h3>Целият път на един екран</h3>
  <p class="prose">Всеки ред е една нормална форма, всяка кутия — таблица с нейните данни, оцветени по фактите. Стрелките показват откъде идват колоните на новата таблица; цветът на стрелката е цветът на преместения факт, сивият пунктир значи „таблицата остава“. Тънките линии под кутиите са <b>връзките по ключове</b> вътре в етапа, като в UML/ER диаграма: от <i>външния ключ</i> (∗, много) до <u>първичния ключ</u> (1) на реферираната таблица. Цветът на линията е цветът на реферираната таблица. Посочи кутия, за да видиш целия ѝ произход и наследници; щракни я, за да отвориш етапа горе.</p>
  <div class="tbl-wrap" id="jr-graph"></div>
</div>
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

  /** Чертае връзките по ключове под HTML таблиците на един етап. */
  function drawUml(inner, tables, st, fks) {
    if (!inner.isConnected) return;
    const base = inner.getBoundingClientRect();
    const wraps = [...tables.children];
    const thOf = (name, col) => { const i = st.tables.findIndex((t) => t.name === name); const t = st.tables[i]; return wraps[i].querySelectorAll("tr:first-child th")[t.cols.indexOf(col)]; };
    const boxOf = (name) => wraps[st.tables.findIndex((t) => t.name === name)].querySelector("table").getBoundingClientRect();
    const REFC = { Student: "stu", Programme: "dean", Course: "title", Teaches: "teach", Enroll: "enr" };
    const items = fks.map(([t, cs, rt, rcs]) => {
      const cx = (name, c) => c.map((x) => { const r = thOf(name, x).getBoundingClientRect(); return r.left + r.width / 2 - base.left; }).reduce((a, b) => a + b, 0) / c.length;
      return { t, cs, rt, rcs, xa: cx(t, cs), xb: cx(rt, rcs), ya: boxOf(t).bottom - base.top, yb: boxOf(rt).bottom - base.top, col: `var(${jvar(REFC[rt] || "enr")})` };
    }).sort((p, q) => Math.abs(p.xa - p.xb) - Math.abs(q.xa - q.xb));
    const levels = [];
    items.forEach((it) => { const lo = Math.min(it.xa, it.xb), hi = Math.max(it.xa, it.xb); let L = 0; while ((levels[L] || []).some(([a, b]) => !(hi < a - 6 || lo > b + 6))) L++; (levels[L] = levels[L] || []).push([lo, hi]); it.L = L; });
    const used = {};
    const slot = (k, x) => { const key = k + "@" + Math.round(x); const n = (used[key] = (used[key] || 0) + 1) - 1; return x + (n ? (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 6 : 0); };
    items.forEach((it) => { it.xa = slot(it.t, it.xa); it.xb = slot(it.rt, it.xb); });
    const maxBottom = Math.max(...wraps.map((w) => w.getBoundingClientRect().bottom - base.top));
    const band = 18 + levels.length * 13;
    inner.style.paddingBottom = band + 8 + "px";
    const H = maxBottom + band + 8, W = inner.scrollWidth;
    const svg = S.svg("svg", { width: W, height: H, style: `position:absolute;left:0;top:0;pointer-events:none;overflow:visible`, "aria-hidden": "true" });
    const labeled = new Set();
    items.forEach((it) => {
      const yy = maxBottom + 14 + it.L * 13;
      svg.append(S.svg("path", { d: `M${it.xa},${it.ya} L${it.xa},${yy} L${it.xb},${yy} L${it.xb},${it.yb}`, style: `fill:none;stroke:${it.col};stroke-width:2` }));
      [[it.t, it.cs, it.xa, it.ya, "∗"], [it.rt, it.rcs, it.xb, it.yb, "1"]].forEach(([name, cs, x, y, txt]) => {
        cs.forEach((c) => { const th = thOf(name, c); th.style.outline = `2px solid ${it.col}`; th.style.outlineOffset = "-2px"; });
        svg.append(S.svg("circle", { cx: x, cy: y + 1, r: 3, style: `fill:${it.col}` }));
        const key = name + "|" + cs.join(","); if (labeled.has(key)) return; labeled.add(key);
        svg.append(S.svg("text", { x: x + 6, y: y + 13, style: "font:700 12px var(--f-mono);fill:var(--ink);paint-order:stroke;stroke:var(--panel);stroke-width:3px", text: txt }));
      });
      svg.append(S.svg("title", { text: `${it.t}(${it.cs.join(", ")}) → ${it.rt}(${it.rcs.join(", ")})` }));
    });
    inner.append(svg);
  }

  function mount(root) {
    const T6 = window.T6;
    const ALL = STAGES.map(metrics);
    const yes = (b) => (b ? "да" : "не");

    let jApi = null, showMoves = true;
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
        const prevSt = f.i > 0 ? STAGES[f.i - 1] : null;
        const moves = MOVES[st.k] || [];
        const prevNames = new Set(prevSt ? prevSt.tables.map((t) => t.name) : []);
        const nextSt = STAGES[f.i + 1], nextMoves = nextSt && nextSt.k !== "5NF" ? MOVES[nextSt.k] || [] : [];
        const tables = h("div", { class: "t6-row" }, ...st.tables.map((t) => {
          const colCls = {}, arrived = {};
          t.cols.forEach((c, j) => {
            const fk = factOf(st, t, c);
            const mv = showMoves && moves.find((m) => m.cols.includes(c) && m.to.split(", ").some((x) => t.name.startsWith(x)));
            if (mv) arrived[j] = mv.from;
            colCls[j] = (fk ? "jr" : "") + (mv && fk ? " jr-in" : "");
          });
          const w = T6.table({ name: `${t.name} · ${t.rows.length} ред${t.rows.length === 1 ? "" : "а"}`, cols: t.cols, rows: t.rows }, { pk: t.key.map((c) => t.cols.indexOf(c)), colCls });
          // цвят на колоните чрез CSS променлива
          const ths = w.querySelectorAll("tr:first-child th");
          t.cols.forEach((c, j) => {
            const fk = factOf(st, t, c); if (!fk) return;
            const v = `var(${jvar(fk)})`;
            ths[j].style.setProperty("--jc", v);
            w.querySelectorAll(`tr td:nth-child(${j + 1})`).forEach((td) => td.style.setProperty("--jc", v));
            if (arrived[j]) ths[j].append(h("span", { class: "jr-from", text: "← " + arrived[j].split(".")[0] }));
          });
          // колони, които ще напуснат таблицата на следващия етап
          if (showMoves) t.cols.forEach((c, j) => {
            const out = nextMoves.find((m) => m.from.split(".")[0] === t.name && (m.from.includes(".") ? m.from.split(".")[1] === c : m.cols.includes(c)));
            if (!out || (st.k === "1NF" && t.key.includes(c) && c !== "Телефон")) return;
            ths[j].classList.add("jr-out");
            ths[j].append(h("span", { class: "jr-to", text: "→ " + out.to + " (" + nextSt.short + ")" }));
          });
          if (showMoves && prevSt && !prevNames.has(t.name)) { w.classList.add("jr-newt"); w.querySelector(".t6-rn").append(h("span", { class: "jr-badge", text: "НОВА" })); }
          return w;
        }));
        const moveBox = !moves.length || !showMoves ? null : h("div", { class: "jr-moves" },
          h("span", { class: "eyebrow", text: `Преход ${prevSt.short} → ${st.short}: какво се премества` }),
          ...moves.map((m) => h("div", { class: "jr-move" },
            ...m.cols.map((c) => { const fk = st.k === "5NF" ? "offer" : c === "Курс" && st.k === "BCNF" ? "teach" : BY_COL[c] || "enr"; const ch = h("span", { class: "jr-chip", text: c }); ch.style.setProperty("--jc", `var(${jvar(fk)})`); return ch; }),
            h("span", { class: "mono", text: m.from }), h("span", { class: "jr-arr", text: "→" }), h("b", { class: "mono", text: m.to }), h("span", { class: "muted", text: "· " + m.how }))));
        const prevGone = showMoves && prevSt ? prevSt.tables.filter((t) => !st.tables.some((x) => x.name === t.name)).map((t) => t.name) : [];
        const gone = prevGone.length && st.k !== "5NF" ? h("div", { class: "muted", style: { fontSize: ".85rem" } }, "Таблици от предишния етап, които вече ги няма (разделени): ", h("span", { class: "mono", text: prevGone.join(", ") })) : null;
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
        const legend = h("div", { class: "jr-legend" }, h("span", { class: "eyebrow", style: { alignSelf: "center", marginRight: "4px" }, text: "Цвят = факт:" }),
          ...FACTS.filter((x) => x.k !== "offer" || st.k === "5NF").map((x) => { const ch = h("span", { class: "jr-chip", text: x.t }); ch.style.setProperty("--jc", `var(${x.var})`); return ch; }));
        const toggle = h("label", { class: "field", style: { display: "flex", gap: "6px", alignItems: "center", fontSize: ".85rem" } },
          h("input", { type: "checkbox", id: "jr-moves", checked: showMoves ? true : null, onchange: (e) => { showMoves = e.target.checked; jApi.go(f.i); } }), "покажи преходите: ← откъде е дошла колоната, → къде ще отиде (на райета)");
        const goal = h("p", { class: "muted", style: { fontSize: ".85rem" }, text: "Целта на нормализацията: всяка таблица да съдържа един цвят — един факт. Таблица с няколко цвята смесва независими факти и води до повторения." });
        // UML: таблиците в един ред, връзките по ключове се чертаят под тях
        const fks = FKS[st.k] || [];
        tables.style.flexWrap = "nowrap"; tables.style.alignItems = "flex-start";
        const inner = h("div", { style: { position: "relative", width: "max-content", paddingBottom: fks.length ? "8px" : "0" } }, tables);
        const scroller = h("div", { class: "tbl-wrap", style: { overflowX: "auto", maxWidth: "100%" } }, inner);
        const umlNote = fks.length ? h("div", { class: "muted", style: { fontSize: ".82rem" }, html: `Линиите под таблиците са <b>връзките по ключове</b> (UML/ER): от <i>външния ключ</i> (∗, много) към <u>първичния ключ</u> (1). Колоните на ключовете са оградени в цвета на линията.` }) : null;
        stage.append(steps, legend, goal, toggle, ...(moveBox ? [moveBox] : []), ...(gone ? [gone] : []), scroller, ...(umlNote ? [umlNote] : []), stats, cards, next);
        if (fks.length) requestAnimationFrame(() => drawUml(inner, tables, st, fks));
        if (st.k === "1NF") stage.append(h("details", { class: "hint", open: true }, h("summary", { text: "Защо 1НФ има повече редове от UNF" }), h("div", null, h("p", { text: "Двата списъка (курсове и телефони) се разгъват едновременно — всеки курс с всеки телефон. Ana: 2 курса × 2 телефона = 4 реда. Това разгъване ще бъде премахнато чак в 4НФ." }))));
        if (st.k === "BCNF") stage.append(h("details", { class: "trap", open: true }, h("summary", { text: "Цената на BCNF" }), h("div", null, h("p", { text: "В 3НФ правилото „студентът има един преподавател за даден курс“ (SID, Курс → Преподавател) се проверява от ключа на Enroll. След разлагането то обхваща две таблици и вече не е ограничение на една таблица." }))));
      },
    });

    /* ---------- граф на целия път ---------- */
    const gstate = { data: true, lin: true, fk: true };
    function graph() {
      const host = root.querySelector("#jr-graph");
      host.innerHTML = "";
      const SV = S.svg, CW = 6.9, PADX = 10, GAP = 24, CGAP = 14, LEFT = 120, TOP = 26, GAPV = 118, RH = 15;
      const main = STAGES.filter((x) => x.k !== "5NF");
      const nodes = [], edges = [];
      const label = (t) => t.name.replace(" (един факт, не е в 5НФ)", "");
      /** ширини на колоните и размер на кутията */
      function layout(t) {
        const cw = t.cols.map((c, j) => Math.max(c.length, ...(gstate.data ? t.rows.map((r) => String(r[j]).length) : [0])) * CW);
        const off = []; let x = 0; cw.forEach((w, j) => { off.push(x); x += w + (j < cw.length - 1 ? CGAP : 0); });
        const w = Math.max(label(t).length * 7.6, x) + 2 * PADX;
        const hh = 44 + (gstate.data ? t.rows.length * RH + 8 : 0);
        return { cw, off, w, h: hh };
      }
      let W = 0, y = TOP;
      const rowY = [];
      main.forEach((st, i) => {
        const L = st.tables.map(layout), total = L.reduce((a, l) => a + l.w, 0) + GAP * (L.length - 1);
        W = Math.max(W, LEFT + total + 20);
        rowY.push(y);
        let x = LEFT;
        st.tables.forEach((t, j) => { nodes.push({ id: st.k + ":" + t.name, st, si: i, t, x, y, w: L[j].w, h: L[j].h, L: L[j] }); x += L[j].w + GAP; });
        y += Math.max(...L.map((l) => l.h)) + GAPV;
      });
      // 5НФ — отделен клон
      const st5 = STAGES.find((x) => x.k === "5NF"), y5 = y + 18;
      const L5 = st5.tables.map(layout);
      const n5 = st5.tables.map((t, j) => ({ id: "5NF:" + t.name, st: st5, si: main.length, t, x: 0, y: 0, w: L5[j].w, h: L5[j].h, L: L5[j] }));
      let xx = LEFT; n5.slice(1).forEach((n) => { n.x = xx; n.y = y5 + n5[0].h + 90; xx += n.w + GAP; });
      n5[0].x = LEFT + (xx - GAP - LEFT) / 2 - n5[0].w / 2; n5[0].y = y5;
      nodes.push(...n5);
      W = Math.max(W, xx + 20);
      const H = n5[1].y + Math.max(...n5.slice(1).map((n) => n.h)) + 30;
      const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
      nodes.forEach((n) => { n.colX = {}; n.colR = {}; n.t.cols.forEach((c, j) => { const x1 = n.x + PADX + n.L.off[j]; n.colR[c] = [x1, x1 + c.length * CW]; n.colX[c] = x1 + (c.length * CW) / 2; }); });
      // ребра на прехода
      main.forEach((st, i) => {
        if (!i) return;
        const prev = main[i - 1], mv = MOVES[st.k] || [];
        st.tables.forEach((t) => {
          const to = byId[st.k + ":" + t.name];
          const same = prev.tables.find((p) => p.name === t.name);
          if (same) edges.push({ a: byId[prev.k + ":" + same.name], b: to, kind: "keep" });
          mv.filter((m) => m.to.split(", ").includes(t.name)).forEach((m) => {
            const src = byId[prev.k + ":" + m.from.split(".")[0]];
            if (!src) return;
            const fk = BY_COL[m.cols[0]] && !(st.k === "BCNF" && m.cols[0] === "Курс") ? BY_COL[m.cols[0]] : st.k === "BCNF" ? "teach" : "enr";
            edges.push({ a: src, b: to, kind: "move", fk: m.cols[0] === "Курс" && st.k === "1NF" ? "enr" : fk, label: m.cols.join(", ") });
          });
        });
      });
      n5.slice(1).forEach((n) => edges.push({ a: n5[0], b: n, kind: "move", fk: "offer", label: "π" }));
      const up = (n, acc = new Set()) => { edges.filter((e) => e.b === n).forEach((e) => { if (!acc.has(e.a.id)) { acc.add(e.a.id); up(e.a, acc); } }); return acc; };
      const down = (n, acc = new Set()) => { edges.filter((e) => e.a === n).forEach((e) => { if (!acc.has(e.b.id)) { acc.add(e.b.id); down(e.b, acc); } }); return acc; };

      const svg = SV("svg", { class: "g jr-graph", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Граф на нормализацията" });
      const gL = SV("g"), gE = SV("g"), gF = SV("g"), gN = SV("g");
      svg.append(gL, gE, gF, gN);
      // етикети на редовете
      main.concat([st5]).forEach((st, i) => {
        const yy = i < main.length ? rowY[i] : y5;
        const g = SV("g", { style: "cursor:pointer", onclick: () => { jApi.go(STAGES.indexOf(st)); root.querySelector("#jr-viz").scrollIntoView({ behavior: "smooth", block: "start" }); } });
        g.append(SV("text", { x: 8, y: yy + 20, style: "font:700 15px var(--f-display);fill:var(--ink)", text: st.short }),
          SV("text", { x: 8, y: yy + 37, style: "font:11px var(--f-body);fill:var(--muted)", text: i < main.length ? `${st.tables.length} табл. · ${ALL[STAGES.indexOf(st)].rows} реда` : "нов вид факт" }));
        if (i > 0 && i < main.length) gL.append(SV("line", { x1: 8, x2: W - 10, y1: yy - 30, y2: yy - 30, style: "stroke:var(--line-2);stroke-width:1" }));
        gL.append(g);
      });
      gL.append(SV("line", { x1: 8, x2: W - 10, y1: y5 - 26, y2: y5 - 26, style: "stroke:var(--line);stroke-width:1.5;stroke-dasharray:6 4" }));
      gL.append(SV("text", { x: W - 12, y: y5 - 32, "text-anchor": "end", style: "font:11px var(--f-body);fill:var(--muted)", text: "схемата от 4НФ е и в 5НФ; отдолу — нов вид факт с циклично правило" }));
      // стрелки на прехода
      const into = {};
      edges.forEach((e) => { if (e.kind === "move") (into[e.b.id] = into[e.b.id] || []).push(e); });
      Object.values(into).forEach((arr) => arr.forEach((e, k) => { e.k = k; e.n = arr.length; }));
      const edgeEls = edges.map((e) => {
        const off = e.n > 1 ? (e.k - (e.n - 1) / 2) * 16 : 0;
        const x1 = e.a.x + e.a.w / 2 + off, y1 = e.a.y + e.a.h, x2 = e.b.x + e.b.w / 2 + off, y2 = e.b.y, my = (y1 + y2) / 2;
        const col = e.kind === "keep" ? "var(--muted)" : `var(${jvar(e.fk)})`;
        const g = SV("g");
        g.append(SV("path", { d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2 - 6}`, style: `fill:none;stroke:${col};stroke-width:${e.kind === "keep" ? 1.2 : 2.4};${e.kind === "keep" ? "stroke-dasharray:4 4;opacity:.55" : ""}` }),
          SV("path", { d: `M${x2 - 5},${y2 - 9} L${x2},${y2 - 1} L${x2 + 5},${y2 - 9}`, style: `fill:none;stroke:${col};stroke-width:${e.kind === "keep" ? 1.2 : 2.2}` }));
        if (e.kind === "move" && e.label !== "π") {
          const ly = y2 - 12 - ((e.n || 1) - 1 - (e.k || 0)) * 13;
          g.append(SV("text", { x: e.b.x + e.b.w / 2 + ((e.n || 1) - 1) * 8 + 12, y: ly, "text-anchor": "start", style: `font:600 10.5px var(--f-mono);fill:${col};paint-order:stroke;stroke:var(--bg);stroke-width:4px`, text: e.label }));
        }
        gE.append(g); return { e, g };
      });
      // кутии с колони и данни
      const nodeEls = nodes.map((n) => {
        const g = SV("g", { style: "cursor:pointer", tabindex: 0, role: "button", "aria-label": `${n.st.short}: ${n.t.name}` });
        const isNew = n.si > 0 && n.st.k !== "5NF" && !main[n.si - 1].tables.some((p) => p.name === n.t.name);
        g.append(SV("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 6, style: `fill:var(--panel);stroke:${isNew ? "var(--accent)" : "var(--line)"};stroke-width:${isNew ? 2 : 1.2}` }));
        g.append(SV("text", { x: n.x + PADX, y: n.y + 18, style: "font:700 12.5px var(--f-mono);fill:var(--ink)", text: label(n.t) + (gstate.data ? "" : "") }));
        const colStyle = (c) => {
          const fk = factOf(n.st, n.t, c);
          return { fk, fill: fk ? `var(${jvar(fk)})` : "var(--ink-2)" };
        };
        n.t.cols.forEach((c, j) => {
          const { fill } = colStyle(c);
          const isFk = (FKS[n.st.k] || []).some((x) => x[0] === n.t.name && x[1].includes(c));
          g.append(SV("text", { x: n.colR[c][0], y: n.y + 37, style: `font:600 11.5px var(--f-mono);fill:${fill};${n.t.key.includes(c) ? "text-decoration:underline;" : ""}${isFk ? "font-style:italic;" : ""}`, text: c }));
        });
        if (gstate.data) {
          g.append(SV("line", { x1: n.x + 6, x2: n.x + n.w - 6, y1: n.y + 44, y2: n.y + 44, style: "stroke:var(--line);stroke-width:1" }));
          n.t.rows.forEach((r, i) => {
            if (i % 2) g.append(SV("rect", { x: n.x + 3, y: n.y + 46 + i * RH, width: n.w - 6, height: RH, style: "fill:var(--panel-2)" }));
            n.t.cols.forEach((c, j) => {
              const { fk, fill } = colStyle(c);
              g.append(SV("text", { x: n.colR[c][0], y: n.y + 57 + i * RH, style: `font:11px var(--f-mono);fill:${fk ? fill : "var(--ink)"};${fk ? "opacity:.9" : ""}`, text: String(r[j]) }));
            });
          });
        }
        const on = () => {
          const rel = new Set([n.id, ...up(n), ...down(n)]);
          nodeEls.forEach((o) => (o.g.style.opacity = rel.has(o.n.id) ? 1 : 0.25));
          edgeEls.forEach((o) => (o.g.style.opacity = rel.has(o.e.a.id) && rel.has(o.e.b.id) ? 1 : 0.12));
        };
        const off = () => { nodeEls.forEach((o) => (o.g.style.opacity = 1)); edgeEls.forEach((o) => (o.g.style.opacity = 1)); };
        g.addEventListener("mouseenter", on); g.addEventListener("focus", on);
        g.addEventListener("mouseleave", off); g.addEventListener("blur", off);
        g.addEventListener("click", () => { jApi.go(STAGES.indexOf(n.st)); root.querySelector("#jr-viz").scrollIntoView({ behavior: "smooth", block: "start" }); });
        gN.append(g); return { n, g };
      });
      /* --- UML: външни ключове в рамките на всеки етап --- */
      Object.entries(FKS).forEach(([k, list]) => {
        const items = list.map(([t, cs, rt, rcs]) => {
          const a = byId[k + ":" + t], b = byId[k + ":" + rt];
          const avg = (n, c) => c.reduce((s2, x) => s2 + n.colX[x], 0) / c.length;
          return { a, b, cs, rcs, xa: avg(a, cs), xb: avg(b, rcs) };
        }).sort((p, q) => Math.abs(p.xa - p.xb) - Math.abs(q.xa - q.xb));
        const levels = [];
        items.forEach((it) => {
          const lo = Math.min(it.xa, it.xb), hi = Math.max(it.xa, it.xb);
          let Lv = 0; while ((levels[Lv] || []).some(([p, q]) => !(hi < p - 6 || lo > q + 6))) Lv++;
          (levels[Lv] = levels[Lv] || []).push([lo, hi]); it.Lv = Lv;
        });
        const used = {};
        const slot = (n, x) => { const key = n.id + "@" + Math.round(x); const kk = (used[key] = (used[key] || 0) + 1) - 1; return x + (kk ? (kk % 2 ? 1 : -1) * Math.ceil(kk / 2) * 5 : 0); };
        items.forEach((it) => { it.xa = slot(it.a, it.xa); it.xb = slot(it.b, it.xb); });
        const labeled = new Set();
        const REFC = { Student: "stu", Programme: "dean", Course: "title", Teaches: "teach", Enroll: "enr" };
        items.forEach((it) => {
          const col = `var(${jvar(REFC[it.b.t.name] || "enr")})`;
          const y0 = it.a.y + it.a.h, yb = it.b.y + it.b.h, d = 16 + it.Lv * 11;
          const yy = Math.max(y0, yb) + d;
          const g = SV("g", { class: "jr-fk" });
          g.append(SV("path", { d: `M${it.xa},${y0} L${it.xa},${yy} L${it.xb},${yy} L${it.xb},${yb}`, style: `fill:none;stroke:${col};stroke-width:1.7` }));
          // подчертаване на колоните на двата края (под заглавието)
          [[it.a, it.cs], [it.b, it.rcs]].forEach(([n, cs]) => cs.forEach((c) => { const [x1, x2] = n.colR[c]; g.append(SV("line", { x1, x2, y1: n.y + 41, y2: n.y + 41, style: `stroke:${col};stroke-width:2` })); }));
          const lab = (n, cs, x, yv, t) => { const key = n.id + "|" + cs.join(","); if (labeled.has(key)) return; labeled.add(key); g.append(SV("text", { x: x + 5, y: yv, style: "font:700 11px var(--f-mono);fill:var(--ink);paint-order:stroke;stroke:var(--bg);stroke-width:3px", text: t })); };
          lab(it.a, it.cs, it.xa, y0 + 12, "∗"); lab(it.b, it.rcs, it.xb, yb + 12, "1");
          g.append(SV("title", { text: `${it.a.t.name}(${it.cs.join(", ")}) → ${it.b.t.name}(${it.rcs.join(", ")})` }));
          gF.append(g);
        });
      });
      gE.style.display = gstate.lin ? "" : "none";
      gF.style.display = gstate.fk ? "" : "none";
      // превключватели
      const tg = (labelTxt, key) => h("button", { type: "button", class: "btn", "aria-pressed": gstate[key] ? "true" : "false", onclick: () => { gstate[key] = !gstate[key]; graph(); } }, labelTxt);
      host.append(h("div", { class: "row", style: { marginBottom: "8px" } },
        tg("Данни в таблиците", "data"), tg("Преходи между етапите", "lin"), tg("Връзки по ключове (UML)", "fk"),
        h("span", { class: "muted", style: { fontSize: ".82rem" }, html: "<u>подчертано</u> = първичен ключ · <i>курсив</i> = външен ключ · 1 ── ∗ = един към много" })));
      host.append(svg);
      svg.style.minWidth = Math.min(W, 900) + "px";
    }
    graph();

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
