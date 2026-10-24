/* Раздел 4 — SQL (глава 3, втора част): декларативност, логически ред на клаузите,
   LEFT JOIN, COUNT и NULL, тризначна логика, план за изпълнение. */
(function () {
  const S = window.Study, h = S.h;

  function parseStudents(txt) {
    const out = [];
    String(txt).split(/[;,]+/).map((x) => x.trim()).filter(Boolean).forEach((p) => {
      const m = /^(\d+)\s+(\S+)$/.exec(p);
      if (!m) throw new Error(`„${p}“: студент във вида „id име“, напр. „1 Ana“.`);
      if (out.some((s) => s.id === +m[1])) throw new Error(`Повторен id ${m[1]} — Student.id е първичен ключ.`);
      out.push({ id: +m[1], name: m[2].slice(0, 11) });
    });
    if (!out.length) throw new Error("Нужен е поне един студент.");
    if (out.length > 6) throw new Error("Най-много 6 студента.");
    return out;
  }
  function parseEnr(txt, studs) {
    const out = [];
    String(txt).split(/[;,]+/).map((x) => x.trim()).filter(Boolean).forEach((p) => {
      const m = /^(\d+)\s+(\d+)\s+(\d+)$/.exec(p);
      if (!m) throw new Error(`„${p}“: записване във вида „student_id course_id grade“, напр. „1 101 6“.`);
      const e = { sid: +m[1], cid: +m[2], grade: +m[3] };
      if (e.grade < 2 || e.grade > 6) throw new Error("Оценката е от 2 до 6.");
      if (!studs.some((s) => s.id === e.sid)) throw new Error(`Външен ключ: няма студент ${e.sid}.`);
      if (out.some((x) => x.sid === e.sid && x.cid === e.cid)) throw new Error(`Повторена двойка (${e.sid}, ${e.cid}) — първичен ключ.`);
      out.push(e);
    });
    if (out.length > 10) throw new Error("Най-много 10 записвания.");
    return out;
  }

  /* тризначна логика: F=0 U=1 T=2 */
  const TV = ["FALSE", "UNKNOWN", "TRUE"];
  const and = (a, b) => Math.min(a, b), or = (a, b) => Math.max(a, b), not = (a) => 2 - a;
  const ge = (x, isNull, g) => (isNull ? 1 : x >= g ? 2 : 0);

  const algos = {
    and, or, not, ge,

    query({ studs, enr, place, g, agg }) {
      const Sx = parseStudents(studs), E = parseEnr(enr, Sx);
      place = +place; agg = +agg;
      g = S.int(g, 2, 6, "Прагът g");
      const rows = [], F = [];
      const cond = place === 1 ? ` AND e.grade >= ${g}` : "";
      const where = place === 2 ? `\nWHERE e.grade >= ${g}` : "";
      const sql = `SELECT s.id, s.name, ${agg ? "COUNT(*)" : "COUNT(e.course_id)"} AS courses\nFROM Student AS s\nLEFT JOIN Enrollment AS e ON e.student_id = s.id${cond}${where}\nGROUP BY s.id, s.name\nORDER BY s.id;`;
      let phase = "FROM / JOIN";
      const snap = (o) => ({ Sx, E, sql, phase, rows: rows.map((r) => ({ ...r })), stats: { "редове след JOIN": rows.length }, ...o });
      F.push(snap({ msg: "Логическият ред на обработка: <b>FROM/JOIN → WHERE → GROUP BY → SELECT (агрегати) → ORDER BY</b>. Записаният ред на клаузите е друг. Реалният план може да се различава, но със същия смисъл." }));
      Sx.forEach((s, i) => {
        let matched = false;
        F.push(snap({ at: "lj_outer", si: i, msg: `Студент (${s.id}, ${s.name}): търсим записвания с e.student_id = ${s.id}${cond ? ` и e.grade ≥ ${g}` : ""}.` }));
        E.forEach((e, k) => {
          let on = e.sid === s.id ? 2 : 0;
          if (place === 1) on = and(on, ge(e.grade, false, g));
          F.push(snap({ at: ["lj_inner", "lj_on"], si: i, ek: k, eok: on === 2, msg: `ON за (${e.sid}, ${e.cid}, ${e.grade}): ${TV[on]}.` }));
          if (on !== 2) return;
          rows.push({ id: s.id, name: s.name, cid: e.cid, grade: e.grade, nul: false });
          matched = true;
          F.push(snap({ at: "lj_match", si: i, ek: k, eok: true, ri: rows.length - 1, msg: `Съвпадение — добавяме ред.`, log: `JOIN: (${s.id}, ${e.cid})` }));
        });
        if (!matched) {
          rows.push({ id: s.id, name: s.name, cid: null, grade: null, nul: true });
          F.push(snap({ at: "lj_pad", si: i, ri: rows.length - 1, msg: `Няма съвпадение. <b>LEFT JOIN</b> пази студента и попълва колоните на e с <b>NULL</b>.`, log: `JOIN: (${s.id}, NULL)` }));
        }
      });
      phase = "WHERE";
      if (place === 2) {
        const kept = [];
        rows.forEach((r, i) => {
          const c = ge(r.grade, r.nul, g);
          F.push(snap({ at: "wh_loop", ri: i, rok: c === 2, msg: `WHERE e.grade >= ${g}: ${r.nul ? "NULL" : r.grade} >= ${g} → <b>${TV[c]}</b>. ${c === 2 ? "Остава." : c === 1 ? "UNKNOWN не е TRUE — редът <b>отпада</b>." : "FALSE — отпада."}` }));
          if (c === 2) kept.push(r);
          else F.push(snap({ at: "wh_drop", ri: i, rok: false, dropped: true, msg: `Ред (${r.id}, ${r.nul ? "NULL" : r.cid}) отпада.${r.nul ? " Така LEFT JOIN-ът на практика става INNER JOIN за този студент." : ""}`, log: `WHERE: −(${r.id}, ${r.nul ? "NULL" : r.cid})` }));
        });
        rows.length = 0; kept.forEach((r) => rows.push(r));
      } else F.push(snap({ at: "wh_loop", msg: place === 1 ? "Условието е в ON — то вече е решило кои записвания да се съединят, а редът с NULL остава. WHERE няма." : "Няма WHERE." }));
      phase = "GROUP BY";
      const counts = [];
      let groups = 0;
      Sx.forEach((s, i) => {
        let cnt = 0, present = false;
        F.push(snap({ at: "gb_group", gi: s.id, counts: counts.slice(), msg: `Група s.id = ${s.id}.` }));
        rows.forEach((r, ri) => {
          if (r.id !== s.id) return;
          present = true;
          const counted = agg === 1 || !r.nul;
          if (counted) cnt++;
          F.push(snap({ at: ["gb_row", "gb_count"], gi: s.id, ri, rok: counted, counts: counts.slice(), msg: agg ? `COUNT(*) брои реда → ${cnt}.` : `COUNT(e.course_id): стойност ${r.nul ? "NULL — <b>не се брои</b>" : r.cid + " — брои се"} → ${cnt}.` }));
        });
        counts.push(present ? cnt : -1);
        if (present) groups++;
        F.push(snap({ at: "gb_emit", gi: s.id, counts: counts.slice(), msg: present ? `(${s.id}, ${s.name}, <b>${cnt}</b>).` : `Студент ${s.id} няма нито един ред след WHERE — групата <b>изчезва</b> от резултата.`, log: present ? `(${s.id}, ${s.name}, ${cnt})` : `(${s.id}) липсва` }));
      });
      phase = "ORDER BY";
      F.push(snap({ done: true, counts: counts.slice(), msg: `Резултат: ${groups} реда, подредени по s.id. ${agg === 1 && place !== 2 ? "COUNT(*) брои и реда с NULL — студент без записвания получава 1, не 0." : ""}` }));
      return { frames: F, counts: counts.join(","), groups };
    },

    tvl({ x, xnull, g, op2, y }) {
      g = S.int(g, -1000, 1000, "g");
      const isNull = xnull === true || xnull === "true";
      const xv = isNull ? null : S.int(x, -1000, 1000, "x");
      const c = ge(xv, isNull, g);
      const yv = { T: 2, U: 1, F: 0 }[y];
      if (yv === undefined) throw new Error("Втората стойност е T, U или F.");
      const F = [];
      F.push({ at: isNull ? "cmp_null" : "cmp_val", c, msg: `x >= ${g}, x = ${isNull ? "NULL" : xv} → <b>${TV[c]}</b>.${isNull ? " Всяко сравнение с NULL (дори NULL = NULL) дава UNKNOWN." : ""}` });
      let r = c, at = "and";
      if (op2 === "AND") { r = and(c, yv); at = "and"; }
      else if (op2 === "OR") { r = or(c, yv); at = "or"; }
      else if (op2 === "NOT") { r = not(c); at = "not"; }
      if (op2 !== "—") F.push({ at, c, r, msg: op2 === "NOT" ? `NOT ${TV[c]} = <b>${TV[r]}</b>.` : `${TV[c]} ${op2} ${TV[yv]} = <b>${TV[r]}</b> (${op2 === "AND" ? "минимумът" : "максимумът"} при FALSE &lt; UNKNOWN &lt; TRUE).` });
      F.push({ at: "where", c, r, done: true, msg: `WHERE ${r === 2 ? "<b>запазва</b>" : "<b>отхвърля</b>"} реда — оставя само TRUE.`, inv: { text: r === 2 ? "TRUE → редът остава" : `${TV[r]} → редът отпада`, ok: r === 2 } });
      return { frames: F, result: r };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="sql">SQL</dfn> е <dfn data-g="декларативен език">декларативен език</dfn>: заявката описва желания резултат, а оптимизаторът избира <dfn data-g="план за изпълнение">план за изпълнение</dfn>. <code>SELECT</code> определя резултатни изрази, <code>FROM</code> и <code>JOIN</code> — източници и връзки, <code>WHERE</code> филтрира редове, <code>GROUP BY</code> групира, <code>HAVING</code> филтрира групи, <code>ORDER BY</code> подрежда. Записаният синтактичен ред не е непременно редът на физическите операции.</p>
</div>

<div class="block">
  <h3>Заявката от ръководството: LEFT JOIN, COUNT и NULL</h3>
  <p class="prose">За Student с редове (1, Ana) и (2, Boris) и Enrollment само за студент 1 LEFT JOIN пази и Boris. В колоните от липсващия партньор се появява <dfn data-g="null">NULL</dfn>. <code>COUNT(e.course_id)</code> брои ненулевите стойности и дава 0; <code>COUNT(*)</code> преброява получения ред и дава 1. Ако условие върху e бъде преместено от <code>ON</code> в <code>WHERE</code>, редът без съответствие може да бъде отстранен.</p>
  <div id="v-q"></div>
  <details class="hint"><summary>Защо COUNT(e.course_id) дава 0 само „при NOT NULL идентификатор“</summary><div>
    <p>COUNT(колона) брои ненулевите стойности. Ако e.course_id може законно да е NULL в Enrollment, тогава NULL от LEFT JOIN и NULL от данните са неразличими и броят е подвеждащ. Затова ръководството казва: „Условието за ненулевост трябва да е част от схемата.“ Тук course_id е част от PK и не допуска NULL.</p>
  </div></details>
  <details class="trap"><summary>Капан: малка синтактична промяна може да промени смисъла, а не само скоростта</summary><div>
    <p>Сравни „условие в ON“ и „условие в WHERE“ с прага 5. В ON: Boris остава с 0. В WHERE: <code>NULL &gt;= 5</code> е UNKNOWN, WHERE оставя само TRUE — Boris изчезва от резултата.</p>
  </div></details>
</div>

<div class="block">
  <h3>Тризначна логика</h3>
  <p class="prose">NULL обозначава липсваща или неизвестна стойност и сравненията могат да дадат <dfn data-g="unknown">UNKNOWN</dfn>. Проверява се с <code>IS NULL</code>, а не с <code>= NULL</code>. WHERE запазва редовете, за които условието е TRUE. Нула, празен низ и NULL са различни стойности или състояния.</p>
  <div id="v-tvl"></div>
  <div class="tbl-wrap"><table class="t grid" id="tvl-tab"></table></div>
  <p class="muted">Таблицата е стандартната тризначна логика на SQL; кодът по-горе я реализира като min/max при подредба FALSE &lt; UNKNOWN &lt; TRUE.</p>
</div>

<div class="block">
  <h3>Схема 6 · Декларативна заявка и план за изпълнение</h3>
  <p class="prose">SQL описва какъв резултат се иска. Оптимизаторът избира конкретни операции, които запазват семантиката. Физическият ред може да се различава от реда на клаузите в текста. Щракни върху клауза, за да видиш мястото ѝ в логическия ред.</p>
  <div class="split">
    <div><span class="eyebrow">Както е написана</span><div id="ord-written" style="display:grid;gap:4px;margin-top:6px"></div></div>
    <div><span class="eyebrow">Логически ред на обработка</span><div id="ord-logical" style="display:grid;gap:4px;margin-top:6px"></div></div>
  </div>
  <div class="key" id="ord-d"></div>
  <details class="trap"><summary>Капан: план, индекс, изглед — нито едно не е нова истина</summary><div>
    <p><dfn data-g="план за изпълнение">Планът</dfn> е избраната последователност от физически операции. <dfn data-g="индекс">Индексът</dfn> е помощна структура за достъп. <dfn data-g="изглед">Изгледът</dfn> обикновено е именувана заявка, а materialized view пази резултат, който трябва да бъде обновяван. Нито едното не е непременно нова независима истина за предметната област; съхраненото производно представяне изисква правило за свежест.</p>
  </div></details>
  <details class="trap"><summary>Капан: SQL е език, не продукт</summary><div><p>PostgreSQL, SQL Server, MySQL и Oracle имат различия в типовете, диалектите и разширенията. SSMS, MySQL Workbench и pgAdmin са клиентски инструменти, а не самите СУБД.</p></div></details>
</div>`;

  const CLAUSES = [
    ["SELECT", 5, "Изчислява резултатните изрази — включително агрегатите COUNT, SUM… след групирането."],
    ["FROM / JOIN", 1, "Изгражда източника: таблиците и съединенията им (LEFT JOIN добавя NULL за липсващ партньор)."],
    ["WHERE", 2, "Филтрира <b>редове</b>; остават само тези с TRUE."],
    ["GROUP BY", 3, "Образува групи от редове с еднакви стойности."],
    ["HAVING", 4, "Филтрира <b>групи</b> — може да използва агрегати, WHERE не може."],
    ["ORDER BY", 6, "Подрежда резултата. Без ORDER BY редът не е обещан."],
  ];

  function mount(root) {
    S.viz(root.querySelector("#v-q"), {
      id: "q", title: "Заявката фаза по фаза", sub: "Ляво: входните таблици; дясно: междинните редове и резултатът.",
      code: "ch04_leftjoin",
      inputs: [
        { id: "studs", label: "Student (id име; …)", value: "1 Ana; 2 Boris", width: "14em" },
        { id: "enr", label: "Enrollment (sid cid оценка; …)", value: "1 101 6", width: "16em" },
        { id: "place", label: "условие e.grade ≥ g", type: "select", value: "0", options: [["0", "без условие"], ["1", "в ON"], ["2", "в WHERE"]] },
        { id: "g", label: "g", type: "number", value: 5, width: "4em" },
        { id: "agg", label: "агрегат", type: "select", value: "0", options: [["0", "COUNT(e.course_id)"], ["1", "COUNT(*)"]] },
      ],
      presets: [
        { label: "Ana и Boris", values: { studs: "1 Ana; 2 Boris", enr: "1 101 6", place: "0", agg: "0" } },
        { label: "COUNT(*)", values: { studs: "1 Ana; 2 Boris", enr: "1 101 6", place: "0", agg: "1" } },
        { label: "Условие в ON", values: { studs: "1 Ana; 2 Boris; 3 Vera", enr: "1 101 6; 1 102 4; 3 101 5", place: "1", g: 5, agg: "0" } },
        { label: "Условие в WHERE", values: { studs: "1 Ana; 2 Boris; 3 Vera", enr: "1 101 6; 1 102 4; 3 101 5", place: "2", g: 5, agg: "0" } },
      ],
      legend: [["s-act", "текущ"], ["s-done", "съвпада / брои се"], ["s-cmp", "не съвпада / не се брои"], ["s-swap", "отпада"]],
      build: algos.query,
      draw(st, f) {
        st.innerHTML = "";
        st.append(h("div", { style: { marginBottom: "10px" } }, T6.sql(f.sql)));
        st.append(h("p", { class: "t6-res", style: { marginBottom: "8px" }, text: "Фаза: " + f.phase }));
        const rs = {}, re = {}, rr = {};
        if (f.si != null) rs[f.si] = "s-act";
        if (f.ek != null) re[f.ek] = f.eok ? "s-done" : "s-cmp";
        if (f.ri != null) rr[f.ri] = f.dropped ? "s-swap" : f.rok === false ? "s-cmp" : f.rok ? "s-done" : "s-act";
        if (f.gi != null) f.rows.forEach((r, i) => { if (r.id === f.gi && rr[i] == null) rr[i] = "s-piv"; });
        const kids = [
          T6.table({ name: "Student s", cols: ["id", "name"], rows: f.Sx.map((s) => [s.id, s.name]) }, { pk: [0], rowCls: rs }),
          T6.table({ name: "Enrollment e", cols: ["student_id", "course_id", "grade"], rows: f.E.map((e) => [e.sid, e.cid, e.grade]) }, { pk: [0, 1], rowCls: re }),
          T6.op("⇒"),
          T6.table({ name: "междинни редове", cols: ["s.id", "s.name", "e.course_id", "e.grade"], rows: f.rows.map((r) => [r.id, r.name, r.nul ? null : r.cid, r.nul ? null : r.grade]) }, { rowCls: rr, empty: "—" }),
        ];
        if (f.counts) {
          const res = [];
          f.Sx.forEach((s, i) => { if (i < f.counts.length && f.counts[i] >= 0) res.push([s.id, s.name, f.counts[i]]); });
          kids.push(T6.op("⇒"), T6.table({ name: "резултат", cols: ["id", "name", "courses"], rows: res }, { empty: "—" }));
        }
        st.append(T6.row(...kids));
      },
    });

    S.viz(root.querySelector("#v-tvl"), {
      id: "tvl", title: "Сравнение с NULL и WHERE", sub: "Условие: (x >= g) [AND/OR/NOT второ условие].",
      code: "ch04_tvl",
      inputs: [
        { id: "x", label: "x", type: "number", value: 4, width: "5em" },
        { id: "xnull", label: "x е NULL", type: "checkbox", value: true },
        { id: "g", label: "g", type: "number", value: 5, width: "5em" },
        { id: "op2", label: "оператор", type: "select", value: "OR", options: ["—", "AND", "OR", "NOT"] },
        { id: "y", label: "второ условие", type: "select", value: "T", options: [["T", "TRUE"], ["U", "UNKNOWN"], ["F", "FALSE"]] },
      ],
      presets: [
        { label: "NULL >= 5", values: { xnull: true, op2: "—" } },
        { label: "NOT UNKNOWN", values: { xnull: true, op2: "NOT" } },
        { label: "UNKNOWN AND FALSE", values: { xnull: true, op2: "AND", y: "F" } },
        { label: "UNKNOWN OR TRUE", values: { xnull: true, op2: "OR", y: "T" } },
      ],
      build: algos.tvl,
      draw(st, f) {
        st.innerHTML = "";
        const pill = (v, lab) => h("div", { style: { display: "grid", gap: "4px", justifyItems: "center" } }, h("span", { class: "muted", text: lab }), h("span", { class: "pill " + ["s-swap", "s-cmp", "s-done"][v], style: { fontSize: "1rem", padding: "8px 14px" }, text: TV[v] }));
        const kids = [pill(f.c, "x >= g")];
        if (f.r != null) kids.push(T6.op("⇒"), pill(f.r, "цялото условие"));
        if (f.done) kids.push(T6.op("⇒"), h("span", { class: "pill " + (f.r === 2 ? "s-done" : "s-swap"), style: { fontSize: "1rem", padding: "8px 14px" }, text: f.r === 2 ? "редът остава" : "редът отпада" }));
        st.append(T6.row(...kids));
      },
    });

    const tt = root.querySelector("#tvl-tab");
    const hdr = h("tr", null, h("th", { text: "a" }), h("th", { text: "b" }), h("th", { text: "a AND b" }), h("th", { text: "a OR b" }), h("th", { text: "NOT a" }));
    tt.append(hdr);
    const C = ["s-swap", "s-cmp", "s-done"];
    [2, 1, 0].forEach((a) => [2, 1, 0].forEach((b) => tt.append(h("tr", null,
      h("td", { class: C[a], text: TV[a] }), h("td", { class: C[b], text: TV[b] }), h("td", { class: C[and(a, b)], text: TV[and(a, b)] }), h("td", { class: C[or(a, b)], text: TV[or(a, b)] }), h("td", { class: C[not(a)], text: TV[not(a)] })))));

    const W = root.querySelector("#ord-written"), Lg = root.querySelector("#ord-logical"), D = root.querySelector("#ord-d");
    const bw = [], bl = [];
    CLAUSES.forEach((c, i) => { const b = h("button", { class: "btn", style: { justifyContent: "flex-start" }, text: c[0], onclick: () => pick(i) }); bw.push(b); W.append(b); });
    CLAUSES.slice().sort((a, b) => a[1] - b[1]).forEach((c) => { const b = h("button", { class: "btn", style: { justifyContent: "flex-start" }, text: c[1] + ". " + c[0], onclick: () => pick(CLAUSES.indexOf(c)) }); bl[CLAUSES.indexOf(c)] = b; Lg.append(b); });
    function pick(i) {
      bw.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
      bl.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
      D.innerHTML = `<p><b>${CLAUSES[i][0]}</b> — написана ${i + 1}-ва, обработва се логически ${CLAUSES[i][1]}-ва.</p><p>${CLAUSES[i][2]}</p><p class="muted">Това е полезен логически модел, а не гарантиран ред на физическото изпълнение.</p>`;
    }
    pick(0);
  }

  S.chapter({ id: "sql", order: 4, num: "4", group: "Релационен модел", title: "SQL заявки и NULL", lead: "SQL е декларативен. Логическият ред на клаузите, LEFT JOIN с COUNT, NULL и тризначната логика — малка промяна в текста може да промени смисъла.", html, mount, algos });
})();
