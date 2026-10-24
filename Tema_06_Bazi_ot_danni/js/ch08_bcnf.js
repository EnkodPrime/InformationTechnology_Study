/* Раздел 8 — Нормална форма на Бойс и Код (глава 6): BCNF срещу 3НФ, разлагане,
   компромисът със запазването на зависимостите, денормализация. */
(function () {
  const S = window.Study, h = S.h;
  const FD = () => window.T6FD;

  const PRESETS = {
    sct: { attrs: "Student Course Teacher", fds: "Student,Course->Teacher; Teacher->Course", t: "Student–Course–Teacher" },
    enr: { attrs: "StudentID StudentName CourseID CourseName Grade", fds: "StudentID->StudentName; CourseID->CourseName; StudentID,CourseID->Grade", t: "Enrollment" },
    emp: { attrs: "EmpID DeptID DeptName", fds: "EmpID->DeptID; DeptID->DeptName", t: "Employee" },
    big: { attrs: "A B C D E F", fds: "A,B->C; C->D; D->A; E->F; B,D->E", t: "Шест атрибута" },
  };

  const algos = {
    bcnf({ attrs, fds }) {
      const F = FD(), sch = F.parse(attrs, fds);
      if (sch.n > 8) throw new Error("Най-много 8 атрибута.");
      const frames = [];
      const rels = F.bcnf(sch, {}, frames);
      let pres = 0;
      const pr = sch.fds.map((d) => { const ok = F.preserved(sch, rels, d); pres += ok; return ok; });
      const ll = F.chase(sch, rels).row > 0;
      frames.forEach((f) => { f.sch = sch; f.stats = { подсхеми: f.rels.length }; });
      const last = frames[frames.length - 1];
      last.pr = pr; last.ll = ll;
      last.inv = { text: `без загуба: ${ll ? "да" : "не"}; запазени ФЗ: ${pres}/${sch.fds.length}`, ok: pres === sch.fds.length };
      return { frames, result: rels.map((r) => "{" + F.str(sch, r) + "}").join(" "), preserved: `${pres}/${sch.fds.length}`, lossless: ll ? 1 : 0 };
    },

    preserve({ attrs, fds, dec, fd }) {
      const F = FD(), sch = F.parse(attrs, fds);
      const rels = String(dec).split("|").map((s) => s.trim()).filter(Boolean).map((p) => sch.set(p));
      if (rels.length < 1) throw new Error("Въведи поне една подсхема.");
      const k = S.int(fd, 1, sch.fds.length, "Номерът на зависимостта");
      const d = sch.fds[k - 1];
      const frames = [];
      const ok = F.preserved(sch, rels, d, {}, frames);
      frames.forEach((f) => { f.sch = sch; f.rels = rels; f.d = d; f.vars = { Z: "{" + F.str(sch, f.Z) + "}" }; });
      return { frames, ok: ok ? 1 : 0 };
    },

    /** Нарушение на неналожено правило в BCNF разлагането (данни). */
    violate({ teacher }) {
      const T = [["Ivanov", "Bazi"], ["Petrov", "Bazi"], ["Georgiev", "Algo"]];
      const A = [["Ana", "Ivanov"], ["Boris", "Petrov"], ["Ana", "Georgiev"]];
      if (!T.some((t) => t[0] === teacher)) throw new Error("Избери преподавател от Teaching.");
      const F = [];
      F.push({ T, A, msg: "Teaching(Teacher, Course) и Assignment(Student, Teacher). Teacher е ключ на Teaching." });
      const A2 = A.concat([["Ana", teacher]]);
      const dup = A.some((r) => r[0] === "Ana" && r[1] === teacher);
      F.push({ T, A: A2, hlA: [A2.length - 1], msg: dup ? `(Ana, ${teacher}) вече съществува — Assignment ще откаже повторение по своя ключ.` : `Вмъкваме (Ana, ${teacher}) в Assignment. Локално: ключът (Student, Teacher) е уникален — <b>приема се</b>.` });
      const course = T.find((t) => t[0] === teacher)[1];
      const conflict = A.filter((r) => r[0] === "Ana" && T.find((t) => t[0] === r[1])[1] === course && r[1] !== teacher);
      const J = A2.map((r) => [r[0], T.find((t) => t[0] === r[1])[1], r[1]]);
      const rc = {};
      J.forEach((r, i) => { if (r[0] === "Ana" && r[1] === course) rc[i] = conflict.length ? "s-swap" : "s-done"; });
      F.push({ T, A: A2, J, rc, done: true, msg: conflict.length ? `Съединението показва: Ana изучава ${course} при <b>двама</b> преподаватели. Правилото (Student, Course) → Teacher е нарушено, но нито една от двете таблици не го забелязва — нужна е проверка върху съединението (тригер, приложна логика).` : `Ana изучава ${course} само при ${teacher} — правилото е спазено. Пробвай преподавател от курс, който Ana вече изучава.`, inv: conflict.length ? { text: "(Student, Course) → Teacher е нарушена", ok: false } : { text: "Няма нарушение", ok: true } });
      return { frames: F, conflict: conflict.length };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="bcnf">BCNF</dfn> (Boyce–Codd Normal Form) изисква всеки <dfn data-g="детерминант">детерминант</dfn> на нетривиална функционална зависимост да е <dfn data-g="суперключ">суперключ</dfn>. Тя е по-строга от <dfn data-g="3нф">3НФ</dfn>, защото не допуска изключението за <dfn data-g="първичен атрибут">първичен атрибут</dfn> отдясно. Всяка релация в BCNF е в 3НФ, но обратното не е общовалидно.</p>
</div>

<div class="block">
  <h3>Схема 13 · Защо 3НФ не е тъждествена на BCNF</h3>
  <p class="prose">Нека R(Student, Course, Teacher) има зависимости (Student, Course)→Teacher и Teacher→Course: всеки преподавател води точно един курс, а за студент и курс има един преподавател. Кандидатни ключове са (Student, Course) и (Student, Teacher). Teacher не е суперключ, но Course е първичен атрибут, затова втората зависимост е допустима в 3НФ и нарушава BCNF.</p>
  <div class="tbl-wrap"><table class="t" id="b-cmp"></table></div>
  <p class="muted">Пусни анализатора от <a href="#nf123">раздел 7</a> с „Student–Course–Teacher (3НФ, не BCNF)“, за да видиш стъпките.</p>
</div>

<div class="block">
  <h3>BCNF разлагане</h3>
  <p class="prose">Стандартният алгоритъм: докато има подсхема Rᵢ с детерминант X, който не е неин суперключ, заместваме Rᵢ с X ∪ (X⁺ ∩ Rᵢ) и Rᵢ − (X⁺ − X). Общата част X е суперключ на първата половина (X определя X⁺ ∩ Rᵢ) — затова всяко разделяне е <dfn data-g="беззагубно разлагане">без загуба</dfn>. <span class="extra-tag">извън конспекта</span> (ръководството дава резултата за примера; общият алгоритъм е стандартен.)</p>
  <div id="v-bcnf"></div>
  <details class="hint"><summary>Защо всяко BCNF разделяне е без загуба, но може да загуби зависимост</summary><div>
    <p>Двете части имат общо X и X → (X⁺ ∩ Rᵢ) — тоест сечението определя едната част. Това е точно условието за беззагубно разлагане на две части. Но зависимост, чиито атрибути попадат в различни части, вече няма таблица, в която да се провери директно; тя е запазена само ако следва от локалните зависимости на частите (напр. при A→B, B→C и разлагане AB, BC зависимостта A→C е запазена). Ако не следва — тя се губи.</p>
  </div></details>
</div>

<div class="block">
  <h3>Компромисът: беззагубност срещу запазване на зависимостите</h3>
  <p class="prose">Разлагането на Teaching(Teacher, Course) и Assignment(Student, Teacher) е без загуба по Teacher→Course, но зависимостта (Student, Course)→Teacher не може да се наложи само чрез отделни локални функционални зависимости в двете таблици. <dfn data-g="запазване на зависимостите">Запазване на зависимостите</dfn> и липса на загуба са отделни свойства. По-високата форма не е автоматично безплатна във всяко отношение.</p>
  <div id="v-pres"></div>
  <div id="v-viol"></div>
  <details class="trap"><summary>Капан: „BCNF винаги е по-добре от 3НФ“</summary><div><p>Тук BCNF премахва повторението „преподавател → курс“, но правилото „един преподавател за студент и курс“ остава без локална проверка. Изборът между 3НФ (запазва зависимостта) и BCNF (премахва още излишък) зависи от това кое е по-важно за предметната област.</p></div></details>
</div>

<div class="block">
  <h3>Нормализацията не е механично раздробяване</h3>
  <p class="prose">Нормализацията не означава механично създаване на възможно най-много таблици. Тя се извършва спрямо реалните правила. <dfn data-g="денормализация">Денормализацията</dfn> е съзнателно дублиране за конкретна нужда и изисква механизъм за съгласуваност. Не трябва да се използва като обяснение за случайно лоша схема.</p>
  <div class="split">
    <div class="key"><b>Нормализация</b><p>Отстранява излишъци и аномалии спрямо зависимостите. Не прави всяка заявка по-бърза.</p></div>
    <div class="key"><b>Денормализация</b><p>Съзнателно, документирано дублиране + правило за съгласуваност (кой и кога обновява копието).</p></div>
  </div>
  <p class="prose muted">По-високите нормални форми (4NF и др.) разглеждат <dfn data-g="mvd">многозначни зависимости</dfn> и зависимости на съединение — <a href="#dopalnenie">раздел 10</a>. <span class="extra-tag">извън конспекта</span></p>
</div>`;

  function mount(root) {
    const t = root.querySelector("#b-cmp");
    t.append(h("tr", null, ...["Зависимост", "Детерминантът суперключ ли е?", "Дясната страна първична ли е?", "3НФ", "BCNF"].map((x) => h("th", { text: x }))));
    t.append(h("tr", null, h("td", { class: "mono", text: "Student,Course → Teacher" }), h("td", { text: "да" }), h("td", { text: "да" }), h("td", null, h("span", { class: "pill s-done", text: "допустима" })), h("td", null, h("span", { class: "pill s-done", text: "допустима" }))));
    t.append(h("tr", null, h("td", { class: "mono", text: "Teacher → Course" }), h("td", { text: "не" }), h("td", { text: "да (Course е в ключа Student,Course)" }), h("td", null, h("span", { class: "pill s-done", text: "допустима" })), h("td", null, h("span", { class: "pill s-swap", text: "нарушение" }))));

    S.viz(root.querySelector("#v-bcnf"), {
      id: "bcnf", title: "BCNF разлагане стъпка по стъпка", sub: "Накрая: без загуба ли е и кои зависимости са запазени.",
      code: "ch08_bcnf",
      inputs: [{ id: "attrs", label: "Схема R", value: PRESETS.sct.attrs, width: "24em" }, { id: "fds", label: "Зависимости F", value: PRESETS.sct.fds, width: "34em" }],
      presets: Object.values(PRESETS).map((p) => ({ label: p.t, values: { attrs: p.attrs, fds: p.fds } })),
      legend: [["s-act", "проверявана"], ["s-swap", "нарушение"], ["s-done", "в BCNF"], ["s-piv", "детерминант X"]],
      build: algos.bcnf,
      draw(st, f) {
        st.innerHTML = "";
        const Fd = FD(), sch = f.sch;
        const wrap = h("div", { style: { display: "grid", gap: "8px" } });
        f.rels.forEach((R, i) => {
          const isCur = f.ri === i;
          const cls = (a, k) => (isCur && f.X != null && f.X >> k & 1 ? "s-piv" : isCur && f.c != null && f.c >> k & 1 ? "s-cmp" : "");
          const names = sch.names.filter((n, k) => R >> k & 1);
          const idx = sch.names.map((n, k) => k).filter((k) => R >> k & 1);
          wrap.append(h("div", { class: "row", style: { alignItems: "center" } },
            h("span", { class: "pill " + (isCur ? (f.X != null && f.at !== "b_split" ? "s-swap" : f.okRel === i ? "s-done" : "s-act") : f.done ? "s-done" : ""), text: "R" + (i + 1) }),
            T6.attrs(names, (a, j) => cls(a, idx[j]))));
        });
        st.append(wrap);
        if (f.pr) {
          const tb = h("table", { class: "t", style: { marginTop: "10px" } }, h("tr", null, h("th", { text: "зависимост" }), h("th", { text: "запазена?" })));
          sch.fds.forEach((d, i) => tb.append(h("tr", { class: f.pr[i] ? "s-done" : "s-swap" }, h("td", { class: "mono", text: Fd.fdStr(sch, d) }), h("td", { text: f.pr[i] ? "да" : "не" }))));
          st.append(h("div", { class: "tbl-wrap" }, tb));
        }
      },
    });

    S.viz(root.querySelector("#v-pres"), {
      id: "pres", title: "Запазена ли е зависимостта?", sub: "Z расте само чрез затваряния вътре в отделните подсхеми.",
      code: "ch08_preserve",
      inputs: [
        { id: "attrs", label: "Схема R", value: PRESETS.sct.attrs, width: "18em" },
        { id: "fds", label: "Зависимости F", value: PRESETS.sct.fds, width: "26em" },
        { id: "dec", label: "Разлагане", value: "Teacher Course|Student Teacher", width: "18em" },
        { id: "fd", label: "№ на ФЗ", type: "number", value: 1, width: "5em" },
      ],
      presets: [
        { label: "(Student,Course)→Teacher", values: { attrs: PRESETS.sct.attrs, fds: PRESETS.sct.fds, dec: "Teacher Course|Student Teacher", fd: 1 } },
        { label: "Teacher→Course", values: { attrs: PRESETS.sct.attrs, fds: PRESETS.sct.fds, dec: "Teacher Course|Student Teacher", fd: 2 } },
        { label: "Employee, EmpID→DeptID", values: { attrs: PRESETS.emp.attrs, fds: PRESETS.emp.fds, dec: "DeptID DeptName|EmpID DeptID", fd: 1 } },
      ],
      legend: [["s-act", "Z"], ["s-done", "добавени"]],
      build: algos.preserve,
      draw(st, f) {
        st.innerHTML = "";
        const Fd = FD(), sch = f.sch;
        st.append(h("p", { class: "t6-res", text: "Проверявана: " + Fd.fdStr(sch, f.d) }));
        f.rels.forEach((R, i) => st.append(h("div", { class: "row", style: { alignItems: "center", marginTop: "6px" } },
          h("span", { class: "pill " + (f.ri === i ? "s-act" : ""), text: "R" + (i + 1) }),
          T6.attrs(sch.names.filter((n, k) => R >> k & 1), (a) => { const k = sch.names.indexOf(a); return f.ri === i && f.add != null && f.add >> k & 1 && !(f.Z >> k & 1) ? "s-done" : f.Z >> k & 1 ? "s-act" : ""; }))));
        if (f.done) st.append(h("p", { class: "pill " + (f.ok ? "s-done" : "s-swap"), style: { marginTop: "10px" }, text: f.ok ? "запазена" : "не е запазена" }));
      },
    });

    S.viz(root.querySelector("#v-viol"), {
      id: "viol", title: "Какво значи „не е запазена“ на практика", sub: "Учебни данни: Ana вече изучава Bazi при Ivanov и Algo при Georgiev.", code: false,
      inputs: [{ id: "teacher", label: "Вмъкни (Ana, ?) в Assignment", type: "select", value: "Petrov", options: ["Petrov", "Ivanov", "Georgiev"] }],
      legend: [["s-done", "нов ред"], ["s-swap", "нарушено правило"]],
      build: algos.violate,
      draw(st, f) {
        st.innerHTML = "";
        const ra = {}; (f.hlA || []).forEach((i) => (ra[i] = "s-done"));
        const kids = [T6.table({ name: "Teaching", cols: ["Teacher", "Course"], rows: f.T }, { pk: [0] }), T6.table({ name: "Assignment", cols: ["Student", "Teacher"], rows: f.A }, { pk: [0, 1], fk: [1], rowCls: ra })];
        if (f.J) kids.push(T6.op("⋈"), T6.table({ name: "Teaching ⋈ Assignment", cols: ["Student", "Course", "Teacher"], rows: f.J }, { rowCls: f.rc }));
        st.append(T6.row(...kids));
      },
    });
  }

  S.chapter({ id: "bcnf", order: 8, num: "8", group: "Зависимости и нормализация", title: "Нормална форма на Бойс и Код", lead: "Всеки детерминант — суперключ. Защо 3НФ ≠ BCNF, BCNF разлагане и цената му: зависимост, която вече не може да се провери локално.", html, mount, algos });
})();
