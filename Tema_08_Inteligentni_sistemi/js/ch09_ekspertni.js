/* Раздел 9 — експертни системи: архитектура, мини-система с обяснение, придобиване и проверка на знанията. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- чисти функции ---------- */
  function parseRulesLite(text) {
    const R = [];
    String(text).split(/[;\n]+/).forEach((ln) => {
      const a = ln.indexOf("->");
      if (a < 0) { if (ln.trim()) throw new Error(`„${ln.trim()}“: липсва „->“.`); return; }
      let lhs = ln.slice(0, a), name;
      const c = lhs.indexOf(":");
      if (c >= 0) { name = lhs.slice(0, c).trim(); lhs = lhs.slice(c + 1); } else name = "R" + (R.length + 1);
      const cond = lhs.split("&").map((x) => x.trim()).filter(Boolean), concl = ln.slice(a + 2).trim();
      if (!cond.length || !concl) throw new Error(`Правило ${name}: нужни са условие и заключение.`);
      R.push({ name, cond, concl });
    });
    if (!R.length) throw new Error("Няма правила.");
    return R;
  }
  const varOf = (c) => { const m = /^([^<>=]+)(>=|<=|>|<|=)/.exec(c); return m ? m[1] : c; };

  const algos = {
    /** Проверка на базата: противоречиви двойки, непокрити условия, недостижими заключения, цикли. */
    checkKB({ rules, inputs, contra }) {
      const R = parseRulesLite(rules);
      const IN = new Set(String(inputs).split(/[\s,;]+/).filter(Boolean));
      const CONTRA = String(contra).split(/[;,]+/).map((x) => x.trim()).filter(Boolean).map((p) => p.split("/").map((x) => x.trim()));
      const concl = new Set(R.map((r) => r.concl));
      const issues = [];
      // 1) условие, което нито е вход, нито се извежда
      R.forEach((r) => r.cond.forEach((c) => { const v = varOf(c); if (!IN.has(v) && !concl.has(v)) issues.push({ kind: "непокрито условие", rule: r.name, text: `„${v}“ не е входно измерване и никое правило не го извежда — ${r.name} никога няма да се задейства.` }); }));
      // 2) еднакви условия, противоречиви заключения
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
        const same = R[i].cond.slice().sort().join("&") === R[j].cond.slice().sort().join("&");
        const opp = CONTRA.some(([a, b]) => (R[i].concl === a && R[j].concl === b) || (R[i].concl === b && R[j].concl === a));
        if (same && R[i].concl !== R[j].concl && opp) issues.push({ kind: "противоречие", rule: `${R[i].name}, ${R[j].name}`, text: `Едни и същи условия водят до „${R[i].concl}“ и „${R[j].concl}“, обявени за несъвместими.` });
        else if (opp) issues.push({ kind: "възможно противоречие", rule: `${R[i].name}, ${R[j].name}`, text: `„${R[i].concl}“ и „${R[j].concl}“ са несъвместими; проверете дали условията им могат да са верни едновременно.` });
        else if (same && R[i].concl === R[j].concl) issues.push({ kind: "дублиране", rule: `${R[i].name}, ${R[j].name}`, text: "Две правила с еднакви условия и заключение." });
      }
      // 3) цикъл в графа условие → заключение
      const adj = {};
      R.forEach((r) => r.cond.forEach((c) => { (adj[varOf(c)] = adj[varOf(c)] || []).push(r.concl); }));
      const color = {}, cyc = [];
      const dfs = (u, path) => { color[u] = 1; for (const v of adj[u] || []) { if (color[v] === 1) cyc.push([...path.slice(path.indexOf(v)), v].join(" → ")); else if (!color[v]) dfs(v, [...path, v]); } color[u] = 2; };
      Object.keys(adj).forEach((u) => { if (!color[u]) dfs(u, [u]); });
      cyc.forEach((c) => issues.push({ kind: "цикъл", rule: "", text: c }));
      return { frames: [{ R, issues }], issues, count: issues.length };
    },
  };

  /* ---------- архитектура (схема) ---------- */
  const ARCH = {
    ui: { t: "Потребителски интерфейс", d: "Въвежда фактите за случая (измервания, отговори) и показва заключенията. В мини-системата по-долу това са полетата за T, захранване и отговор." },
    kb: { t: "База от знания", d: "<dfn data-g=\"база от знания\">Общите правила</dfn> за областта — не зависят от конкретния случай. Тук: R1–R5 от раздел 8." },
    wm: { t: "Работна памет", d: "<dfn data-g=\"работна памет\">Текущите факти</dfn> за разглеждания случай — входни и изведени. Текущите факти и общите правила имат <b>различни роли</b>." },
    ie: { t: "Механизъм за извод", d: "<dfn data-g=\"механизъм за извод\">Съпоставя</dfn> условията на правилата с фактите, образува конфликтно множество, избира и изпълнява. Прав или обратен извод." },
    ex: { t: "Обяснителен компонент", d: "<dfn data-g=\"обяснителен компонент\">Показва</dfn> кои факти и правила са използвани („как стигна до това?“). Проследимост, а не гаранция за истинност." },
    acq: { t: "Придобиване на знания", d: "Експертът предоставя знания, <dfn data-g=\"инженер по знанията\">инженерът по знанията</dfn> ги формализира като явни условия. Проверката търси противоречия, непокрити случаи и грешни заключения; правилата се поддържат и актуализират." },
  };
  function drawArch(host, info) {
    const svg = S.svg("svg", { class: "g", viewBox: "0 0 600 270", width: 600 });
    svg.append(S.svg("defs", null, S.svg("marker", { id: "ar9", markerUnits: "userSpaceOnUse", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 10, markerHeight: 10, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--ink-2)" }))));
    const nodes = {};
    const box = (k, x, y, w, hh, cls) => {
      const g = S.svg("g", { class: "node " + cls, style: "cursor:pointer", tabindex: 0, onclick: () => show(k) },
        S.svg("rect", { x, y, width: w, height: hh, rx: 6, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--ink-2));stroke-width:2" }),
        ...ARCH[k].t.split(" ").reduce((acc, wd) => { const l = acc[acc.length - 1]; if (l && (l + " " + wd).length <= 14) acc[acc.length - 1] = l + " " + wd; else acc.push(wd); return acc; }, []).map((ln, i, a) => S.svg("text", { x: x + w / 2, y: y + hh / 2 + 5 + (i - (a.length - 1) / 2) * 15, "text-anchor": "middle", style: "font-size:12px", text: ln })));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter") show(k); });
      svg.append(g); nodes[k] = g;
    };
    const ar = (x1, y1, x2, y2, both) => svg.append(S.svg("line", { x1, y1, x2, y2, class: "edge", style: "stroke:var(--ink-2)", "marker-end": "url(#ar9)", "marker-start": both ? "url(#ar9)" : null }));
    box("ui", 10, 105, 120, 56, "s-piv");
    box("ie", 230, 105, 140, 56, "s-act");
    box("kb", 230, 10, 140, 50, "");
    box("wm", 230, 205, 140, 50, "");
    box("ex", 460, 105, 130, 56, "s-done");
    box("acq", 460, 10, 130, 50, "s-cmp");
    ar(130, 133, 228, 133, true); ar(300, 62, 300, 103); ar(300, 163, 300, 203, true); ar(372, 133, 458, 133); ar(458, 35, 372, 35);
    ar(130, 150, 228, 225);
    svg.append(S.svg("text", { x: 150, y: 196, class: "wt", style: "font-size:10px", text: "факти" }));
    function show(k) {
      Object.entries(nodes).forEach(([kk, g]) => (g.querySelector("rect").style.strokeWidth = kk === k ? "4" : "2"));
      info.innerHTML = `<p><b>${ARCH[k].t}.</b> ${ARCH[k].d}</p>`;
      info.querySelectorAll("dfn[data-g]").forEach((d) => d.setAttribute("tabindex", "0"));
    }
    host.append(h("div", { style: { overflowX: "auto" } }, svg));
    show("ie");
  }

  /* ---------- мини експертна система ---------- */
  function miniES(host) {
    const R8 = S.Tema08 && S.Tema08.rules;
    if (!R8) { host.append(h("p", { class: "warn", text: "Липсва механизмът за извод от раздел 8." })); return; }
    const T = h("input", { type: "range", min: 20, max: 120, value: 90, "aria-label": "Температура" });
    const Tv = h("b", { text: "90" });
    const thr = h("input", { type: "number", min: 30, max: 110, value: 80, style: { width: "5em" }, "aria-label": "Праг за прегряване" });
    const pw = h("select", { "aria-label": "Захранване" }, h("option", { value: "има_захранване", text: "има" }), h("option", { value: "липсва_захранване", text: "липсва" }));
    const resp = h("select", { "aria-label": "Отговаря ли" }, h("option", { value: "не_отговаря", text: "не отговаря" }), h("option", { value: "", text: "отговаря" }));
    const out = h("div", { style: { display: "grid", gap: "10px" } });
    function run() {
      Tv.textContent = T.value;
      const kb = R8.KB1.replace("T>80", "T>" + (+thr.value || 80));
      const facts = [`T=${T.value}`, pw.value, resp.value].filter(Boolean).join(" ");
      out.innerHTML = "";
      let r;
      try { r = R8.forward({ rules: kb, facts, strategy: 0, refraction: true }); } catch (e) { out.append(h("p", { class: "warn", text: e.message })); return; }
      const E = r.E, derived = E.W.filter((w) => w.by >= 0);
      out.append(h("p", { class: "muted", style: { fontSize: ".85rem" }, text: `Работна памет (вход): ${facts}. Правило R1 използва праг T > ${thr.value}.` }));
      if (!derived.length) { out.append(h("p", { text: "Няма изведени заключения за тези факти." })); return; }
      derived.forEach((w, wi) => {
        const tree = R8.explain(E, w.sym);
        const render = (n) => {
          const lab = n.kind === "rule" ? `${n.sym}  ⇐ ${n.rule}` : n.kind === "test" ? `${n.sym}  (${n.val})` : n.kind === "input" ? `${n.sym}  — входен факт` : n.sym;
          return h("li", null, h("span", { class: "pill " + (n.kind === "rule" ? "s-done" : n.kind === "test" ? "s-cmp" : "s-piv"), text: lab }), n.kids ? h("ul", { style: { listStyle: "none", paddingLeft: "16px", borderLeft: "1px dashed var(--line)", margin: "3px 0 3px 6px" } }, ...n.kids.map(render)) : null);
        };
        out.append(h("details", { class: "hint", open: wi === derived.length - 1 ? true : null }, h("summary", { text: `Заключение: ${w.sym} — как?` }), h("div", null, h("ul", { style: { listStyle: "none", paddingLeft: 0 } }, render(tree)))));
      });
      out.append(h("p", { class: "muted", style: { fontSize: ".8rem" }, text: `Ред на задействане: ${r.fired}. Проверки на условия: ${r.tests}.` }));
    }
    [T, thr, pw, resp].forEach((el) => el.addEventListener("input", run));
    [pw, resp].forEach((el) => el.addEventListener("change", run));
    host.append(h("div", { class: "viz" },
      h("div", { class: "viz-head" }, h("h4", { text: "Мини експертна система за диагностика" }), h("span", { class: "sub", text: "Базата от знания е R1–R5 от раздел 8; механизмът е правият извод. Отвори всяко заключение за обяснение „как?“." })),
      h("div", { class: "viz-inputs" },
        h("label", { class: "field" }, h("span", null, "T = ", Tv, " °C"), T),
        h("label", { class: "field" }, h("span", { text: "праг „висока T“" }), thr),
        h("label", { class: "field" }, h("span", { text: "захранване" }), pw),
        h("label", { class: "field" }, h("span", { text: "устройство" }), resp)),
      h("div", { class: "viz-stage" }, out)));
    run();
  }

  function drawCheck(st, f) {
    st.innerHTML = "";
    if (!f.issues.length) { st.append(h("p", { style: { color: "var(--st-done)" }, text: "Не са открити проблеми от проверяваните видове." })); return; }
    const t = h("table", { class: "t" }, h("tr", null, h("th", { text: "вид" }), h("th", { text: "правила" }), h("th", { text: "описание" })));
    f.issues.forEach((i) => t.append(h("tr", null, h("td", null, h("span", { class: "pill " + (i.kind === "противоречие" || i.kind === "цикъл" ? "s-swap" : "s-cmp"), text: i.kind })), h("td", { class: "mono", text: i.rule }), h("td", { text: i.text }))));
    st.append(h("div", { class: "tbl-wrap" }, t));
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="експертна система">Експертната система</dfn> използва формализирани специализирани знания за задачи в ограничена област. Тя не е задължително самообучаваща се невронна мрежа: знанията са явни правила, а изводът е проследим.</p>
</div>

<div class="block">
  <h3>Архитектура</h3>
  <p class="prose">Класическият състав: база от знания, механизъм за извод, работна памет, потребителски интерфейс, обяснителен компонент и средства за придобиване и поддържане на знанията. Щракни блок.</p>
  <div id="v9-arch"></div>
  <div class="card" id="v9-arch-info" aria-live="polite"></div>
  <div class="key"><b>Базата от знания пази общи правила, работната памет — текущи факти</b>, а механизмът за извод ги съчетава. Факт T = 90 и правило T &gt; 80 → прегряване дават заключение, вярно <b>спрямо модела</b>.</div>
</div>

<div class="block">
  <h3>Схеми 16 и 17 — факт, правило, извод, обяснение</h3>
  <div id="v9-mini"></div>
  <details class="hint"><summary>Хинт: придобиване на знания — прагът</summary><div>
    <p>Ако „висока температура“ остава неуточнено, различни хора имат различни прагове и контексти. Смени прага на 95 при T = 90: заключенията „прегряване“ и „спри_и_охлади“ изчезват, без да се промени нито едно измерване. Задачата на <dfn data-g="инженер по знанията">инженера по знанията</dfn> е да превърне експертните разграничения в явни условия.</p>
  </div></details>
  <details class="trap"><summary>Капан: обяснение = доказателство за истинност</summary><div>
    <p>Обяснителният компонент показва кои факти и правила са използвани. Това е проследимост, а не автоматична гаранция. Дефектен датчик или неподходящ праг могат да направят заключението за реалния обект погрешно. Формално правилен извод не поправя неверни предпоставки; системата може да обяснява извод, без първоначалните правила да са верни.</p>
  </div></details>
  <details class="trap"><summary>Капан: „провери връзката“ = доказана причина</summary><div>
    <p>Учебният пример: ако липсва захранване, се изследва захранващият път; ако захранването е налично, но устройството не отговаря, се проверява връзката. Изводът се основава на измервания и правила и <b>не доказва непременно единствена физическа причина</b>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Механизъм за извод и конфликтно множество</h3>
  <p class="prose">Механизмът съпоставя условията с фактите. При повече приложими правила се образува <dfn data-g="конфликтно множество">конфликтно множество</dfn>; изборът може да зависи от приоритет, специфичност или новост. Необходимо е да се предотврати безкрайно повтаряне на правило без нова информация. Всичко това е стъпково в <a href="#pravila">раздел 8</a>.</p>
</div>

<div class="block">
  <h3>Проверка на базата от знания</h3>
  <p class="prose">Проверката търси противоречия, непокрити случаи и грешни заключения. Тази проста проверка намира: условия, които нищо не захранва; правила с несъвместими заключения; цикли условие → заключение. Несъвместимите двойки се задават като „A/B“. Грешните заключения не могат да се открият механично — нужни са тестови случаи и експерт.</p>
  <div id="v9-check"></div>
</div>

<div class="block">
  <h3>Ограничения и реални системи</h3>
  <div class="split">
    <div class="card"><h4>Ограничения</h4><p>Тесен обхват; трудно извличане на неявен опит; необходимост от актуализиране; противоречиви, пропуснати и остарели правила.</p></div>
    <div class="card"><h4>Реални системи с правила</h4><p><dfn data-g="clips">CLIPS</dfn> е среда за изграждане на експертни системи; Drools е платформа с механизъм за бизнес правила; SWI-Prolog реализира логическо програмиране и търсене на доказателство чрез правила (обратен извод).</p></div>
  </div>
</div>`;

  function mount(root) {
    drawArch(root.querySelector("#v9-arch"), root.querySelector("#v9-arch-info"));
    miniES(root.querySelector("#v9-mini"));
    S.viz(root.querySelector("#v9-check"), {
      id: "c9c", title: "Проверка на базата", code: false,
      inputs: [
        { id: "rules", label: "Правила (разделени с ;)", value: "R1: T>80 -> прегряване; R2: T>80 & вентилатор_работи -> норма; R3: прегряване & датчик_ок -> спри; R4: спри -> рестарт; R5: рестарт -> спри", width: "min(46em, 78vw)" },
        { id: "inputs", label: "входни измервания", value: "T вентилатор_работи", width: "14em" },
        { id: "contra", label: "несъвместими (A/B; …)", value: "прегряване/норма", width: "14em" },
      ],
      build: algos.checkKB, draw: drawCheck,
    });
  }

  S.chapter({ id: "ekspertni", order: 9, num: "9", group: "Експертни системи", title: "Експертни системи",
    lead: "База от знания, работна памет, механизъм за извод, обяснение и придобиване на знания. Мини-система за диагностика с обяснение „как?“ и проверка на базата.", html, mount, algos });
})();
