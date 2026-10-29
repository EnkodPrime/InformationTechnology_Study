/* Раздел 8а — Многозначни зависимости, 4НФ; зависимост на съединение, 5НФ. */
(function () {
  const S = window.Study, h = S.h;

  Object.assign(window.GLOSSARY, {
    "многозначна зависимост": { cat: "Нормализация", t: "Многозначна зависимост X ↠ Y", en: "Multivalued dependency (MVD)", d: "За всяка стойност на X множеството от стойности на Y не зависи от останалите атрибути Z. Ако два кортежа съвпадат по X, то и „кръстосаната“ комбинация (Y от първия, Z от втория) трябва да е в релацията.", more: "Всяка ФЗ X → Y е и МЗ X ↠ Y, но не обратно. МЗ е тривиална, ако Y ⊆ X или X ∪ Y = всички атрибути." },
    "4нф": { cat: "Нормализация", t: "4НФ", en: "Fourth normal form", d: "Релацията е в 4НФ, ако за всяка нетривиална многозначна зависимост X ↠ Y множеството X е суперключ.", more: "4НФ ⇒ BCNF. Нарушава се, когато в една таблица са смесени две независими многозначни характеристики на един обект." },
    "зависимост на съединение": { cat: "Нормализация", t: "Зависимост на съединение", en: "Join dependency (JD)", d: "R удовлетворява *(R₁, …, Rₙ), ако R винаги е равна на естественото съединение на проекциите си върху R₁, …, Rₙ.", more: "МЗ е частен случай с две части: X ↠ Y | Z ⇔ *(XY, XZ)." },
    "5нф": { cat: "Нормализация", t: "5НФ (PJ/NF)", en: "Fifth normal form, project-join NF", d: "Релацията е в 5НФ, ако всяка нетривиална зависимост на съединение в нея следва от кандидатните ключове.", more: "Нарушава се рядко — при цикличен бизнес правило между три (или повече) обекта, което не може да се изрази с ФЗ или МЗ." },
    "теорема на фейгин": { cat: "Нормализация", t: "Теорема на Фейгин", en: "Fagin's theorem", d: "R(X, Y, Z) е равна на съединението на проекциите си върху XY и XZ тогава и само тогава, когато X ↠ Y | Z.", more: "Затова разлагането по МЗ е беззагубно." },
  });

  /* ---------- релационни помощници (чисти) ---------- */
  const key = (r) => JSON.stringify(r);
  function project(rel, cols) {
    const idx = cols.map((c) => rel.cols.indexOf(c));
    const seen = new Set(), rows = [];
    rel.rows.forEach((r) => { const t = idx.map((i) => r[i]); const k = key(t); if (!seen.has(k)) { seen.add(k); rows.push(t); } });
    return { cols: cols.slice(), rows };
  }
  function join(a, b) {
    const common = a.cols.filter((c) => b.cols.includes(c));
    const extra = b.cols.filter((c) => !common.includes(c));
    const cols = a.cols.concat(extra), rows = [], seen = new Set();
    a.rows.forEach((ra) => b.rows.forEach((rb) => {
      if (common.every((c) => ra[a.cols.indexOf(c)] === rb[b.cols.indexOf(c)])) {
        const t = ra.concat(extra.map((c) => rb[b.cols.indexOf(c)])); const k = key(t);
        if (!seen.has(k)) { seen.add(k); rows.push(t); }
      }
    }));
    return { cols, rows };
  }
  /** Преподрежда колоните на rel като cols и връща множество от ключове на редовете. */
  function rowSet(rel, cols) { return new Set(project(rel, cols).rows.map(key)); }
  /** Проверка на МЗ X ↠ Y: връща липсващите кръстосани кортежи (празно ⇒ изпълнена). */
  function mvdMissing(rel, X, Y) {
    const Z = rel.cols.filter((c) => !X.includes(c) && !Y.includes(c));
    const ix = (cs) => cs.map((c) => rel.cols.indexOf(c));
    const have = new Set(rel.rows.map(key)), miss = [], seen = new Set();
    rel.rows.forEach((t1) => rel.rows.forEach((t2) => {
      if (!ix(X).every((i) => t1[i] === t2[i])) return;
      const t3 = rel.cols.map((c, j) => (X.includes(c) || Y.includes(c) ? t1[j] : t2[j]));
      const k = key(t3);
      if (!have.has(k) && !seen.has(k)) { seen.add(k); miss.push(t3); }
    }));
    return { Z, miss };
  }
  /** Зависимост на съединение: съединява проекциите по parts; връща резултата и фалшивите кортежи. */
  function jd(rel, parts) {
    let j = project(rel, parts[0]);
    for (let k = 1; k < parts.length; k++) j = join(j, project(rel, parts[k]));
    j = project(j, rel.cols);
    const orig = new Set(rel.rows.map(key));
    const spurious = j.rows.filter((r) => !orig.has(key(r)));
    return { joined: j, spurious, holds: spurious.length === 0 };
  }

  /* ---------- данни ---------- */
  const SCP0 = { name: "StudentCoursePhone", cols: ["Студент", "Курс", "Телефон"], rows: [
    ["Ana", "БД", "0881"], ["Ana", "БД", "0882"], ["Ana", "ОС", "0881"], ["Ana", "ОС", "0882"],
    ["Boris", "БД", "0893"],
  ] };
  const OFFER = { name: "Offer", cols: ["Преподавател", "Курс", "Програма"], rows: [
    ["Петров", "БД", "КН"], ["Петров", "ОС", "Информатика"], ["Иванов", "БД", "Информатика"], ["Петров", "БД", "Информатика"],
  ] };
  const algos = { project, join, mvdMissing, jd, SCP0, OFFER };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>BCNF премахва повторенията, причинени от <dfn data-g="функционална зависимост">функционални зависимости</dfn>. Остават два вида излишък, които ФЗ не могат да опишат: <b>независими многозначни характеристики</b> на един обект (решава ги 4НФ) и <b>циклични правила между три обекта</b> (решава ги 5НФ).</p>
</div>

<div class="block">
  <h3>Многозначна зависимост: два независими списъка в една таблица</h3>
  <p class="prose">Студентът има <b>списък курсове</b> и <b>списък телефони</b>. Двата списъка не са свързани: телефонът не зависи от курса. Ако ги сложим в една таблица, всеки курс трябва да се повтори с всеки телефон — иначе таблицата твърди нещо невярно („телефон 0882 важи само за ОС“). Това е <dfn data-g="многозначна зависимост">многозначната зависимост</dfn> Студент ↠ Курс | Телефон.</p>
  <div id="mvd-lab"></div>
  <div class="key"><b>Определение (с думи).</b><p>X ↠ Y е в сила, ако за всяка стойност на X множеството от стойности на Y е едно и също, каквито и да са останалите атрибути Z. Еквивалентно: ако два реда съвпадат по X, кръстосаният ред (Y от първия, Z от втория) също трябва да присъства.</p></div>
  <details class="hint"><summary>Защо ФЗ не стига да опише това</summary><div><p>Студент → Курс не е вярно (студентът има няколко курса), Студент → Телефон — също. Няма нетривиална ФЗ и таблицата (Студент, Курс, Телефон), в която ключът е и трите атрибута, е в BCNF. Излишъкът идва от изискването за всички комбинации, а не от функционална зависимост.</p></div></details>
</div>

<div class="block">
  <h3>4НФ: всяка многозначна зависимост да идва от ключ</h3>
  <p class="prose">Таблицата е в <dfn data-g="4нф">4НФ</dfn>, ако за всяка нетривиална X ↠ Y множеството X е суперключ. Тук Студент ↠ Курс, а {Студент} не е ключ ⇒ таблицата не е в 4НФ. Разлагаме на (Студент, Курс) и (Студент, Телефон). По <dfn data-g="теорема на фейгин">теоремата на Фейгин</dfn> разлагането е беззагубно точно защото МЗ е в сила.</p>
  <div id="nf4-lab"></div>
  <div class="key"><b>Полза от 4НФ</b><p>Ред на студент с c курса и p телефона: в една таблица c·p реда; след разлагането c + p реда. Нов телефон: c нови реда срещу 1. Невъзможно е да се получи „частична“ комбинация, която твърди нещо невярно.</p></div>
  <details class="trap"><summary>Капан: „4НФ е за повтарящи се стойности въобще“</summary><div><p>Не. Повтаряне, причинено от ФЗ, се решава с 2НФ/3НФ/BCNF. 4НФ е за <b>независимите</b> многозначни характеристики. Ако курсът и телефонът бяха свързани (напр. „телефон за връзка по този курс“), таблицата (Студент, Курс, Телефон) е правилна и няма какво да се разлага.</p></div></details>
</div>

<div class="block">
  <h3>Зависимост на съединение и 5НФ: цикличното правило</h3>
  <p class="prose">Правило в университета: <b>ако</b> преподавателят може да води курса, <b>и</b> преподавателят преподава в програмата, <b>и</b> курсът е част от програмата, <b>тогава</b> той води курса в тази програма. Фактът „кой какво води къде“ тогава се определя от три двойни факта. Това е <dfn data-g="зависимост на съединение">зависимостта на съединение</dfn> *( {Преподавател, Курс}, {Преподавател, Програма}, {Курс, Програма} ).</p>
  <div id="jd-lab"></div>
  <div class="key"><b>5НФ</b><p>Таблицата е в <dfn data-g="5нф">5НФ</dfn>, ако всяка нетривиална зависимост на съединение в нея следва от кандидатните ключове. Offer(Преподавател, Курс, Програма) няма многозначни зависимости (в 4НФ е), но цикличното правило е зависимост на съединение, която не следва от ключа (ключът е трите атрибута) ⇒ не е в 5НФ. Разлагаме на трите проекции.</p></div>
  <details class="hint"><summary>Защо две таблици не стигат</summary><div><p>Съединението на <b>кои да е две</b> от трите проекции дава фалшив ред (бутоните по-горе го показват). Само съединението на <b>трите</b> възстановява точно оригинала. Затова 5НФ разлага на три части, а не на две — това не може да се постигне с МЗ.</p></div></details>
  <details class="trap"><summary>Капан: „разлагай на тройки винаги“</summary><div><p>Разлагането на три проекции е вярно <b>само ако правилото е в сила</b> в предметната област. Без правилото съединението на трите проекции създава факти, които не са верни (превключи „Правилото не важи“). Нормализацията следва зависимостите, а не формата на таблицата.</p></div></details>
</div>

<div class="block">
  <h3>Йерархия</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Форма</th><th>Отстранява излишък, причинен от</th><th>Условие</th></tr>
    <tr><td>BCNF</td><td>функционални зависимости</td><td>всеки детерминант на нетривиална ФЗ е суперключ</td></tr>
    <tr><td>4НФ</td><td>многозначни зависимости</td><td>всяко X на нетривиална X ↠ Y е суперключ</td></tr>
    <tr><td>5НФ</td><td>зависимости на съединение</td><td>всяка нетривиална зависимост на съединение следва от кандидатните ключове</td></tr>
  </table></div>
  <p class="prose">Всяка ФЗ е МЗ, а всяка МЗ е зависимост на съединение с две части ⇒ 5НФ ⇒ 4НФ ⇒ BCNF ⇒ 3НФ. На практика нарушенията на 4НФ се срещат при смесване на независими списъци; нарушенията на 5НФ са редки. <span class="extra-tag">разширение</span> Съществува и 6НФ (всяка релация с ключ и най-много един друг атрибут), използвана при темпорални данни.</p>
</div>`;

  function mount(root) {
    const T6 = window.T6;
    /* --- МЗ лаборатория --- */
    let scp = JSON.parse(JSON.stringify(SCP0));
    const mvdBox = h("div", { style: { display: "grid", gap: "10px", minWidth: "0" } });
    const mvdMsg = h("div", { class: "viz-msg" });
    const phoneIn = h("input", { type: "text", id: "nf45-phone", value: "0889", "aria-label": "Нов телефон", style: { width: "7em" } });
    const courseIn = h("input", { type: "text", id: "nf45-course", value: "Мрежи", "aria-label": "Нов курс", style: { width: "7em" } });
    function drawMvd(hl) {
      const r = mvdMissing(scp, ["Студент"], ["Курс"]);
      mvdBox.innerHTML = "";
      const rowCls = {}; (hl || []).forEach((i) => (rowCls[i] = "s-done"));
      const tblMiss = r.miss.length ? T6.table({ name: "Липсващи комбинации (нарушена МЗ)", cols: scp.cols, rows: r.miss }, { rowCls: Object.fromEntries(r.miss.map((_, i) => [i, "s-swap"])) }) : null;
      // решетка курс × телефон за Ana
      const ana = scp.rows.filter((x) => x[0] === "Ana");
      const cs = [...new Set(ana.map((x) => x[1]))], ps = [...new Set(ana.map((x) => x[2]))];
      const grid = h("table", { class: "t grid t6" }, h("tr", null, h("th", { text: "Ana: курс × телефон" }), ...ps.map((p) => h("th", { text: p }))));
      cs.forEach((c) => grid.append(h("tr", null, h("th", { text: c }), ...ps.map((p) => { const on = ana.some((x) => x[1] === c && x[2] === p); return h("td", { class: on ? "s-done" : "s-swap", text: on ? "✓" : "липсва" }); }))));
      mvdBox.append(T6.row(T6.table({ name: `${scp.name} · ${scp.rows.length} реда`, cols: scp.cols, rows: scp.rows }, { rowCls, pk: [0, 1, 2] }), h("div", { style: { display: "grid", gap: "6px" } }, h("div", { class: "tbl-wrap" }, grid), tblMiss)));
      mvdMsg.innerHTML = r.miss.length
        ? `<div class="warn"><b>Таблицата е непоследователна:</b> липсват ${r.miss.length} комбинации. Без тях тя твърди, че някой телефон важи само за някой курс.</div>`
        : `<div><b>Студент ↠ Курс | Телефон е в сила:</b> за всеки студент всяка двойка (курс, телефон) присъства.</div>`;
    }
    root.querySelector("#mvd-lab").append(h("div", { class: "viz", style: { padding: "12px 14px", display: "grid", gap: "10px" } },
      h("div", { class: "row" },
        h("label", { class: "field" }, h("span", { text: "нов телефон на Ana" }), phoneIn),
        h("button", { class: "btn primary", type: "button", text: "Добави телефон", onclick: () => {
          const p = phoneIn.value.trim(); if (!p) return;
          const cs = [...new Set(scp.rows.filter((x) => x[0] === "Ana").map((x) => x[1]))];
          const before = scp.rows.length; const added = [];
          cs.forEach((c) => { if (!scp.rows.some((x) => x[0] === "Ana" && x[1] === c && x[2] === p)) { scp.rows.push(["Ana", c, p]); added.push(scp.rows.length - 1); } });
          drawMvd(added); mvdMsg.insertAdjacentHTML("afterbegin", `<div>Един нов телефон изисква <b>${scp.rows.length - before}</b> нови реда — по един за всеки курс на Ana.</div>`);
        } }),
        h("label", { class: "field" }, h("span", { text: "нов курс на Ana" }), courseIn),
        h("button", { class: "btn", type: "button", text: "Добави курс", onclick: () => {
          const c = courseIn.value.trim(); if (!c) return;
          const ps = [...new Set(scp.rows.filter((x) => x[0] === "Ana").map((x) => x[2]))];
          const before = scp.rows.length; const added = [];
          ps.forEach((p) => { if (!scp.rows.some((x) => x[0] === "Ana" && x[1] === c && x[2] === p)) { scp.rows.push(["Ana", c, p]); added.push(scp.rows.length - 1); } });
          drawMvd(added); mvdMsg.insertAdjacentHTML("afterbegin", `<div>Един нов курс изисква <b>${scp.rows.length - before}</b> нови реда — по един за всеки телефон.</div>`);
        } }),
        h("button", { class: "btn", type: "button", text: "Изтрий ред (Ana, ОС, 0882)", onclick: () => { scp.rows = scp.rows.filter((x) => !(x[0] === "Ana" && x[1] === "ОС" && x[2] === "0882")); drawMvd(); } }),
        h("button", { class: "btn ghost", type: "button", text: "Отначало", onclick: () => { scp = JSON.parse(JSON.stringify(SCP0)); drawMvd(); } })),
      mvdBox, mvdMsg));
    drawMvd();

    /* --- 4НФ: разлагане и брой редове --- */
    const cR = h("input", { type: "range", min: 1, max: 10, value: 4, id: "nf4-c", "aria-label": "курсове" });
    const pR = h("input", { type: "range", min: 1, max: 6, value: 3, id: "nf4-p", "aria-label": "телефони" });
    const nf4Box = h("div", { style: { display: "grid", gap: "10px", minWidth: "0" } });
    function drawNf4() {
      const c = +cR.value, p = +pR.value;
      const CS = ["БД", "ОС", "Мрежи", "Алгоритми", "ИИ", "Крипт.", "Уеб", "ООП", "Сигурност", "Архит."].slice(0, c);
      const PS = ["0881", "0882", "0883", "0884", "0885", "0886"].slice(0, p);
      const one = { name: `Една таблица (не е в 4НФ) · ${c}·${p} = ${c * p} реда`, cols: ["Студент", "Курс", "Телефон"], rows: [] };
      CS.forEach((x) => PS.forEach((y) => one.rows.push(["Ana", x, y])));
      const sc = project(one, ["Студент", "Курс"]), sp = project(one, ["Студент", "Телефон"]);
      const back = join(sc, sp);
      const ok = rowSet(back, one.cols).size === one.rows.length && [...rowSet(back, one.cols)].every((k) => rowSet(one, one.cols).has(k));
      nf4Box.innerHTML = "";
      nf4Box.append(
        h("div", { class: "row" }, h("label", { class: "field" }, h("span", null, "курсове на Ana: ", h("b", { text: c })), cR), h("label", { class: "field" }, h("span", null, "телефони на Ana: ", h("b", { text: p })), pR)),
        T6.row(T6.table(one, { pk: [0, 1, 2] }), T6.op("⇒"), T6.table({ name: `StudentCourse · ${c} реда`, cols: sc.cols, rows: sc.rows }, { pk: [0, 1] }), T6.table({ name: `StudentPhone · ${p} реда`, cols: sp.cols, rows: sp.rows }, { pk: [0, 1] })),
        h("div", { class: "stats" }, h("span", null, "редове: ", h("b", { text: `${c * p} → ${c + p}` })), h("span", null, "стойности: ", h("b", { text: `${3 * c * p} → ${2 * (c + p)}` })), h("span", null, "нов телефон: ", h("b", { text: `${c} реда → 1 ред` })),
          h("span", { class: "pill " + (ok ? "s-done" : "s-swap"), text: ok ? "StudentCourse ⋈ StudentPhone = оригинала (без загуба)" : "загуба!" })));
    }
    cR.addEventListener("input", drawNf4); pR.addEventListener("input", drawNf4);
    root.querySelector("#nf4-lab").append(h("div", { class: "viz", style: { padding: "12px 14px" } }, nf4Box));
    drawNf4();

    /* --- 5НФ: зависимост на съединение --- */
    let rule = true, offer = JSON.parse(JSON.stringify(OFFER));
    const P = { TC: ["Преподавател", "Курс"], TP: ["Преподавател", "Програма"], CP: ["Курс", "Програма"] };
    const jdBox = h("div", { style: { display: "grid", gap: "12px", minWidth: "0" } });
    const jdMsg = h("div", { class: "viz-msg" });
    let shown = "all";
    function drawJd() {
      const tc = project(offer, P.TC), tp = project(offer, P.TP), cp = project(offer, P.CP);
      const parts = shown === "TC+TP" ? [P.TC, P.TP] : shown === "TC+CP" ? [P.TC, P.CP] : shown === "TP+CP" ? [P.TP, P.CP] : [P.TC, P.TP, P.CP];
      const r = jd(offer, parts);
      const orig = new Set(offer.rows.map(key));
      const rowCls = {}; r.joined.rows.forEach((x, i) => { if (!orig.has(key(x))) rowCls[i] = "s-swap"; });
      // MVD проверка за всеки единичен атрибут
      const mvds = [["Преподавател"], ["Курс"], ["Програма"]].map((X) => { const other = offer.cols.filter((c) => c !== X[0]); return { X: X[0], Y: other[0], ok: mvdMissing(offer, X, [other[0]]).miss.length === 0 }; });
      jdBox.innerHTML = "";
      jdBox.append(
        T6.row(T6.table({ name: `Offer · ${offer.rows.length} реда`, cols: offer.cols, rows: offer.rows }, { pk: [0, 1, 2] }), T6.op("π"),
          T6.table({ name: "Може_да_води", cols: tc.cols, rows: tc.rows }), T6.table({ name: "Преподава_в", cols: tp.cols, rows: tp.rows }), T6.table({ name: "Курс_в_програма", cols: cp.cols, rows: cp.rows })),
        T6.row(T6.table({ name: "Съединение: " + parts.map((x) => "{" + x.join(", ") + "}").join(" ⋈ "), cols: r.joined.cols, rows: r.joined.rows }, { rowCls }),
          h("div", { style: { display: "grid", gap: "6px", maxWidth: "46ch" } },
            h("span", { class: "eyebrow", text: "Многозначни зависимости в Offer" }),
            ...mvds.map((m) => h("span", { class: "pill " + (m.ok ? "s-swap" : "s-done"), text: `${m.X} ↠ ${m.Y}: ${m.ok ? "в сила" : "не е в сила"}` })),
            h("span", { class: "muted", style: { fontSize: ".85rem" }, text: mvds.some((m) => m.ok) ? "Има нетривиална МЗ — таблицата не е дори в 4НФ." : "Няма нетривиални МЗ ⇒ Offer е в 4НФ. Излишъкът е само в цикличното правило." }))));
      jdMsg.innerHTML = r.holds
        ? `<div><b>Съединението дава точно оригинала</b> (${r.joined.rows.length} реда). ${parts.length === 3 ? "Зависимостта на съединение е в сила." : ""}</div>`
        : `<div class="warn"><b>${r.spurious.length} фалшиви реда</b> (червени): ${r.spurious.map((x) => "(" + x.join(", ") + ")").join(", ")} — съединението твърди факти, които не са в оригинала.</div>`;
    }
    const segBtns = [["TC+TP", "Може_да_води ⋈ Преподава_в"], ["TC+CP", "Може_да_води ⋈ Курс_в_програма"], ["TP+CP", "Преподава_в ⋈ Курс_в_програма"], ["all", "Трите заедно"]].map(([k, t]) => {
      const b = h("button", { class: "btn", type: "button", "aria-pressed": k === shown ? "true" : "false", onclick: () => { shown = k; segBtns.forEach((x) => x.setAttribute("aria-pressed", x.dataset.k === shown ? "true" : "false")); drawJd(); } }, t);
      b.dataset.k = k; return b;
    });
    const ruleCb = h("input", { type: "checkbox", id: "nf5-rule", checked: true, onchange: () => {
      rule = ruleCb.checked;
      offer = JSON.parse(JSON.stringify(OFFER));
      if (!rule) offer.rows = offer.rows.filter((x) => !(x[0] === "Петров" && x[1] === "БД" && x[2] === "Информатика"));
      drawJd();
    } });
    const insBtn = h("button", { class: "btn primary", type: "button", text: "Нов факт: Иванов преподава и в КН", onclick: () => {
      // в 5НФ: добавяме една двойка (Иванов, КН) в Преподава_в; съединението извежда тройките
      const tc = project(offer, P.TC), tp = project(offer, P.TP), cp = project(offer, P.CP);
      if (!tp.rows.some((x) => x[0] === "Иванов" && x[1] === "КН")) tp.rows.push(["Иванов", "КН"]);
      const derived = project(join(join(tc, tp), cp), offer.cols);
      const orig = new Set(offer.rows.map(key));
      const fresh = derived.rows.filter((x) => !orig.has(key(x)));
      jdMsg.innerHTML = `<div>В 5НФ се вмъква <b>един</b> ред: (Иванов, КН) в Преподава_в. Съединението извежда ${fresh.length ? fresh.map((x) => "(" + x.join(", ") + ")").join(", ") : "нищо ново"}.</div>` +
        `<div class="warn">В единствената таблица Offer този ред трябва да се добави <b>ръчно</b>. Ако се пропусне, базата противоречи на правилото — аномалия при вмъкване.</div>`;
      if (rule) { offer.rows.push(...fresh); drawJd(); jdMsg.insertAdjacentHTML("beforeend", `<div class="muted">Offer вече съдържа и изведения ред; превключи бутоните, за да видиш, че съединението на трите проекции пак е точно.</div>`); }
    } });
    root.querySelector("#jd-lab").append(h("div", { class: "viz", style: { padding: "12px 14px", display: "grid", gap: "10px" } },
      h("div", { class: "row" }, ...segBtns), h("div", { class: "row" }, h("label", { class: "field", style: { display: "flex", gap: "6px", alignItems: "center" } }, ruleCb, "Правилото важи (без него редът (Петров, БД, Информатика) липсва)"), insBtn,
        h("button", { class: "btn ghost", type: "button", text: "Отначало", onclick: () => { ruleCb.checked = true; rule = true; offer = JSON.parse(JSON.stringify(OFFER)); drawJd(); } })),
      jdBox, jdMsg));
    drawJd();
  }

  S.chapter({ id: "nf45", order: 8.4, num: "8а", group: "Зависимости и нормализация", title: "4НФ и 5НФ", lead: "Многозначни зависимости и зависимости на съединение: излишъкът, който BCNF не вижда.", html, mount, algos });
})();
