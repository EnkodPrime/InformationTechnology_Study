/* Раздел 6 — Изисквания и моделиране (ръководство, глава 5; схеми 8–11). C: c/06_requirements.c */
(function () {
  const S = window.Study, h = S.h, DG = window.DG;

  /* Елементи на проследимостта — същите като в C (enum и EDGES в същия ред). */
  const EL = [
    { id: "N1", k: "need", t: "Потребност", d: "Да няма двойно записване на студент в дисциплина." },
    { id: "R1", k: "req", t: "Изискване: уникалност", d: "Студентът не може да е записан два пъти в една дисциплина за семестър — и при едновременни заявки." },
    { id: "R2", k: "req", t: "Изискване: време", d: "95% от записванията да отговарят до 2 s при зададено натоварване, мерено от сървъра." },
    { id: "D1", k: "des", t: "Проект: уникално ограничение", d: "Уникално ограничение върху (студент, дисциплина, семестър)." },
    { id: "D2", k: "des", t: "Проект: транзакция", d: "Транзакционно обработване на записването." },
    { id: "D3", k: "des", t: "Проект: екран", d: "Екранът показва грешката разбираемо." },
    { id: "C1", k: "code", t: "Код: enroll()", d: "Функцията за записване в приложния слой." },
    { id: "C2", k: "code", t: "Код: таблица", d: "Таблицата на записванията с ограничението." },
    { id: "T1", k: "test", t: "Тест: две едновременни", d: "Две едновременни заявки на един студент — изпитва точно правилото." },
    { id: "T2", k: "test", t: "Тест: две последователни", d: "Две последователни заявки — не изпитват конкурентното поведение." },
    { id: "T3", k: "test", t: "Тест: натоварване", d: "Натоварване по модела от R2." },
  ];
  const IDX = Object.fromEntries(EL.map((e, i) => [e.id, i]));
  const EDGES = [["N1", "R1"], ["N1", "R2"], ["R1", "D1"], ["R1", "D2"], ["R1", "D3"], ["R2", "D2"], ["D1", "C2"], ["D2", "C1"], ["D3", "C1"], ["C1", "T1"], ["C2", "T1"], ["C1", "T2"], ["C1", "T3"], ["R2", "T3"]].map(([a, b]) => [IDX[a], IDX[b]]);

  /* ---------- чисти функции ---------- */
  const algos = {
    /** Същото като nfr_check() в C. */
    nfr_check({ times, offset, limit, pct }) {
      const t = S.parseNums(times, { min: 0, max: 60000, minLen: 1, maxLen: 40 });
      const off = S.int(offset, 0, 5000, "Добавката");
      const lim = S.int(limit, 1, 60000, "Границата");
      const p = S.int(pct, 1, 100, "Процентът");
      const n = t.length, F = [];
      let ok = 0;
      const res = new Array(n).fill(null);
      F.push({ at: "enter", vars: { n, offset_ms: off, limit_ms: lim, pct: p }, t, res: res.slice(), i: -1, msg: `Изискване: <b>${p}%</b> от заявките до <b>${lim} ms</b>, мерено ${off ? `от клиента (+${off} ms мрежа)` : "от сървъра"}.`, log: `n=${n}` });
      for (let i = 0; i < n; i++) {
        F.push({ at: "loop", vars: { i, ok }, t, res: res.slice(), i, msg: `<code>i &lt; n</code>: ${i} &lt; ${n}.`, stats: { ok, общо: i } });
        const m = t[i] + off;
        F.push({ at: "measure", vars: { i, ok, measured: m }, t, res: res.slice(), i, msg: `measured = ${t[i]} + ${off} = <b>${m}</b> ms.`, stats: { ok, общо: i } });
        const pass = m <= lim;
        res[i] = pass;
        F.push({ at: "cmp", vars: { i, ok, measured: m }, t, res: res.slice(), i, msg: `${m} ≤ ${lim}? <b>${pass ? "да" : "не"}</b>.`, stats: { ok, общо: i + 1 }, log: `#${i}: ${m} ${pass ? "✓" : "✗"}` });
        if (pass) { ok++; F.push({ at: "ok", vars: { i, ok, measured: m }, t, res: res.slice(), i, msg: `ok = ${ok}.`, stats: { ok, общо: i + 1 } }); }
      }
      const verdict = n > 0 && ok * 100 >= p * n ? 1 : 0;
      F.push({ at: "verdict", vars: { ok, n, "ok*100": ok * 100, "pct*n": p * n, return: verdict }, t, res: res.slice(), i: -1, done: true, verdict,
        msg: `${ok}·100 = ${ok * 100} ${verdict ? "≥" : "&lt;"} ${p}·${n} = ${p * n} → изискването е <b>${verdict ? "изпълнено" : "НЕ е изпълнено"}</b> (${ok}/${n} = ${Math.round((ok * 1000) / n) / 10}%).`,
        inv: { text: verdict ? "проверим критерий: изпълнен" : "проверим критерий: неизпълнен", ok: !!verdict }, stats: { ok, общо: n }, log: `return ${verdict}` });
      return { frames: F, ok, n, verdict };
    },

    /** Същото като impact() в C: обхождане в ширина по ребрата на проследимостта. */
    impact({ start }) {
      const s = IDX[start];
      if (s == null) throw new Error("Непознат елемент: " + start);
      const F = [], seen = new Array(EL.length).fill(0), q = [], out = [];
      let head = 0;
      seen[s] = 1; q.push(s);
      const snap = (o) => Object.assign({ seen: seen.slice(), q: q.slice(head), out: out.slice() }, o);
      F.push(snap({ at: "enter", cur: s, vars: { start: EL[s].id }, msg: `Променяме <b>${EL[s].id}</b> — ${EL[s].t}. Търсим всичко, което зависи от него.` }));
      F.push(snap({ at: "push", cur: s, vars: { start: EL[s].id, queue: q.slice(head).map((x) => EL[x].id) }, msg: `Слагаме ${EL[s].id} в опашката.`, log: `+${EL[s].id}` }));
      while (head < q.length) {
        F.push(snap({ at: "loop", cur: -1, vars: { queue: q.slice(head).map((x) => EL[x].id) }, msg: `Опашката не е празна (${q.length - head}).` }));
        const u = q[head++];
        out.push(u);
        F.push(snap({ at: "pop", cur: u, vars: { u: EL[u].id, засегнати: out.length }, msg: `Вадим <b>${EL[u].id}</b> — засегнат: ${EL[u].t}.`, log: `засегнат ${EL[u].id}` }));
        for (let e = 0; e < EDGES.length; e++) {
          if (EDGES[e][0] !== u) continue;
          const v = EDGES[e][1];
          F.push(snap({ at: ["edge", "check"], cur: u, edge: e, vars: { u: EL[u].id, v: EL[v].id, "seen[v]": seen[v] }, msg: `Ребро ${EL[u].id} → ${EL[v].id}: ${seen[v] ? "вече е отбелязан" : "нов"}.` }));
          if (!seen[v]) {
            seen[v] = 1; q.push(v);
            F.push(snap({ at: ["mark", "push"], cur: u, edge: e, vars: { u: EL[u].id, v: EL[v].id, queue: q.slice(head).map((x) => EL[x].id) }, msg: `Отбелязваме ${EL[v].id} и го слагаме в опашката.`, log: `+${EL[v].id}` }));
          }
        }
      }
      F.push(snap({ at: "ret", cur: -1, done: true, vars: { return: out.length }, msg: `Засегнати са <b>${out.length}</b> елемента: ${out.map((x) => EL[x].id).join(" ")}. Това са моделите, кодът и тестовете, които трябва да се прегледат.`, log: `return ${out.length}` }));
      return { frames: F, out: out.map((x) => EL[x].id) };
    },
  };

  const REQS = [
    ["Студентът подава заявление за записване.", "f"],
    ["Системата да бъде бърза.", "bad"],
    ["95% от заявките да отговарят до 2 s при 500 едновременни потребители, мерено от получаването на заявката до изпращането на отговора от сървъра.", "nf"],
    ["Служителят одобрява или отхвърля заявление.", "f"],
    ["Системата да е удобна за ползване.", "bad"],
    ["Само ролята „служител“ има достъп до личните данни на кандидатите.", "nf"],
    ["Да няма двойно записване на студент в дисциплина за семестър, включително при едновременни заявки.", "f"],
  ];
  const RV = { f: ["функционално", "s-act", "Описва действие / поведение."], nf: ["нефункционално, проверимо", "s-done", "Качество или ограничение с измерим критерий."], bad: ["непроверимо", "s-swap", "Няма операция, натоварване, граница и точка на измерване — не може да се провери."] };

  const html = `
<div class="prose">
  <p><dfn data-g="функционално изискване">Функционалното изискване</dfn> определя услуга или поведение: „студентът подава заявление“. <dfn data-g="нефункционално изискване">Нефункционалното</dfn> определя качество или ограничение: време за отговор, достъпност, съвместимост или сигурност. Изискванията трябва да са <b>проверими</b>.</p>
</div>

<div class="block">
  <h3>Кое изискване е проверимо?</h3>
  <p class="muted">Щракни изискване — виж вида му и защо.</p>
  <div id="reqs" style="display:grid;gap:6px"></div>
  <div class="detail" id="req-det"></div>
</div>

<div class="block">
  <h3>Измеримо нефункционално изискване — проверка</h3>
  <p class="prose">„95% от заявките да отговарят до две секунди при определени данни и натоварване“ задава оценим критерий. И този критерий трябва да посочи <b>от кой момент до кой</b> се измерва, иначе две страни могат да отчитат различни времена. Смени точката на измерване на „от клиента“ — същите сървърни времена дават друга присъда.</p>
  <div id="v-nfr"></div>
  <details class="hint"><summary>Хинт: защо целочислено сравнение <code>ok*100 >= pct*n</code></summary><div>
    <p>Избягва деление и закръгляне с плаваща запетая: 18/20 = 90% се сравнява точно с прага. При 95% и n = 20 са нужни поне 19 успешни заявки.</p>
  </div></details>
</div>

<div class="block">
  <h3>Потребност → изискване → проект → тест</h3>
  <p class="prose">Потребността описва <b>защо</b> е нужна промяната. Изискването задава проверимо поведение или ограничение. Проектът избира <b>как</b> да се реализира. Тестът събира свидетелство, че поведението съответства. „Да няма двойно записване“ може да доведе до уникално ограничение върху студент, дисциплина и семестър плюс транзакционно обработване. Проверка с две <b>едновременни</b> заявки изпитва точно този случай; две последователни заявки не са достатъчни.</p>
</div>

<div class="block">
  <h3>Схеми 8 и 11. Проследимост — анализ на въздействието</h3>
  <p class="prose"><dfn data-g="проследимост">Проследимостта</dfn> свързва потребност с изискване, проектен елемент, реализация и проверка. Ако правилото за записване се промени, тя помага да бъдат намерени засегнатите екрани, таблици и тестове. Избери елемент, който се променя — обхождането в ширина намира всичко зависимо.</p>
  <div id="v-impact"></div>
  <details class="trap"><summary>Капан: приоритетът променя ли истинността на изискване?</summary><div>
    <p>Не. Приоритизирането определя кое е необходимо за конкретна версия, без да променя истинността на останалите изисквания.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 9. Участник, случай на употреба и граница</h3>
  <p class="prose"><dfn data-g="случай на употреба">Случаят на употреба</dfn> описва цел на участник и взаимодействие със системата. Участникът е <b>външна роля</b> спрямо системата. Щракни участник или случай. (Диаграмата показва връзката между целите; тя не е програмен алгоритъм или точен UML чертеж.)</p>
  <div id="s9"></div>
  <div class="detail" id="s9-det"></div>
</div>

<div class="block">
  <h3>Схема 10. Контекст и поток на данните</h3>
  <p class="prose"><dfn data-g="контекстна диаграма">Контекстната диаграма</dfn> очертава границата и външните потоци. <dfn data-g="диаграма на потоците от данни">Диаграмите на потоците от данни</dfn> описват преобразуване на информацията и не са същото като блок-схема на конкретен алгоритъм. По-подробните модели могат да разделят процеси и хранилища.</p>
  <div class="chips" id="dfn-lvl"></div>
  <div id="s10"></div>
  <p class="mini" id="s10-note"></p>
  <details class="trap"><summary>Капан: DFD като блок-схема</summary><div>
    <p>Потокът пренася <b>данни</b>, а не непременно контрол на изпълнението. В DFD няма условия, цикли и ред на изпълнение.</p>
  </div></details>
</div>

<div class="block">
  <h3>Един модел не заменя всички останали</h3>
  <p class="muted">Щракни модел — какъв въпрос задава.</p>
  <div class="cards" id="models"></div>
  <p class="prose"><dfn data-g="uml">UML</dfn> е език за моделиране, а <dfn data-g="bpmn">BPMN</dfn> е нотация за бизнес процеси; нито едното само по себе си е метод за управление на проект. Реални средства: UML диаграми в Enterprise Architect или Visual Paradigm; изисквания и задачи в Jira, Azure DevOps или Zoho Projects. Инструментът съхранява модела и работата, но не заменя анализа на потребностите.</p>
  <p class="prose"><dfn data-g="заинтересована страна">Заинтересованите страни</dfn> включват потребители, възложител, администратори и външни участници.</p>
</div>`;

  const MODELS = [
    ["Случаи на употреба", "Каква е целта на участника и как взаимодейства със системата?"],
    ["Контекстна диаграма", "Къде е границата и какви са външните потоци?"],
    ["Потоци от данни (DFD)", "Как се преобразува информацията между процеси и хранилища?"],
    ["Модел на данните", "Каква е идентичността на обектите и отношенията им?"],
    ["UML диаграма на класове", "Каква е статичната структура?"],
    ["UML диаграма на последователност", "В какъв ред си разменят съобщения участниците?"],
    ["UML диаграма на дейности", "Какъв е потокът от действия?"],
    ["UML диаграма на състояния", "През кои състояния минава обектът и при какви събития?"],
    ["BPMN", "Как протича бизнес процесът?"],
  ];

  function mount(root) {
    /* --- изисквания --- */
    const rb = root.querySelector("#reqs"), rd = root.querySelector("#req-det");
    const btns = REQS.map(([t, v], k) => h("button", { class: "card", "aria-pressed": "false", style: { padding: "8px 12px" }, onclick: () => {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", j === k ? "true" : "false"));
      const [n, cls, why] = RV[v];
      rd.innerHTML = `<p><span class="pill ${cls}">${n}</span></p><p>${why}</p>`;
    } }, h("span", { text: t })));
    rb.append(...btns);
    rd.innerHTML = '<p class="muted">Избери изискване.</p>';

    /* --- NFR --- */
    const TIMES = "420 380 1900 650 2400 510 880 1200 700 1750 300 950 610 1490 2050 560 830 1020 400 1300";
    S.viz(root.querySelector("#v-nfr"), {
      id: "nfr", title: "Проверка: pct% от заявките до limit ms", sub: "Лентите са измерените времена; линията е границата.",
      code: "ch06_nfr",
      inputs: [
        { id: "times", label: "времена на сървъра (ms)", value: TIMES, width: "22em" },
        { id: "offset", label: "точка на измерване", type: "select", value: "0", options: [["0", "от сървъра (+0)"], ["300", "от клиента (+300 ms мрежа)"]] },
        { id: "limit", label: "граница, ms", type: "number", value: 2000, width: "6em" },
        { id: "pct", label: "процент", type: "number", value: 95, width: "5em" },
      ],
      presets: [{ label: "90%", values: { pct: 90, offset: "0" } }, { label: "90% от клиента", values: { pct: 90, offset: "300" } }, { label: "граница 2500", values: { limit: 2500, pct: 95, offset: "0" } }],
      random: () => ({ times: S.randArray(16, 200, 2600).join(" ") }),
      speed: 3,
      legend: [["s-act", "текуща"], ["s-done", "в границата"], ["s-swap", "над границата"]],
      build: algos.nfr_check,
      draw(st, f, { inputs }) {
        st.innerHTML = "";
        const off = +inputs.offset, lim = +inputs.limit;
        const vals = f.t.map((x) => x + off);
        const cls = {};
        f.res.forEach((r, k) => { if (r != null) cls[k] = r ? "s-done" : "s-swap"; });
        if (f.i >= 0 && f.res[f.i] == null) cls[f.i] = "s-act";
        const box = h("div", { style: { position: "relative" } });
        st.append(box);
        S.drawBars(box, vals, { height: 170, cls, fmt: (v) => v, labelsUpTo: 24 });
        const max = Math.max(1, ...vals);
        if (lim <= max) box.append(h("div", { style: { position: "absolute", left: 0, right: 0, bottom: `${20 + (lim / max) * 150}px`, borderTop: "2px dashed var(--st-swap)" } }, h("span", { class: "mini", style: { position: "absolute", right: 0, top: "-18px" }, text: `граница ${lim} ms` })));
      },
    });

    /* --- проследимост --- */
    const COL = { need: 0, req: 1, des: 2, code: 3, test: 4 };
    const COLT = ["Потребност", "Изисквания", "Проект", "Реализация", "Проверки"];
    const POS = {};
    const per = {};
    EL.forEach((e, i) => { const c = COL[e.k]; per[c] = (per[c] || 0) + 1; POS[i] = [c, per[c] - 1]; });
    const xy = (i) => { const [c, r] = POS[i]; const cnt = per[c]; return [70 + c * 125, 50 + (r + 0.5) * (300 / cnt)]; };
    S.viz(root.querySelector("#v-impact"), {
      id: "impact", title: "Какво засяга промяната?", sub: "Ребро u → v: v е изведено от u. Обхождане в ширина (опашка).",
      code: "ch06_impact",
      inputs: [{ id: "start", label: "променя се", type: "select", value: "R1", options: EL.map((e) => [e.id, `${e.id} — ${e.t}`]) }],
      presets: [{ label: "Правилото (R1)", values: { start: "R1" } }, { label: "Таблицата (C2)", values: { start: "C2" } }, { label: "Изискване за време (R2)", values: { start: "R2" } }],
      speed: 2,
      legend: [["s-act", "обработва се"], ["s-cmp", "в опашката"], ["s-done", "засегнат"]],
      build: algos.impact,
      draw(st, f) {
        st.innerHTML = "";
        const svg = DG.root(640, 360);
        COLT.forEach((t, c) => DG.text(svg, 70 + c * 125, 26, t, "sub"));
        EDGES.forEach(([a, b], e) => {
          const [x1, y1] = xy(a), [x2, y2] = xy(b);
          DG.line(svg, [[x1 + 50, y1], [x2 - 52, y2]], { cls: f.edge === e ? "s-act" : f.seen[a] && f.seen[b] && f.out.includes(a) ? "s-done" : "s-dim" });
        });
        EL.forEach((E, i) => {
          const [x, y] = xy(i);
          const cls = f.cur === i ? "s-act" : f.out.includes(i) ? "s-done" : f.q.includes(i) ? "s-cmp" : "";
          DG.node(svg, { x, y, w: 100, h: 34, t: E.id, cls });
        });
        DG.wrap(st, svg);
        const cur = f.cur >= 0 ? EL[f.cur] : null;
        if (cur) st.append(h("p", { class: "mini", html: `<b>${cur.id}</b> — ${cur.t}: ${cur.d}` }));
      },
    });

    /* --- случаи на употреба --- */
    const UC = {
      student: { t: "Студент (участник)", d: "Външна роля. Цел: да се запише в дисциплина. Един човек може да има няколко роли (студент и служител)." },
      clerk: { t: "Служител (участник)", d: "Външна роля. Цел: да одобри или отхвърли заявление." },
      uc1: { t: "Подаване на заявление", d: "Случай на употреба: студентът постига целта „записан съм“ чрез взаимодействие със системата." },
      uc2: { t: "Одобряване на заявление", d: "Случай на употреба на служителя. Свързан е с първия: одобрява се подаденото заявление." },
    };
    const s9 = root.querySelector("#s9"), d9 = root.querySelector("#s9-det");
    let u9 = "uc1";
    function draw9() {
      s9.innerHTML = "";
      const svg = DG.root(640, 230);
      svg.append(S.svg("rect", { x: 170, y: 20, width: 300, height: 190, rx: 10, class: "boundary" }));
      DG.text(svg, 320, 40, "Университетска система (граница)", "sub");
      DG.line(svg, [[90, 110], [205, 80]], { arrow: false, cls: u9 === "student" || u9 === "uc1" ? "s-act" : "" });
      DG.line(svg, [[550, 110], [435, 160]], { arrow: false, cls: u9 === "clerk" || u9 === "uc2" ? "s-act" : "" });
      DG.line(svg, [[320, 102], [320, 140]], { dash: true, label: "свързани цели", lx: 330, ly: 125, anchor: "start" });
      DG.actor(svg, 70, 100, "Студент", u9 === "student" ? "s-act" : "", () => { u9 = "student"; draw9(); });
      DG.actor(svg, 570, 100, "Служител", u9 === "clerk" ? "s-act" : "", () => { u9 = "clerk"; draw9(); });
      DG.node(svg, { x: 320, y: 80, w: 220, h: 42, shape: "ell", t: "Подаване на заявление", cls: u9 === "uc1" ? "s-act" : "", onclick: () => { u9 = "uc1"; draw9(); } });
      DG.node(svg, { x: 320, y: 165, w: 220, h: 42, shape: "ell", t: "Одобряване на заявление", cls: u9 === "uc2" ? "s-act" : "", onclick: () => { u9 = "uc2"; draw9(); } });
      DG.wrap(s9, svg);
      d9.innerHTML = `<h4>${UC[u9].t}</h4><p>${UC[u9].d}</p>`;
    }
    draw9();

    /* --- контекст / DFD --- */
    const lb = root.querySelector("#dfn-lvl"), s10 = root.querySelector("#s10"), n10 = root.querySelector("#s10-note");
    let lvl = 0;
    const NOTES = [
      "Ниво 0 (контекст): цялата система е един процес. Показани са само външните участници и потоците през границата.",
      "Ниво 1: процесът е разделен на подпроцеси и хранилища. Външните потоци са същите като на ниво 0 — балансиране между нивата.",
    ];
    function draw10() {
      lb.innerHTML = "";
      ["Ниво 0 — контекст", "Ниво 1 — процеси и хранилища"].forEach((t, k) => lb.append(h("button", { class: "chip", "aria-pressed": k === lvl ? "true" : "false", text: t, onclick: () => { lvl = k; draw10(); } })));
      s10.innerHTML = "";
      const svg = DG.root(640, 300);
      DG.node(svg, { x: 70, y: 80, w: 110, h: 44, t: "Студент", r: 0 });
      DG.node(svg, { x: 70, y: 230, w: 110, h: 44, t: "Служител", r: 0 });
      DG.node(svg, { x: 580, y: 150, w: 100, h: 44, t: "Банка", r: 0 });
      if (lvl === 0) {
        svg.append(S.svg("rect", { x: 200, y: 40, width: 260, height: 230, rx: 14, class: "boundary" }));
        DG.node(svg, { x: 330, y: 155, w: 160, h: 90, shape: "circ", t: "0\nСистема за\nзаписване", cls: "s-piv" });
        DG.line(svg, [[126, 80], [262, 125]], { label: "заявление", lx: 190, ly: 92 });
        DG.line(svg, [[262, 140], [126, 95]], { label: "потвърждение", lx: 175, ly: 135 });
        DG.line(svg, [[126, 230], [265, 180]], { label: "решение", lx: 190, ly: 225 });
        DG.line(svg, [[408, 150], [528, 150]], { label: "такса", lx: 468, ly: 142 });
      } else {
        svg.append(S.svg("rect", { x: 160, y: 25, width: 350, height: 260, rx: 14, class: "boundary" }));
        DG.node(svg, { x: 245, y: 80, w: 90, h: 90, shape: "circ", t: "1\nПриемане" });
        DG.node(svg, { x: 245, y: 225, w: 90, h: 90, shape: "circ", t: "2\nПроверка" });
        DG.node(svg, { x: 430, y: 150, w: 90, h: 90, shape: "circ", t: "3\nЗаписване" });
        DG.store(svg, { x: 400, y: 60, w: 130, h: 30, t: "D1 Заявления" });
        DG.store(svg, { x: 400, y: 250, w: 130, h: 30, t: "D2 Записвания" });
        DG.line(svg, [[126, 80], [198, 80]], { label: "заявление", lx: 165, ly: 72 });
        DG.line(svg, [[290, 75], [335, 62]]);
        DG.line(svg, [[335, 65], [270, 205]], { label: "", });
        DG.line(svg, [[126, 230], [198, 228]], { label: "решение", lx: 160, ly: 222 });
        DG.line(svg, [[290, 210], [388, 170]], { label: "одобрено", lx: 330, ly: 178 });
        DG.line(svg, [[430, 197], [430, 233]]);
        DG.line(svg, [[475, 150], [528, 150]], { label: "такса", lx: 502, ly: 142 });
        DG.line(svg, [[200, 95], [126, 92]], { label: "потвърждение", lx: 165, ly: 112 });
      }
      DG.wrap(s10, svg);
      n10.textContent = NOTES[lvl] + " Учебен пример [допускане: конкретните процеси и хранилища не са дадени в материала].";
    }
    draw10();

    /* --- модели --- */
    const mb = root.querySelector("#models");
    MODELS.forEach(([t, q]) => mb.append(h("div", { class: "card" }, h("h4", { text: t }), h("p", { text: q }))));
  }

  S.chapter({ id: "iziskvania", order: 6, num: "6", group: "Жизнен цикъл и проектиране", title: "Изисквания и моделиране", lead: "Функционални и измерими нефункционални изисквания, проследимост, случаи на употреба, контекст и потоци от данни.", html, mount, algos });
})();
