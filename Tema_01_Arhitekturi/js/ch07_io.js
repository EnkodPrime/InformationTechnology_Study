/* Раздел 7 — подсистема за вход и изход: контролери, memory-mapped I/O,
   запитване / прекъсване / DMA (времева диаграма), път на заявка от приложение до устройство. */
(function () {
  const S = window.Study, h = S.h;

  const KIND = ["W", "P", "C", "I", "S"];      // работа, запитване, копиране, обработчик, настройка
  const KNAME = { W: "полезна работа", P: "проверка на състоянието", C: "копиране от CPU", I: "обработчик на прекъсване", S: "настройка на DMA" };
  const KCLS = { W: "s-done", P: "s-swap", C: "s-act", I: "s-cmp", S: "s-piv" };

  const algos = {
    /** Същото като simulate() в c/07_io.c */
    io_sim({ mode, N, gap, copy, isr, setup, H }) {
      const m = { polling: 0, irq: 1, dma: 2 }[mode];
      if (m == null) throw new Error("Непознат режим.");
      N = S.int(N, 1, 12, "Брой байтове"); gap = S.int(gap, 1, 12, "Интервал"); copy = S.int(copy, 1, 6, "Копиране");
      isr = S.int(isr, 1, 8, "Обработчик"); setup = S.int(setup, 1, 10, "Настройка на DMA"); H = S.int(H, 10, 120, "Хоризонт");
      const r = { end: 0, useful: 0, polls: 0, copies: 0, irqs: 0, cpu_io: 0 };
      const cpu = [], dev = [], F = [];
      let got = 0, busy = 0, kind = 0, want = 0, setupDone = 0, irq = 0;
      const snap = (o) => F.push(Object.assign({ cpu: cpu.slice(), dev: dev.slice(), H, N, got, mode: m, stats: { "полезна работа": r.useful, "CPU за вход/изход": r.cpu_io, проверки: r.polls, прекъсвания: r.irqs, "байтове в RAM": r.copies } }, o));
      if (m === 2) { kind = 4; busy = setup; }
      snap({ at: m === 2 ? "setup" : "tick", t: -1, vars: { N, gap }, msg: `Устройството получава ${N} байта, по един на всеки ${gap} единици (готов в моменти ${Array.from({ length: N }, (_, k) => (k + 1) * gap).join(", ")}).${m === 2 ? ` CPU първо програмира DMA контролера: адрес, посока, размер (${setup} единици).` : ""}` });
      for (let t = 0; t < H; t++) {
        const ready = got < N && t >= (got + 1) * gap;
        dev[t] = t > 0 && t % gap === 0 && t / gap <= N ? 1 : 0;
        let note = "", tag = "acct";
        if (busy === 0) {
          kind = 0;
          if (m === 0 && got < N) {
            if (want) { kind = 2; busy = copy; want = 0; note = `Предишната проверка видя „готов“ — CPU копира байт ${got + 1} от регистъра на данни в RAM.`; tag = "pcopy"; }
            else { kind = 1; busy = 1; r.polls++; want = ready ? 1 : 0; note = `CPU чете регистъра за състояние: ${ready ? "<b>готов</b>" : "не е готов"}.`; tag = "poll"; }
          } else if (m === 1 && ready) {
            kind = 3; busy = isr + copy; r.irqs++; note = `Устройството вдига <b>прекъсване</b>. CPU прекъсва работата и влиза в обработчика (${isr} за вход/изход от обработчика + ${copy} за копиране).`; tag = "irq";
          } else if (m === 2 && irq) {
            kind = 3; busy = isr; irq = 0; r.irqs++; note = "DMA контролерът съобщава „готово“ с <b>едно</b> прекъсване."; tag = "dirq";
          }
        }
        if (m === 2 && setupDone && ready) {
          dev[t] = 2; got++; r.copies++;
          note += ` DMA пренася байт ${got} в RAM — <b>без</b> CPU.`; tag = "dma";
          if (got === N) irq = 1;
        }
        cpu[t] = KIND[kind];
        if (kind === 0) r.useful++; else r.cpu_io++;
        let fin = "";
        if (busy > 0 && --busy === 0) {
          if (kind === 2 || (kind === 3 && m === 1)) { got++; r.copies++; fin = ` Байт ${got} е в RAM.`; }
          if (kind === 4) { setupDone = 1; fin = " DMA е настроен и чака устройството."; }
          if (r.end === 0 && got === N && (m !== 2 || kind === 3)) { r.end = t + 1; fin += ` <b>Всички ${N} байта са в RAM и CPU знае това.</b>`; }
        }
        if (note || fin || t === H - 1) snap({ at: tag, t, vars: { t, байтове: `${got}/${N}`, CPU: KNAME[cpu[t]] }, msg: `t = ${t}: ${note || (kind === 0 ? "CPU върши полезна работа." : "продължава " + KNAME[cpu[t]] + ".")}${fin}`, log: `t${t}: ${cpu[t]}${dev[t] === 2 ? " DMA" : dev[t] ? " R" : ""}` });
      }
      snap({ at: "ret", t: H - 1, done: true, vars: { край: r.end || "—" }, msg: `Хоризонт ${H}: полезна работа <b>${r.useful}</b>, CPU зает с вход/изход <b>${r.cpu_io}</b>, проверки ${r.polls}, прекъсвания ${r.irqs}. Край на прехвърлянето: ${r.end || "не е достигнат"}.` });
      return { frames: F, r, result: `${r.end} ${r.useful} ${r.polls} ${r.copies} ${r.irqs} ${r.cpu_io} ${cpu.join("")} ${dev.map((x) => ".RD"[x]).join("")}` };
    },
  };

  /* ---------- съдържание ---------- */
  const html = `
<div class="prose">
  <p>Подсистемата за <dfn data-g="i/o">вход и изход</dfn> свързва системата със средата. Периферните устройства се управляват чрез <dfn data-g="контролер">контролери</dfn> и <dfn data-g="драйвер">драйвери</dfn>. Процесорът обменя команди, състояние и данни чрез регистри на контролера. Те могат да бъдат включени в общото адресно пространство като <dfn data-g="memory-mapped i/o">memory-mapped I/O</dfn> или да използват отделно пространство за вход и изход, ако архитектурата го поддържа.</p>
</div>

<div class="block">
  <h3>Регистрите на контролера</h3>
  <p class="prose">Същият принцип важи за <dfn data-g="gpio">GPIO</dfn>, таймери и други периферни блокове. Учебен <dfn data-g="uart">UART</dfn> приемник, видян от CPU като адреси в паметта. Адресите и битовете са илюстративни — всеки реален контролер има собствена карта на регистрите.</p>
  <div class="tbl-wrap"><table class="t" id="regmap"></table></div>
  <details class="trap"><summary>Капан: четенето от регистър на устройство е като четене от RAM?</summary><div>
    <p>Не. Четене от такъв адрес може да има страничен ефект (например вземане на байт от приемния буфер и изчистване на флага „готов“) и не трябва да се третира като обикновено четене от RAM. В C такъв достъп се прави през <code>volatile</code> указател, за да не го премахне или преподреди компилаторът.</p>
  </div></details>
</div>

<div class="block">
  <h3>Запитване, прекъсване и DMA — времева диаграма</h3>
  <p class="prose">При <dfn data-g="програмно запитване">програмно запитване</dfn> процесорът периодично проверява готовността на устройството. При <dfn data-g="прекъсване">прекъсвания</dfn> устройството сигнализира събитие, а процесорът изпълнява обработчик. <dfn data-g="dma">DMA</dfn> позволява контролер да прехвърля блокове между устройство и памет без процесорът да копира всеки елемент; процесорът задава адрес, посока и размер и получава съобщение при завършване или грешка.</p>
  <div id="v-io"></div>
  <details class="hint"><summary>Хинт: условия на модела</summary><div>
    <p>Една единица време = една стъпка на модела. Устройството задържа готовия байт, докато не бъде прочетен (с достатъчно голям приемен буфер; реален UART без FIFO би загубил байт). Не моделираме заемането на шината от DMA, кеша и приоритетите на прекъсванията. Затова числата показват <i>къде отива времето на CPU</i>, а не точна производителност.</p>
  </div></details>
  <details class="trap"><summary>Капан: прекъсването прехвърля ли данните?</summary><div>
    <p>Не. Прекъсването е механизъм за уведомяване и управление — не означава автоматично прехвърляне на целия блок данни. При прекъсвания CPU все пак копира всеки байт в обработчика. DMA е механизъм за прехвърляне. Устройство може да използва DMA и накрая да подаде прекъсване; изборът не е „или едното, или другото“.</p>
  </div></details>
</div>

<div class="block">
  <h3>DMA буфер: три собственика на действието</h3>
  <p class="prose">Примерът с входен буфер има три собственика: CPU подготвя адрес и размер; DMA контролерът записва байтове; обработчикът обработва завършването. Плъзни момента, в който CPU чете буфера.</p>
  <div id="dmabuf"></div>
  <details class="trap"><summary>Капан: „DMA приключи“ = „CPU вижда правилните байтове“?</summary><div>
    <p>Изискват съгласуван протокол. Ако CPU прочете буфера преди края, вижда непълни данни. Ако има некохерентен кеш, е нужна и съответна синхронизация на кеша (CPU може да чете стари копия от кеша, докато DMA е записал в RAM). Буферът трябва да остане валиден до приключване на операцията.</p>
  </div></details>
</div>

<div class="block">
  <h3>Път на заявка: четене на файл от SSD</h3>
  <div id="path"></div>
  <div class="key" id="path-d"></div>
  <p class="prose muted">Реалният път може да включва кеширане и асинхронно изпълнение; затова логическата заявка не съответства непременно на отделен физически достъп. Конкретна периферия: DMA контролер пренася блок от UART или <dfn data-g="adc">ADC</dfn> към RAM; <dfn data-g="nvme">NVMe</dfn> контролер обслужва <dfn data-g="ssd">SSD</dfn>.</p>
</div>

<div class="key"><b>За запомняне.</b> Polling харчи CPU за проверки. Прекъсването е уведомяване. DMA е прехвърляне без копиране от CPU; завършването често се съобщава с прекъсване. Memory-mapped I/O: регистрите на устройството са адреси, но четенето им може да има страничен ефект.</div>`;

  const REGS = [
    ["0x4000_0000", "STATUS", "чете се", "бит 0 RXNE = 1: има приет байт; бит 1 TXE = 1: предавателят е свободен"],
    ["0x4000_0004", "DATA", "чете / записва", "четене взема приетия байт (страничен ефект: RXNE → 0); запис изпраща байт"],
    ["0x4000_0008", "CTRL", "записва се", "бит 0 RXIE: прекъсване при приет байт; бит 1 DMAEN: заявки към DMA"],
  ];
  const PATH = [
    ["Приложение", "Програмата прави системно извикване (read)."],
    ["ОС", "Операционната система проверява заявката (права, файл, отместване) и може да я обслужи от своя кеш."],
    ["Драйвер", "Драйверът подготвя операция за контролера: команда, адрес на буфера, размер."],
    ["Контролер", "Контролерът прехвърля данните, обикновено с DMA, към буфера в RAM."],
    ["Завършване", "Завършването се отчита (често с прекъсване); ОС събужда чакащата програма."],
  ];

  let mk = 0;
  function mount(root) {
    const rm = root.querySelector("#regmap");
    rm.append(h("tr", null, ...["Адрес", "Регистър", "Достъп", "Значение"].map((x) => h("th", { text: x }))));
    REGS.forEach((r) => rm.append(h("tr", null, h("td", { class: "mono", text: r[0] }), h("td", { class: "mono", text: r[1] }), h("td", { text: r[2] }), h("td", { text: r[3] }))));

    S.viz(root.querySelector("#v-io"), {
      id: "io", title: "Къде отива времето на CPU", sub: "Ред „CPU“ — какво прави процесорът; ред „устр.“ — R: байт готов, D: DMA го пренася",
      code: "ch07_io",
      inputs: [{ id: "mode", label: "Механизъм", type: "select", value: "polling", options: [["polling", "запитване (polling)"], ["irq", "прекъсване"], ["dma", "DMA + прекъсване"]] },
        { id: "N", label: "байтове", type: "number", value: 4, width: "4.5em" }, { id: "gap", label: "интервал", type: "number", value: 6, width: "4.5em" },
        { id: "copy", label: "копиране", type: "number", value: 2, width: "4.5em" }, { id: "isr", label: "обработчик", type: "number", value: 3, width: "4.5em" },
        { id: "setup", label: "настр. DMA", type: "number", value: 4, width: "4.5em" }, { id: "H", label: "хоризонт", type: "number", value: 40, width: "4.5em" }],
      presets: [{ label: "Бавно устройство", values: { N: 3, gap: 10, copy: 2, isr: 3, setup: 5, H: 50 } }, { label: "Бързо устройство", values: { N: 8, gap: 3, copy: 1, isr: 2, setup: 4, H: 40 } }, { label: "Скъп обработчик", values: { N: 6, gap: 4, copy: 1, isr: 5, setup: 3, H: 40 } }],
      legend: Object.keys(KNAME).map((k) => [KCLS[k], KNAME[k]]),
      build: algos.io_sim,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" });
        tb.append(h("tr", null, h("th", { text: "t" }), ...Array.from({ length: f.H }, (_, k) => h("th", { class: k === f.t ? "s-act" : "", style: { minWidth: "22px", padding: "3px 2px", fontSize: "11px" }, text: k % 5 === 0 ? k : "" }))));
        const rc = h("tr", null, h("th", { text: "CPU" }));
        const rd = h("tr", null, h("th", { text: "устр." }));
        for (let k = 0; k < f.H; k++) {
          const c = f.cpu[k];
          rc.append(h("td", { class: c ? KCLS[c] : "", style: { minWidth: "22px", padding: "3px 2px" }, title: c ? KNAME[c] : "", text: c || "" }));
          const d = f.dev[k];
          rd.append(h("td", { class: d === 2 ? "s-piv" : d === 1 ? "s-cmp" : "", style: { minWidth: "22px", padding: "3px 2px" }, text: k > f.t ? "" : d === 2 ? "D" : d === 1 ? "R" : "" }));
        }
        tb.append(rc, rd);
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });

    // сравнение под визуализатора
    const cmpBox = h("div", { class: "tbl-wrap" });
    root.querySelector("#v-io").append(cmpBox);
    const rerunCmp = () => {
      const q = (id) => root.querySelector("#io-" + id).value;
      const base = { N: q("N"), gap: q("gap"), copy: q("copy"), isr: q("isr"), setup: q("setup"), H: q("H") };
      let rows;
      try { rows = [["polling", "запитване"], ["irq", "прекъсване"], ["dma", "DMA"]].map(([m, n]) => [n, algos.io_sim(Object.assign({ mode: m }, base)).r]); }
      catch (e) { cmpBox.innerHTML = ""; return; }
      const tb = h("table", { class: "t" }, h("tr", null, ...["Механизъм", "полезна работа", "CPU за вход/изход", "проверки", "прекъсвания", "край"].map((x) => h("th", { text: x }))));
      rows.forEach(([n, r]) => tb.append(h("tr", null, h("td", { text: n }), h("td", { class: "mono", text: r.useful }), h("td", { class: "mono", text: r.cpu_io }), h("td", { class: "mono", text: r.polls }), h("td", { class: "mono", text: r.irqs }), h("td", { class: "mono", text: r.end || "—" }))));
      cmpBox.innerHTML = ""; cmpBox.append(h("p", { class: "eyebrow", style: { padding: "8px 16px 0" }, text: "Сравнение при същите параметри" }), tb);
    };
    root.querySelector("#viz-io").addEventListener("click", (e) => { if (e.target.closest(".viz-inputs button")) setTimeout(rerunCmp, 0); });
    root.querySelector("#viz-io").addEventListener("change", () => setTimeout(rerunCmp, 0));
    rerunCmp();

    // DMA буфер
    {
      const box = root.querySelector("#dmabuf"), N = 8, data = [72, 101, 108, 108, 111, 33, 13, 10];
      const sl = h("input", { type: "range", min: 0, max: N + 3, value: 3, "aria-label": "Момент на четене" });
      const coh = h("input", { type: "checkbox", id: "dma-coh", checked: true });
      const out = h("div"), msg = h("p");
      box.append(h("div", { class: "row" }, h("label", null, "момент на четене от CPU: ", sl), h("label", { style: { display: "flex", gap: "6px", alignItems: "center" } }, coh, h("span", { text: "кешът е синхронизиран (invalidate) преди четене" }))), out, msg);
      const render = () => {
        const t = +sl.value, written = Math.min(t, N), done = t > N;
        const ram = data.map((v, k) => (k < written ? v : "·"));
        const view = coh.checked ? ram : data.map(() => 0);
        out.innerHTML = "";
        out.append(h("span", { class: "eyebrow", text: "RAM (записва DMA)" }));
        S.drawArray(out, ram, { cls: Object.fromEntries(ram.map((v, k) => [k, v === "·" ? "s-dim" : "s-piv"])), append: true });
        out.append(h("span", { class: "eyebrow", text: "Какво вижда CPU" }));
        S.drawArray(out, view, { cls: Object.fromEntries(view.map((v, k) => [k, !coh.checked ? "s-swap" : v === "·" ? "s-swap" : done ? "s-done" : "s-cmp"])), append: true });
        msg.innerHTML = !coh.checked ? "<span class='warn'>Некохерентен кеш без синхронизация: CPU чете стари копия от кеша (тук 0), въпреки че DMA е записал в RAM.</span>"
          : !done ? `<span class='warn'>DMA е записал ${written} от ${N} байта и още не е съобщил „готово“. CPU вижда непълни данни.</span>`
            : "Прекъсването „готово“ е дошло, кешът е синхронизиран — CPU вижда правилните байтове („Hello!\\r\\n“).";
      };
      sl.addEventListener("input", render); coh.addEventListener("change", render); render();
    }

    // път на заявка
    {
      const W = 620, H = 90, id = "pt" + (mk++), svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      const d = S.svg("defs"); d.append(S.svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S.svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" }))); svg.append(d);
      const det = root.querySelector("#path-d");
      const gs = PATH.map(([t], i) => {
        const g = S.svg("g", { class: "node", tabindex: 0, role: "button", style: "cursor:pointer", onclick: () => pick(i), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } } });
        g.append(S.svg("rect", { x: 5 + i * 123, y: 20, width: 108, height: 46, rx: 6, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }));
        g.append(S.svg("text", { x: 59 + i * 123, y: 48, "text-anchor": "middle", "font-size": 12, text: t }));
        svg.append(g);
        if (i < PATH.length - 1) { const l = S.svg("line", { x1: 113 + i * 123, y1: 43, x2: 126 + i * 123, y2: 43, class: "edge", "marker-end": `url(#${id})` }); l.style.color = "var(--ink-2)"; svg.append(l); }
        return g;
      });
      function pick(i) { gs.forEach((g, j) => g.setAttribute("class", "node " + (j < i ? "s-done" : j === i ? "s-act" : ""))); det.innerHTML = `<p><b>${i + 1}. ${PATH[i][0]}.</b> ${PATH[i][1]}</p>`; }
      root.querySelector("#path").append(svg); pick(0);
    }
  }

  S.chapter({ id: "vhod-izhod", order: 7, num: "7", group: "Памет и вход/изход", title: "Подсистема за вход и изход",
    lead: "Регистри на контролера, запитване срещу прекъсване срещу DMA на една времева ос, DMA буферът и пътят на заявка.", html, mount, algos });
})();
