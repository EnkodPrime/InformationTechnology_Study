/* Раздел 7 — Първа, втора и трета нормална форма (глава 5). */
(function () {
  const S = window.Study, h = S.h;
  const FD = () => window.T6FD;

  const PRESETS = {
    enr: { attrs: "StudentID StudentName CourseID CourseName Grade", fds: "StudentID->StudentName; CourseID->CourseName; StudentID,CourseID->Grade", t: "Enrollment (2НФ пример)" },
    emp: { attrs: "EmpID DeptID DeptName", fds: "EmpID->DeptID; DeptID->DeptName", t: "Employee (3НФ пример)" },
    stu: { attrs: "student_id name programme_id programme_name", fds: "student_id->name,programme_id; programme_id->programme_name", t: "Student–Programme (схема 11)" },
    sct: { attrs: "Student Course Teacher", fds: "Student,Course->Teacher; Teacher->Course", t: "Student–Course–Teacher (3НФ, не BCNF)" },
    ok: { attrs: "Student Course Grade", fds: "Student,Course->Grade", t: "Enrollment след разлагането" },
    big: { attrs: "A B C D E F", fds: "A,B->C; C->D; D->A; E->F; B,D->E", t: "Шест атрибута" },
  };

  const algos = {
    analyze({ attrs, fds }) {
      const F = FD(), sch = F.parse(attrs, fds);
      if (sch.n > 8) throw new Error("Най-много 8 атрибута за анализа.");
      const frames = [], cnt = {};
      const r = F.analyze(sch, cnt, frames);
      frames.forEach((f) => { f.sch = sch; f.stats = { "нарушения 2НФ": f.viol.filter((v) => v.kind === 2).length, "3НФ": f.viol.filter((v) => v.kind === 3).length, "само BCNF": f.viol.filter((v) => v.kind === 4).length }; });
      const c = [2, 3, 4].map((k) => r.viol.filter((v) => v.kind === k).length).join(" ");
      return { frames, level: r.level, prime: F.str(sch, r.prime), viol: c };
    },

    phones({ mode }) {
      const rows = [["C42", "Ivan", "0881, 0882"], ["C43", "Maria", "0899"], ["C44", "Petar", "0877, 0878, 0879"]];
      const F = [];
      F.push({ mode: "flat", rows, msg: "Клиентите и телефоните им — списък в една клетка." });
      if (mode === "query") {
        F.push({ mode: "flat", rows, hl: [0, 2], msg: "Въпрос: „Кой клиент има телефон 0882?“ В тази форма трябва да се разглоби текстът на всяка клетка — релационната селекция работи с <b>цели стойности</b> на атрибута." });
      }
      const C = rows.map((r) => [r[0], r[1]]), P = [];
      rows.forEach((r) => r[2].split(",").map((x) => x.trim()).forEach((p) => P.push([r[0], p])));
      F.push({ mode: "split", C, P, msg: "Отделяме CustomerPhone(CustomerID, Phone): всеки телефон е отделна стойност в отделен ред. Ключ: (CustomerID, Phone)." });
      if (mode === "query") F.push({ mode: "split", C, P, hlP: P.map((p, i) => (p[1] === "0882" ? i : -1)).filter((i) => i >= 0), done: true, msg: "Сега „телефон 0882“ е обикновена селекция σ<sub>Phone = 0882</sub>(CustomerPhone)." });
      else F.push({ mode: "split", C, P, done: true, msg: "Атомарността се определя спрямо избраните домейни и операции. Ако телефоните трябва да се обработват като отделни стойности — отделната релация е естественото моделиране." });
      return { frames: F };
    },
  };

  const html = `
<div class="block">
  <h3>Първа нормална форма — схема 9</h3>
  <p class="prose"><dfn data-g="1нф">Първа нормална форма, 1НФ</dfn>, изисква стойностите на атрибутите да са атомарни в рамките на избрания модел и да няма повтарящи се групи. Списък от няколко независими телефона в една клетка затруднява релационните операции и обикновено се отделя в свързана таблица. Атомарността се определя спрямо разглежданите операции и <dfn data-g="домейн">домейни</dfn>.</p>
  <div id="v-1nf"></div>
  <details class="trap"><summary>Капан: атомарност ≠ „няма по-малки физически части“</summary><div>
    <p>Дата има ден, месец и година, но може да се използва като една домейнна стойност. Примерът не твърди, че всеки текст с разделител нарушава 1НФ — решава дали частите участват като отделни стойности в операции и проверки.</p>
  </div></details>
</div>

<div class="block">
  <h3>Втора и трета нормална форма</h3>
  <div class="split">
    <div class="key"><b>2НФ</b><p>1НФ и всеки <b>непървичен</b> атрибут е напълно функционално зависим от всеки кандидатен ключ.</p><p class="muted">Нарушение = зависимост от <b>собствена част</b> на ключ, а не просто наличие на съставен ключ.</p></div>
    <div class="key"><b>3НФ</b><p>За всяка нетривиална X→A: <b>X е суперключ</b> или <b>A е първичен атрибут</b>.</p><p class="muted">„Без транзитивни зависимости“ е училищна интуиция; формалното условие е по-точно при няколко кандидатни ключа.</p></div>
  </div>
  <p class="prose"><dfn data-g="2нф">2НФ</dfn>: непървичен е атрибут, който не участва в никой кандидатен ключ (<dfn data-g="първичен атрибут">първичен атрибут</dfn> е обратното) — а не просто „не е избраният primary key“. <dfn data-g="3нф">3НФ</dfn>: формулата „всички полета зависят само от ключа“ е полезна начална интуиция, но пропуска важни случаи с няколко кандидатни ключа.</p>
  <p class="muted">Анализаторът по-долу извежда ключовете със затваряне (<a href="#fz">раздел 5</a>), после проверява всяка собствена част на всеки ключ (2НФ) и всяка зависимост (3НФ и BCNF).</p>
  <div id="v-nf"></div>
  <details class="hint"><summary>Защо 2НФ проверява затварянето на частите на ключа, а не само зададените ФЗ</summary><div>
    <p>Частична зависимост може да е <i>изведена</i>: ако K = {A, B} и са дадени A→C и C→D, тогава D зависи от собствената част {A} на ключа, въпреки че A→D не е записана. Затова за всяка собствена част X се смята X⁺ и се търсят непървични атрибути в него.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 10 · 2НФ при съставен ключ — разлагането стъпка по стъпка</h3>
  <p class="prose">В примера StudentName зависи само от StudentID, а CourseName само от CourseID. Разлагаме на Student(StudentID, StudentName), Course(CourseID, CourseName) и Enrollment(StudentID, CourseID, Grade). Последната пази оценката за конкретна двойка студент–курс. Предпоставката е <b>едно записване и една оценка на двойка</b>; ако има семестри или опити, ключът се променя.</p>
  <div id="d-2nf"></div>
</div>

<div class="block">
  <h3>Схема 11 · Нормализацията премахва транзитивно повторение</h3>
  <p class="prose">Пример: Employee(EmpID, DeptID, DeptName), EmpID→DeptID и DeptID→DeptName. Ако DeptID не е ключ, а DeptName не е първичен атрибут, имаме нарушение на 3НФ. Отделяме Department(DeptID, DeptName) и Employee(EmpID, DeptID). Същото при student_id → programme_id и programme_id → programme_name: името на специалността се отделя в Programme, а Student пази <dfn data-g="външен ключ">външен ключ</dfn>.</p>
  <div id="d-3nf"></div>
  <div class="key">Реална проектна ситуация: студентската система пази факултетен номер в Student, дисциплини в Course и записвания в Enrollment. Външните ключове свързват записването със студент и дисциплина, без да се повтарят имената им във всеки ред.</div>
  <details class="trap"><summary>Капан: индексът не премахва аномалията</summary><div><p>„Добавянето на индекс не премахва аномалията от повтарящо се име на катедра в десет хиляди реда.“ Нормализацията организира логическите зависимости; индексирането организира достъпа (<a href="#tranzakcii">раздел 9</a>).</p></div></details>
</div>`;

  /* стъпково разлагане като щракаема схема (без C — показва избора на детерминант) */
  function decompDemo(host, P, steps) {
    let k = 0;
    const box = h("div", { class: "t6-diag" });
    const ctrl = h("div", { class: "row" });
    const msg = h("div", { class: "key" });
    const prev = h("button", { class: "btn", text: "◀ Назад", onclick: () => { if (k > 0) { k--; render(); } } });
    const next = h("button", { class: "btn primary", text: "Следваща стъпка ▶", onclick: () => { if (k < steps.length - 1) { k++; render(); } } });
    const reset = h("button", { class: "btn ghost", text: "Отначало", onclick: () => { k = 0; render(); } });
    const pos = h("span", { class: "muted" });
    ctrl.append(prev, next, reset, pos);
    host.append(ctrl, box, msg);
    function render() {
      const s = steps[k];
      box.innerHTML = "";
      box.append(T6.row(...s.tables.map((t) => T6.table({ name: t.name, cols: t.cols, rows: t.rows }, { pk: t.pk, fk: t.fk || [], colCls: t.colCls || {}, rowCls: t.rowCls || {} }))));
      msg.innerHTML = s.msg;
      prev.disabled = k === 0; next.disabled = k === steps.length - 1;
      pos.textContent = `стъпка ${k + 1}/${steps.length}`;
    }
    render();
  }

  function mount(root) {
    S.viz(root.querySelector("#v-1nf"), {
      id: "1nf", title: "Списък в една клетка → отделна релация", sub: "Учебни данни.", code: false,
      inputs: [{ id: "mode", label: "Сценарий", type: "select", value: "query", options: [["query", "търсене по телефон"], ["split", "само разлагането"]] }],
      legend: [["s-cmp", "трябва да се разглоби"], ["s-done", "намерено"]],
      build: algos.phones,
      draw(st, f) {
        st.innerHTML = "";
        if (f.mode === "flat") { const rc = {}; (f.hl || []).forEach((i) => (rc[i] = "s-cmp")); st.append(T6.table({ name: "Customer", cols: ["CustomerID", "Name", "Phones"], rows: f.rows }, { pk: [0], rowCls: rc })); }
        else { const rp = {}; (f.hlP || []).forEach((i) => (rp[i] = "s-done")); st.append(T6.row(T6.table({ name: "Customer", cols: ["CustomerID", "Name"], rows: f.C }, { pk: [0] }), T6.table({ name: "CustomerPhone", cols: ["CustomerID", "Phone"], rows: f.P }, { pk: [0, 1], fk: [0], rowCls: rp }))); }
      },
    });

    S.viz(root.querySelector("#v-nf"), {
      id: "nf", title: "Коя нормална форма? — анализ стъпка по стъпка", sub: "Ключове → 2НФ (части на ключовете) → 3НФ и BCNF (всяка зависимост).",
      code: "ch07_analyze",
      inputs: [
        { id: "attrs", label: "Схема R", value: PRESETS.enr.attrs, width: "24em" },
        { id: "fds", label: "Зависимости F", value: PRESETS.enr.fds, width: "34em" },
      ],
      presets: Object.values(PRESETS).map((p) => ({ label: p.t, values: { attrs: p.attrs, fds: p.fds } })),
      legend: [["s-piv", "първичен атрибут"], ["s-act", "проверявано"], ["s-swap", "нарушение"], ["s-done", "допустимо"]],
      speed: 1,
      build: algos.analyze,
      draw(st, f) {
        st.innerHTML = "";
        const Fd = FD(), sch = f.sch;
        st.append(h("div", null, h("span", { class: "eyebrow", text: "Атрибути (лилаво — първични)" }), T6.attrs(sch.names, (a, k) => {
          if (f.a === k) return f.bad ? "s-swap" : "s-act";
          if (f.X != null && f.X >> k & 1) return "s-act";
          if (f.dep != null && f.dep >> k & 1) return "s-cmp";
          return f.prime >> k & 1 ? "s-piv" : "";
        })));
        st.append(h("p", { class: "t6-res", style: { margin: "8px 0" }, text: "Ключове: " + f.keys.map((k) => "{" + Fd.str(sch, k) + "}").join("  ") }));
        const tb = h("table", { class: "t" }, h("tr", null, h("th", { text: "зависимост" }), h("th", { text: "детерминантът суперключ ли е?" })));
        sch.fds.forEach((d, i) => tb.append(h("tr", { class: f.fi === i ? (f.bad ? "s-swap" : f.sup ? "s-done" : "s-act") : "" }, h("td", { class: "mono", text: Fd.fdStr(sch, d) }), h("td", { class: "mono", text: Fd.closure(sch, d.lhs) === sch.all ? "да" : "не" }))));
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.viol.length) {
          const vb = h("div", { class: "t6-attrs", style: { marginTop: "10px" } });
          f.viol.forEach((v) => vb.append(h("span", { class: "pill s-swap", text: `${["", "", "2НФ", "3НФ", "BCNF"][v.kind]}: ${Fd.str(sch, v.lhs)} → ${sch.names[v.attr]}` })));
          st.append(vb);
        }
        if (f.level) {
          const L = ["1НФ", "2НФ", "3НФ", "BCNF"];
          st.append(h("div", { class: "t6-attrs", style: { marginTop: "10px" } }, ...L.map((x, i) => h("span", { class: "pill " + (i < f.level ? "s-done" : "s-dim"), text: (i < f.level ? "✓ " : "✗ ") + x }))));
        }
      },
    });

    const ENR = [["1", "Ana", "C1", "Bazi", "6"], ["1", "Ana", "C2", "Algoritmi", "5"], ["2", "Boris", "C1", "Bazi", "4"], ["3", "Vera", "C2", "Algoritmi", "3"]];
    const ec = ["StudentID", "StudentName", "CourseID", "CourseName", "Grade"];
    decompDemo(root.querySelector("#d-2nf"), PRESETS.enr, [
      { tables: [{ name: "Enrollment", cols: ec, rows: ENR, pk: [0, 2] }], msg: "Ключ (StudentID, CourseID). StudentName и CourseName се повтарят." },
      { tables: [{ name: "Enrollment", cols: ec, rows: ENR, pk: [0, 2], colCls: { 0: "s-piv", 1: "s-swap" } }], msg: "<b>StudentID → StudentName</b>: StudentName зависи от собствена част на ключа ⇒ нарушение на 2НФ." },
      { tables: [{ name: "Student", cols: ["StudentID", "StudentName"], rows: [["1", "Ana"], ["2", "Boris"], ["3", "Vera"]], pk: [0], colCls: { 1: "s-done" } }, { name: "Enrollment′", cols: ["StudentID", "CourseID", "CourseName", "Grade"], rows: ENR.map((r) => [r[0], r[2], r[3], r[4]]), pk: [0, 1], fk: [0] }], msg: "Отделяме Student(StudentID, StudentName). Всяко име — веднъж. Общият атрибут StudentID е ключ на Student ⇒ без загуба." },
      { tables: [{ name: "Student", cols: ["StudentID", "StudentName"], rows: [["1", "Ana"], ["2", "Boris"], ["3", "Vera"]], pk: [0] }, { name: "Enrollment′", cols: ["StudentID", "CourseID", "CourseName", "Grade"], rows: ENR.map((r) => [r[0], r[2], r[3], r[4]]), pk: [0, 1], fk: [0], colCls: { 1: "s-piv", 2: "s-swap" } }], msg: "<b>CourseID → CourseName</b>: същото нарушение за другата част на ключа." },
      { tables: [{ name: "Student", cols: ["StudentID", "StudentName"], rows: [["1", "Ana"], ["2", "Boris"], ["3", "Vera"]], pk: [0] }, { name: "Course", cols: ["CourseID", "CourseName"], rows: [["C1", "Bazi"], ["C2", "Algoritmi"]], pk: [0], colCls: { 1: "s-done" } }, { name: "Enrollment", cols: ["StudentID", "CourseID", "Grade"], rows: ENR.map((r) => [r[0], r[2], r[4]]), pk: [0, 1], fk: [0, 1], colCls: { 2: "s-done" } }], msg: "Резултат: Student, Course, Enrollment. <b>Grade остава в Enrollment</b>, защото зависи от цялата двойка — при предпоставката „една оценка на двойка“. Всяка таблица е в BCNF." },
    ]);

    const EMP = [["E1", "D1", "IT"], ["E2", "D1", "IT"], ["E3", "D2", "HR"], ["E4", "D1", "IT"]];
    decompDemo(root.querySelector("#d-3nf"), PRESETS.emp, [
      { tables: [{ name: "Employee", cols: ["EmpID", "DeptID", "DeptName"], rows: EMP, pk: [0] }], msg: "Ключ EmpID (един атрибут ⇒ 2НФ е изпълнена автоматично). DeptName се повтаря за всеки служител на катедрата." },
      { tables: [{ name: "Employee", cols: ["EmpID", "DeptID", "DeptName"], rows: EMP, pk: [0], colCls: { 1: "s-piv", 2: "s-swap" } }], msg: "<b>DeptID → DeptName</b>: DeptID не е суперключ, DeptName не е първичен ⇒ нарушение на 3НФ (транзитивно: EmpID → DeptID → DeptName)." },
      { tables: [{ name: "Department", cols: ["DeptID", "DeptName"], rows: [["D1", "IT"], ["D2", "HR"]], pk: [0], colCls: { 1: "s-done" } }, { name: "Employee", cols: ["EmpID", "DeptID"], rows: EMP.map((r) => [r[0], r[1]]), pk: [0], fk: [1] }], msg: "Department(DeptID, DeptName) и Employee(EmpID, DeptID) с външен ключ. Името на катедрата — веднъж." },
    ]);
  }

  S.chapter({ id: "nf123", order: 7, num: "7", group: "Зависимости и нормализация", title: "1НФ, 2НФ и 3НФ", lead: "Атомарност спрямо модела; частична зависимост от собствена част на ключ; 3НФ по формалното условие. Анализатор и разлагания стъпка по стъпка.", html, mount, algos });
})();
