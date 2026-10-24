/* Раздел 9 — Допълнение и единен пример за жизнения цикъл; миграция (ръководство, глава 8; схеми 19, 20). C: c/09_migration.c */
(function () {
  const S = window.Study, h = S.h;

  const STUDENTS = [101, 102, 103, 104];
  const SRC = [[1, 101, 12000], [2, 102, 5000], [3, 103, 25000], [4, 101, 3000], [5, 104, 9999]];
  const BUGS = { none: "без грешка", noconv: "без превалутиране", fkshift: "изместено съпоставяне на студентите", dupid: "последният ред затрит с копие", drop: "изпуснат ред", fktypo: "несъществуващ студент" };
  const CHECKS = ["брой редове", "уникален ключ", "чужди ключове", "контролна сума (€)", "ред по ред"];

  /* ---------- чисти функции (същата логика като c/09_migration.c) ---------- */
  const bgn_to_eur = (st) => Math.floor((st * 100000 + 97791) / 195583);
  function migrate(src, bug) {
    const dst = [];
    src.forEach((row, i) => {
      const n = src.length;
      if (bug === "drop" && i === n - 1) return;
      let r = { id: row[0], student: row[1], amount: row[2] };
      if (bug !== "noconv") r.amount = bgn_to_eur(r.amount);
      if (bug === "fkshift") { const k = STUDENTS.indexOf(row[1]); if (k >= 0) r.student = STUDENTS[(k + 1) % STUDENTS.length]; }
      if (bug === "fktypo" && i === 0) r.student += 1000;
      if (bug === "dupid" && i === n - 1 && n > 1) r = Object.assign({}, dst[dst.length - 1]);
      dst.push(r);
    });
    return dst;
  }
  function parseSrc(s) {
    const rows = String(s).split(/[;\n]+/).map((x) => x.trim()).filter(Boolean).map((x) => {
      const p = S.parseNums(x, { min: 0, max: 1e7, minLen: 3, maxLen: 3 });
      if (!STUDENTS.includes(p[1])) throw new Error(`Студент ${p[1]} не съществува (има ${STUDENTS.join(", ")}).`);
      return p;
    });
    if (rows.length < 2 || rows.length > 8) throw new Error("Нужни са от 2 до 8 реда (ид студент стотинки; …).");
    return rows;
  }

  const algos = {
    bgn_to_eur,
    accept({ rows, bug }) {
      const src = parseSrc(rows);
      if (!BUGS[bug]) throw new Error("Непозната грешка.");
      const dst = migrate(src, bug);
      const n = src.length, m = dst.length, F = [];
      let mask = 0;
      const res = [null, null, null, null, null];
      const snap = (o) => Object.assign({ src, dst, res: res.slice(), mask }, o);
      F.push(snap({ at: "enter", vars: { n, m }, msg: `Миграция „${BUGS[bug]}“: ${n} реда в старата система (стотинки), ${m} в новата (евроценти). Курс 1 € = 1.95583 лв.`, log: `n=${n}, m=${m}` }));
      // 1
      res[0] = m === n; if (res[0]) mask |= 1;
      F.push(snap({ at: "count", chk: 0, vars: { n, m, mask }, msg: `<b>1. Брой редове:</b> ${m} ${m === n ? "=" : "≠"} ${n}.`, log: `брой ${res[0] ? "✓" : "✗"}` }));
      // 2
      let uniq = true, bi = -1, bj = -1;
      for (let i = 0; i < m && uniq; i++) for (let j = i + 1; j < m; j++) if (dst[i].id === dst[j].id) { uniq = false; bi = i; bj = j; break; }
      res[1] = uniq; if (uniq) mask |= 2;
      F.push(snap({ at: "pk", chk: 1, bad: uniq ? [] : [bi, bj], vars: { mask }, msg: `<b>2. Уникален първичен ключ:</b> ${uniq ? "всички ид са различни" : `ид ${dst[bi].id} се среща два пъти`}.`, log: `ключ ${uniq ? "✓" : "✗"}` }));
      // 3
      const badFk = dst.map((r, i) => (STUDENTS.includes(r.student) ? -1 : i)).filter((i) => i >= 0);
      res[2] = !badFk.length; if (res[2]) mask |= 4;
      F.push(snap({ at: "fk", chk: 2, bad: badFk, vars: { mask }, msg: `<b>3. Чужди ключове:</b> ${badFk.length ? `студент ${dst[badFk[0]].student} не съществува` : "всички студенти съществуват"}.`, log: `FK ${res[2] ? "✓" : "✗"}` }));
      // 4
      const want = src.reduce((s, r) => s + bgn_to_eur(r[2]), 0), got = dst.reduce((s, r) => s + r.amount, 0);
      res[3] = want === got; if (res[3]) mask |= 8;
      F.push(snap({ at: "sum", chk: 3, vars: { want, got, mask }, msg: `<b>4. Контролна сума в евроценти:</b> очаквано ${want}, получено ${got}${want === got ? "" : ` (×${(got / want).toFixed(2)})`}.`, log: `сума ${res[3] ? "✓" : "✗"}` }));
      // 5
      const miss = [];
      src.forEach((r, i) => { if (!dst.some((d) => d.id === r[0] && d.student === r[1] && d.amount === bgn_to_eur(r[2]))) miss.push(i); });
      res[4] = !miss.length; if (res[4]) mask |= 16;
      F.push(snap({ at: "rec", chk: 4, srcBad: miss, vars: { mask }, msg: `<b>5. Съпоставяне ред по ред:</b> ${miss.length ? `${miss.length} реда нямат съответствие (ид ${miss.map((i) => src[i][0]).join(", ")})` : "всеки ред има същия студент и сума"}.`, log: `ред по ред ${res[4] ? "✓" : "✗"}` }));
      const pass = mask === 31;
      F.push(snap({ at: "ret", vars: { return: mask }, done: true, msg: pass ? "Всички проверки минават — миграцията може да бъде приета." : `Миграцията <b>не се приема</b>.${res[0] && !pass ? " Обърни внимание: броят редове съвпада, а смисълът не е запазен." : ""}`, inv: { text: "mask = 31 (всички 5 проверки)", ok: pass }, log: `return ${mask}` }));
      return { frames: F, mask, rows: m };
    },
  };

  const STORY = [
    ["Потребност", "zhiznen", "Намаляване на грешките при записване."],
    ["Изисквания", "iziskvania", "Право, срокове и капацитет."],
    ["Проект", "proektirane", "Роли, данни и атомарно записване."],
    ["Проверка", "modeli", "Нормални случаи, откази, конкурентни заявки и натоварване."],
    ["Внедряване", "migracia", "Мигрират се активните студенти и се обучават служителите."],
    ["Експлоатация", "zhiznen", "Измерват се откази и време за обработка, коригират се дефекти."],
    ["Промяна", "zhiznen", "Променят се правила при нов учебен план."],
    ["Замяна", "zhiznen", "Запазват се необходимите архиви и се прекратяват старите интерфейси."],
  ];

  const html = `
<div class="block">
  <h3>Единен пример: от потребност до замяна</h3>
  <p class="muted">Щракни етап — отива към раздела, където механизмът е показан.</p>
  <div class="cards" id="story"></div>
  <div class="key">Примерът показва, че жизненият цикъл е цикъл на <b>организационна система</b>, а не само на програмен код.</div>
</div>

<div class="block">
  <h3>Схеми 19 и 20. Миграция с проверки преди приемане</h3>
  <p class="prose"><dfn data-g="миграция">Миграцията</dfn> включва извличане, преобразуване, съпоставяне на идентичности, зареждане и проверки. Броят редове е необходима, но недостатъчна проверка: еднакъв брой с объркани валути или чужди ключове остава грешна база. Пренасянето на байтове не доказва запазен смисъл.</p>
  <p class="prose muted">Учебен пример: плащания на студенти от стара система (в стотинки) към нова (в евроценти) по фиксирания курс 1 € = 1.95583 лв. Избери типична грешка и виж кои проверки я хващат.</p>
  <div id="v-mig"></div>
  <details class="hint"><summary>Хинт: защо изместеното съпоставяне минава четири от пет проверки</summary><div>
    <p>Всеки ред получава съществуващ, но <b>чужд</b> студент. Броят, ключовете, чуждите ключове и сумата са верни — само проверката ред по ред (идентичност + сума за всеки ид) показва, че плащането е приписано на друг човек. Смисловите проверки са част от приемането.</p>
  </div></details>
  <details class="trap"><summary>Капан: „импортът мина успешно“</summary><div>
    <p>Миграцията на данни трябва да проверява количества, ключове, преобразувания и бизнес смисъл, а не само успешното импортиране. Миграцията е част от организационния жизнен цикъл, не само импорт на файл.</p>
  </div></details>
</div>

<div class="block">
  <h3>ETL и ELT</h3>
  <div class="split">
    <div class="card"><h4><dfn data-g="etl">ETL</dfn></h4><p>Extract Transform Load — назовава последователност на подготовка: преобразуване преди зареждане.</p></div>
    <div class="card"><h4><dfn data-g="elt">ELT</dfn></h4><p>Премества преобразуването след зареждането.</p></div>
  </div>
  <p class="prose">Изборът зависи от средата и контрола върху данните.</p>
</div>

<div class="block">
  <h3>Данните и отговорностите преживяват една версия на софтуера</h3>
  <p class="prose"><dfn data-g="микросервиси">Микросервисите</dfn> отделят услуги с определени отговорности и договори. Те не гарантират автоматично независима разработка, надеждност или добра предметна декомпозиция. Ако всяка промяна изисква едновременно обновяване на всички услуги, физическото разделяне не е премахнало логическата свързаност. Същият въпрос се среща при капсулирането в тема 3.</p>
  <div class="key">ERP и CRM не са взаимно изключващи се категории (виж раздел <a href="#funkcia">3</a>). Класификацията се отнася до функции и организация, а не само до търговско име.</div>
</div>`;

  function mount(root) {
    const sb = root.querySelector("#story");
    STORY.forEach(([t, id, d], i) => sb.append(h("a", { class: "card", href: "#" + id, style: { textDecoration: "none", color: "inherit" } },
      h("span", { class: "eyebrow", text: `${i + 1}` }), h("h4", { text: t }), h("p", { text: d }))));

    const DEF = SRC.map((r) => r.join(" ")).join("; ");
    S.viz(root.querySelector("#v-mig"), {
      id: "mig", title: "Пет проверки преди приемане", sub: "Редове: „ид студент стотинки; …“. Студенти: 101–104.",
      code: "ch09_accept",
      inputs: [{ id: "rows", label: "стара система", value: DEF, width: "24em" }, { id: "bug", label: "внесена грешка", type: "select", value: "fkshift", options: Object.entries(BUGS) }],
      presets: [{ label: "Без превалутиране", values: { bug: "noconv" } }, { label: "Изпуснат ред", values: { bug: "drop" } }, { label: "Чиста", values: { bug: "none" } }],
      legend: [["s-act", "проверява се"], ["s-done", "минала"], ["s-swap", "неуспешна / засегнат ред"]],
      build: algos.accept,
      draw(st, f) {
        st.innerHTML = "";
        const row = h("div", { class: "phase-row" });
        CHECKS.forEach((c, k) => row.append(h("span", { class: "ph " + (f.chk === k ? (f.res[k] ? "s-act" : "s-swap") : f.res[k] == null ? "s-dim" : f.res[k] ? "s-done" : "s-swap"), text: `${k + 1}. ${c}` })));
        st.append(row);
        const tSrc = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "ид" }), h("th", { text: "студент" }), h("th", { text: "стотинки" }), h("th", { text: "→ € цента" })));
        f.src.forEach((r, i) => tSrc.append(h("tr", null, ...[r[0], r[1], r[2], bgn_to_eur(r[2])].map((v) => h("td", { class: (f.srcBad || []).includes(i) ? "s-swap" : "", text: v })))));
        const tDst = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "ид" }), h("th", { text: "студент" }), h("th", { text: "€ цента" })));
        f.dst.forEach((r, i) => tDst.append(h("tr", null, ...[r.id, r.student, r.amount].map((v) => h("td", { class: (f.bad || []).includes(i) ? "s-swap" : "", text: v })))));
        st.append(h("div", { class: "split", style: { marginTop: "12px" } },
          h("div", null, h("div", { class: "mini", text: "стара система" }), h("div", { class: "tbl-wrap" }, tSrc)),
          h("div", null, h("div", { class: "mini", text: "нова система" }), h("div", { class: "tbl-wrap" }, tDst))));
      },
    });
  }

  S.chapter({ id: "migracia", order: 9, num: "9", group: "Жизнен цикъл и проектиране", title: "Единен пример и миграция", lead: "Целият жизнен цикъл на един пример; миграция с проверки на смисъла; ETL/ELT; микросервиси.", html, mount, algos });
})();
