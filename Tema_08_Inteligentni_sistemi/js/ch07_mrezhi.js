/* Раздел 7 — семантични мрежи и фреймове: наследяване по „е вид“, стойности по подразбиране, „част от“. */
(function () {
  const S = window.Study, h = S.h;

  /* Същата база като в main() на 07_frames.c */
  const KB = [
    { name: "животно", isa: null, part: null, x: 300, y: 40, slots: { диша: "да", кожа: "има" } },
    { name: "птица", isa: "животно", part: null, x: 170, y: 140, slots: { лети: "да (по подразбиране)", покритие: "пера" } },
    { name: "риба", isa: "животно", part: null, x: 440, y: 140, slots: { покритие: "люспи", плува: "да" } },
    { name: "канарче", isa: "птица", part: null, x: 80, y: 250, slots: { цвят: "жълт", пее: "да" } },
    { name: "пингвин", isa: "птица", part: null, x: 250, y: 250, slots: { лети: "не", плува: "да" } },
    { name: "Туити", isa: "канарче", part: null, x: 80, y: 350, slots: { собственик: "Ана" } },
    { name: "крило", isa: null, part: "птица", x: 360, y: 300, slots: { брой: "2" } },
    { name: "хриле", isa: null, part: "риба", x: 520, y: 260, slots: { функция: "дишане във вода" } },
  ];
  const byName = (n) => KB.find((f) => f.name === n);
  const allSlots = [...new Set(KB.flatMap((f) => Object.keys(f.slots)))];

  /* ---------- чисти функции ---------- */
  const algos = {
    /** lookup(f, slot, &from, wrong) от 07_frames.c */
    lookup({ frame, slot, wrong }) {
      const f0 = byName(frame);
      if (!f0) throw new Error(`Няма фрейм „${frame}“.`);
      const sl = String(slot).trim();
      if (!sl) throw new Error("Въведи име на слот.");
      const bad = wrong === true || wrong === "1";
      const F = [], chain = [];
      let steps = 0;
      const up = (f) => (f.isa ? byName(f.isa) : bad && f.part ? byName(f.part) : null);
      for (let cur = f0; cur; cur = up(cur)) {
        steps++; chain.push(cur.name);
        const via = chain.length > 1 ? (byName(chain[chain.length - 2]).isa === cur.name ? "е вид" : "част от") : null;
        F.push({ at: "climb", cur: cur.name, chain: chain.slice(), via, vars: { фрейм: cur.name, стъпки: steps }, stats: { стъпки: steps }, msg: chain.length === 1 ? `Започваме от самия фрейм <b>${cur.name}</b>.` : `Изкачваме се по връзка „${via}“ до <b>${cur.name}</b>.${via === "част от" ? ' <span class="warn">Грешка: „част от“ не е „е вид“!</span>' : ""}`, log: `${cur.name}` });
        F.push({ at: "scan", cur: cur.name, chain: chain.slice(), vars: { фрейм: cur.name, слотове: Object.keys(cur.slots).join(", ") }, stats: { стъпки: steps }, msg: `Слотове на ${cur.name}: ${Object.keys(cur.slots).join(", ")}.` });
        if (sl in cur.slots) {
          F.push({ at: ["found", "match"], cur: cur.name, chain: chain.slice(), from: cur.name, done: true, vars: { [sl]: cur.slots[sl], от: cur.name }, stats: { стъпки: steps },
            msg: `Намерено: ${frame}.${sl} = <b>${cur.slots[sl]}</b>${cur.name === frame ? " (собствена стойност)" : ` — <b>наследено</b> от ${cur.name}`}.${bad && chain.some((c, i) => i > 0 && byName(chain[i - 1]).isa !== c) ? ' <span class="warn">Изводът е грешен — получен е чрез „част от“.</span>' : ""}`,
            log: `→ ${cur.slots[sl]}` });
          return { frames: F, value: cur.slots[sl], from: cur.name, steps };
        }
      }
      F.push({ at: "none", cur: null, chain: chain.slice(), done: true, vars: { [sl]: "?" }, stats: { стъпки: steps }, msg: `Веригата „е вид“ свърши, без да намерим слот „${sl}“ ⇒ стойността е <b>неизвестна</b>.` });
      return { frames: F, value: "?", from: "-", steps };
    },
    /** всички слотове на фрейм — собствени, наследени и отменени (за картата на фрейма) */
    frameView(name) {
      const out = {};
      let d = 0;
      for (let cur = byName(name); cur; cur = cur.isa ? byName(cur.isa) : null, d++)
        for (const [k, v] of Object.entries(cur.slots)) { if (!(k in out)) out[k] = { v, from: cur.name, own: d === 0, shadowed: [] }; else out[k].shadowed.push(`${cur.name}: ${v}`); }
      return out;
    },
    triples() {
      const T = [];
      KB.forEach((f) => { if (f.isa) T.push([f.name, "е_вид", f.isa]); if (f.part) T.push([f.name, "част_от", f.part]); Object.entries(f.slots).forEach(([k, v]) => T.push([f.name, k, v])); });
      return T;
    },
  };

  /* ---------- мрежа ---------- */
  function drawNet(svg, opt) {
    svg.innerHTML = "";
    svg.append(S.svg("defs", null,
      S.svg("marker", { id: "ar7", markerUnits: "userSpaceOnUse", viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 10, markerHeight: 10, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--ink-2)" })),
      S.svg("marker", { id: "ar7p", markerUnits: "userSpaceOnUse", viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 10, markerHeight: 10, orient: "auto-start-reverse" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--st-cmp)" }))));
    const chain = opt.chain || [];
    const edge = (a, b, kind) => {
      const A = byName(a), B = byName(b);
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const i = chain.indexOf(a), on = i >= 0 && chain[i + 1] === b;
      const cls = on ? (kind === "isa" ? "s-act" : "s-swap") : "";
      svg.append(S.svg("line", { x1: A.x + ux * 22, y1: A.y + uy * 22, x2: B.x - ux * 26, y2: B.y - uy * 26, class: "edge " + cls, style: kind === "part" ? "stroke-dasharray:6 4;" + (cls ? "" : "stroke:var(--st-cmp)") : cls ? "" : "stroke:var(--ink-2);stroke-width:1.6", "marker-end": `url(#${kind === "part" ? "ar7p" : "ar7"})` }));
      svg.append(S.svg("text", { x: (A.x + B.x) / 2 + 6, y: (A.y + B.y) / 2 - 4, class: "wt", style: "font-size:11px", text: kind === "isa" ? "е вид" : "част от" }));
    };
    KB.forEach((f) => { if (f.isa) edge(f.name, f.isa, "isa"); if (f.part) edge(f.name, f.part, "part"); });
    KB.forEach((f) => {
      let cls = "";
      if (opt.sel === f.name) cls = "s-piv";
      if (chain.includes(f.name)) cls = "s-cmp";
      if (opt.cur === f.name) cls = "s-act";
      if (opt.from === f.name) cls = "s-done";
      const w = Math.max(70, f.name.length * 10 + 20);
      const g = S.svg("g", { class: "node " + cls, style: opt.onPick ? "cursor:pointer" : null, tabindex: opt.onPick ? 0 : null, onclick: opt.onPick ? () => opt.onPick(f.name) : null },
        S.svg("rect", { x: f.x - w / 2, y: f.y - 18, width: w, height: 36, rx: 18, style: "fill:var(--cb,var(--panel));stroke:var(--c,var(--ink-2));stroke-width:2" }),
        S.svg("text", { x: f.x, y: f.y + 5, "text-anchor": "middle", "font-weight": 600, text: f.name }));
      if (opt.onPick) g.addEventListener("keydown", (e) => { if (e.key === "Enter") opt.onPick(f.name); });
      svg.append(g);
    });
  }

  function frameCard(host, name) {
    host.innerHTML = "";
    const V = algos.frameView(name), f = byName(name);
    const t = h("table", { class: "t" }, h("tr", null, h("th", { text: "слот" }), h("th", { text: "стойност" }), h("th", { text: "откъде" })));
    Object.entries(V).forEach(([k, o]) => t.append(h("tr", null, h("td", { class: "mono", text: k }), h("td", null, o.v, o.shadowed.length ? h("div", { class: "muted", style: { fontSize: ".75rem", textDecoration: "line-through" }, text: o.shadowed.join("; ") }) : null),
      h("td", null, h("span", { class: "pill " + (o.own ? "s-piv" : "s-done"), text: o.own ? "собствен" : "наследен от " + o.from })))));
    host.append(h("h4", { text: `Фрейм „${name}“` }),
      h("p", { class: "muted", style: { fontSize: ".85rem" }, text: f.isa ? `е вид: ${f.isa}` : f.part ? `част от: ${f.part} — няма „е вид“ ⇒ нищо не наследява` : "корен на йерархията" }),
      h("div", { class: "tbl-wrap" }, t));
  }

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p><dfn data-g="семантична мрежа">Семантичната мрежа</dfn> представя понятия като възли и отношения като означени ребра. <dfn data-g="фрейм">Фреймът</dfn> описва структура със слотове, стойности, ограничения и <dfn data-g="стойност по подразбиране">стойности по подразбиране</dfn>. Тук двете са едно и също знание в два изгледа: мрежата показва връзките, фреймът — слотовете на един възел.</p>
</div>

<div class="block">
  <h3>Схеми 13 и 14 — щракаема мрежа и фрейм</h3>
  <p class="prose">Плътните стрелки са <dfn data-g="е вид">„е вид“</dfn>, прекъснатите — „част от“. Щракни възел и виж неговия фрейм: кои слотове са собствени, кои са наследени и кои стойности по подразбиране са <b>отменени</b> (зачеркнати).</p>
  <div class="split" style="align-items:start">
    <div id="v7-net" style="overflow-x:auto"></div>
    <div class="card" id="v7-frame" aria-live="polite"></div>
  </div>
  <details class="hint"><summary>Хинт: защо пингвинът не лети, а Туити лети</summary><div>
    <p>Търсенето на слот започва от самия фрейм и се изкачва по „е вид“; <b>първата намерена стойност печели</b>. Пингвинът има собствен слот лети = не, който скрива стойността по подразбиране на „птица“. Туити няма такъв слот, канарчето също — стойността идва от „птица“.</p>
  </div></details>
</div>

<div class="block">
  <h3>Наследяване стъпка по стъпка</h3>
  <p class="prose">Програмата следва веригата „е вид“ и спира при първия фрейм със слота. Отметката „следвай и „част от““ показва <b>грешката</b> от ръководството: тогава „крило“ наследява „лети“ от „птица“, сякаш крилото е птица.</p>
  <div id="v7-look"></div>
  <div class="key">„Канарче е вид птица“ позволява наследяване; „птица има част крило“ <b>не прави крилото птица</b>. Следване по ребро без отчитане на вида му е логическа грешка. Графовото представяне само по себе си не задава валидните изводи.</div>
  <details class="trap"><summary>Капан: стойност по подразбиране = универсално правило</summary><div>
    <p>„Птиците типично летят“ може да бъде отменено за пингвин. Универсалното логическо правило „всяка птица лети“ (∀x Птица(x) → Лети(x)) би направило изключението <b>противоречие</b>. „По подразбиране“ и „за всички“ са различни степени на твърдение. Изключението трябва да се управлява от избрания модел.</p>
  </div></details>
  <details class="trap"><summary>Капан: семантичната мрежа е невронна мрежа</summary><div>
    <p>Не. Семантичната мрежа изобразява явни понятия и отношения. Невронната има параметризирани изчислителни възли и научени зависимости. Общата дума „мрежа“ не задава общ механизъм.</p>
  </div></details>
</div>

<div class="block">
  <h3>Онтологии и тройки</h3>
  <p class="prose"><dfn data-g="онтология">Онтологията</dfn> формализира понятията и отношенията на областта и може да включва аксиоми. <dfn data-g="rdf">RDF</dfn> описва твърдения като тройки субект–предикат–обект; <dfn data-g="owl">OWL</dfn> добавя средства за формални онтологии; Protégé е редактор на онтологии. Същата мрежа като тройки:</p>
  <div class="tbl-wrap" style="max-height:240px;overflow:auto"><table class="t" id="v7-trip"></table></div>
  <details class="trap"><summary>Капан: редакторът е базата от знания</summary><div>
    <p>Protégé е редактор, а не самото знание, и не е задължително механизъм за извод. Тройките сами по себе си не казват, че „е_вид“ е транзитивно и води до наследяване — това задава семантиката на езика (напр. OWL) или механизмът за извод.</p>
  </div></details>
</div>`;

  function mount(root) {
    const host = root.querySelector("#v7-net"), card = root.querySelector("#v7-frame");
    const svg = S.svg("svg", { class: "g", viewBox: "0 0 600 390", width: 600 });
    host.append(svg);
    let sel = "пингвин";
    const pick = (n) => { sel = n; drawNet(svg, { sel, onPick: pick }); frameCard(card, n); };
    pick(sel);

    S.viz(root.querySelector("#v7-look"), {
      id: "c7l", title: "lookup(фрейм, слот)", sub: "Оранжево — веригата; синьо — текущ фрейм; зелено — откъдето е взета стойността.",
      code: "ch07_lookup",
      inputs: [
        { id: "frame", label: "фрейм", type: "select", value: "Туити", options: KB.map((f) => f.name) },
        { id: "slot", label: "слот", type: "select", value: "лети", options: allSlots },
        { id: "wrong", label: "следвай и „част от“ (грешно)", type: "checkbox", value: false },
      ],
      presets: [
        { label: "Туити.лети", values: { frame: "Туити", slot: "лети", wrong: false } },
        { label: "пингвин.лети", values: { frame: "пингвин", slot: "лети", wrong: false } },
        { label: "Туити.диша", values: { frame: "Туити", slot: "диша", wrong: false } },
        { label: "крило.лети (грешно)", values: { frame: "крило", slot: "лети", wrong: true } },
      ],
      legend: [["s-act", "текущ фрейм"], ["s-cmp", "верига"], ["s-done", "източник"], ["s-swap", "грешна връзка"]],
      build: algos.lookup,
      draw: (st, f) => { st.innerHTML = ""; const s = S.svg("svg", { class: "g", viewBox: "0 0 600 390", width: 600 }); drawNet(s, { chain: f.chain, cur: f.cur, from: f.from }); st.append(h("div", { style: { overflowX: "auto" } }, s)); },
      speed: 0,
    });

    const tt = root.querySelector("#v7-trip");
    tt.append(h("tr", null, h("th", { text: "субект" }), h("th", { text: "предикат" }), h("th", { text: "обект" })));
    algos.triples().forEach(([a, p, b]) => tt.append(h("tr", null, h("td", { text: a }), h("td", { class: "mono", text: p }), h("td", { text: b }))));
  }

  S.chapter({ id: "mrezhi", order: 7, num: "7", group: "Представяне на знания", title: "Семантични мрежи и фреймове",
    lead: "Понятия и означени отношения; наследяване само по „е вид“; фреймове със слотове и стойности по подразбиране, които могат да се отменят; онтологии и RDF тройки.", html, mount, algos });
})();
