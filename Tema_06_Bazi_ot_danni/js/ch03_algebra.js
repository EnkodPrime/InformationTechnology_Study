/* Раздел 3 — Релационна алгебра (глава 3, първа част): σ, π, ×, ⋈, ∪, −, ∩. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- разбор ---------- */
  function parseRel(txt, name) {
    const segs = String(txt).split("|").map((s) => s.trim());
    if (!segs[0]) throw new Error(`${name}: липсва схема. Формат: „A B C|1 x p|2 y q“.`);
    const cols = segs[0].split(/\s+/).filter(Boolean);
    if (cols.length > 8) throw new Error(`${name}: най-много 8 атрибута.`);
    if (new Set(cols).size !== cols.length) throw new Error(`${name}: повторено име на атрибут.`);
    cols.forEach((c) => { if (c.length > 12) throw new Error(`${name}: името „${c}“ е по-дълго от 12 знака.`); });
    const rows = [];
    segs.slice(1).filter(Boolean).forEach((s, i) => {
      const v = s.split(/\s+/).filter(Boolean);
      if (v.length !== cols.length) throw new Error(`${name}: ред ${i + 1} има ${v.length} стойности, а схемата — ${cols.length} атрибута.`);
      v.forEach((x) => { if (x.length > 15) throw new Error(`${name}: стойността „${x}“ е по-дълга от 15 знака.`); });
      if (rows.some((r) => r.join("\u0001") === v.join("\u0001"))) throw new Error(`${name}: ред (${v.join(", ")}) се повтаря — релацията е множество.`);
      rows.push(v);
    });
    if (rows.length > 8) throw new Error(`${name}: най-много 8 реда (за да е видимо стъпка по стъпка).`);
    return { name, cols, rows };
  }
  const isInt = (s) => /^-?\d+$/.test(s);
  function testCond(x, op, val) {
    const c = isInt(x) && isInt(val) ? parseInt(x, 10) - parseInt(val, 10) : x < val ? -1 : x > val ? 1 : 0;
    return { "=": c === 0, "!=": c !== 0, "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[op];
  }
  const rowEq = (a, b) => a.length === b.length && a.every((v, j) => v === b[j]);
  const tup = (r) => "(" + r.join(", ") + ")";

  /* ---------- алгоритми (огледало на c/03_algebra.c, със същите броячи) ---------- */
  const algos = {
    parseRel, testCond,

    run({ op, R, S: Sx, cond, cols, bag }) {
      const A = parseRel(R, "R");
      const F = [];
      let cmp = 0;
      const out = { cols: [], rows: [] };
      const snap = (o) => ({ A, B: o.B || null, out: { cols: out.cols.slice(), rows: out.rows.map((r) => r.slice()) }, stats: { сравнения: cmp, "редове в резултата": out.rows.length }, ...o });
      const contains = (rel, row) => { for (let k = 0; k < rel.length; k++) { cmp++; if (rowEq(row, rel[k])) return k; } return -1; };

      if (op === "sel") {
        const m = /^\s*(\S+)\s*(<=|>=|!=|=|<|>)\s*(\S+)\s*$/.exec(String(cond));
        if (!m) throw new Error("Условие във вида „атрибут оп стойност“, напр. „pid = INF“ или „grade >= 5“.");
        const [, an, o, val] = m;
        const j = A.cols.indexOf(an);
        if (j < 0) throw new Error(`R няма атрибут „${an}“.`);
        out.cols = A.cols.slice();
        const sql = `SELECT *\nFROM R\nWHERE ${an} ${o === "!=" ? "<>" : o} ${isInt(val) ? val : "'" + val + "'"};`;
        F.push(snap({ at: "sel_init", sql, msg: `σ<sub>${S.esc(an)} ${S.esc(o)} ${S.esc(val)}</sub>(R): схемата на резултата е същата като на R.` }));
        A.rows.forEach((r, i) => {
          cmp++;
          const ok = testCond(r[j], o, val);
          F.push(snap({ at: ["sel_loop", "sel_test"], sql, ai: i, aj: j, aok: ok, msg: `Ред ${i + 1}: ${an} = ${S.esc(r[j])}; ${S.esc(r[j])} ${S.esc(o)} ${S.esc(val)} → <b>${ok}</b>.${isInt(r[j]) && isInt(val) ? " (числово сравнение)" : " (сравнение като низове)"}` }));
          if (ok) { out.rows.push(r.slice()); F.push(snap({ at: "sel_keep", sql, ai: i, aok: true, oi: out.rows.length - 1, msg: `Запазваме ${S.esc(tup(r))}.`, log: `σ: ${tup(r)}` })); }
        });
        F.push(snap({ sql, done: true, msg: `Резултат: ${out.rows.length} от ${A.rows.length} реда. Селекцията избира <b>редове</b>; колоните остават.` }));
      } else if (op === "proj") {
        const names = String(cols).split(/[\s,]+/).filter(Boolean);
        if (!names.length) throw new Error("Посочи поне един атрибут за проекцията.");
        const idx = names.map((n) => { const j = A.cols.indexOf(n); if (j < 0) throw new Error(`R няма атрибут „${n}“.`); return j; });
        out.cols = idx.map((j) => A.cols[j]);
        const isBag = bag === true || bag === "true";
        const sql = `SELECT ${isBag ? "" : "DISTINCT "}${names.join(", ")}\nFROM R;`;
        F.push(snap({ at: "pr_init", sql, pcols: idx, msg: `π<sub>${S.esc(names.join(", "))}</sub>(R)${isBag ? " — режим SQL без DISTINCT (мултимножество)" : ""}.` }));
        A.rows.forEach((r, i) => {
          const cand = idx.map((j) => r[j]);
          F.push(snap({ at: ["pr_loop", "pr_build"], sql, ai: i, pcols: idx, msg: `Ред ${i + 1}: кандидат ${S.esc(tup(cand))}.` }));
          if (!isBag) {
            const k = contains(out.rows, cand);
            if (k >= 0) { F.push(snap({ at: ["pr_dup", "pr_skip"], sql, ai: i, pcols: idx, oi: k, dup: true, msg: `${S.esc(tup(cand))} вече е в резултата (ред ${k + 1}) — като множество не го добавяме.`, log: `π: ${tup(cand)} повтаря се` })); return; }
          }
          out.rows.push(cand);
          F.push(snap({ at: ["pr_dup", "pr_keep"], sql, ai: i, pcols: idx, oi: out.rows.length - 1, msg: `Добавяме ${S.esc(tup(cand))}.`, log: `π: ${tup(cand)}` }));
        });
        F.push(snap({ sql, done: true, pcols: idx, msg: isBag ? `SQL без DISTINCT пази ${out.rows.length} реда, включително повторенията.` : `Резултат: ${out.rows.length} различни кортежа. Проекцията избира <b>колони</b> и като операция над множества премахва повторенията.` }));
      } else {
        const B = parseRel(Sx, "S");
        if (op === "prod") {
          out.cols = A.cols.map((c) => (B.cols.includes(c) ? "R." + c : c)).concat(B.cols.map((c) => (A.cols.includes(c) ? "S." + c : c)));
          const sql = "SELECT *\nFROM R CROSS JOIN S;";
          F.push(snap({ B, at: "px_init", sql, msg: `R × S: ${A.rows.length} · ${B.rows.length} = <b>${A.rows.length * B.rows.length}</b> реда, ${out.cols.length} колони. Общите имена получават префикс.` }));
          A.rows.forEach((r, i) => B.rows.forEach((s, k) => {
            cmp++;
            out.rows.push(r.concat(s));
            F.push(snap({ B, at: ["px_inner", "px_emit"], sql, ai: i, bi: k, oi: out.rows.length - 1, msg: `${S.esc(tup(r))} × ${S.esc(tup(s))}.`, log: `×: ${tup(r.concat(s))}` }));
          }));
          F.push(snap({ B, sql, done: true, msg: "Всеки ред на R с всеки ред на S — без условие. Повечето комбинации нямат смисъл; затова съединението добавя условие." }));
        } else if (op === "join") {
          const common = B.cols.filter((c) => A.cols.includes(c));
          const extra = B.cols.map((c, k) => k).filter((k) => !A.cols.includes(B.cols[k]));
          out.cols = A.cols.concat(extra.map((k) => B.cols[k]));
          const sql = common.length ? `SELECT *\nFROM R NATURAL JOIN S;\n-- същото като:\n-- SELECT R.*, ${extra.map((k) => "S." + B.cols[k]).join(", ") || "…"}\n-- FROM R JOIN S ON ${common.map((c) => "R." + c + " = S." + c).join(" AND ")};` : "SELECT *\nFROM R NATURAL JOIN S;  -- няма общи атрибути => R × S";
          F.push(snap({ B, at: "j_init", sql, jc: common, msg: common.length ? `R ⋈ S по общите атрибути: <b>${S.esc(common.join(", "))}</b>. Вложени цикли: всяка двойка редове се проверява.` : "Няма общи атрибути — естественото съединение се свежда до декартово произведение." }));
          A.rows.forEach((r, i) => B.rows.forEach((s, k) => {
            cmp++;
            const bad = common.find((c) => r[A.cols.indexOf(c)] !== s[B.cols.indexOf(c)]);
            const ok = bad === undefined;
            F.push(snap({ B, at: ["j_inner", "j_test"], sql, jc: common, ai: i, bi: k, aok: ok, msg: common.length ? `${S.esc(tup(r))} и ${S.esc(tup(s))}: ${common.map((c) => `${c}: ${S.esc(r[A.cols.indexOf(c)])} ${r[A.cols.indexOf(c)] === s[B.cols.indexOf(c)] ? "=" : "≠"} ${S.esc(s[B.cols.indexOf(c)])}`).join("; ")} → <b>${ok ? "съвпадат" : "не съвпадат"}</b>.` : "Без общи атрибути — всяка двойка съвпада." }));
            if (ok) {
              const row = r.concat(extra.map((e) => s[e]));
              out.rows.push(row);
              F.push(snap({ B, at: "j_emit", sql, jc: common, ai: i, bi: k, aok: true, oi: out.rows.length - 1, msg: `Добавяме ${S.esc(tup(row))}.`, log: `⋈: ${tup(row)}` }));
            }
          }));
          F.push(snap({ B, sql, jc: common, done: true, msg: `Резултат: ${out.rows.length} реда при ${cmp} проверени двойки. Логически: ⋈ = π(σ(R × S)). Реалната СУБД може да избере друг алгоритъм (хеш, сливане, индекс) със същия резултат.` }));
        } else if (op === "union" || op === "diff" || op === "inter") {
          if (A.cols.length !== B.cols.length || A.cols.some((c, j) => c !== B.cols[j]))
            throw new Error(`Схемите не са съвместими: R(${A.cols.join(", ")}) и S(${B.cols.join(", ")}). Обединение, разлика и сечение изискват еднакви атрибути.`);
          out.cols = A.cols.slice();
          const sym = { union: "∪", diff: "−", inter: "∩" }[op];
          const sql = `SELECT * FROM R\n${{ union: "UNION", diff: "EXCEPT", inter: "INTERSECT" }[op]}\nSELECT * FROM S;`;
          F.push(snap({ B, at: ["so_compat", "so_init"], sql, msg: `R ${sym} S. Схемите са съвместими: (${S.esc(A.cols.join(", "))}).` }));
          A.rows.forEach((r, i) => {
            const k = contains(B.rows, r);
            const inS = k >= 0;
            const keep = op === "union" || (op === "diff" && !inS) || (op === "inter" && inS);
            F.push(snap({ B, at: ["so_r", "so_probe"], sql, ai: i, bi: inS ? k : null, aok: keep, msg: `${S.esc(tup(r))} от R ${inS ? "<b>е</b>" : "<b>не е</b>"} в S → ${keep ? "влиза" : "не влиза"} в резултата.` }));
            if (keep && contains(out.rows, r) < 0) {
              out.rows.push(r.slice());
              F.push(snap({ B, at: "so_keep", sql, ai: i, aok: true, oi: out.rows.length - 1, msg: `Добавяме ${S.esc(tup(r))}.`, log: `${sym}: ${tup(r)}` }));
            }
          });
          if (op === "union") B.rows.forEach((s, k) => {
            const has = contains(out.rows, s) >= 0;
            F.push(snap({ B, at: "so_s", sql, bi: k, aok: !has, msg: `${S.esc(tup(s))} от S ${has ? "вече е в резултата — повторение не се добавя" : "е нов"}.` }));
            if (!has) { out.rows.push(s.slice()); F.push(snap({ B, at: "so_add", sql, bi: k, aok: true, oi: out.rows.length - 1, msg: `Добавяме ${S.esc(tup(s))}.`, log: `∪: ${tup(s)}` })); }
          });
          F.push(snap({ B, sql, done: true, msg: `Резултат: ${out.rows.length} реда. Като множества: без повторения. (В SQL: UNION премахва дубликати, UNION ALL — не.)` }));
        } else throw new Error("Непозната операция.");
      }
      return { frames: F, rows: out.rows, cols: out.cols, cmp };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="селекция">Селекцията</dfn> избира кортежи по условие, а <dfn data-g="проекция">проекцията</dfn> избира атрибути. <dfn data-g="декартово произведение">Декартовото произведение</dfn> комбинира кортежи от две релации. <dfn data-g="съединение">Съединението</dfn> обединява съответстващи кортежи по зададено условие. Обединение, сечение и разлика изискват <dfn data-g="съвместими схеми">съвместими схеми</dfn>. Тези операции формират <dfn data-g="релационна алгебра">релационната алгебра</dfn>.</p>
</div>

<div class="block">
  <h3>Лаборатория: операциите стъпка по стъпка</h3>
  <p class="muted">Таблиците са редактируеми: формат <code>атрибути|ред|ред…</code>, стойностите се разделят с интервал. Еквивалентната SQL заявка е над визуализацията; изпълнимият код е C.</p>
  <div id="v-alg"></div>
  <details class="hint"><summary>Защо проекцията „губи“ редове, а SQL SELECT — не</summary><div>
    <p>Релацията е множество: два еднакви кортежа са един и същ елемент. Затова π<sub>pid</sub> върху четирима студенти от три специалности дава три реда. SQL таблиците са мултимножества: <code>SELECT pid FROM Student</code> връща четири реда; само <code>SELECT DISTINCT</code> премахва повторенията. Превключи „SQL без DISTINCT“, за да видиш разликата.</p>
  </div></details>
  <details class="hint"><summary>Защо съединението е „селекция върху декартово произведение“</summary><div>
    <p>Логически R ⋈ S = π(σ<sub>R.a = S.a</sub>(R × S)): от всички комбинации оставяме съответстващите и махаме повторената колона. Сравни броя редове на × и ⋈ върху Student и Programme. Това е <b>логически</b> модел — СУБД рядко строи декартовото произведение физически.</p>
  </div></details>
  <details class="trap"><summary>Капан: SELECT не означава само селекция</summary><div>
    <p>Релационната селекция σ избира <b>редове</b>. SQL <code>SELECT</code> изброява резултатните колони (това е проекция) и заедно с FROM, JOIN, WHERE, GROUP BY може да съдържа селекция, съединения, агрегати и други операции. Селекцията в SQL е най-вече <code>WHERE</code>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 5 · Селекция, проекция и съединение</h3>
  <div class="split">
    <div class="key"><b>σ — хоризонтално</b><p>Реже редове. Схемата е същата.</p></div>
    <div class="key"><b>π — вертикално</b><p>Реже колони. Повторенията изчезват (като множество).</p></div>
    <div class="key"><b>⋈ — комбинира</b><p>Свързва съответстващи редове от две релации по условие.</p></div>
  </div>
  <p class="prose muted">Примерът е логически; правилата за дубликати и NULL в SQL се различават от математическите релации — следващият раздел ги показва.</p>
</div>`;

  const STUD = "sid name pid|1 Ana INF|2 Boris MAT|3 Vera INF|4 Galin FIZ";
  const PROG = "pid pname|INF Informatika|MAT Matematika|PED Pedagogika";
  const ENR = "sid cid grade|1 C1 6|1 C2 5|2 C1 4|3 C2 3";
  const OPS = [["sel", "σ селекция"], ["proj", "π проекция"], ["prod", "× декартово произведение"], ["join", "⋈ естествено съединение"], ["union", "∪ обединение"], ["diff", "− разлика"], ["inter", "∩ сечение"]];
  const CODE = { sel: "ch03_select", proj: "ch03_project", prod: "ch03_product", join: "ch03_join", union: "ch03_setops", diff: "ch03_setops", inter: "ch03_setops" };

  function mount(root) {
    S.viz(root.querySelector("#v-alg"), {
      id: "alg", title: "Релационна алгебра върху редактируеми таблици", sub: "Синьо — текущ ред; зелено — влиза в резултата; оранжево — проверява се / повтаря се.",
      code: (inp) => CODE[inp.op] || "ch03_select",
      inputs: [
        { id: "op", label: "Операция", type: "select", value: "sel", options: OPS },
        { id: "R", label: "R", value: STUD, width: "26em" },
        { id: "S", label: "S", value: PROG, width: "26em" },
        { id: "cond", label: "условие (σ)", value: "pid = INF", width: "9em" },
        { id: "cols", label: "атрибути (π)", value: "pid", width: "9em" },
        { id: "bag", label: "SQL без DISTINCT (π)", type: "checkbox", value: false },
      ],
      presets: [
        { label: "σ pid = INF", values: { op: "sel", R: STUD, cond: "pid = INF" } },
        { label: "σ grade ≥ 5", values: { op: "sel", R: ENR, cond: "grade >= 5" } },
        { label: "π pid", values: { op: "proj", R: STUD, cols: "pid", bag: false } },
        { label: "Student × Programme", values: { op: "prod", R: STUD, S: PROG } },
        { label: "Student ⋈ Programme", values: { op: "join", R: STUD, S: PROG } },
        { label: "Student ⋈ Enrollment", values: { op: "join", R: STUD, S: ENR } },
        { label: "R − S", values: { op: "diff", R: "A B C|1 x p|2 x q|3 y p", S: "A B C|2 x q|3 y p|4 z r" } },
        { label: "Несъвместими схеми", values: { op: "union", R: "A B C|1 x p", S: "A B|1 x" } },
      ],
      legend: [["s-act", "текущ ред"], ["s-cmp", "сравнява се / повтаря се"], ["s-done", "влиза в резултата"], ["s-piv", "атрибути на условието"]],
      build: algos.run,
      draw(st, f) {
        st.innerHTML = "";
        if (f.sql) st.append(h("div", { style: { marginBottom: "10px" } }, h("span", { class: "eyebrow", text: "Еквивалентен SQL (само за четене)" }), T6.sql(f.sql)));
        const rowA = {}, rowB = {}, rowO = {}, colA = {}, colB = {};
        if (f.ai != null) rowA[f.ai] = f.aok === true ? "s-done" : f.aok === false ? "s-cmp" : "s-act";
        if (f.bi != null) rowB[f.bi] = f.aok === true ? "s-done" : f.aok === false ? "s-cmp" : "s-act";
        if (f.oi != null) rowO[f.oi] = f.dup ? "s-cmp" : "s-done";
        if (f.aj != null) colA[f.aj] = "s-piv";
        (f.pcols || []).forEach((j) => (colA[j] = "s-piv"));
        (f.jc || []).forEach((c) => { colA[f.A.cols.indexOf(c)] = "s-piv"; if (f.B) colB[f.B.cols.indexOf(c)] = "s-piv"; });
        const kids = [T6.table({ name: "R", cols: f.A.cols, rows: f.A.rows }, { rowCls: rowA, colCls: colA })];
        if (f.B) kids.push(T6.table({ name: "S", cols: f.B.cols, rows: f.B.rows }, { rowCls: rowB, colCls: colB }));
        kids.push(T6.op("⇒"), T6.table({ name: "резултат", cols: f.out.cols, rows: f.out.rows }, { rowCls: rowO, empty: "∅ (засега празен)" }));
        st.append(T6.row(...kids));
      },
    });
  }

  S.chapter({ id: "algebra", order: 3, num: "3", group: "Релационен модел", title: "Релационна алгебра", lead: "Селекция, проекция, декартово произведение, съединение, обединение, разлика и сечение — стъпка по стъпка върху редактируеми таблици, с еквивалентен SQL.", html, mount, algos });
})();
