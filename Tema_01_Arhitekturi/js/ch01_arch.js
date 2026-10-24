/* Раздел 1 — архитектура и организация: архитектура срещу микроархитектура,
   фон Нойман срещу Харвард (симулатор на шината), три логически шини. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- чисти функции ---------- */
  function parseProg(str) {
    const s = String(str).toUpperCase().replace(/[\s,;]+/g, "");
    if (!s.length) throw new Error("Въведи поне една инструкция: A (без достъп до данни), L (LOAD) или S (STORE).");
    if (s.length > 14) throw new Error("Най-много 14 инструкции.");
    const bad = s.replace(/[ALS]/g, "");
    if (bad) throw new Error(`„${bad[0]}“ не е позволено. Използвай само A, L и S.`);
    return s;
  }

  const algos = {
    /** Същият алгоритъм като run_bus() в c/01_bus.c */
    run_bus({ prog, arch }) {
      const p = parseProg(prog), n = p.length, harvard = arch === "harvard";
      const st = { такта: 0, извличания: 0, "достъпи до данни": 0, конфликти: 0 };
      const hist = [], F = [];
      let next = 0, pending = -1;
      const snap = (o) => F.push(Object.assign({ p, harvard, hist: hist.map((x) => ({ ...x })), next, pending, stats: { ...st },
        vars: { next, pending, cycle: st.такта } }, o));
      snap({ at: "init", msg: `Програма от ${n} инструкции: <code>${p}</code>. ${harvard ? "Харвард: отделни шини за инструкции и данни." : "Фон Нойман: една обща шина за инструкции и данни."}` });
      while (next < n || pending >= 0) {
        st.такта++;
        const cur = { f: null, d: null, conf: false };
        hist.push(cur);
        snap({ at: ["tick", "loop"], msg: `Такт <b>${st.такта}</b>. ${pending >= 0 ? `Инструкция I${pending + 1} (${p[pending]}) чака достъп до данни.` : "Няма чакащ достъп до данни."}` });
        let dbusy = 0;
        if (pending >= 0) {
          st["достъпи до данни"]++; cur.d = pending; dbusy = 1;
          const was = pending; pending = -1;
          snap({ at: ["data", "dchk"], bus: "d", msg: `Транзакция за <b>данни</b> на I${was + 1} (${p[was] === "L" ? "LOAD чете" : "STORE записва"}). ${harvard ? "Използва шината за данни." : "Заема <b>общата</b> шина."}`, log: `т${st.такта}: D I${was + 1}` });
        }
        const fbusy = harvard ? 0 : dbusy;
        if (next < n && !fbusy) {
          st.извличания++; cur.f = next;
          const ls = p[next] === "L" || p[next] === "S";
          const idx = next;
          if (ls) pending = next;
          next++;
          snap({ at: ls ? ["needd", "fetch"] : ["fetch", "fchk"], bus: "f", msg: `<b>Извличане</b> на I${idx + 1} (${p[idx]})${harvard && dbusy ? " — в <b>същия</b> такт, защото пътят за инструкции е отделен" : ""}.${ls ? " Тя е LOAD/STORE — в следващия такт ще ѝ трябва шината за данни." : ""}`, log: `т${st.такта}: F I${idx + 1}` });
        } else if (next < n) {
          st.конфликти++; cur.conf = true;
          snap({ at: ["conf", "fchk"], bus: "x", msg: `Извличането на I${next + 1} <b>чака</b>: общата шина е заета с данни. Това е ограничението на модела на фон Нойман.`, log: `т${st.такта}: F чака` });
        }
      }
      snap({ at: "ret", done: true, msg: `Край: <b>${st.такта}</b> такта за ${n} инструкции (${st.извличания} извличания, ${st["достъпи до данни"]} достъпа до данни, ${st.конфликти} конфликта).` });
      return { frames: F, result: [st.такта, st.извличания, st["достъпи до данни"], st.конфликти] };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Компютърната <dfn data-g="архитектура">архитектура</dfn> описва принципите на работа и характеристиките на машината, които са съществени за програмиста: инструкции, регистри, типове данни, адресиране и механизми за изпълнение. <dfn data-g="микроархитектура">Микроархитектурата</dfn> определя как конкретен процесор реализира тази архитектура: изпълнителни устройства, конвейери, кешове и управляваща логика. Два процесора могат да изпълняват един и същ машинен код, но да имат различна производителност и вътрешна организация.</p>
  <p>Основните функционални части са процесор, памет, входно-изходни устройства и връзки между тях. Процесорът включва <dfn data-g="уу">управляващо устройство</dfn>, <dfn data-g="алу">аритметично-логическо устройство</dfn> и <dfn data-g="регистър">регистри</dfn>. <dfn data-g="брояч на командите">Броячът на командите</dfn> определя откъде се извлича следващата инструкция; преходите могат да променят нормалната последователност.</p>
</div>

<div class="block">
  <h3>Един договор, различни реализации</h3>
  <p class="prose"><dfn data-g="isa">Архитектурата на системата от инструкции</dfn> е договорът, по който машинната програма разговаря с процесора: какви регистри съществуват, как се назовават операциите и какъв наблюдаем резултат трябва да дадат. Микроархитектурата е вътрешният механизъм, който изпълнява договора. Щракни върху реализация — резултатът остава същият, времето не.</p>
  <div class="cards" id="impl"></div>
  <div class="key" id="impl-d"></div>
  <details class="trap"><summary>Капан: „съвместим“ значи ли „еднакво бърз“?</summary><div>
    <p>Не. ISA съвместимостта гарантира поведение, а времето зависи от микроархитектурата, кешовете, паметта, честотата и конкретните зависимости в програмата. Единият процесор може да има по-дълъг конвейер, повече кеш и различно предсказване на преходи.</p>
  </div></details>
  <details class="trap"><summary>Капан: „32-битов процесор“</summary><div>
    <p>Самостоятелно не определя ширината на всички шини, размера на всяка инструкция или максималния размер на физическата памет. Трябва да се уточни дали става дума за регистри, адреси, операции или интерфейс. Битът е двоична цифра, байтът в разглежданите съвременни системи е осем бита, а машинната дума зависи от архитектурата. Инструкцията може да заема няколко байта, а да обработва един байт данни.</p>
  </div></details>
</div>

<div class="block">
  <h3>Фон Нойман и Харвард: какво точно се разделя</h3>
  <div class="split">
    <div class="key"><b><dfn data-g="фон нойман">Фон Нойман</dfn></b><p>Програмата и данните са в обща памет и минават по общ път. Общият път може да ограничи едновременното извличане на инструкция и четене на данни.</p></div>
    <div class="key"><b><dfn data-g="харвард">Харвард</dfn></b><p>Отделни памети и пътища за инструкции и данни — допуска едновременни достъпи. Един и същ числов адрес може да означава различни места в двете пространства.</p></div>
  </div>
  <p class="prose">Симулаторът брои такта по шината в учебен модел: всяка инструкция се извлича с една транзакция (F), а LOAD/STORE правят още една за данни (D) в следващия такт. Изпиши програма от <b>A</b> (аритметика, без данни), <b>L</b> (LOAD) и <b>S</b> (STORE) и сравни двете организации.</p>
  <div id="v-bus"></div>
  <details class="hint"><summary>Хинт: откъде идват числата</summary><div>
    <p>При Харвард всяка инструкция заема пътя за инструкции точно 1 такт, а достъпът за данни се припокрива с извличането на следващата. Затова времето е n + 1, ако последната инструкция е LOAD/STORE, иначе n. При фон Нойман всеки достъп до данни „краде“ такт от извличането: n + (брой L и S).</p>
    <p>Моделът показва само конфликта за пътя. Реален процесор има кешове, конвейер и изчаквания на паметта.</p>
  </div></details>
  <p class="prose">На практика се срещат <dfn data-g="смесена организация">смесени организации</dfn>: отделни кешове за инструкции и данни пред обща основна памет. Така един процесор може да има единно програмно адресно пространство и все пак два независими пътя на първото кеш ниво. Следователно разделянето трябва да се разглежда на конкретно равнище от йерархията.</p>
  <div id="mixed"></div>
  <details class="trap"><summary>Капан: „Харвард значи RISC, фон Нойман значи CISC“</summary><div>
    <p>Не следва. Това са различни класификационни оси: едната е организацията на достъпа до паметта, другата — сложността на системата от инструкции. Названието „Харвард“ идва от историческата връзка с Harvard Mark I; важният признак днес е организацията на достъпа, а не мястото на производство.</p>
  </div></details>
  <details class="trap"><summary>Капан: два кеша означават ли две основни памети?</summary><div>
    <p>Не. Кешовете за инструкции и данни могат да извличат блокове от обща RAM. Отделянето на първо кеш ниво не означава две отделни основни RAM памети. За класификацията трябва да се разгледат адресните пространства, пътищата и конкретното ниво.</p>
  </div></details>
</div>

<div class="block">
  <h3>Адресна шина, шина за данни, управляваща шина</h3>
  <p class="prose"><dfn data-g="адресна шина">Адресната шина</dfn> отговаря на „къде“, <dfn data-g="шина за данни">шината за данни</dfn> — „каква стойност“, а <dfn data-g="управляваща шина">управляващите сигнали</dfn> — „каква операция и кога“. Избери транзакция; посоките зависят от текущия инициатор, тук CPU.</p>
  <div class="row" id="bus-btns"></div>
  <div id="bus-svg"></div>
  <div class="key" id="bus-d"></div>
  <details class="hint"><summary>Хинт: трите шини са логически роли</summary><div>
    <p>В реален интерфейс адресът и данните могат да споделят линии в различни моменти. Изобразените три шини са логическо разделение на ролите, не задължително три групи проводници.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> Архитектура = какво вижда програмата; микроархитектура = как е направено. Фон Нойман/Харвард е въпрос за <i>пътищата до паметта</i> и винаги трябва да се каже <i>на кое равнище</i>.</div>`;

  /* ---------- данни за интерактивните схеми ---------- */
  const IMPL = [
    { t: "Реализация A", s: "къс конвейер, малък кеш", d: "ADD x3, x1, x2 при x1 = 5, x2 = 3 дава x3 = 8. С малък кеш програма с много пропуски чака паметта по-често." },
    { t: "Реализация B", s: "дълъг конвейер, голям кеш, предсказване", d: "Същата инструкция дава <b>същото</b> x3 = 8. Повече инструкции са едновременно в движение; времето за програма с много разклонения зависи от точността на предсказването." },
    { t: "Ibex (RISC-V)", s: "реално отворено ядро", d: "Документацията описва отделни decoder, controller, register file, ALU и load-store unit. Изпълнява RV32I — същият договор." },
  ];

  function arrowDefs(svg, id) {
    const d = S.svg("defs");
    d.append(S.svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
      S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" })));
    svg.append(d);
  }
  let mk = 0;
  function box(svg, x, y, w, hh, label, cls, sub) {
    const g = S.svg("g", { class: "node " + (cls || "") });
    g.append(S.svg("rect", { x, y, width: w, height: hh, rx: 6, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }));
    g.append(S.svg("text", { x: x + w / 2, y: y + hh / 2 + (sub ? -3 : 5), "text-anchor": "middle", "font-weight": 600, text: label }));
    if (sub) g.append(S.svg("text", { x: x + w / 2, y: y + hh / 2 + 14, "text-anchor": "middle", class: "wt", text: sub }));
    svg.append(g);
    return g;
  }
  function line(svg, x1, y1, x2, y2, cls, id, both) {
    const ln = S.svg("line", { x1, y1, x2, y2, class: "edge " + (cls || ""), "marker-end": id ? `url(#${id})` : null, "marker-start": both && id ? `url(#${id})` : null });
    ln.style.color = cls ? "var(--c)" : "var(--line)";
    svg.append(ln);
    return ln;
  }

  /* ---------- mount ---------- */
  function mount(root) {
    // реализации
    const ib = root.querySelector("#impl"), idd = root.querySelector("#impl-d");
    const btns = IMPL.map((I, i) => h("button", { class: "card", "aria-pressed": i === 0 ? "true" : "false", onclick: () => pick(i) },
      h("span", { class: "eyebrow", text: "ISA: RV32I" }), h("h4", { text: I.t }), h("p", { text: I.s })));
    ib.append(...btns);
    function pick(i) { btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false")); idd.innerHTML = `<p>${IMPL[i].d}</p><p class="muted">Програмно наблюдаваното поведение е еднакво; времевите характеристики — не. Схемата не твърди еднакво време за всички входове.</p>`; }
    pick(0);

    // симулатор на шината
    S.viz(root.querySelector("#v-bus"), {
      id: "bus", title: "Път на инструкциите и данните — такт по такт", sub: "F — извличане на инструкция, D — достъп до данни",
      code: "ch01_bus",
      inputs: [{ id: "prog", label: "Програма (A, L, S)", value: "LAAS", width: "12em" },
        { id: "arch", label: "Организация", type: "select", value: "vonneumann", options: [["vonneumann", "фон Нойман"], ["harvard", "Харвард"]] }],
      presets: [{ label: "Само аритметика", values: { prog: "AAAA" } }, { label: "Само LOAD", values: { prog: "LLLL" } }, { label: "Смесена", values: { prog: "LASALASA" } }],
      random: () => ({ prog: Array.from({ length: S.randInt(4, 10) }, () => "AALS"[S.randInt(0, 3)]).join("") }),
      legend: [["s-act", "извличане (F)"], ["s-piv", "данни (D)"], ["s-swap", "F чака шината"]],
      build: algos.run_bus,
      draw(st, f) {
        st.innerHTML = "";
        const W = 620, H = 190, id = "ar" + (mk++);
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        arrowDefs(svg, id);
        box(svg, 20, 60, 120, 70, "CPU", "s-act", f.next < f.p.length ? `следв.: I${f.next + 1}` : "всички извлечени");
        const fOn = f.bus === "f", dOn = f.bus === "d", xOn = f.bus === "x";
        if (f.harvard) {
          box(svg, 440, 10, 160, 60, "Памет за инструкции", fOn ? "s-act" : "");
          box(svg, 440, 120, 160, 60, "Памет за данни", dOn ? "s-piv" : "");
          line(svg, 140, 80, 438, 40, fOn ? "s-act" : "", id, true);
          line(svg, 140, 110, 438, 150, dOn ? "s-piv" : "", id, true);
          svg.append(S.svg("text", { x: 290, y: 50, "text-anchor": "middle", class: "wt", text: "шина за инструкции" }));
          svg.append(S.svg("text", { x: 290, y: 150, "text-anchor": "middle", class: "wt", text: "шина за данни" }));
        } else {
          box(svg, 440, 50, 160, 90, "Обща памет", dOn ? "s-piv" : fOn ? "s-act" : xOn ? "s-swap" : "", "инструкции + данни");
          line(svg, 140, 95, 438, 95, dOn ? "s-piv" : fOn ? "s-act" : xOn ? "s-swap" : "", id, true);
          svg.append(S.svg("text", { x: 290, y: 85, "text-anchor": "middle", class: "wt", text: "обща шина" }));
          if (xOn) svg.append(S.svg("text", { x: 290, y: 125, "text-anchor": "middle", fill: "var(--st-swap)", text: "F чака — шината е заета" }));
        }
        st.append(svg);
        // времева таблица
        const n = f.hist.length;
        const tb = h("table", { class: "t grid" });
        tb.append(h("tr", null, h("th", { text: "такт" }), ...f.hist.map((_, k) => h("th", { text: k + 1 }))));
        const rowF = h("tr", null, h("th", { text: f.harvard ? "шина I" : "шина (F)" }));
        const rowD = h("tr", null, h("th", { text: f.harvard ? "шина D" : "шина (D)" }));
        f.hist.forEach((c, k) => {
          const last = k === n - 1 && !f.done;
          rowF.append(h("td", { class: c.f != null ? (last ? "s-act" : "") : c.conf ? "s-swap" : "", text: c.f != null ? "I" + (c.f + 1) : c.conf ? "чака" : "" }));
          rowD.append(h("td", { class: c.d != null ? (last ? "s-piv" : "") : "", text: c.d != null ? "I" + (c.d + 1) : "" }));
        });
        tb.append(rowF, rowD);
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.done) {
          const other = algos.run_bus({ prog: f.p, arch: f.harvard ? "vonneumann" : "harvard" }).result[0];
          st.append(h("p", { class: "muted", html: `Същата програма при ${f.harvard ? "фон Нойман" : "Харвард"}: <b>${other}</b> такта.` }));
        }
      },
    });

    // смесена организация
    const mx = root.querySelector("#mixed");
    {
      const W = 520, H = 170, id = "mx" + (mk++);
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      arrowDefs(svg, id);
      box(svg, 20, 60, 100, 50, "Ядро", "s-act");
      box(svg, 190, 15, 120, 45, "L1 инструкции", "");
      box(svg, 190, 110, 120, 45, "L1 данни", "s-piv");
      box(svg, 390, 55, 110, 60, "Обща RAM", "", "основна памет");
      line(svg, 120, 75, 188, 40, "", id, true); line(svg, 120, 95, 188, 130, "", id, true);
      line(svg, 310, 40, 388, 75, "", id, true); line(svg, 310, 130, 388, 95, "", id, true);
      svg.append(S.svg("text", { x: 155, y: 165, "text-anchor": "middle", class: "wt", text: "Харвард на L1" }));
      svg.append(S.svg("text", { x: 400, y: 150, "text-anchor": "middle", class: "wt", text: "фон Нойман под L1" }));
      mx.append(svg);
    }

    // шини
    const TX = {
      rd: { t: "Четене от памет", a: ">", d: "<", c: "RD", txt: "CPU поставя адреса и сигнал „четене“; паметта връща стойността по шината за данни, когато интерфейсът потвърди готовност." },
      wr: { t: "Запис в памет", a: ">", d: ">", c: "WR", txt: "CPU поставя адреса, стойността и сигнал „запис“. Посоката на данните е обратна спрямо четенето." },
      io: { t: "Четене от регистър на устройство", a: ">", d: "<", c: "RD", io: true, txt: "При memory-mapped I/O това е обикновено четене по адрес, но може да има страничен ефект (напр. изчистване на флаг) — затова не е същото като четене от RAM." },
    };
    const bb = root.querySelector("#bus-btns"), bs = root.querySelector("#bus-svg"), bd = root.querySelector("#bus-d");
    const tbtn = Object.keys(TX).map((k) => h("button", { class: "btn", "aria-pressed": "false", text: TX[k].t, onclick: () => drawBus(k) }));
    bb.append(...tbtn);
    function drawBus(k) {
      tbtn.forEach((b, i) => b.setAttribute("aria-pressed", Object.keys(TX)[i] === k ? "true" : "false"));
      const T = TX[k], W = 600, H = 200, id = "bs" + (mk++);
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      arrowDefs(svg, id);
      box(svg, 10, 30, 90, 140, "CPU", "s-act", "инициатор");
      box(svg, 480, 20, 110, 70, "Памет", T.io ? "" : "s-cmp");
      box(svg, 480, 110, 110, 70, "Устройство", T.io ? "s-cmp" : "", "регистри");
      const ys = [60, 100, 140], names = ["адресна шина", "шина за данни", "управляваща шина"];
      const dirs = [T.a, T.d, ">"], lbl = [T.io ? "0x4000_0004" : "0x2004", k === "wr" ? "43" : "42", T.c];
      ys.forEach((y, i) => {
        const fwd = dirs[i] === ">";
        const ln = S.svg("line", { x1: fwd ? 100 : 470, y1: y, x2: fwd ? 470 : 102, y2: y, class: "edge " + ["s-act", "s-piv", "s-cmp"][i], "marker-end": `url(#${id})` });
        ln.style.color = "var(--c)";
        svg.append(ln);
        svg.append(S.svg("text", { x: 285, y: y - 6, "text-anchor": "middle", class: "wt", text: names[i] + ": " + lbl[i] }));
      });
      bs.innerHTML = ""; bs.append(svg);
      bd.innerHTML = `<p><b>${T.t}.</b> ${T.txt}</p><p class="muted">Числата са илюстративни. Адресът избира място или регистър; данните са стойността; управляващите сигнали задават вида и момента.</p>`;
    }
    drawBus("rd");
  }

  S.chapter({ id: "arhitektura", order: 1, num: "1", group: "Основа", title: "Архитектура и организация на компютъра",
    lead: "Архитектура срещу микроархитектура, фон Нойман срещу Харвард и трите логически шини.", html, mount, algos });
})();
