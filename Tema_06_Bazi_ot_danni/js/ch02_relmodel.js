/* Раздел 2 — Релационен модел (глава 2): релация, атрибут, кортеж, домейн, ключове,
   външен ключ, референтна цялост, NULL. */
(function () {
  const S = window.Study, h = S.h;

  const BASE = "+P INF Informatika; +P MAT Matematika; +S 1 Ana INF; +S 2 Boris MAT; +S 3 Vera NULL; +C C1 Bazi; +C C2 Algoritmi; +E 1 C1 6; +E 1 C2 5; +E 2 C1 4";
  const RULES = { RESTRICT: 0, CASCADE: 1, "SET NULL": 2 };

  /* ---------- чиста симулация (същата като c/02_relmodel.c, включително реда на редовете) ---------- */
  function newDb() { return { p: [], s: [], c: [], e: [] }; }
  function clone(db) { return { p: db.p.map((x) => ({ ...x })), s: db.s.map((x) => ({ ...x })), c: db.c.map((x) => ({ ...x })), e: db.e.map((x) => ({ ...x })) }; }
  const W = 15, cut = (x) => String(x).slice(0, W);

  function parseScript(txt) {
    const cmds = [];
    String(txt).split(";").forEach((raw) => {
      const p = raw.trim().split(/\s+/).filter(Boolean);
      if (!p.length) return;
      if (cmds.length >= 40) throw new Error("Най-много 40 команди.");
      cmds.push({ raw: raw.trim(), op: p[0], a: cut(p[1] || ""), b: p[2] === "NULL" ? "" : cut(p[2] || ""), c: p[3] === "NULL" ? "" : cut(p[3] || ""), n: p.length });
    });
    return cmds;
  }

  /* C atoi: водещо цяло число или 0 */
  const atoi = (s) => { const m = /^\s*([+-]?\d+)/.exec(s); return m ? parseInt(m[1], 10) : 0; };

  function exec(db, cmd, rule, F, snap) {
    const step = (at, msg, extra) => F && F.push(snap(db, { at, msg, cmd: cmd.raw, ...extra }));
    const fail = (at, why, extra) => { step(at, `<b>Отказ.</b> ${why}`, { bad: true, ...extra, log: `✗ ${cmd.raw} — ${why}` }); return why; };
    const findS = (sid) => db.s.findIndex((x) => x.sid === sid);
    const findP = (pid) => db.p.findIndex((x) => x.pid === pid);
    const findC = (cid) => db.c.findIndex((x) => x.cid === cid);

    function delStudent(sid, rule, inner) {
      const k = findS(sid);
      if (k < 0) return fail("d_none", "Няма такъв студент.");
      const refs = db.e.filter((x) => x.sid === sid).length;
      if (!inner) step("d_scan", `Търсим записвания, които сочат към студент ${sid}: <b>${refs}</b>.`, { tab: "e", hlE: db.e.map((x, i) => (x.sid === sid ? i : -1)).filter((i) => i >= 0) });
      if (refs > 0 && rule === 0) return fail("d_restrict", "RESTRICT: има записвания, които сочат към студента.", { tab: "e" });
      if (refs > 0 && rule === 2) return fail("d_setnull_pk", "SET NULL е невъзможно: Enrollment.sid е част от първичния ключ и не допуска NULL.", { tab: "e" });
      db.e = db.e.filter((x) => x.sid !== sid);
      if (refs) step("d_cascade", `CASCADE: изтрити са ${refs} записвания на студент ${sid}.`, { tab: "e" });
      db.s[k] = db.s[db.s.length - 1]; db.s.pop();
      if (!inner) step("d_ok", `Студент ${sid} е изтрит.`, { ok: true, tab: "s", log: `✓ ${cmd.raw}` });
      return null;
    }

    switch (cmd.op) {
      case "+P": {
        if (!cmd.a || !cmd.b) return fail(null, "NOT NULL: pid и pname са задължителни.", { tab: "p" });
        if (findP(cmd.a) >= 0) return fail(null, `PK: вече има специалност ${cmd.a}.`, { tab: "p", hlP: [findP(cmd.a)] });
        db.p.push({ pid: cmd.a, pname: cmd.b });
        step(null, `Специалност ${cmd.a} е добавена.`, { ok: true, tab: "p", log: `✓ ${cmd.raw}` });
        return null;
      }
      case "+C": {
        if (!cmd.a || !cmd.b) return fail(null, "NOT NULL: cid и title са задължителни.", { tab: "c" });
        if (findC(cmd.a) >= 0) return fail(null, `PK: вече има дисциплина ${cmd.a}.`, { tab: "c", hlC: [findC(cmd.a)] });
        db.c.push({ cid: cmd.a, title: cmd.b });
        step(null, `Дисциплина ${cmd.a} е добавена.`, { ok: true, tab: "c", log: `✓ ${cmd.raw}` });
        return null;
      }
      case "+S": {
        const { a: sid, b: name, c: pid } = cmd;
        step("s_null", `NOT NULL: sid = ${sid || "NULL"}, name = ${name || "NULL"}.`, { tab: "s" });
        if (!sid || !name) return fail("s_null", "NOT NULL: sid и name са задължителни.", { tab: "s" });
        const k = findS(sid);
        step("s_pk", `PK: има ли вече студент с sid = ${sid}? ${k >= 0 ? "<b>да</b>" : "не"}.`, { tab: "s", hlS: k >= 0 ? [k] : [] });
        if (k >= 0) return fail("s_pk", "PK: вече има студент с този sid. Първичният ключ трябва да е уникален.", { tab: "s", hlS: [k] });
        if (pid) {
          const j = findP(pid);
          step("s_fk", `FK: pid = ${pid} трябва да съществува в Programme. ${j >= 0 ? "Съществува." : "<b>Не съществува.</b>"}`, { tab: "p", hlP: j >= 0 ? [j] : [] });
          if (j < 0) return fail("s_fk", `FK: няма специалност ${pid}. Референтната цялост не допуска висяща препратка.`, { tab: "p" });
        } else step("s_fk", "FK: pid е NULL — Student.pid допуска NULL, затова няма препратка за проверка.", { tab: "s" });
        db.s.push({ sid, name, pid });
        step("s_ok", `Студент (${sid}, ${name}, ${pid || "NULL"}) е вмъкнат.`, { ok: true, tab: "s", hlS: [db.s.length - 1], log: `✓ ${cmd.raw}` });
        return null;
      }
      case "+E": {
        const { a: sid, b: cid } = cmd;
        const g = cmd.n >= 4 ? atoi(cmd.c) : 0;
        step("e_dom", `Домейн: grade = ${g} ∈ {2..6}? ${g >= 2 && g <= 6 ? "да" : "<b>не</b>"}.`, { tab: "e" });
        if (g < 2 || g > 6) return fail("e_dom", "Домейн: оценката е цяло число от 2 до 6.", { tab: "e" });
        if (!sid || !cid) return fail("e_null", "NOT NULL: колоните на първичния ключ не допускат NULL.", { tab: "e" });
        const dup = db.e.findIndex((x) => x.sid === sid && x.cid === cid);
        step("e_pk", `PK(sid, cid): има ли вече (${sid}, ${cid})? ${dup >= 0 ? "<b>да</b>" : "не"}.`, { tab: "e", hlE: dup >= 0 ? [dup] : [] });
        if (dup >= 0) return fail("e_pk", "PK: двойката (sid, cid) вече съществува — по предпоставката има една оценка на двойка.", { tab: "e", hlE: [dup] });
        const ks = findS(sid);
        step("e_fk1", `FK sid → Student: ${ks >= 0 ? "съществува" : "<b>не съществува</b>"}.`, { tab: "s", hlS: ks >= 0 ? [ks] : [] });
        if (ks < 0) return fail("e_fk1", `FK: няма студент ${sid}.`, { tab: "s" });
        const kc = findC(cid);
        step("e_fk2", `FK cid → Course: ${kc >= 0 ? "съществува" : "<b>не съществува</b>"}.`, { tab: "c", hlC: kc >= 0 ? [kc] : [] });
        if (kc < 0) return fail("e_fk2", `FK: няма дисциплина ${cid}.`, { tab: "c" });
        db.e.push({ sid, cid, grade: g });
        step("e_ok", `Записване (${sid}, ${cid}, ${g}) е вмъкнато.`, { ok: true, tab: "e", hlE: [db.e.length - 1], log: `✓ ${cmd.raw}` });
        return null;
      }
      case "-S": return delStudent(cmd.a, rule, false);
      case "-P": {
        const pid = cmd.a, k = findP(pid);
        if (k < 0) return fail("p_none", "Няма такава специалност.", { tab: "p" });
        const refs = db.s.filter((x) => x.pid === pid).length;
        step("p_scan", `Студенти със Student.pid = ${pid}: <b>${refs}</b>.`, { tab: "s", hlS: db.s.map((x, i) => (x.pid === pid ? i : -1)).filter((i) => i >= 0) });
        if (refs > 0 && rule === 0) return fail("p_restrict", "RESTRICT: има студенти от тази специалност.", { tab: "s" });
        for (let i = 0; i < db.s.length; i++) {
          if (db.s[i].pid !== pid) continue;
          if (rule === 2) { db.s[i].pid = ""; step("p_setnull", `SET NULL: студент ${db.s[i].sid} остава без специалност (pid = NULL).`, { tab: "s", hlS: [i] }); }
          else { const sid = db.s[i].sid; delStudent(sid, 1, true); step("p_cascade", `CASCADE: изтрит е студент ${sid} заедно с неговите записвания.`, { tab: "s" }); i--; }
        }
        db.p[k] = db.p[db.p.length - 1]; db.p.pop();
        step("p_ok", `Специалност ${pid} е изтрита.`, { ok: true, tab: "p", log: `✓ ${cmd.raw}` });
        return null;
      }
      case "-C": {
        const cid = cmd.a, k = findC(cid);
        if (k < 0) return fail(null, "Няма такава дисциплина.", { tab: "c" });
        const refs = db.e.filter((x) => x.cid === cid).length;
        if (refs > 0 && rule === 0) return fail(null, "RESTRICT: има записвания за дисциплината.", { tab: "e" });
        if (refs > 0 && rule === 2) return fail(null, "SET NULL е невъзможно: Enrollment.cid е част от първичния ключ.", { tab: "e" });
        db.e = db.e.filter((x) => x.cid !== cid);
        db.c[k] = db.c[db.c.length - 1]; db.c.pop();
        step(null, `Дисциплина ${cid} е изтрита${refs ? ` (CASCADE: и ${refs} записвания)` : ""}.`, { ok: true, tab: "c", log: `✓ ${cmd.raw}` });
        return null;
      }
      default: return fail(null, `Непозната команда „${S.esc(cmd.op)}“. Използвай +P +S +C +E -P -S -C.`);
    }
  }

  const algos = {
    run_script({ script, rule, base }) {
      const r = RULES[rule];
      if (r === undefined) throw new Error("Непознато правило при изтриване.");
      const db = newDb();
      if (base !== false && base !== "false") for (const c of parseScript(BASE)) exec(db, c, r, null);
      const cmds = parseScript(script);
      if (!cmds.length) throw new Error("Въведи поне една команда, напр. „+E 1 C1 5“.");
      const F = [], res = [];
      const snap = (d, o) => ({ db: clone(d), ...o });
      F.push(snap(db, { msg: `Начално състояние${base === false || base === "false" ? " (празна база)" : " (примерните данни)"}. Правило при изтриване: <b>${rule}</b>.` }));
      for (const c of cmds) {
        const err = exec(db, c, r, F, snap);
        res.push(err ? "err" : "ok");
      }
      const nn = db.s.filter((x) => !x.pid).length;
      F.push(snap(db, { done: true, msg: `Край: ${res.filter((x) => x === "ok").length} приети, ${res.filter((x) => x === "err").length} отказани команди.` }));
      return { frames: F, result: res.join(" "), counts: [db.p.length, db.s.length, db.c.length, db.e.length].join(" "), nullpid: nn, db };
    },
    BASE,
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Релационният модел представя данните чрез <dfn data-g="релация">релации</dfn> върху <dfn data-g="домейн">домейни</dfn>. В табличната интерпретация <dfn data-g="атрибут">атрибутът</dfn> съответства на колона, <dfn data-g="кортеж">кортежът</dfn> — на ред, а домейнът задава допустимите стойности. В математическата релация кортежите не се повтарят и нямат съществен ред. Редът на колоните също не носи предметен смисъл при идентифициране по име.</p>
</div>

<div class="block">
  <h3>Математическа релация срещу SQL таблица</h3>
  <div class="split" id="r-cmp"></div>
  <div class="row"><button class="btn" id="r-shuffle">Разбъркай редовете и колоните</button><button class="btn" id="r-dup">Добави повторен ред</button><button class="btn ghost" id="r-reset">Отначало</button></div>
  <div class="key" id="r-cmp-d"></div>
  <details class="hint"><summary>Защо разликите са важни</summary><div><p>SQL таблиците могат да съдържат дубликати, ако ограниченията не ги забраняват, и използват <dfn data-g="null">NULL</dfn>. Заявка без <code>ORDER BY</code> не обещава определен ред на резултата. <code>DISTINCT</code> премахва дубликати в избраните резултатни колони. Тези различия са важни при пренасяне на математически изводи към реална СУБД.</p></div></details>
</div>

<div class="block">
  <h3>Ключове</h3>
  <p class="prose"><dfn data-g="суперключ">Суперключ</dfn> е множество атрибути, което еднозначно определя кортеж. <dfn data-g="кандидатен ключ">Кандидатният ключ</dfn> е <b>минимален по включване</b> суперключ: никой негов собствен поднабор не е суперключ. <dfn data-g="първичен ключ">Първичният ключ</dfn> е избраният кандидатен ключ; останалите могат да бъдат <dfn data-g="алтернативен ключ">алтернативни ключове</dfn>.</p>
  <div class="split">
    <div class="key"><b>суперключ ⊇ кандидатен ключ</b><p>Всеки кандидатен ключ е суперключ; добавиш ли атрибут към суперключ, пак е суперключ.</p></div>
    <div class="key"><b>минимален ≠ най-малък</b><p>При ключове {NationalID} и {Country, DocumentNo} вторият не престава да е кандидатен само защото е по-дълъг.</p></div>
  </div>
  <p class="prose muted">Ключовете се <b>извеждат</b> от функционалните зависимости — алгоритъмът със затваряне X⁺ е в <a href="#fz">раздел 5</a>.</p>
</div>

<div class="block">
  <h3>Схема 3 · Първичните и външните ключове свързват релации</h3>
  <p class="prose"><code>Enrollment</code> реализира връзка много към много. Двойката (sid, cid) е съставен първичен ключ в примера. <dfn data-g="външен ключ">Външният ключ</dfn> свързва записи с ключ в друга или същата таблица. <dfn data-g="референтна цялост">Референтната цялост</dfn> не допуска невалидни препратки според ограниченията и правилата за NULL.</p>
  <div class="tbl-wrap"><pre class="t6-sql" id="r-ddl"></pre></div>
  <p class="muted">Учебната схема за визуализатора (SQL е само за четене; проверките се изпълняват от C кода под таблиците):</p>
  <div id="v-rel"></div>
  <details class="hint"><summary>Хинт: защо SET NULL не може за Enrollment.sid</summary><div>
    <p>Колоните на първичния ключ не допускат NULL. Enrollment.sid е част от PK(sid, cid), затова правилото SET NULL при изтриване на студент е невъзможно — остават RESTRICT или CASCADE. За Student.pid (обикновен външен ключ, който допуска NULL) SET NULL е допустимо: студентът остава без специалност.</p>
  </div></details>
  <details class="trap"><summary>Капан: изборът RESTRICT / CASCADE / SET NULL е част от модела</summary><div>
    <p>„Изборът трябва да следва значението на данните, а не желанието командата просто да мине.“ CASCADE при изтриване на специалност изтрива всички нейни студенти и техните оценки — рядко е това, което предметната област иска. Външният ключ <b>не копира</b> автоматично имената от другата таблица и не създава автоматично визуална връзка в приложението.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 4 · Релация, предметна връзка и ограничение</h3>
  <div class="cards" id="r-three"></div>
  <div class="key">Трите английски термина имат близко звучене, но принадлежат на различни логически роли. Не всяка релация е само свързваща таблица.</div>
</div>

<div class="block">
  <h3>NULL е различен от празен текст и нула</h3>
  <p class="prose">Нула е известна числова стойност. Празният низ е текст с дължина нула в системите, които го различават от NULL. <dfn data-g="null">NULL</dfn> маркира липсваща или неизвестна стойност по договор. Затова <code>x = NULL</code> не е правилният тест за липса в SQL; използва се <code>IS NULL</code>. <dfn data-g="unknown">UNKNOWN</dfn> участва в тризначната логика и WHERE оставя само TRUE. Различията между диалектите също са важни, например особеното третиране на празни низове в Oracle Database. Визуализацията на тризначната логика е в <a href="#sql">раздел 4</a>.</p>
</div>`;

  const DDL = `CREATE TABLE Programme (pid VARCHAR(15) PRIMARY KEY, pname VARCHAR(15) NOT NULL);
CREATE TABLE Student   (sid VARCHAR(15) PRIMARY KEY, name VARCHAR(15) NOT NULL,
                        pid VARCHAR(15) REFERENCES Programme(pid) ON DELETE <правило>);
CREATE TABLE Course    (cid VARCHAR(15) PRIMARY KEY, title VARCHAR(15) NOT NULL);
CREATE TABLE Enrollment(sid VARCHAR(15) REFERENCES Student(sid) ON DELETE <правило>,
                        cid VARCHAR(15) REFERENCES Course(cid)  ON DELETE <правило>,
                        grade INT CHECK (grade BETWEEN 2 AND 6),
                        PRIMARY KEY (sid, cid));`;

  function mount(root) {
    root.querySelector("#r-ddl").textContent = DDL;

    /* математическа релация срещу SQL таблица */
    const cmp = root.querySelector("#r-cmp"), cd = root.querySelector("#r-cmp-d");
    const base = { cols: ["id", "name"], rows: [["1", "Ana"], ["2", "Boris"], ["3", "Vera"]] };
    let cur = JSON.parse(JSON.stringify(base)), dupAdded = 0;
    function render(note) {
      cmp.innerHTML = "";
      const set = [];
      cur.rows.forEach((r) => { const key = cur.cols.map((c, j) => c + "=" + r[j]).sort().join("|"); if (!set.includes(key)) set.push(key); });
      const relRows = set.map((k) => { const o = Object.fromEntries(k.split("|").map((x) => x.split("="))); return base.cols.map((c) => o[c]); }).sort((a, b) => a[0].localeCompare(b[0]));
      cmp.append(h("div", null, h("h4", { text: "Математическа релация (множество)" }), T6.table({ cols: base.cols, rows: relRows }, { note: `${relRows.length} кортежа. Повторенията изчезват, редът е без значение.` })));
      cmp.append(h("div", null, h("h4", { text: "SQL таблица (без UNIQUE/PK)" }), T6.table({ cols: cur.cols, rows: cur.rows }, { rowCls: Object.fromEntries(cur.rows.map((r, i) => [i, i >= 3 ? "s-swap" : ""])), note: `${cur.rows.length} реда — дубликатите остават, ако ограничение не ги забранява.` })));
      cd.innerHTML = note || "Двете представят <b>едно и също</b> съдържание, докато няма дубликати. Колоните се идентифицират по име, затова разбъркването не променя релацията.";
    }
    root.querySelector("#r-shuffle").onclick = () => {
      const perm = cur.cols.length === 2 && cur.cols[0] === "id" ? [1, 0] : [0, 1];
      cur = { cols: perm.map((j) => cur.cols[j]), rows: cur.rows.map((r) => perm.map((j) => r[j])).reverse() };
      render("Разбъркахме редовете и колоните. Релацията вляво е <b>същата</b> — множество от кортежи с именувани атрибути. В SQL резултатът без ORDER BY също не обещава ред.");
    };
    root.querySelector("#r-dup").onclick = () => {
      if (dupAdded >= 2) return render("Достатъчно дубликати. Математическата релация пак има 3 кортежа.");
      const ia = cur.cols.indexOf("id"), r = ["", ""]; r[ia] = "2"; r[1 - ia] = "Boris";
      cur.rows.push(r); dupAdded++;
      render("Добавихме ред, който съвпада с вече съществуващ. SQL таблица без PK/UNIQUE го приема; <code>SELECT DISTINCT</code> би го премахнал от <i>резултата</i>. В математическата релация повтореният кортеж е същият елемент на множеството.");
    };
    root.querySelector("#r-reset").onclick = () => { cur = JSON.parse(JSON.stringify(base)); dupAdded = 0; render(); };
    render();

    /* визуализатор: ограничения */
    S.viz(root.querySelector("#v-rel"), {
      id: "rel", title: "Проверка на ограниченията при вмъкване и изтриване", sub: "Команди: <code>+P pid име</code> · <code>+S sid име pid|NULL</code> · <code>+C cid заглавие</code> · <code>+E sid cid оценка</code> · <code>-P pid</code> · <code>-S sid</code> · <code>-C cid</code>",
      code: "ch02_rel",
      inputs: [
        { id: "script", label: "Команди (разделени с ;)", value: "+E 1 C1 5; +E 4 C1 5; +E 2 C2 7; +S 4 Dimo FIZ; +S 4 Dimo INF; +E 4 C2 6", width: "30em" },
        { id: "rule", label: "ON DELETE", type: "select", value: "RESTRICT", options: ["RESTRICT", "CASCADE", "SET NULL"] },
        { id: "base", label: "примерни данни", type: "checkbox", value: true },
      ],
      presets: [
        { label: "Нарушения при вмъкване", values: { script: "+E 1 C1 5; +E 4 C1 5; +E 2 C2 7; +S 4 Dimo FIZ; +S 4 Dimo INF; +E 4 C2 6", rule: "RESTRICT" } },
        { label: "Изтрий студент", values: { script: "-S 1", rule: "RESTRICT" }, title: "Опитай с трите правила" },
        { label: "Изтрий специалност", values: { script: "-P INF", rule: "SET NULL" } },
        { label: "CASCADE по веригата", values: { script: "-P INF", rule: "CASCADE" } },
        { label: "NULL в pid", values: { script: "+S 7 Eli NULL; +S 8 NULL INF", rule: "RESTRICT" } },
      ],
      legend: [["s-cmp", "проверява се"], ["s-done", "вмъкнат ред"], ["s-swap", "нарушение"]],
      build: algos.run_script,
      draw(st, f) {
        st.innerHTML = "";
        const db = f.db;
        const mk = (key, name, cols, rows, pk, fk, hl) => {
          const rowCls = {};
          (hl || []).forEach((i) => (rowCls[i] = f.bad ? "s-swap" : f.ok ? "s-done" : "s-cmp"));
          const t = T6.table({ name: (f.tab === key ? "▸ " : "") + name, cols, rows }, { pk, fk, rowCls });
          if (f.tab === key) t.style.outline = "2px solid var(--accent)", t.style.outlineOffset = "4px", t.style.borderRadius = "4px";
          return t;
        };
        if (f.cmd) st.append(h("p", { class: "t6-res", style: { marginBottom: "10px" }, text: "› " + f.cmd }));
        st.append(T6.row(
          mk("p", "Programme", ["pid", "pname"], db.p.map((x) => [x.pid, x.pname]), [0], [], f.hlP),
          mk("s", "Student", ["sid", "name", "pid"], db.s.map((x) => [x.sid, x.name, x.pid]), [0], [2], f.hlS),
          mk("c", "Course", ["cid", "title"], db.c.map((x) => [x.cid, x.title]), [0], [], f.hlC),
          mk("e", "Enrollment", ["sid", "cid", "grade"], db.e.map((x) => [x.sid, x.cid, x.grade]), [0, 1], [0, 1], f.hlE)));
      },
    });

    /* три термина */
    const three = [
      ["Relation", "Релация", "Математическото понятие: множество кортежи. Таблицата Student сама представя релация.", "релация"],
      ["Relationship", "Предметна връзка", "„Студент е записан в дисциплина.“ Моделира се чрез друга релация — Enrollment.", "предметна връзка"],
      ["Referential integrity", "Референтна цялост", "Изискване към препратките, реализирано например с външни ключове.", "референтна цялост"],
    ];
    const tc = root.querySelector("#r-three");
    three.forEach(([en, bg, d, g]) => tc.append(h("div", { class: "card" }, h("span", { class: "eyebrow", text: en }), h("h4", null, h("dfn", { "data-g": g, text: bg })), h("p", { text: d }))));
  }

  S.chapter({ id: "relmodel", order: 2, num: "2", group: "Релационен модел", title: "Релационен модел", lead: "Релация, атрибут, кортеж, домейн. Ключовете от суперключ до първичен. Външен ключ, референтна цялост и правилата при изтриване.", html, mount, algos });
})();
