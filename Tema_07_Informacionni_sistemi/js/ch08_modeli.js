/* Раздел 8 — Модели на разработване и проверка (ръководство, глава 7; схеми 15–18). */
(function () {
  const S = window.Study, h = S.h, DG = window.DG;

  const ACT = ["Анализ", "Проектиране", "Реализация", "Проверка"];
  const AS = ["А", "П", "Р", "В"];

  /* ---------- чисти функции ---------- */
  const algos = {
    /** Учебен модел за „късна промяна на изискване“.
        Работата е разделена на `parts` функционални части; всяка минава А→П→Р→В.
        Каскадно: всяка дейност се прави за всички части наведнъж. Итеративно-инкрементно: всяка итерация минава А→П→Р→В за една част.
        След стъпка `at` идва промяна в изискването на част `part`. Брои се колко вече извършени единици работа по тази част
        трябва да се повторят и кога потребителят е видял първата проверена (използваема) част.
        [допускане: всички единици работа са с еднаква цена; промяната засяга само избраната част] */
    rework({ model, parts, at, part }) {
      const n = S.int(parts, 2, 6, "Броят части");
      const total = 4 * n;
      const t = S.int(at, 1, total, "Моментът на промяната");
      const q = S.int(part, 1, n, "Засегнатата част") - 1;
      const seq = [];
      if (model === "waterfall") { for (let a = 0; a < 4; a++) for (let p = 0; p < n; p++) seq.push([a, p]); }
      else { for (let p = 0; p < n; p++) for (let a = 0; a < 4; a++) seq.push([a, p]); }
      const firstUse = seq.findIndex(([a]) => a === 3) + 1;
      const done = Array.from({ length: 4 }, () => Array(n).fill(0));
      const F = [];
      let delivered = 0;
      for (let s = 0; s < t; s++) {
        const [a, p] = seq[s];
        done[a][p] = 1;
        if (a === 3) delivered++;
        F.push({ grid: done.map((r) => r.slice()), cur: [a, p], q, msg: `Стъпка ${s + 1}: <b>${ACT[a]}</b> на част ${p + 1}.${a === 3 ? ` Част ${p + 1} е проверена и може да бъде показана на потребителя.` : ""}`, stats: { стъпка: s + 1, "проверени части": delivered }, log: `${AS[a]}${p + 1}` });
      }
      const hit = [];
      for (let a = 0; a < 4; a++) if (done[a][q]) hit.push([a, q]);
      const grid = done.map((r) => r.slice());
      hit.forEach(([a, p]) => (grid[a][p] = 2));
      const seen = delivered ? `Потребителят е видял ${delivered} проверени части (първата — на стъпка ${firstUse}) и е можел да даде обратна връзка.` : `Потребителят още не е видял работеща част (първата идва на стъпка ${firstUse}).`;
      F.push({ grid, cur: null, q, change: true, msg: `<b>Промяна в изискването на част ${q + 1}</b> след стъпка ${t}. По тази част вече са извършени <b>${hit.length}</b> единици работа — те се повтарят. ${seen}`, stats: { стъпка: t, "за повторение": hit.length, "първа използваема": firstUse }, log: `↯ промяна в част ${q + 1}: ${hit.length} за повторение` });
      return { frames: F, rework: hit.length, firstUse, delivered };
    },

    /** Спираловиден модел: всеки цикъл започва с анализ на риска. risks — оценки 1..9 на рисковете;
        на всеки цикъл се адресира най-големият, прототипът го намалява. */
    spiral({ risks, threshold }) {
      const r = S.parseNums(risks, { min: 1, max: 9, minLen: 1, maxLen: 6 });
      const thr = S.int(threshold, 1, 9, "Прагът");
      const names = r.map((_, k) => "Р" + (k + 1));
      const F = [];
      let cyc = 0;
      const cur = r.slice();
      F.push({ r: cur.slice(), cyc, q: -1, msg: `Рискове: ${cur.map((v, k) => names[k] + "=" + v).join(", ")}. Цикли, докато всички станат ≤ ${thr}.` });
      while (Math.max(...cur) > thr && cyc < 12) {
        cyc++;
        const k = cur.indexOf(Math.max(...cur));
        F.push({ r: cur.slice(), cyc, q: 0, k, msg: `<b>Цикъл ${cyc}, квадрант 1 — цели и ограничения.</b> Уточняваме какво искаме от тази обиколка.`, log: `цикъл ${cyc}` });
        F.push({ r: cur.slice(), cyc, q: 1, k, msg: `<b>Квадрант 2 — анализ на риска.</b> Най-голям е ${names[k]} = ${cur[k]}. Изграждаме прототип, който проверява точно тази хипотеза.`, log: `риск ${names[k]}=${cur[k]}` });
        cur[k] = Math.max(1, cur[k] - 4);
        F.push({ r: cur.slice(), cyc, q: 2, k, msg: `<b>Квадрант 3 — разработване и проверка.</b> Прототипът намалява ${names[k]} до ${cur[k]}.`, log: `${names[k]} → ${cur[k]}` });
        F.push({ r: cur.slice(), cyc, q: 3, k, msg: `<b>Квадрант 4 — планиране на следващия цикъл.</b> Остават: ${cur.map((v, j) => names[j] + "=" + v).join(", ")}.` });
      }
      F.push({ r: cur.slice(), cyc, q: -1, done: true, msg: `Всички рискове ≤ ${thr} след <b>${cyc}</b> цикъла. Рискът е в центъра — броят обиколки се определя от него, а не от предварителен план.`, inv: { text: "max риск ≤ праг", ok: Math.max(...cur) <= thr } });
      return { frames: F, cycles: cyc };
    },
  };

  const MODELS = {
    waterfall: { t: "Каскаден", g: "каскаден модел", d: "Организира дейностите предимно последователно и предполага относително стабилни изисквания." },
    iter: { t: "Итеративен", g: "итерация", d: "Повтаря и уточнява решенията." },
    incr: { t: "Инкрементен", g: "инкремент", d: "Добавя функционалност на части. Итеративният и инкрементният могат да се съчетават." },
    spiral: { t: "Спираловиден", g: "спираловиден модел", d: "Поставя риска в центъра на повторяемите цикли." },
    agile: { t: "Гъвкави подходи", g: "гъвкави подходи", d: "Кратка обратна връзка и адаптация. Не премахват изискванията, проектните решения или документацията." },
  };

  const html = `
<div class="prose">
  <p>Изборът на модел зависи от неопределеността, ограниченията и цената на грешка; <b>няма процесен модел, който сам гарантира успех</b>. Моделите подреждат и повтарят логическите дейности на <a href="#zhiznen">жизнения цикъл</a> по различен начин.</p>
</div>

<div class="block">
  <h3>Схема 15. Последователен, итеративен и спираловиден модел</h3>
  <p class="muted">Щракни модел.</p>
  <div class="chips" id="mdl"></div>
  <div id="s15"></div>
  <div class="detail" id="s15-det"></div>
</div>

<div class="block">
  <h3>Симулация: промяна на изискване в късна фаза</h3>
  <p class="prose">Учебен модел: работата е разделена на функционални части; всяка минава анализ (А), проектиране (П), реализация (Р) и проверка (В). Каскадно — всяка дейност за всички части наведнъж; итеративно-инкрементно — всяка итерация доставя една проверена част. В избран момент идва промяна в изискването на една част (рамкираната колона). Броим колко вече извършена работа по нея се повтаря и кога потребителят е видял първата работеща част. <span class="muted">[допускане: еднаква цена на единиците работа; промяната засяга само избраната част]</span></p>
  <div id="v-rework"></div>
  <details class="hint"><summary>Хинт: какво показва и какво НЕ показва симулацията</summary><div>
    <p>Показва механизма: колкото повече работа е натрупана върху едно изискване преди промяната, толкова повече се повтаря. Сравни „Каскадно, част 1“ и „Итеративно, част 1“ на стъпка 14: итеративно по част 1 е свършена цялата работа — повторението не е по-малко. Разликата е, че потребителят е видял част 1 още на стъпка 4 и е можел да открие грешното изискване тогава. При „Итеративно, част 4“ по засегнатата част са свършени само анализът и проектирането — повтарят се 2 единици вместо 3 при каскадния ход.</p>
    <p>Не показва реални разходи — материалът не дава количествен модел за цената на промяната. Ако изискванията са наистина стабилни (предпоставката на каскадния модел), промяна не идва и разликата изчезва.</p>
  </div></details>
</div>

<div class="block">
  <h3>Спираловидният модел: рискът определя обиколките</h3>
  <div id="v-spiral"></div>
</div>

<div class="block">
  <h3>Схема 18. Итерация, инкремент и прототип</h3>
  <div class="cards">
    <div class="card"><h4><dfn data-g="итерация">Итерация</dfn></h4><p>Повторно преминаване с уточняване. Може да има итерации върху един модул, преди да се добави нов.</p></div>
    <div class="card"><h4><dfn data-g="инкремент">Инкремент</dfn></h4><p>Добавя използваема част от функционалността.</p></div>
    <div class="card"><h4><dfn data-g="прототип">Прототип</dfn></h4><p>Проверява идея или хипотеза и може да бъде изхвърлен; не е задължително първата производствена версия.</p></div>
  </div>
  <div class="key">Думите описват <b>различни аспекти</b> на процеса и могат да се използват едновременно за една работа.</div>
</div>

<div class="block">
  <h3>Схема 16. Верификация и валидация върху един пример</h3>
  <p class="prose"><dfn data-g="верификация">Верификацията</dfn> проверява съответствие със спецификацията. <dfn data-g="валидация">Валидацията</dfn> проверява пригодност за действителната потребност. Система може точно да изпълнява написано изискване и все пак да не решава проблема, ако изискването е било погрешно.</p>
  <p class="muted">Избери как е написано изискването и как е реализирана системата.</p>
  <div id="vv"></div>
  <div class="detail" id="vv-out"></div>
</div>

<div class="block">
  <h3>Нива на проверка</h3>
  <div class="cards" id="levels"></div>
  <p class="prose"><span class="extra-tag">извън конспекта</span> V-моделът разполага нивата на проверка срещу дейностите, чиито резултати те проверяват: модулната проверка — срещу детайлния проект, интеграционната — срещу архитектурата, системната — срещу изискванията, приемателната — срещу потребностите на възложителя.</p>
  <details class="trap"><summary>Капан: ниво на проверка = вид качество</summary><div>
    <p>Нивото на проверка (модулна, интеграционна, системна, приемателна) не е същото като вида на проверяваното качество (напр. производителност, сигурност). Нито една отделна проверка не доказва всички свойства.</p>
  </div></details>
  <details class="hint"><summary>Хинт: успешният тест доказва ли, че изискването е правилно?</summary><div>
    <p>Той дава свидетелство за конкретно проверено поведение. Правилността на самото изискване спрямо нуждата изисква валидация, а обобщението към непроверени случаи зависи от обхвата на проверките.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 17. Четири начина за преминаване към нова система</h3>
  <p class="muted">Щракни начин.</p>
  <div class="chips" id="cut"></div>
  <div id="s17"></div>
  <p class="mini" id="s17-note"></p>
  <p class="prose">Вариантите могат да се комбинират, например пилотен отдел с паралелно водене на стария регистър. Планът трябва да отчита данни, обучение и възстановяване при отказ. Миграцията на данни — в раздел <a href="#migracia">9</a>.</p>
</div>`;

  function mount(root) {
    /* --- схема 15 --- */
    const mb = root.querySelector("#mdl"), s15 = root.querySelector("#s15"), d15 = root.querySelector("#s15-det");
    let m = "waterfall";
    function draw15() {
      mb.innerHTML = "";
      Object.entries(MODELS).forEach(([k, M]) => mb.append(h("button", { class: "chip", "aria-pressed": k === m ? "true" : "false", text: M.t, onclick: () => { m = k; draw15(); } })));
      s15.innerHTML = "";
      const svg = DG.root(640, 260);
      if (m === "waterfall") {
        ACT.concat(["Внедряване"]).forEach((t, i) => {
          DG.node(svg, { x: 80 + i * 120, y: 40 + i * 45, w: 110, h: 34, t, cls: "s-act" });
          if (i < 4) DG.line(svg, [[135 + i * 120, 40 + i * 45], [145 + i * 120, 40 + i * 45], [145 + i * 120, 68 + i * 45]]);
        });
      } else if (m === "iter" || m === "incr" || m === "agile") {
        const n = m === "agile" ? 4 : 3;
        for (let k = 0; k < n; k++) {
          const cx = 90 + k * (520 / (n - 1 || 1)) * (n === 4 ? 0.95 : 1), cy = 120;
          svg.append(S.svg("circle", { cx, cy, r: 55, class: "ln", style: "stroke:var(--st-act)" }));
          ACT.forEach((t, j) => { const a = -Math.PI / 2 + j * Math.PI / 2; DG.text(svg, cx + 40 * Math.cos(a), cy + 40 * Math.sin(a) + 4, AS[j], "el"); });
          DG.text(svg, cx, cy + 4, m === "incr" ? `+ част ${k + 1}` : m === "agile" ? `кратък цикъл ${k + 1}` : `итерация ${k + 1}`, "sub");
          if (m !== "iter") DG.node(svg, { x: cx, y: 215, w: 90, h: 30, t: m === "agile" ? "обратна връзка" : `${k + 1} части`, cls: "s-done" });
          if (k < n - 1) DG.line(svg, [[cx + 57, cy], [cx + (520 / (n - 1)) * (n === 4 ? 0.95 : 1) - 57, cy]]);
        }
      } else {
        const pts = [];
        for (let t = 0; t <= 4 * Math.PI * 2.2; t += 0.1) { const r = 8 + t * 3.6; pts.push([320 + r * Math.cos(t), 130 + r * Math.sin(t) * 0.95]); }
        svg.append(S.svg("path", { d: "M" + pts.map((p) => p.join(",")).join(" L"), class: "ln", style: "stroke:var(--st-act)" }));
        svg.append(S.svg("line", { x1: 320, y1: 10, x2: 320, y2: 250, class: "ln dash" }), S.svg("line", { x1: 150, y1: 130, x2: 490, y2: 130, class: "ln dash" }));
        [["цели", 240, 40], ["анализ на риска", 420, 40], ["разработване и проверка", 430, 235], ["планиране", 220, 235]].forEach(([t, x, y]) => DG.text(svg, x, y, t, "sub"));
      }
      DG.wrap(s15, svg);
      const M = MODELS[m];
      d15.innerHTML = `<h4><dfn data-g="${M.g}" tabindex="0">${M.t}</dfn></h4><p>${M.d}</p>`;
    }
    draw15();

    /* --- rework --- */
    S.viz(root.querySelector("#v-rework"), {
      id: "rework", title: "Цена на късната промяна (учебен модел)", sub: "Ред = дейност, колона = функционална част.", code: false,
      inputs: [
        { id: "model", label: "модел", type: "select", value: "waterfall", options: [["waterfall", "каскаден"], ["iter", "итеративно-инкрементен"]] },
        { id: "parts", label: "части", type: "number", value: 4, width: "5em" },
        { id: "at", label: "промяна след стъпка", type: "number", value: 14, width: "5em" },
        { id: "part", label: "засегната част", type: "number", value: 1, width: "5em" },
      ],
      presets: [{ label: "Каскадно, част 1", values: { model: "waterfall", at: 14, part: 1 } }, { label: "Итеративно, част 1", values: { model: "iter", at: 14, part: 1 } }, { label: "Итеративно, част 4", values: { model: "iter", at: 14, part: 4 } }, { label: "Рано (стъпка 3)", values: { at: 3 } }],
      speed: 2,
      legend: [["s-act", "текуща"], ["s-done", "извършена"], ["s-swap", "за повторение"]],
      build: algos.rework,
      draw(st, f) {
        st.innerHTML = "";
        const n = f.grid[0].length;
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "" }), ...Array.from({ length: n }, (_, p) => h("th", { text: "част " + (p + 1) }))));
        f.grid.forEach((row, a) => tb.append(h("tr", null, h("th", { text: ACT[a] }), ...row.map((v, p) => {
          const cur = f.cur && f.cur[0] === a && f.cur[1] === p;
          return h("td", { class: cur ? "s-act" : v === 2 ? "s-swap" : v ? "s-done" : "", style: p === f.q ? { boxShadow: "inset 0 0 0 2px var(--st-piv)" } : null, text: v === 2 ? "↺" : v ? "✓" : "" });
        }))));
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });

    /* --- спирала --- */
    const Q = ["цели", "риск", "разработване", "планиране"];
    S.viz(root.querySelector("#v-spiral"), {
      id: "spiral", title: "Цикли до приемлив риск", sub: "Учебен модел: всеки прототип намалява адресирания риск с 4 точки (оценки 1–9).", code: false,
      inputs: [{ id: "risks", label: "рискове (1–9)", value: "8 5 7", width: "10em" }, { id: "threshold", label: "приемлив праг", type: "number", value: 3, width: "5em" }],
      presets: [{ label: "Нисък риск", values: { risks: "2 3 1" } }, { label: "Висок риск", values: { risks: "9 9 8 6" } }],
      build: algos.spiral,
      draw(st, f) {
        st.innerHTML = "";
        const row = h("div", { class: "phase-row" });
        Q.forEach((q, j) => row.append(h("span", { class: "ph " + (j === f.q ? "s-act" : "s-dim"), text: q })));
        st.append(h("p", { class: "mini", text: `цикъл ${f.cyc}` }), row);
        const b = h("div", { style: { marginTop: "10px", maxWidth: "420px" } });
        st.append(b);
        S.drawBars(b, f.r, { height: 130, cls: f.k != null ? { [f.k]: f.q === 2 ? "s-done" : "s-swap" } : {}, fmt: (v, k) => "Р" + (k + 1) + "=" + v });
      },
    });

    /* --- V&V --- */
    const vv = root.querySelector("#vv"), vo = root.querySelector("#vv-out");
    const st = { req: "right", impl: "spec" };
    const OPT = {
      req: [["right", "„Студентът да не може да се запише два пъти в дисциплина за семестър“ (вярно отразява нуждата)"], ["wrong", "„Студентът да не може да се запише два пъти в една и съща дисциплина“ — без семестър (повторно записване в нов семестър е нужно)"]],
      impl: [["spec", "Реализацията изпълнява точно написаното"], ["off", "Реализацията се отклонява от написаното"]],
    };
    function drawVV() {
      vv.innerHTML = "";
      [["req", "Изискване"], ["impl", "Реализация"]].forEach(([k, t]) => {
        const c = h("div", { class: "chips" });
        OPT[k].forEach(([v, l]) => c.append(h("button", { class: "chip", style: { textAlign: "left" }, "aria-pressed": st[k] === v ? "true" : "false", text: l, onclick: () => { st[k] = v; drawVV(); } })));
        vv.append(h("div", { class: "axis" }, h("b", { text: t }), c));
      });
      const ver = st.impl === "spec", val = ver && st.req === "right";
      vo.innerHTML = `<p><span class="pill ${ver ? "s-done" : "s-swap"}">верификация: ${ver ? "минава" : "не минава"}</span> <span class="pill ${val ? "s-done" : "s-swap"}">валидация: ${val ? "минава" : "не минава"}</span></p>
        <p>${ver && !val ? "Системата <b>точно изпълнява написаното</b> — и пак не е пригодна: студент, който трябва да повтори дисциплината в нов семестър, не може да се запише. Грешката е в изискването, не в кода." : !ver ? "Реализацията не съответства на спецификацията — верификацията го открива. Без съответствие няма смисъл да се говори за пригодност." : "Съответства на спецификацията и спецификацията отразява нуждата."}</p>
        <p class="mini">[допускане: примерът с повторно записване в нов семестър е учебна илюстрация, изградена върху правилото от ръководството „студент, дисциплина и семестър“.]</p>`;
    }
    drawVV();

    const LV = [["Модулна", "Ограничен компонент"], ["Интеграционна", "Взаимодействия"], ["Системна", "Цялото решение"], ["Приемателна", "Критериите на възложителя"]];
    const lvb = root.querySelector("#levels");
    LV.forEach(([t, d]) => lvb.append(h("div", { class: "card" }, h("h4", { text: t }), h("p", { text: d }))));

    /* --- преминаване --- */
    const CUT = {
      direct: { t: "Пряко", n: "Сменя наведнъж. Концентрира промяната — и риска — в един момент." },
      phased: { t: "Поетапно", n: "Прехвърля части (модули) последователно." },
      pilot: { t: "Пилотно", n: "Ограничава първия обхват — напр. един отдел." },
      parallel: { t: "Паралелно", n: "Стара и нова работят едновременно. Позволява сравнение и намалява определени рискове, но носи двойна работа и нужда от съгласуване." },
    };
    const cb = root.querySelector("#cut"), s17 = root.querySelector("#s17"), n17 = root.querySelector("#s17-note");
    let cu = "direct";
    function draw17() {
      cb.innerHTML = "";
      Object.entries(CUT).forEach(([k, C]) => cb.append(h("button", { class: "chip", "aria-pressed": k === cu ? "true" : "false", text: C.t, onclick: () => { cu = k; draw17(); } })));
      s17.innerHTML = "";
      const rows = cu === "phased" || cu === "pilot" ? (cu === "pilot" ? ["Пилотен отдел", "Останалите"] : ["Модул 1", "Модул 2", "Модул 3"]) : ["Всички"];
      const rh = cu === "parallel" ? 62 : 40, H = 30 + rows.length * rh + 30;
      const svg = DG.root(640, H);
      const T0 = 120, T1 = 620, mid = 330;
      DG.line(svg, [[T0, H - 22], [T1, H - 22]]);
      DG.text(svg, T1, H - 6, "време", "sub", "end");
      rows.forEach((r, i) => {
        const y = 20 + i * rh;
        DG.text(svg, 10, y + 18, r, "sub", "start");
        let cut = mid;
        if (cu === "phased") cut = 220 + i * 110;
        if (cu === "pilot") cut = i === 0 ? 220 : 470;
        const oldEnd = cu === "parallel" ? 500 : cut;
        svg.append(S.svg("rect", { x: T0, y, width: oldEnd - T0, height: 26, rx: 4, style: "fill:var(--panel-2);stroke:var(--st-dim)" }));
        svg.append(S.svg("rect", { x: cut, y: cu === "parallel" ? y + 30 : y, width: T1 - cut, height: 26, rx: 4, style: "fill:var(--st-done-bg);stroke:var(--st-done)" }));
        DG.text(svg, (T0 + oldEnd) / 2, y + 17, "стара", "el");
        DG.text(svg, (cut + T1) / 2, (cu === "parallel" ? y + 30 : y) + 17, "нова", "el");
      });
      DG.wrap(s17, svg);
      n17.textContent = CUT[cu].n;
    }
    draw17();
  }

  S.chapter({ id: "modeli", order: 8, num: "8", group: "Жизнен цикъл и проектиране", title: "Модели на разработване и проверка", lead: "Каскаден, итеративен, инкрементен, спираловиден и гъвкав подход; верификация срещу валидация; начини за преминаване.", html, mount, algos });
})();
