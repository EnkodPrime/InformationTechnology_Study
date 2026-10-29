/* Раздел 6 — Аномалии и разлагане без загуба (глава 4, втора част; схема 7 и схема 12). */
(function () {
  const S = window.Study, h = S.h;
  const FD = () => window.T6FD;

  const ENR0 = [
    ["1", "Ana", "C1", "Bazi", "6"],
    ["1", "Ana", "C2", "Algoritmi", "5"],
    ["2", "Boris", "C1", "Bazi", "4"],
    ["3", "Vera", "C2", "Algoritmi", "3"],
  ];
  const ENR_COLS = ["StudentID", "StudentName", "CourseID", "CourseName", "Grade"];

  const algos = {
    /** Аномалиите върху обща таблица Enrollment и върху разложената схема. */
    anomaly({ kind, design }) {
      const norm = design === "norm";
      const F = [];
      const all = ENR0.map((r) => r.slice());
      if (!norm) {
        const snap = (rows, o) => ({ norm, rows: rows.map((r) => r.slice()), ...o });
        if (kind === "update") {
          F.push(snap(all, { msg: "Смяна на името на дисциплина C1: „Bazi“ → „Bazi danni“. Името е записано във <b>всеки</b> ред със C1." }));
          const rows = all.map((r) => r.slice());
          const hits = rows.map((r, i) => (r[2] === "C1" ? i : -1)).filter((i) => i >= 0);
          F.push(snap(rows, { hl: hits, cls: "s-cmp", msg: `Трябва да се променят <b>${hits.length}</b> реда.` }));
          rows[hits[0]][3] = "Bazi danni";
          F.push(snap(rows, { hl: [hits[0]], cls: "s-done", cell: [hits[0], 3], msg: "Обновихме първия ред… и приложението „забрави“ втория." }));
          F.push(snap(rows, { hl: hits, cls: "s-swap", done: true, msg: "<b>Аномалия при изменение:</b> една и съща дисциплина C1 има две различни имена. Базата е несъгласувана, без да е нарушено нито едно зададено ограничение.", inv: { text: "CourseID → CourseName е нарушена в данните", ok: false } }));
        } else if (kind === "insert") {
          F.push(snap(all, { msg: "Искаме да добавим нова дисциплина C3 „Mrezhi“, за която още няма записани студенти." }));
          const row = ["NULL", "NULL", "C3", "Mrezhi", "NULL"];
          F.push(snap(all.concat([row]), { hl: [4], cls: "s-swap", done: true, msg: "<b>Аномалия при добавяне:</b> ключът е (StudentID, CourseID) и е задължителен — без студент редът не може да се вмъкне. Фактът „съществува дисциплина C3“ няма къде да се запише.", inv: { text: "PK не допуска NULL в StudentID", ok: false } }));
        } else {
          F.push(snap(all, { msg: "Студентка Vera се отписва от C2 — изтриваме реда (3, C2)." }));
          F.push(snap(all, { hl: [3], cls: "s-cmp", msg: "Изтриваме ред 4." }));
          const rows = all.filter((r, i) => i !== 3);
          F.push(snap(rows, { msg: "Сведенията за C2 оцеляват — има и друг ред (Ana, C2). Сега Ana също се отписва от C2." }));
          F.push(snap(rows, { hl: [1], cls: "s-cmp", msg: "Изтриваме (1, C2) — последния ред с C2." }));
          const rows2 = rows.filter((r, i) => i !== 1);
          F.push(snap(rows2, { done: true, msg: "<b>Аномалия при изтриване:</b> с последното записване изчезна и фактът, че дисциплина C2 се казва „Algoritmi“. Изтрихме повече, отколкото искахме. (Същото важи за Vera като студент.)", inv: { text: "Загубен факт: C2 → Algoritmi", ok: false } }));
        }
      } else {
        const st = { s: [["1", "Ana"], ["2", "Boris"], ["3", "Vera"]], c: [["C1", "Bazi"], ["C2", "Algoritmi"]], e: ENR0.map((r) => [r[0], r[2], r[4]]) };
        const snap = (o) => ({ norm, st: JSON.parse(JSON.stringify(st)), ...o });
        if (kind === "update") {
          F.push(snap({ msg: "Същата смяна в разложената схема Student, Course, Enrollment." }));
          st.c[0][1] = "Bazi danni";
          F.push(snap({ hlC: [0], done: true, msg: "Името е записано <b>на едно място</b> — променяме един ред. Несъгласуваност е невъзможна.", inv: { text: "Един факт — едно място", ok: true } }));
        } else if (kind === "insert") {
          F.push(snap({ msg: "Нова дисциплина C3 без студенти." }));
          st.c.push(["C3", "Mrezhi"]);
          F.push(snap({ hlC: [2], done: true, msg: "Course(CourseID, CourseName) приема C3 самостоятелно.", inv: { text: "Добавянето не изисква несвързан факт", ok: true } }));
        } else {
          F.push(snap({ msg: "Vera и Ana се отписват от C2." }));
          st.e = st.e.filter((r) => r[1] !== "C2");
          F.push(snap({ hlC: [1], done: true, msg: "Записванията изчезнаха, но Course пази C2 „Algoritmi“.", inv: { text: "Фактът за дисциплината оцелява", ok: true } }));
        }
      }
      return { frames: F };
    },

    /** Проекции и тяхното съединение — фалшиви кортежи (огледало на spurious_join в C). */
    spurious({ rows, a1, a2 }) {
      const lines = String(rows).split("|").map((s) => s.trim()).filter(Boolean);
      const cols = lines[0].split(/\s+/);
      if (cols.length > 6) throw new Error("Най-много 6 атрибута.");
      const data = lines.slice(1).map((l, i) => { const v = l.split(/\s+/); if (v.length !== cols.length) throw new Error(`Ред ${i + 1}: ${v.length} стойности при ${cols.length} атрибута.`); return v; });
      if (!data.length) throw new Error("Нужен е поне един ред.");
      if (data.length > 6) throw new Error("Най-много 6 реда.");
      const mask = (s) => s.split(/[\s,]+/).filter(Boolean).reduce((m, n) => { const k = cols.indexOf(n); if (k < 0) throw new Error(`Няма атрибут „${n}“.`); return m | (1 << k); }, 0);
      const A1 = mask(a1), A2 = mask(a2);
      if ((A1 | A2) !== (1 << cols.length) - 1) throw new Error("R1 ∪ R2 трябва да съдържа всички атрибути на R.");
      const same = (a, b, m) => cols.every((_, j) => !(m >> j & 1) || a[j] === b[j]);
      const proj = (m) => { const o = []; data.forEach((r) => { if (!o.some((x) => same(x, r, m))) o.push(r); }); return o; };
      const P1 = proj(A1), P2 = proj(A2), common = A1 & A2;
      const F = [], out = [];
      let sp = 0;
      const pick = (r, m) => cols.map((_, j) => (m >> j & 1 ? r[j] : null)).filter((x) => x !== null);
      const cn = (m) => cols.filter((_, j) => m >> j & 1);
      const snap = (o) => ({ cols, data, P1: P1.map((r) => pick(r, A1)), P2: P2.map((r) => pick(r, A2)), c1: cn(A1), c2: cn(A2), out: out.map((x) => ({ ...x })), stats: { "редове в R": data.length, "в съединението": out.length, "фалшиви": sp }, ...o });
      F.push(snap({ at: "sp_proj", msg: `R1 = π<sub>${cn(A1).join(",")}</sub>(R), R2 = π<sub>${cn(A2).join(",")}</sub>(R). Общи атрибути: <b>${cn(common).join(",") || "няма"}</b>.` }));
      P1.forEach((r, i) => P2.forEach((s, k) => {
        if (!same(r, s, common)) return;
        const row = cols.map((_, j) => (A1 >> j & 1 ? r[j] : s[j]));
        const real = data.some((d) => same(row, d, A1 | A2));
        F.push(snap({ at: ["sp_match", "sp_emit"], i1: i, i2: k, msg: `R1 ред ${i + 1} и R2 ред ${k + 1} съвпадат по ${cn(common).join(",") || "(няма общи — всяка двойка)"} → (${row.join(", ")}).` }));
        out.push({ row, real });
        if (!real) { sp++; F.push(snap({ at: "sp_fake", i1: i, i2: k, last: true, msg: `(${row.join(", ")}) <b>го няма в R</b> — фалшив кортеж.`, log: `фалшив: (${row.join(", ")})` })); }
        else F.push(snap({ i1: i, i2: k, last: true, at: "sp_emit", msg: `(${row.join(", ")}) е в R.`, log: `истински: (${row.join(", ")})` }));
      }));
      F.push(snap({ done: true, msg: sp ? `Съединението дава ${out.length} реда при ${data.length} в R: <b>${sp} фалшиви</b>. Разлагането губи информация — не знаем кои комбинации са истински.` : `Съединението възстановява точно R (${out.length} реда). За <i>това</i> състояние няма загуба — но гаранция за всички състояния дава само проверка по зависимостите (по-долу).`, inv: { text: sp ? "Загуба: R1 ⋈ R2 ⊋ R" : "R1 ⋈ R2 = R в това състояние", ok: !sp } }));
      return { frames: F, n: out.length, sp };
    },

    chase({ attrs, fds, dec }) {
      const F = FD(), sch = F.parse(attrs, fds);
      const parts = String(dec).split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) throw new Error("Разлагането трябва да има поне две подсхеми, разделени с „|“.");
      if (parts.length > 6) throw new Error("Най-много 6 подсхеми.");
      const rels = parts.map((p) => { const m = sch.set(p); if (!m) throw new Error("Празна подсхема."); return m; });
      if (rels.reduce((a, b) => a | b, 0) !== sch.all) throw new Error("Подсхемите трябва заедно да покриват всички атрибути.");
      const frames = [];
      const r = F.chase(sch, rels, frames);
      frames.forEach((f) => { f.sch = sch; f.rels = rels; f.stats = { изравнявания: f.steps }; });
      let pres = 0;
      sch.fds.forEach((d) => { pres += F.preserved(sch, rels, d) ? 1 : 0; });
      frames[frames.length - 1].pres = `${pres}/${sch.fds.length}`;
      return { frames, row: r.row, steps: r.steps, preserved: `${pres}/${sch.fds.length}` };
    },
  };

  const html = `
<div class="prose">
  <p>Нека Enrollment(StudentID, StudentName, CourseID, CourseName, Grade) има ключ (StudentID, CourseID). Приемаме StudentID→StudentName и CourseID→CourseName. Имената се повтарят във всяко записване. Смяна на име изисква множество изменения; пропуск в някой ред създава несъгласуваност.</p>
</div>

<div class="block">
  <h3>Схема 7 · Функционални зависимости и повторение — трите аномалии</h3>
  <p class="prose"><dfn data-g="аномалия">Аномалия</dfn> при добавяне е невъзможност да се запише нов курс без студент при такава схема и задължителен съставен ключ. При изтриване на последното записване може да се загубят сведенията за курса. При изменение едно и също име може да остане различно в различни редове. <dfn data-g="нормализация">Нормализацията</dfn> отстранява определени зависимости, пораждащи тези аномалии.</p>
  <div id="v-an"></div>
  <details class="hint"><summary>Защо аномалиите идват от зависимостите</summary><div>
    <p>CourseName зависи само от CourseID — част от ключа. Затова фактът „C1 се казва Bazi“ е записан толкова пъти, колкото записвания има C1, и не може да съществува без записване. Отделим ли Course(CourseID, CourseName), всеки факт има точно едно място. Как се открива това систематично — в <a href="#nf123">раздел 7</a>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 12 · Как некоректно разлагане добавя фалшиви редове</h3>
  <p class="prose">Разлагането трябва да е <dfn data-g="беззагубно разлагане">без загуба при съединяване</dfn>: съединението на проекциите възстановява точно първоначалната релация без <dfn data-g="фалшив кортеж">фалшиви кортежи</dfn>. Ако от R(A, B, C) с редове (1, x, p) и (2, x, q) запазим само AB и BC, съединението по B произвежда и (1, x, q), (2, x, p). Отделянето на колони само по себе си не е доказано коректна нормализация.</p>
  <div id="v-sp"></div>
  <details class="trap"><summary>Капан: „съединението даде същото, значи е без загуба“</summary><div><p>Пример „AB|BC, но B определя C“ показва състояние без фалшиви редове. Това е вярно само за <b>това</b> състояние. Беззагубността е свойство на схемата и зависимостите за <b>всички</b> допустими състояния — проверява се с метода по-долу.</p></div></details>
</div>

<div class="block">
  <h3>Проверка за беззагубност по зависимостите (метод на таблицата)</h3>
  <p class="prose muted">Ръководството изисква беззагубността да се <b>доказва</b>, а не да се приема. Стандартният общ метод е таблицата („chase“): по ред за всяка подсхема, отличен символ a в нейните атрибути; зависимостите изравняват символи; ако някой ред стане изцяло a, разлагането е без загуба. За две подсхеми това се свежда до правилото: R1 ∩ R2 → R1 или R1 ∩ R2 → R2. <span class="extra-tag">разширение</span></p>
  <div id="v-chase"></div>
  <div class="key">Беззагубност и <dfn data-g="запазване на зависимостите">запазване на зависимостите</dfn> са <b>отделни свойства</b>; добрата нормална форма сама по себе си не заменя доказването им. Броячът „запазени ФЗ“ в последната стъпка показва второто свойство.</div>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-an"), {
      id: "an", title: "Аномалии: обща таблица срещу разложена схема", sub: "Избери аномалия и схема.", code: false,
      inputs: [
        { id: "kind", label: "Аномалия", type: "select", value: "update", options: [["update", "при изменение"], ["insert", "при добавяне"], ["delete", "при изтриване"]] },
        { id: "design", label: "Схема", type: "select", value: "flat", options: [["flat", "обща Enrollment (5 колони)"], ["norm", "Student + Course + Enrollment"]] },
      ],
      legend: [["s-cmp", "засегнати редове"], ["s-done", "променен"], ["s-swap", "несъгласуваност / отказ"]],
      build: algos.anomaly,
      draw(st, f) {
        st.innerHTML = "";
        if (!f.norm) {
          const rowCls = {}; (f.hl || []).forEach((i) => (rowCls[i] = f.cls));
          const cellCls = {}; if (f.cell) cellCls[f.cell.join(",")] = "s-done";
          st.append(T6.table({ name: "Enrollment", cols: ENR_COLS, rows: f.rows }, { pk: [0, 2], rowCls, cellCls, nullTxt: "NULL" }));
        } else {
          const rc = {}; (f.hlC || []).forEach((i) => (rc[i] = "s-done"));
          st.append(T6.row(
            T6.table({ name: "Student", cols: ["StudentID", "StudentName"], rows: f.st.s }, { pk: [0] }),
            T6.table({ name: "Course", cols: ["CourseID", "CourseName"], rows: f.st.c }, { pk: [0], rowCls: rc }),
            T6.table({ name: "Enrollment", cols: ["StudentID", "CourseID", "Grade"], rows: f.st.e }, { pk: [0, 1], fk: [0, 1] })));
        }
      },
    });

    S.viz(root.querySelector("#v-sp"), {
      id: "sp", title: "Проекции и обратно съединение", sub: "R се разлага на R1 и R2; после R1 ⋈ R2 се сравнява с R.",
      code: "ch06_spurious",
      inputs: [
        { id: "rows", label: "R (атрибути|ред|…)", value: "A B C|1 x p|2 x q", width: "22em" },
        { id: "a1", label: "R1", value: "A B", width: "7em" }, { id: "a2", label: "R2", value: "B C", width: "7em" },
      ],
      presets: [
        { label: "Примерът от ръководството", values: { rows: "A B C|1 x p|2 x q", a1: "A B", a2: "B C" } },
        { label: "AB|AC (A е ключ)", values: { rows: "A B C|1 x p|2 x q", a1: "A B", a2: "A C" } },
        { label: "AB|BC, но B определя C", values: { rows: "A B C|1 x p|2 x p|3 y q|4 y q|5 z r", a1: "A B", a2: "B C" } },
        { label: "AC|BC при същите данни", values: { rows: "A B C|1 x p|2 x p|3 y q|4 y q|5 z r", a1: "A C", a2: "B C" } },
      ],
      legend: [["s-act", "съчетавани редове"], ["s-done", "истински"], ["s-swap", "фалшив"]],
      build: algos.spurious,
      draw(st, f) {
        st.innerHTML = "";
        const r1 = {}, r2 = {}; if (f.i1 != null) { r1[f.i1] = "s-act"; r2[f.i2] = "s-act"; }
        const oc = {}; f.out.forEach((o, i) => (oc[i] = o.real ? "s-done" : "s-swap"));
        st.append(T6.row(
          T6.table({ name: "R", cols: f.cols, rows: f.data }),
          T6.op("→"),
          T6.table({ name: "R1", cols: f.c1, rows: f.P1 }, { rowCls: r1 }),
          T6.table({ name: "R2", cols: f.c2, rows: f.P2 }, { rowCls: r2 }),
          T6.op("⋈"),
          T6.table({ name: "R1 ⋈ R2", cols: f.cols, rows: f.out.map((o) => o.row) }, { rowCls: oc, empty: "—" })));
      },
    });

    S.viz(root.querySelector("#v-chase"), {
      id: "chase", title: "Метод на таблицата за беззагубно съединение", sub: "Подсхемите се разделят с „|“.",
      code: "ch06_chase",
      inputs: [
        { id: "attrs", label: "Схема R", value: "A B C", width: "14em" },
        { id: "fds", label: "Зависимости F", value: "B->C", width: "18em" },
        { id: "dec", label: "Разлагане", value: "A B|B C", width: "16em" },
      ],
      presets: [
        { label: "AB|BC при A→B", values: { attrs: "A B C", fds: "A->B", dec: "A B|B C" } },
        { label: "AB|BC при B→C", values: { attrs: "A B C", fds: "B->C", dec: "A B|B C" } },
        { label: "Teaching|Assignment", values: { attrs: "Student Course Teacher", fds: "Student,Course->Teacher; Teacher->Course", dec: "Teacher Course|Student Teacher" } },
        { label: "Грешно: EmpID DeptName | DeptID DeptName", values: { attrs: "EmpID DeptID DeptName", fds: "EmpID->DeptID; DeptID->DeptName", dec: "EmpID DeptName|DeptID DeptName" } },
        { label: "Пет подсхеми", values: { attrs: "A B C D E", fds: "A->C; B->C; C->D; D,E->C; C,E->A", dec: "A D|A B|B E|C D E|A E" } },
      ],
      legend: [["s-done", "a (отличен)"], ["s-act", "изравнявани редове"], ["s-cmp", "променена колона"]],
      build: algos.chase,
      draw(st, f) {
        st.innerHTML = "";
        const sch = f.sch, Fd = FD();
        const tb = h("table", { class: "t grid t6 t6-tableau" }, h("tr", null, h("th", { text: "" }), ...sch.names.map((n, j) => h("th", { class: f.col === j ? "s-cmp" : "", text: n }))));
        f.t.forEach((row, i) => {
          const tr = h("tr", { class: f.full === i ? "s-done" : "" }, h("th", { text: `R${i + 1} {${Fd.str(sch, f.rels[i])}}` }));
          row.forEach((v, j) => {
            let cls = v === 0 ? "s-done" : "";
            if ((f.r1 === i || f.r2 === i)) cls = j === f.col ? "s-cmp" : cls || "s-act";
            const lab = v === 0 ? "a" + (j + 1) : "b" + (Math.floor((v - 1) / 12) + 1) + "," + (((v - 1) % 12) + 1);
            tr.append(h("td", { class: cls, html: v === 0 ? `a<sub>${j + 1}</sub>` : `b<sub>${lab.slice(1)}</sub>` }));
          });
          tb.append(tr);
        });
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.pres) st.append(h("p", { class: "t6-res", style: { marginTop: "8px" }, text: "Запазени ФЗ: " + f.pres }));
      },
    });
  }

  S.chapter({ id: "anomalii", order: 6, num: "6", group: "Зависимости и нормализация", title: "Аномалии и разлагане без загуба", lead: "Повторението поражда аномалии при добавяне, изменение и изтриване. Разлагането трябва да е без загуба — проверява се, не се приема.", html, mount, algos });
})();
