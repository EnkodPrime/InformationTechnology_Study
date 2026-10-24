/* Раздел 2 — процеси и нишки: състояния, PCB, превключване на контекст. */
(function () {
  const S = window.Study, h = S.h;
  const SN = ["готов", "изпълнява се", "блокиран", "завършил"];
  const SC = ["s-cmp", "s-act", "s-swap", "s-done"];
  const READY = 0, RUNNING = 1, BLOCKED = 2, DONE = 3;

  function parseScript(str, n) {
    const toks = String(str).trim().split(/\s+/).filter(Boolean);
    if (toks.length > 40) throw new Error("Най-много 40 събития.");
    return toks.map((t) => {
      if (/^[twx]$/.test(t)) return { ev: t, target: -1 };
      const m = /^d([1-9])$/.exec(t);
      if (m) return { ev: "d", target: +m[1] - 1 };
      throw new Error(`„${t}“ не е събитие. Допустими: t, w, x, d1…d${n}.`);
    });
  }

  const algos = {
    /* Огледало на on_event()/dispatch() от c/02_procesi.c */
    proc({ n, script }) {
      n = S.int(n, 1, 6, "Броят процеси");
      const evs = parseScript(script, n);
      const p = Array.from({ length: n }, (_, i) => ({ pid: i + 1, state: READY, pc: 0 }));
      let rq = [], running = -1, last = -1, kernel = 0, ctx = 0, clock = 0, bad = 0;
      const F = [];
      const snap = (o) => ({ n, p: p.map((x) => ({ ...x })), rq: rq.slice(), running, stats: { "влизания в ядрото": kernel, "превключвания на контекст": ctx }, ...o });
      const dispatch = (fr) => {
        if (running >= 0 || rq.length === 0) {
          if (running < 0) last = -1;
          F.push(snap({ at: "disp", vars: { running: running >= 0 ? "P" + (running + 1) : "—", "опашка": rq.map((i) => "P" + (i + 1)) }, msg: running >= 0 ? `Процесорът е зает от P${running + 1} — няма избор на нов процес, <b>няма превключване на контекст</b>.` : "Опашката на готовите е празна — процесорът остава свободен.", ...fr }));
          return;
        }
        const i = rq.shift();
        p[i].state = RUNNING; running = i;
        const sw = i !== last;
        if (sw) ctx++;
        last = i;
        F.push(snap({ at: sw ? ["run", "ctx"] : "run", hiTr: "dispatch", hiP: i, vars: { running: "P" + (i + 1) }, msg: sw ? `Планировчикът избира P${i + 1} (първия в опашката). Възстановява се неговият <dfn data-g="контекст">контекст</dfn> — превключване №${ctx}.` : `Планировчикът избира отново P${i + 1} — той е единственият готов и контекстът му вече е на процесора: <b>няма превключване на контекст</b>.`, log: `→ P${i + 1} се изпълнява`, ...fr }));
      };
      // init
      for (let i = 0; i < n; i++) rq.push(i);
      F.push(snap({ vars: { n }, msg: `${n} процеса са създадени, всички са <b>готови</b> и чакат в опашката.` }));
      dispatch({});
      for (const e of evs) {
        kernel++;
        const r = running;
        if (r >= 0) p[r].pc = clock;
        const lbl = e.ev === "d" ? `d${e.target + 1}` : e.ev;
        F.push(snap({ at: "enter", vars: { "събитие": lbl, running: r >= 0 ? "P" + (r + 1) : "—" }, msg: `Събитие <b>${lbl}</b> → влизане в ядрото (смяна на режим №${kernel}). ${r >= 0 ? `Контекстът на P${r + 1} се запазва в неговия <dfn data-g="pcb">PCB</dfn>.` : ""}` }));
        let ok = true;
        if (e.ev === "t") {
          if (r < 0) ok = false;
          else {
            p[r].state = READY; rq.push(r); running = -1;
            F.push(snap({ at: "tmo", hiTr: "timeout", hiP: r, msg: `Изтича квантът на P${r + 1}: <dfn data-g="изпреварване">изпреварване</dfn>. P${r + 1} става <b>готов</b> и отива в края на опашката.`, log: `P${r + 1}: изпълнява се → готов` }));
          }
        } else if (e.ev === "w") {
          if (r < 0) ok = false;
          else {
            p[r].state = BLOCKED; running = -1;
            F.push(snap({ at: "wait", hiTr: "block", hiP: r, msg: `P${r + 1} заявява вход/изход и чака събитие: става <b>блокиран</b>. Блокираният не е в опашката на готовите.`, log: `P${r + 1}: изпълнява се → блокиран` }));
          }
        } else if (e.ev === "d") {
          const k = e.target;
          if (k < 0 || k >= n || p[k].state !== BLOCKED) ok = false;
          else {
            p[k].state = READY; rq.push(k);
            F.push(snap({ at: ["wake", "io"], hiTr: "wake", hiP: k, msg: `Прекъсване: операцията на P${k + 1} завърши. P${k + 1} става <b>готов</b> — не веднага изпълняващ се.${r >= 0 ? ` P${r + 1} продължава да държи процесора.` : ""}`, log: `P${k + 1}: блокиран → готов` }));
          }
        } else if (e.ev === "x") {
          if (r < 0) ok = false;
          else {
            p[r].state = DONE; running = -1;
            F.push(snap({ at: "exit", hiTr: "exit", hiP: r, msg: `P${r + 1} завършва.`, log: `P${r + 1}: завършил` }));
          }
        }
        if (!ok) {
          bad++;
          F.push(snap({ at: e.ev === "t" ? "tmo" : e.ev === "w" ? "wait" : e.ev === "x" ? "exit" : "io", bad: true, msg: `<span class="warn">Недопустимо събитие ${lbl}</span>: ${e.ev === "d" ? `P${e.target + 1} не е блокиран (или не съществува)` : "няма изпълняващ се процес"}. Ядрото връща грешка; състоянията не се променят.`, log: `${lbl}: недопустимо` }));
          continue;
        }
        dispatch({});
        clock++;
        F.push(snap({ at: "ret", vars: { running: running >= 0 ? "P" + (running + 1) : "—" }, msg: `Връщане в потребителски режим${running >= 0 ? ` — изпълнява се P${running + 1}` : ""}.` }));
      }
      const st = p.map((x) => "RXBD"[x.state]).join("");
      F.push(snap({ done: true, msg: `Край. Влизания в ядрото: <b>${kernel}</b>, превключвания на контекст: <b>${ctx}</b>. Разликата показва, че не всяко влизане в ядрото сменя процеса.` }));
      return { frames: F, kernel, ctx, bad, states: st, running: running >= 0 ? running + 1 : 0 };
    },
  };

  /* ---------- диаграма на състоянията ---------- */
  const NODES = { new: [70, 140, "нов"], ready: [250, 140, "готов"], run: [480, 140, "изпълнява се"], blk: [365, 280, "блокиран"], done: [650, 140, "завършил"] };
  const TR = [
    { k: "admit", a: "new", b: "ready", lab: [160, 128, "middle"], t: "приемане", d: "Създаденият процес получава PCB и влиза в опашката на готовите." },
    { k: "dispatch", a: "ready", b: "run", lab: [365, 92, "middle"], t: "избор от планировчика", d: "Планировчикът избира готов процес; възстановява се контекстът му. Това е единственият път към „изпълнява се“.", curve: -45 },
    { k: "timeout", a: "run", b: "ready", lab: [365, 196, "middle"], t: "изтекъл квант", d: "Изпреварване: ОС отнема процесора. Процесът остава годен за работа — става ГОТОВ, не блокиран.", curve: -45 },
    { k: "block", a: "run", b: "blk", lab: [440, 236, "start"], t: "чака събитие", d: "Например вход/изход. Блокираният НЕ чака процесор — чака събитие; допълнителни ядра не му помагат." },
    { k: "wake", a: "blk", b: "ready", lab: [290, 236, "end"], t: "събитието настъпи", d: "Блокираният става ГОТОВ, а не непременно веднага изпълняващ се. Обикновено това става в обработчик на прекъсване." },
    { k: "exit", a: "run", b: "done", lab: [565, 128, "middle"], t: "завършване", d: "Процесът приключва; ресурсите му се освобождават." },
  ];

  function stateSvg(onPick, hiTr, hiState) {
    const W = 720, H = 320;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Диаграма на състоянията на процеса" });
    svg.append(S.svg("defs", null, S.svg("marker", { id: "arr2", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--muted)" }))));
    TR.forEach((T) => {
      const [x1, y1] = NODES[T.a], [x2, y2] = NODES[T.b];
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const sx = x1 + ux * 48, sy = y1 + uy * 26, ex = x2 - ux * 50, ey = y2 - uy * 28;
      const c = T.curve || 0, mx = (sx + ex) / 2 - uy * c, my = (sy + ey) / 2 + ux * c;
      const on = hiTr === T.k;
      const g = S.svg("g", { style: "cursor:pointer", tabindex: "0", role: "button", "aria-label": T.t, onclick: () => onPick(T) });
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(T); } });
      g.append(S.svg("path", { d: `M${sx},${sy} Q${mx},${my} ${ex},${ey}`, class: "edge" + (on ? " s-act" : ""), "marker-end": "url(#arr2)" }));
      g.append(S.svg("path", { d: `M${sx},${sy} Q${mx},${my} ${ex},${ey}`, stroke: "transparent", "stroke-width": 16, fill: "none" }));
      const [lx, ly, anc] = T.lab;
      g.append(S.svg("text", { x: lx, y: ly, "text-anchor": anc, class: on ? "" : "wt", style: on ? "font-size:12px;font-weight:700" : "font-size:11.5px", text: T.t }));
      svg.append(g);
    });
    const map = { ready: READY, run: RUNNING, blk: BLOCKED, done: DONE };
    for (const k in NODES) {
      const [x, y, t] = NODES[k];
      const cls = hiState && hiState[k] ? hiState[k] : (k in map ? SC[map[k]] : "");
      const g = S.svg("g", { class: "node " + cls });
      g.append(S.svg("rect", { x: x - 48, y: y - 22, width: 96, height: 44, rx: 22, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }));
      g.append(S.svg("text", { x, y: y + 4, "text-anchor": "middle", style: "font-size:12.5px;font-weight:600", text: t }));
      svg.append(g);
    }
    return svg;
  }

  const html = `
<div class="prose">
  <p>Програмата е описание на инструкции и данни, а <dfn data-g="процес">процесът</dfn> е изпълняващ се екземпляр със собствено състояние и ресурси: адресно пространство, регистри, отворени файлове и служебна информация. ОС пази информацията за управление в дескриптор на процеса — <dfn data-g="pcb">PCB</dfn>.</p>
</div>

<div class="block">
  <h3>Схема 5 · Основни състояния на процеса</h3>
  <p class="muted">Щракни стрелка — обяснение на прехода. Основните състояния са <dfn data-g="готов процес">готов</dfn>, изпълняващ се и <dfn data-g="блокиран процес">блокиран</dfn>; „нов“ и „завършил“ са добавени за пълнота на жизнения цикъл.</p>
  <div class="tbl-wrap" id="st-svg"></div>
  <div class="key" id="st-note">Щракни стрелка.</div>
  <details class="trap"><summary>Капан: „след вход/изход процесът продължава да се изпълнява“</summary><div>
    <p>След събитието блокираният обикновено става <b>готов</b>, а не непременно веднага изпълняващ се. Няма стрелка блокиран → изпълнява се: процесорът се дава само от планировчика.</p>
    <p>„Готов“ = чака процесор. „Блокиран“ = чака събитие. Допълнителни ядра помагат на готовите, но не произвеждат липсващите данни за блокирания.</p>
  </div></details>
</div>

<div class="block">
  <h3>Модел на ядро: събития, PCB и превключване</h3>
  <p class="prose">Всяко събитие (изтекъл <dfn data-g="квант">квант</dfn>, заявка за вход/изход, прекъсване от устройство, завършване) е влизане в ядрото. <b>Превключване на контекст</b> има само когато процесорът се дава на друг процес. Събития: <code>t</code> — изтича квантът, <code>w</code> — изпълняващият се чака вход/изход, <code>dK</code> — операцията на P<sub>K</sub> завърши, <code>x</code> — изпълняващият се завършва.</p>
  <div id="v-proc"></div>
  <details class="hint"><summary>Хинт: защо броячите се различават</summary><div>
    <p>При <code>dK</code>, докато друг процес работи, ядрото само премества P<sub>K</sub> в опашката и се връща към <b>същия</b> процес: влизане в ядрото има, превключване на контекст няма. Това е разграничението от ръководството: „преминаване от потребителски в привилегирован режим само по себе си не означава избор на друга нишка“ и „прекъсването може да бъде обслужено и управлението да се върне към същата нишка“.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 6 · Процесът притежава ресурси, нишките изпълняват</h3>
  <p class="prose"><dfn data-g="нишка">Нишката</dfn> е поток на изпълнение в процес. Нишките на един процес обикновено споделят код, глобални данни и файлови ресурси, но имат собствени регистри и стекове. Щракни елемент.</p>
  <div class="split"><div id="pt-svg" class="tbl-wrap"></div><div class="key" id="pt-note">Щракни елемент от процеса.</div></div>
  <details class="trap"><summary>Изяснен въпрос: нишката малък процес ли е?</summary><div>
    <p>Това е неточна аналогия. Нишката има собствено изпълнително състояние, но обикновено споделя адресното пространство и ресурсите на процеса. Именно това споделяне поражда различни правила за комуникация и защита — и нуждата от <a href="#sinhronizacia">синхронизация</a>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 7–8 · Превключване на контекст; режим, контекст и адресно пространство</h3>
  <p class="prose">Превключването на контекст запазва състоянието на един изпълнител и възстановява друго. То има разход и може да засегне кешове и адресни преобразувания. Трите описания по-долу са свързани, но не са синоними; конкретна ОС може да комбинира преходите при едно събитие.</p>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Преход</th><th>Какво се сменя</th><th>Пример</th><th>Сменя ли се изпълнителят?</th></tr>
    <tr><td>Смяна на режим</td><td>потребителски ↔ <dfn data-g="привилегирован режим">привилегирован</dfn></td><td>системно извикване, прекъсване</td><td>не непременно</td></tr>
    <tr><td>Превключване на <dfn data-g="контекст">контекст</dfn></td><td>регистри, брояч на инструкции, стек</td><td>изтекъл квант → друга нишка</td><td>да</td></tr>
    <tr><td>Смяна на адресно пространство</td><td>таблица на страниците (и евентуално <dfn data-g="tlb">TLB</dfn>)</td><td>превключване към нишка на <b>друг</b> процес</td><td>да, и то от друг процес</td></tr>
  </table></div>
  <div class="key"><b>За запомняне.</b> Програма — описание; процес — екземпляр с ресурси; нишка — поток на изпълнение. Готов чака процесор; блокиран чака събитие; събудилият се става готов. Смяна на режим ≠ превключване на контекст.</div>
</div>`;

  const PT = {
    code: "Код — споделен от всички нишки на процеса.",
    data: "Глобални данни — споделени. Едновременни записи от две нишки изискват синхронизация (раздел 4).",
    files: "Отворени файлове — споделени дескриптори на процеса.",
    as: "Адресно пространство — едно за процеса; двата процеса на един редактор имат отделни адресни пространства.",
    t1: "Нишка 1 (напр. интерфейс): собствени регистри, брояч на инструкции и стек.",
    t2: "Нишка 2 (напр. обработка): собствени регистри и стек; вижда същите данни на документа.",
  };

  function mount(root) {
    const note = root.querySelector("#st-note");
    const box = root.querySelector("#st-svg");
    const pick = (T) => { note.innerHTML = `<b>${NODES[T.a][2]} → ${NODES[T.b][2]}</b> (${T.t}). ${T.d}`; box.innerHTML = ""; box.append(stateSvg(pick, T.k)); };
    box.append(stateSvg(pick, null));

    S.viz(root.querySelector("#v-proc"), {
      id: "proc", title: "Ядро с един процесор: състояния, опашка, PCB", sub: "Процесите в опашката на готовите са подредени отляво надясно (FIFO).",
      code: "s02_states",
      inputs: [{ id: "n", label: "Процеси", type: "number", value: 3, width: "5em" }, { id: "script", label: "Събития (t w x dK)", value: "t w t d2 x t x x", width: "18em" }],
      presets: [{ label: "Всички блокирани", values: { n: 3, script: "w w w d2 d1" } }, { label: "Прекъсване без смяна", values: { n: 2, script: "w d1 t t x x" }, title: "d1 идва, докато P2 работи" }, { label: "Недопустимо", values: { n: 2, script: "x x t" } }],
      legend: [["s-cmp", "готов"], ["s-act", "изпълнява се"], ["s-swap", "блокиран"], ["s-done", "завършил"]],
      build: algos.proc,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "PCB" }), ...f.p.map((x) => h("th", { text: "P" + x.pid }))),
          h("tr", null, h("th", { text: "състояние" }), ...f.p.map((x, i) => h("td", { class: SC[x.state] + (f.hiP === i ? "" : ""), style: f.hiP === i ? { fontWeight: 700 } : null, text: SN[x.state] }))),
          h("tr", null, h("th", { text: "запазен pc" }), ...f.p.map((x) => h("td", { text: x.pc }))));
        const q = h("div", { class: "row" }, h("span", { class: "muted", text: "опашка на готовите:" }), ...(f.rq.length ? f.rq.map((i) => h("span", { class: "pill s-cmp", text: "P" + (i + 1) })) : [h("span", { class: "muted", text: "празна" })]),
          h("span", { class: "muted", style: { marginLeft: "12px" }, text: "CPU:" }), h("span", { class: "pill " + (f.running >= 0 ? "s-act" : ""), text: f.running >= 0 ? "P" + (f.running + 1) : "свободен" }));
        const counts = { ready: 0, run: 0, blk: 0, done: 0 };
        f.p.forEach((x) => { counts[["ready", "run", "blk", "done"][x.state]]++; });
        const hs = {};
        if (f.hiTr) { const T = TR.find((t) => t.k === f.hiTr); hs[T.b] = "s-act"; }
        st.append(h("div", { class: "tbl-wrap" }, tb), h("div", { style: { margin: "10px 0" } }, q));
        const sv = stateSvg(() => {}, f.hiTr, null);
        sv.setAttribute("width", 520);
        st.append(h("div", { class: "tbl-wrap" }, sv));
        if (f.bad) st.append(h("p", { class: "warn", text: "Недопустимо събитие — нищо не се променя." }));
      },
    });

    // процес/нишки
    const pb = root.querySelector("#pt-svg"), pn = root.querySelector("#pt-note");
    const W = 420, H = 250;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Процес и нишки" });
    svg.append(S.svg("rect", { x: 6, y: 6, width: W - 12, height: H - 12, rx: 8, fill: "none", stroke: "var(--ink-2)", "stroke-width": 2 }));
    svg.append(S.svg("text", { x: 16, y: 26, class: "wt", text: "процес (притежава ресурси)" }));
    const item = (k, x, y, w, hh, t, cls) => {
      const g = S.svg("g", { class: "node " + cls, style: "cursor:pointer", tabindex: "0", role: "button", onclick: () => { pn.innerHTML = PT[k]; } });
      g.addEventListener("keydown", (e) => { if (e.key === "Enter") pn.innerHTML = PT[k]; });
      g.append(S.svg("rect", { x, y, width: w, height: hh, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }));
      const lines = t.split("\n");
      lines.forEach((ln, li) => g.append(S.svg("text", { x: x + w / 2, y: y + hh / 2 + 4 + (li - (lines.length - 1) / 2) * 16, "text-anchor": "middle", style: "font-size:12px", text: ln })));
      svg.append(g);
    };
    item("as", 20, 38, 380, 30, "адресно пространство", "s-dim");
    item("code", 20, 76, 120, 34, "код", "s-piv");
    item("data", 150, 76, 120, 34, "глобални данни", "s-piv");
    item("files", 280, 76, 120, 34, "отв. файлове", "s-piv");
    item("t1", 40, 130, 160, 100, "нишка 1\nрегистри\nстек", "s-act");
    item("t2", 220, 130, 160, 100, "нишка 2\nрегистри\nстек", "s-act");
    pb.append(svg);
  }

  S.chapter({ id: "procesi", order: 2, num: "2", group: "Процеси", title: "Процеси и нишки", lead: "Програма, процес, нишка; състояния и преходи; PCB; превключване на контекст и смяна на режим.", html, mount, algos });
})();
