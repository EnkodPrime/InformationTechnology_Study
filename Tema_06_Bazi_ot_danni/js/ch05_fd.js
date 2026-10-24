/* Раздел 5 — Функционални зависимости, затваряне X⁺, кандидатни ключове (глава 4, първа част). */
(function () {
  const S = window.Study, h = S.h;
  const FD = () => window.T6FD;

  const PRESETS = {
    abc: { attrs: "A B C", fds: "A->B; B->C", x: "A", t: "R(A,B,C): A→B, B→C" },
    enr: { attrs: "StudentID StudentName CourseID CourseName Grade", fds: "StudentID->StudentName; CourseID->CourseName; StudentID,CourseID->Grade", x: "StudentID", t: "Enrollment (ръководство)" },
    sct: { attrs: "Student Course Teacher", fds: "Student,Course->Teacher; Teacher->Course", x: "Teacher", t: "Student–Course–Teacher (BCNF пример)" },
    per: { attrs: "NationalID Country DocumentNo Name", fds: "NationalID->Country,DocumentNo,Name; Country,DocumentNo->NationalID", x: "Country,DocumentNo", t: "Два кандидатни ключа с различна дължина" },
    big: { attrs: "A B C D E F", fds: "A,B->C; C->D; D->A; E->F; B,D->E", x: "A,B", t: "Шест атрибута, три ключа" },
  };

  const algos = {
    closure({ attrs, fds, x }) {
      const F = FD(), sch = F.parse(attrs, fds);
      const X = sch.set(String(x));
      if (!X) throw new Error("X е празно — въведи поне един атрибут.");
      const frames = [], cnt = {};
      const res = F.closure(sch, X, cnt, frames);
      let pass = 0, checks = 0;
      frames.forEach((f) => {
        if (f.at === "cl_pass" && f.pass > pass) pass = f.pass;
        if ([].concat(f.at).includes("cl_test")) checks++;
        f.sch = sch; f.X = X; f.stats = { проходи: pass, "проверени ФЗ": checks };
        f.vars = { X: "{" + F.str(sch, X) + "}", "X⁺": "{" + F.str(sch, f.res) + "}" };
      });
      const all = res === sch.all;
      const last = frames[frames.length - 1];
      last.inv = all ? { text: `{${F.str(sch, X)}} е суперключ (X⁺ = всички атрибути)`, ok: true } : { text: `{${F.str(sch, X)}} не е суперключ — липсват ${F.str(sch, sch.all & ~res)}`, ok: false };
      return { frames, result: F.str(sch, res), passes: cnt.passes, checks: cnt.checks, superkey: all };
    },

    keys({ attrs, fds }) {
      const F = FD(), sch = F.parse(attrs, fds);
      if (sch.n > 8) throw new Error("За стъпковото търсене на ключове — най-много 8 атрибута.");
      const frames = [], cnt = {};
      const keys = F.keys(sch, cnt, frames);
      frames.forEach((f) => { f.sch = sch; f.stats = { "изчислени затваряния": "—" }; });
      let c = 0;
      frames.forEach((f) => { if ([].concat(f.at).includes("k_test")) c++; f.stats = { "изчислени затваряния": c, "намерени ключове": f.keys.length }; });
      const prime = F.prime(keys);
      frames.push({ at: "k_size", sch, keys: keys.slice(), done: true, stats: frames[frames.length - 1].stats,
        msg: `Кандидатни ключове: ${keys.map((k) => "{" + F.str(sch, k) + "}").join(", ")}. Първични атрибути: {${F.str(sch, prime)}}. Непървични: {${F.str(sch, sch.all & ~prime)}}.` });
      return { frames, result: keys.map((k) => "{" + F.str(sch, k) + "}").join(" "), closures: cnt.closures, prime: F.str(sch, prime) };
    },

    holds({ rows, x, y }) {
      const lines = String(rows).split("|").map((s) => s.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error("Нужни са схема и поне един ред: „A B|1 x|2 y“.");
      const cols = lines[0].split(/\s+/);
      const data = lines.slice(1).map((l, i) => { const v = l.split(/\s+/); if (v.length !== cols.length) throw new Error(`Ред ${i + 1}: ${v.length} стойности при ${cols.length} атрибута.`); return v; });
      if (data.length > 8) throw new Error("Най-много 8 реда.");
      const idx = (s) => s.split(/[\s,]+/).filter(Boolean).map((n) => { const k = cols.indexOf(n); if (k < 0) throw new Error(`Няма атрибут „${n}“.`); return k; });
      const X = idx(x), Y = idx(y);
      if (!X.length || !Y.length) throw new Error("X и Y не трябва да са празни.");
      const F = [];
      const st = { cols, data, X, Y };
      F.push({ ...st, msg: `Проверяваме дали {${X.map((k) => cols[k]).join(",")}} → {${Y.map((k) => cols[k]).join(",")}} е изпълнена в <b>текущото състояние</b>: всяка двойка редове с еднакво X трябва да има еднакво Y.` });
      for (let i = 0; i < data.length; i++) for (let j = i + 1; j < data.length; j++) {
        const sx = X.every((k) => data[i][k] === data[j][k]), sy = Y.every((k) => data[i][k] === data[j][k]);
        F.push({ ...st, at: ["h_j", "h_x"], pi: i, pj: j, sx, sy, msg: `Редове ${i + 1} и ${j + 1}: X ${sx ? "еднакво" : "различно"}${sx ? `, Y ${sy ? "еднакво" : "<b>различно</b>"}` : " — двойката не е свидетел"}.` });
        if (sx && !sy) {
          F.push({ ...st, at: "h_bad", pi: i, pj: j, sx, sy, bad: true, done: true, msg: `Контрапример: редове ${i + 1} и ${j + 1}. Зависимостта <b>не е изпълнена</b> в това състояние, значи не може да е правило на предметната област.`, inv: { text: "Едно нарушение опровергава ФЗ", ok: false } });
          return { frames: F, ok: 0, pi: i, pj: j };
        }
      }
      F.push({ ...st, at: "h_ok", done: true, msg: "Няма контрапример в текущите редове. Това <b>не доказва</b> зависимостта: следващо допустимо вмъкване може да я наруши. Функционалната зависимост е правило на предметната област, не наблюдение.", inv: { text: "Съвместимо с ФЗ ≠ доказателство за ФЗ", ok: true } });
      return { frames: F, ok: 1, pi: -1, pj: -1 };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="функционална зависимост">Функционалната зависимост</dfn> X→Y означава, че във всяко допустимо състояние два кортежа с еднакви стойности на X имат еднакви стойности на Y. Тя изразява <b>правило на предметната област</b>. Случайното съвпадение в текущите редове не доказва зависимостта за всички допустими данни. Лявата страна е <dfn data-g="детерминант">детерминант</dfn>.</p>
  <p>X→Y не казва, че програмата изчислява Y аритметично от X. StudentID→StudentName е ограничение, дори името да няма числова формула. Обратното StudentName→StudentID не следва: различни студенти могат да имат едно име.</p>
</div>

<div class="block">
  <h3>Данните могат само да опровергаят зависимост</h3>
  <div id="v-holds"></div>
  <details class="trap"><summary>Капан: „в таблицата CourseName определя CourseID, значи CourseName→CourseID“</summary><div>
    <p>Текущото <dfn data-g="състояние на база">състояние</dfn> може да е съвместимо със зависимост, която не е правило. Посоката на извода е само една: контрапример в данните опровергава ФЗ; липсата на контрапример не я доказва.</p>
  </div></details>
</div>

<div class="block">
  <h3>Затваряне на атрибути X⁺</h3>
  <p class="prose"><dfn data-g="затваряне на атрибути">Затварянето X⁺</dfn> спрямо набор зависимости е множеството атрибути, които X определя. При A→B и B→C получаваме {A}⁺ = {A, B, C}. Ако това са всички атрибути на схемата, A е <dfn data-g="суперключ">суперключ</dfn>; ако няма по-малък определящ поднабор, е <dfn data-g="кандидатен ключ">кандидатен ключ</dfn>. Така ключовете се <b>извеждат от правилата</b>, а не се избират само по удобен вид на колоната.</p>
  <div id="v-cl"></div>
  <details class="hint"><summary>Защо алгоритъмът винаги спира и е коректен</summary><div>
    <p><b>Спиране:</b> X⁺ само расте и е подмножество на краен брой атрибути n; всеки проход, който не спира, добавя поне един атрибут ⇒ най-много n + 1 прохода.</p>
    <p><b>Коректност:</b> всяко добавяне следва от правилата (транзитивност и обединение на зависимости); при неподвижна точка никоя зависимост не може да добави нищо, значи няма какво друго X да определя чрез тези правила.</p>
    <p>Цена: O(n · |F|) проверки при битови маски — в C всяка проверка е една операция <code>(lhs &amp; ~res) == 0</code>.</p>
  </div></details>
  <div class="key"><span class="formula">X е суперключ ⇔ X⁺ = всички атрибути</span><br><span class="formula">X е кандидатен ключ ⇔ X⁺ = всички и ∀ собствено Y ⊂ X: Y⁺ ≠ всички</span></div>
</div>

<div class="block">
  <h3>Схема 8 · Затваряне за проверка на ключ — всички кандидатни ключове</h3>
  <p class="prose">За схема R(A, B, C) и точно посочените зависимости A определя цялата схема. Минималността на кандидатния ключ се проверява отделно. Алгоритъмът по-долу обхожда подмножествата по нарастващ размер; надмножество на вече намерен ключ се пропуска без затваряне, защото не може да е минимално.</p>
  <div id="v-keys"></div>
  <details class="hint"><summary>Хинт: минимален по включване ≠ най-малък</summary><div><p>Пусни „Два ключа с различна дължина“: {NationalID} и {Country, DocumentNo} са кандидатни ключове. Вторият не престава да е кандидатен, защото никой негов собствен поднабор не е суперключ.</p></div></details>
  <details class="trap"><summary>Капан: експоненциален брой подмножества</summary><div><p>Броят на подмножествата е 2ⁿ − 1, а броят на кандидатните ключове може да е експоненциален в n. Обхождането е учебно — за малки схеми. Пропускането на надмножествата на намерените ключове намалява работата, но не променя най-лошия случай.</p></div></details>
</div>

<div class="block">
  <h3>Предпоставките на примера Enrollment</h3>
  <p class="prose">При Enrollment(StudentID, CourseID, StudentName, CourseName, Grade) предполагаме един запис за двойка студент и дисциплина. Имената зависят само от част от съставния ключ, а Grade — от цялата двойка. Ако се допускат повторно записване, семестри или различни опити, първоначалната схема вече не изразява правилно идентичността. Нормализацията започва с точното предметно правило, не с механично разделяне.</p>
</div>`;

  function drawSchemaFDs(st, f, F) {
    const sch = f.sch;
    const cls = (k) => {
      const b = 1 << k;
      if (f.added && f.added & b) return "s-done";
      if (f.X != null && f.X & b) return "s-piv";
      if (f.res != null && f.res & b) return "s-act";
      return "";
    };
    st.append(h("div", null, h("span", { class: "eyebrow", text: "Атрибути (лилаво — X; синьо — вече в X⁺; зелено — току-що добавени)" }), T6.attrs(sch.names, (a, k) => cls(k))));
    const tb = h("table", { class: "t", style: { marginTop: "10px" } }, h("tr", null, h("th", { text: "#" }), h("th", { text: "зависимост" }), h("th", { text: "лявата ⊆ X⁺?" })));
    sch.fds.forEach((d, i) => {
      const cur = i === f.fi;
      const inL = f.res != null ? F.sub(d.lhs, f.res) : null;
      tb.append(h("tr", { class: cur ? (f.ok ? "s-done" : "s-cmp") : "" },
        h("td", { class: "mono", text: i + 1 }), h("td", { class: "mono", text: F.fdStr(sch, d) }),
        h("td", { class: "mono", text: inL == null ? "" : inL ? "да" : "не" })));
    });
    st.append(h("div", { class: "tbl-wrap" }, tb));
  }

  function mount(root) {
    S.viz(root.querySelector("#v-holds"), {
      id: "holds", title: "Изпълнена ли е X→Y в текущите редове?", sub: "Сравняват се всички двойки редове.",
      code: "ch05_holds",
      inputs: [
        { id: "rows", label: "Таблица (атрибути|ред|…)", value: "StudentID StudentName CourseID CourseName|1 Ana C1 Bazi|1 Ana C2 Algo|2 Boris C1 Bazi|3 Ana C2 Algo", width: "34em" },
        { id: "x", label: "X", value: "StudentName", width: "9em" }, { id: "y", label: "Y", value: "StudentID", width: "9em" },
      ],
      presets: [
        { label: "StudentID → StudentName", values: { x: "StudentID", y: "StudentName" } },
        { label: "StudentName → StudentID", values: { x: "StudentName", y: "StudentID" } },
        { label: "CourseName → CourseID", values: { x: "CourseName", y: "CourseID" }, title: "Съвместима с данните, но не е правило" },
      ],
      legend: [["s-cmp", "двойка с еднакво X"], ["s-swap", "контрапример"], ["s-piv", "X"], ["s-act", "Y"]],
      build: algos.holds,
      draw(st, f) {
        st.innerHTML = "";
        const rowCls = {}, colCls = {};
        f.X.forEach((k) => (colCls[k] = "s-piv")); f.Y.forEach((k) => (colCls[k] = "s-act"));
        if (f.pi != null) { const c = f.bad ? "s-swap" : f.sx ? "s-cmp" : "s-dim"; rowCls[f.pi] = c; rowCls[f.pj] = c; }
        st.append(T6.table({ cols: f.cols, rows: f.data }, { rowCls, colCls }));
      },
    });

    const P = PRESETS;
    S.viz(root.querySelector("#v-cl"), {
      id: "cl", title: "Затваряне X⁺ стъпка по стъпка", sub: "Зависимости: „X->Y“, разделени с „;“; атрибутите в лявата/дясната страна — със запетая.",
      code: "ch05_closure",
      inputs: [
        { id: "attrs", label: "Схема R", value: P.abc.attrs, width: "22em" },
        { id: "fds", label: "Зависимости F", value: P.abc.fds, width: "30em" },
        { id: "x", label: "X", value: P.abc.x, width: "11em" },
      ],
      presets: Object.values(P).map((p) => ({ label: p.t, values: { attrs: p.attrs, fds: p.fds, x: p.x } })).concat([{ label: "Enrollment: {StudentID, CourseID}⁺", values: { attrs: P.enr.attrs, fds: P.enr.fds, x: "StudentID,CourseID" } }]),
      legend: [["s-piv", "X"], ["s-act", "в X⁺"], ["s-done", "нов"], ["s-cmp", "не се прилага"]],
      build: algos.closure,
      draw(st, f) { st.innerHTML = ""; drawSchemaFDs(st, f, FD()); },
    });

    S.viz(root.querySelector("#v-keys"), {
      id: "keys", title: "Всички кандидатни ключове", sub: "Подмножества по нарастващ размер; надмножествата на намерен ключ се пропускат.",
      code: "ch05_keys",
      inputs: [{ id: "attrs", label: "Схема R", value: P.sct.attrs, width: "22em" }, { id: "fds", label: "Зависимости F", value: P.sct.fds, width: "30em" }],
      presets: Object.values(P).map((p) => ({ label: p.t, values: { attrs: p.attrs, fds: p.fds } })).concat([{ label: "Без зависимости", values: { attrs: "A B C D", fds: "" } }]),
      legend: [["s-act", "проверявано X"], ["s-done", "ключ"], ["s-dim", "надмножество — пропуснато"], ["s-piv", "намерени ключове"]],
      speed: 2,
      build: algos.keys,
      draw(st, f) {
        st.innerHTML = "";
        const F = FD(), sch = f.sch;
        if (f.X != null) {
          st.append(h("div", null, h("span", { class: "eyebrow", text: "Проверявано X" + (f.cl != null ? " и X⁺" : "") }),
            T6.attrs(sch.names, (a, k) => (f.X >> k & 1 ? (f.skip != null ? "s-dim" : f.ok ? "s-done" : "s-act") : f.cl != null && f.cl >> k & 1 ? "s-cmp" : ""))));
        }
        const kb = h("div", { style: { marginTop: "12px" } }, h("span", { class: "eyebrow", text: "Намерени кандидатни ключове" }));
        const row = h("div", { class: "t6-attrs" });
        if (!f.keys.length) row.append(h("span", { class: "muted", text: "— още няма" }));
        f.keys.forEach((k) => row.append(h("span", { class: "pill s-piv", text: "{" + F.str(sch, k) + "}" })));
        kb.append(row);
        st.append(kb);
        if (f.done) {
          const prime = F.prime(f.keys);
          st.append(h("div", { style: { marginTop: "12px" } }, h("span", { class: "eyebrow", text: "Първични (лилаво) и непървични атрибути" }), T6.attrs(sch.names, (a, k) => (prime >> k & 1 ? "s-piv" : ""))));
        }
      },
    });
  }

  S.chapter({ id: "fz", order: 5, num: "5", group: "Зависимости и нормализация", title: "Функционални зависимости и ключове", lead: "X→Y е правило на предметната област. Затварянето X⁺ стъпка по стъпка и извеждане на всички кандидатни ключове.", html, mount, algos });
})();
