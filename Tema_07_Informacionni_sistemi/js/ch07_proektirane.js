/* Раздел 7 — Проектиране на решението (ръководство, глава 6; схеми 12–14). C: c/07_design.c */
(function () {
  const S = window.Study, h = S.h, DG = window.DG;

  const RES = { 0: "чака", 1: "записан", "-1": "няма места", "-2": "вече е записан" };

  /* ---------- чисти функции (същата логика като c/07_design.c) ---------- */
  function parseStudents(s) {
    const a = S.parseNums(s, { min: 100, max: 999, minLen: 2, maxLen: 3 });
    return a;
  }
  const algos = {
    race({ students, free, sched, mode }) {
      const st = parseStudents(students);
      const f0 = S.int(free, 0, 5, "Свободните места");
      const atomic = mode === "atomic";
      const sc = String(sched).toUpperCase().replace(/\s+/g, "");
      if (!/^[A-C]*$/.test(sc)) throw new Error("Графикът съдържа само буквите A, B, C (по една на стъпка).");
      if (sc.length > 12) throw new Error("Графикът е най-много 12 стъпки.");
      const nr = st.length;
      if ([...sc].some((ch) => ch.charCodeAt(0) - 65 >= nr)) throw new Error(`Има ${nr} заявки — използвай само ${"ABC".slice(0, nr).split("").join(", ")}.`);
      const c = { free: f0, enrolled: [] };
      const R = st.map((s) => ({ student: s, phase: 0, seen_free: null, seen_dup: null, result: 0 }));
      const F = [];
      const snap = (o) => Object.assign({ c: { free: c.free, enrolled: c.enrolled.slice() }, R: R.map((r) => Object.assign({}, r)), atomic,
        vars: Object.assign({ "c->free": c.free, "c->n_enrolled": c.enrolled.length }, ...R.map((r, k) => ({ [`${"ABC"[k]}.phase`]: r.phase, [`${"ABC"[k]}.result`]: r.result }))) }, o);
      F.push(snap({ at: [], k: -1, msg: `Курсът има <b>${f0}</b> свободни места. ${nr} едновременни заявки (${R.map((r, k) => "ABC"[k] + "=" + r.student).join(", ")}). Режим: <b>${atomic ? "атомарно при запис" : "проверка, после запис"}</b>.`, log: "старт" }));
      const step = (k) => {
        const r = R[k], L = "ABC"[k];
        if (!atomic) {
          if (r.phase === 0) {
            r.seen_free = c.free; r.seen_dup = c.enrolled.includes(r.student) ? 1 : 0; r.phase = 1;
            F.push(snap({ at: "read", k, msg: `${L}: <b>чете</b> free = ${r.seen_free}, вече записан = ${r.seen_dup}. Проверката изглежда успешна${r.seen_free > 0 && !r.seen_dup ? "" : " — не"}.`, log: `${L} чете free=${r.seen_free}` }));
            return;
          }
          if (r.seen_dup) { r.result = -2; r.phase = 2; F.push(snap({ at: "dup", k, msg: `${L}: по прочетеното е вече записан → отказ.`, log: `${L}: дубликат` })); return; }
          if (r.seen_free <= 0) { r.result = -1; r.phase = 2; F.push(snap({ at: "full", k, msg: `${L}: по прочетеното няма места → отказ.`, log: `${L}: няма места` })); return; }
          const before = c.free;
          c.free = r.seen_free - 1;
          c.enrolled.push(r.student);
          r.result = 1; r.phase = 2;
          const lost = before !== r.seen_free;
          const dup = c.enrolled.filter((x) => x === r.student).length > 1;
          F.push(snap({ at: ["write", "ok"], k, conflict: lost || c.enrolled.length > f0 || dup, msg: `${L}: <b>записва</b> free = ${r.seen_free} − 1 = ${c.free}${lost ? ` — но междувременно free беше ${before}! Изменението на другата заявка е <b>загубено</b>.` : "."}${dup ? " Студентът е записан <b>два пъти</b>." : ""}`, log: `${L} пише free=${c.free}${lost ? " ✗" : ""}` }));
          return;
        }
        if (c.enrolled.includes(r.student)) { r.result = -2; r.phase = 2; F.push(snap({ at: "adup", k, msg: `${L}: уникалното ограничение (студент, курс) отхвърля дубликата <b>при запис</b>.`, log: `${L}: дубликат` })); return; }
        if (c.free <= 0) { r.result = -1; r.phase = 2; F.push(snap({ at: "afull", k, msg: `${L}: условното изменение (free &gt; 0) не минава — няма места.`, log: `${L}: няма места` })); return; }
        c.free--; c.enrolled.push(r.student); r.result = 1; r.phase = 2;
        F.push(snap({ at: ["awrite", "aok"], k, msg: `${L}: проверка и изменение в <b>една неделима стъпка</b>: free = ${c.free}.`, log: `${L} записан, free=${c.free}` }));
      };
      for (const ch of sc) { const k = ch.charCodeAt(0) - 65; if (R[k].phase !== 2) step(k); }
      for (let k = 0; k < nr; k++) while (R[k].phase !== 2) step(k);
      const over = c.enrolled.length > f0 || new Set(c.enrolled).size !== c.enrolled.length;
      F.push(snap({ at: [], k: -1, done: true, over, msg: `Край: записани ${c.enrolled.length} при ${f0} места, free = ${c.free}. ${over ? "<b>Правилото е нарушено</b> — проверката „на екрана“ не го защитава." : "Правилото е спазено."}`,
        inv: { text: `записани (${c.enrolled.length}) ≤ места (${f0}) и без дубликати`, ok: !over }, log: over ? "✗ нарушено" : "✓ спазено" }));
      return { frames: F, free: c.free, enrolled: c.enrolled.length, res: R.map((r) => r.result).join(",") };
    },

    idem({ lost, use_key }) {
      const L = S.parseNums(lost, { min: 0, max: 1, minLen: 1, maxLen: 5 });
      const key = !!use_key && use_key !== "0";
      const srv = { seen: [], saved: [], effects: 0 };
      const F = [];
      const snap = (o) => Object.assign({ effects: srv.effects, seen: srv.seen.slice(), key, vars: { "s->effects": srv.effects, "s->n_seen": srv.seen.length, use_key: key ? 1 : 0, a: o.a } }, o);
      F.push(snap({ at: [], a: -1, msg: `Клиентът изпраща записване (op_id = 501). Опити: ${L.length}. Изгубени отговори на опити: ${L.map((x, k) => (x ? k + 1 : null)).filter(Boolean).join(", ") || "няма"}. Идентификатор на операцията: <b>${key ? "да" : "не"}</b>.` }));
      let got = -1;
      for (let a = 0; a < L.length; a++) {
        F.push(snap({ at: ["send", "srv"], a, ph: "send", msg: `Опит ${a + 1}: клиентът изпраща заявката.`, log: `→ опит ${a + 1}` }));
        let resp, replay = false;
        if (key) {
          const i = srv.seen.indexOf(501);
          F.push(snap({ at: "lookup", a, ph: "srv", msg: `Сървърът търси op_id 501 сред обработените: ${i >= 0 ? "<b>намерен</b>" : "няма го"}.` }));
          if (i >= 0) { resp = srv.saved[i]; replay = true; F.push(snap({ at: "replay", a, ph: "srv", replay: true, msg: "Повторение → връща <b>запазения резултат</b> без нов бизнес ефект.", log: "повторение, без ефект" })); }
        }
        if (!replay) {
          srv.effects++;
          F.push(snap({ at: "effect", a, ph: "srv", eff: true, msg: `Сървърът изпълнява операцията → <b>бизнес ефект №${srv.effects}</b>${srv.effects > 1 ? " — <b>двойно действие!</b>" : ""}.`, log: `ефект ${srv.effects}${srv.effects > 1 ? " ✗" : ""}` }));
          if (key) { srv.seen.push(501); srv.saved.push(srv.effects); F.push(snap({ at: "store", a, ph: "srv", msg: "Запазва op_id 501 и резултата." })); }
          resp = srv.effects;
        }
        if (L[a]) { F.push(snap({ at: "lost", a, ph: "lost", msg: `Отговорът на опит ${a + 1} се <b>губи</b> (прекъсната връзка). Клиентът не знае дали операцията е изпълнена — повтаря.`, log: "✗ отговорът е изгубен" })); continue; }
        got = a + 1;
        F.push(snap({ at: "got", a, ph: "got", msg: `Клиентът получава отговор (резултат ${resp}) на опит ${got}.`, log: `← отговор, опит ${got}` }));
        break;
      }
      if (got < 0) F.push(snap({ at: "giveup", a: L.length - 1, ph: "lost", msg: "Опитите свършиха без отговор. Клиентът не знае резултата — но ефектът може вече да е настъпил." }));
      const bad = srv.effects > 1;
      F.push(snap({ at: [], a: -1, done: true, msg: `Бизнес ефекти: <b>${srv.effects}</b>. ${bad ? "Транспортното повторение е създало двойно действие." : "Повторението има същия предвиден ефект като едно изпълнение."}`, inv: { text: "ефектите ≤ 1 (идемпотентност)", ok: !bad } }));
      return { frames: F, got, effects: srv.effects };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="архитектура">Архитектурата</dfn> определя основните компоненти, отговорностите им, връзките и значимите решения. <dfn data-g="слоеста архитектура">Слоестата организация</dfn> често отделя представяне, приложна логика и достъп до данни. Това е <b>логическо</b> разделение; не означава задължително три отделни сървъра. Физическото разполагане е друго проектно решение.</p>
  <p>Моделът на данните определя идентификатори, ограничения, връзки и правила за изменение. Интерфейсът трябва да следва задачите на потребителя и да представя грешки разбираемо. Интеграционните договори уточняват формат, семантика, удостоверяване, повторение и поведение при частичен отказ.</p>
</div>

<div class="block">
  <h3>Схеми 12 и 13. Логическите слоеве не броят машините</h3>
  <p class="muted">Горният ред разделя отговорности; долният показва едно възможно разполагане. Смени разполагането.</p>
  <div class="chips" id="dep"></div>
  <div id="s12"></div>
  <p class="mini" id="s12-note"></p>
  <details class="trap"><summary>Капан: „трислойна“ = три компютъра</summary><div>
    <p>Слоевете могат да работят в един процес или на няколко машини. Обратно, много сървъри могат да реализират един слой. Разполагането се описва отделно от отговорностите и следва натоварване, сигурност и поддръжка.</p>
  </div></details>
  <details class="hint"><summary>Хинт: облачна система винаги ли е разпределена по бизнес логика?</summary><div>
    <p>Не. Облакът описва среда и предоставяне на ресурси. Едно монолитно приложение може да е разположено в облак; множество машини не доказват множество независими предметни услуги.</p>
  </div></details>
</div>

<div class="block">
  <h3>Записване в курс: две едновременни заявки и последното място</h3>
  <p class="prose">Интерфейсът изпраща заявка, приложният слой проверява срок, предпоставки и свободни места, а слоят за данни извършва съгласувано изменение. Само проверка на екрана не е достатъчна: две едновременни заявки могат да използват последното място, ако правилото не е защитено при запис.</p>
  <p class="muted">Графикът задава реда на стъпките: „ABAB“ = A чете, B чете, A пише, B пише. В режим „проверка, после запис“ всяка заявка прави две стъпки; при „атомарно“ — една.</p>
  <div id="v-race"></div>
  <details class="hint"><summary>Хинт: какво значи „защитено при запис“</summary><div>
    <p>Проверката и изменението са една неделима операция в слоя за данни — например условно изменение (намали free само ако free &gt; 0) и уникално ограничение върху (студент, дисциплина, семестър) плюс транзакционно обработване. Точните механизми на СУБД са тема 6.</p>
    <p>Тестът, който изпитва това правило, е с <b>две едновременни</b> заявки (график ABAB). Последователният график AABB минава и при грешния режим — затова не е достатъчен.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 14. Повторна заявка и идемпотентен ефект</h3>
  <p class="prose">Повторна заявка след прекъсване на връзката може да създаде двойно действие, ако първата операция е изпълнена, но отговорът е изгубен. <dfn data-g="идемпотентност">Идемпотентността</dfn> означава, че повторението има същия предвиден ефект като едно изпълнение. Платежна или записваща операция може да изисква отделен идентификатор на заявката и правило за разпознаване на повторения.</p>
  <div id="v-idem"></div>
  <div class="key">Транспортната доставка и бизнес ефектът са <b>отделни гаранции</b>. Самото транспортно повторение не осигурява идемпотентен бизнес ефект.</div>
</div>

<div class="block">
  <h3>Качества, които се проектират отрано</h3>
  <div class="cards">
    <div class="card"><h4>Сигурност</h4><p>Права според роли, минимално необходим достъп, регистриране на съществени действия.</p></div>
    <div class="card"><h4>Устойчивост</h4><p>Резервни копия и възстановяване.</p></div>
    <div class="card"><h4>Производителност</h4><p>Модел на натоварване.</p></div>
  </div>
  <p class="prose">Тези качества трябва да се разгледат при проектиране, защото някои решения трудно се добавят след реализацията.</p>
</div>`;

  function mount(root) {
    /* --- слоеве и разполагане --- */
    const DEP = [
      { t: "1 сървър", m: [["Сървър 1", [0, 1, 2]]], n: "Трите логически слоя в един процес на една машина — все още трислойна архитектура." },
      { t: "2 машини", m: [["Уеб/приложен сървър", [0, 1]], ["Сървър на базата", [2]]], n: "Представянето и логиката на една машина, данните на друга." },
      { t: "3 машини", m: [["Уеб сървър", [0]], ["Приложен сървър", [1]], ["Сървър на базата", [2]]], n: "Едно към едно — възможно, но не задължително." },
      { t: "Клъстер за логиката", m: [["Уеб сървър", [0]], ["Прил. 1", [1]], ["Прил. 2", [1]], ["Прил. 3", [1]], ["База", [2]]], n: "Много сървъри реализират един слой. Броят машини не е броят слоеве." },
    ];
    const LAY = ["Представяне", "Приложна логика", "Достъп до данни"];
    const db = root.querySelector("#dep"), s12 = root.querySelector("#s12"), n12 = root.querySelector("#s12-note");
    let d = 0;
    function draw12() {
      db.innerHTML = "";
      DEP.forEach((x, k) => db.append(h("button", { class: "chip", "aria-pressed": k === d ? "true" : "false", text: x.t, onclick: () => { d = k; draw12(); } })));
      s12.innerHTML = "";
      const svg = DG.root(640, 250);
      DG.text(svg, 20, 24, "логически слоеве (отговорности)", "sub", "start");
      DG.text(svg, 20, 160, "физическо разполагане (едно възможно)", "sub", "start");
      const lx = (i) => 120 + i * 200;
      LAY.forEach((t, i) => DG.node(svg, { x: lx(i), y: 70, w: 170, h: 46, t, cls: "s-piv" }));
      const M = DEP[d].m, w = 600 / M.length;
      M.forEach(([t, ls], j) => {
        const x = 20 + w * (j + 0.5);
        DG.node(svg, { x, y: 205, w: Math.min(170, w - 12), h: 46, t, cls: "s-act" });
        ls.forEach((i) => DG.line(svg, [[lx(i), 94], [x, 181]], { cls: "dash", arrow: true }));
      });
      DG.wrap(s12, svg);
      n12.textContent = DEP[d].n;
    }
    draw12();

    /* --- състезание --- */
    S.viz(root.querySelector("#v-race"), {
      id: "race", title: "Последното място", sub: "Детерминиран график на преплитане; същата логика като c/07_design.c.",
      code: "ch07_race",
      inputs: [
        { id: "students", label: "студенти (A B [C])", value: "101 102", width: "9em" },
        { id: "free", label: "свободни места", type: "number", value: 1, width: "5em" },
        { id: "sched", label: "график", value: "ABAB", width: "7em" },
        { id: "mode", label: "режим", type: "select", value: "cta", options: [["cta", "проверка, после запис"], ["atomic", "атомарно при запис"]] },
      ],
      presets: [
        { label: "Последователно AABB", values: { sched: "AABB", students: "101 102", free: 1 } },
        { label: "Един студент ×2", values: { students: "101 101", free: 2, sched: "ABAB" } },
        { label: "Трима, 2 места", values: { students: "101 102 103", free: 2, sched: "ABCABC" } },
      ],
      legend: [["s-act", "текуща заявка"], ["s-done", "записан"], ["s-swap", "конфликт / отказ"]],
      build: algos.race,
      draw(st, f) {
        st.innerHTML = "";
        const over = f.c.enrolled.length > 0 && (f.conflict || f.over);
        const seats = h("div", { class: "row" }, h("span", { class: "mini", text: "Курс:" }),
          h("span", { class: "pill " + (f.c.free < 0 || over ? "s-swap" : "s-piv"), text: `free = ${f.c.free}` }),
          h("span", { class: "mini", text: "записани: " + (f.c.enrolled.join(", ") || "—") }));
        st.append(seats);
        const cards = h("div", { class: "cards", style: { marginTop: "10px" } });
        f.R.forEach((r, k) => {
          const cls = k === f.k ? (f.conflict ? "s-swap" : "s-act") : r.result === 1 ? "s-done" : r.result < 0 ? "s-swap" : "";
          cards.append(h("div", { class: "card " + cls, style: { borderColor: "var(--c, var(--line))", background: "var(--cb, var(--panel))" } },
            h("span", { class: "eyebrow", text: `Заявка ${"ABC"[k]} · студент ${r.student}` }),
            f.atomic ? null : h("p", { class: "mono", text: `прочетено: free=${r.seen_free ?? "·"}, записан=${r.seen_dup ?? "·"}` }),
            h("p", null, h("b", { text: RES[r.result] }))));
        });
        st.append(cards);
      },
    });

    /* --- идемпотентност --- */
    S.viz(root.querySelector("#v-idem"), {
      id: "idem", title: "Изгубен отговор и повторение", sub: "1 = отговорът на този опит се губи, 0 = стига до клиента.",
      code: "ch07_idem",
      inputs: [{ id: "lost", label: "изгубени отговори по опити", value: "1 0 0", width: "8em" }, { id: "use_key", label: "идентификатор на операцията (op_id)", type: "checkbox", value: false }],
      presets: [{ label: "С op_id", values: { use_key: true } }, { label: "Два изгубени", values: { lost: "1 1 0" } }, { label: "Без загуби", values: { lost: "0 0 0" } }],
      legend: [["s-act", "текущо"], ["s-done", "наред"], ["s-swap", "двоен ефект / загуба"]],
      build: algos.idem,
      draw(st, f) {
        st.innerHTML = "";
        const svg = DG.root(600, 220, "narrow");
        DG.node(svg, { x: 90, y: 110, w: 120, h: 60, t: "Клиент", cls: f.ph === "got" ? "s-done" : f.ph === "send" ? "s-act" : "" });
        DG.node(svg, { x: 480, y: 110, w: 150, h: 70, t: "Сървър", sub: f.key ? `обработени: ${f.seen.join(",") || "—"}` : "без op_id", cls: f.ph === "srv" ? (f.eff && f.effects > 1 ? "s-swap" : f.replay ? "s-done" : "s-act") : "" });
        DG.line(svg, [[150, 90], [405, 90]], { cls: f.ph === "send" ? "s-act" : "", label: "заявка (op_id 501)", ly: 80 });
        DG.line(svg, [[405, 130], [150, 130]], { cls: f.ph === "lost" ? "s-swap dash" : f.ph === "got" ? "s-done" : "", label: f.ph === "lost" ? "отговор — изгубен ✗" : "отговор", ly: 150 });
        DG.text(svg, 300, 200, `бизнес ефекти: ${f.effects}`, f.effects > 1 ? "ttl" : "el");
        DG.wrap(st, svg);
      },
    });
  }

  S.chapter({ id: "proektirane", order: 7, num: "7", group: "Жизнен цикъл и проектиране", title: "Проектиране на решението", lead: "Логически слоеве срещу физическо разполагане, защита на правило при запис, идемпотентна повторна заявка.", html, mount, algos });
})();
