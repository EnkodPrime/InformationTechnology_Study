/* Раздел 6 — управление на оперативната памет: виртуален адрес, страници, рамки, TLB, page fault. */
(function () {
  const S = window.Study, h = S.h;
  const PERM = { W: "четене и запис", R: "само четене", C: "copy-on-write" };
  const KIND = ["TLB попадение", "TLB пропуск → таблица", "page fault: зареждане", "page fault: copy-on-write", "невалиден достъп"];

  function parseTable(str) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error("Таблицата на страниците е празна.");
    if (parts.length > 16) throw new Error("Най-много 16 страници.");
    return parts.map((p, i) => {
      if (p === "-") return { present: false, frame: null, perm: "W" };
      const m = /^(\d+)([WRC])?$/i.exec(p);
      if (!m) throw new Error(`Страница ${i}: „${p}“ — формат: рамка и права (W, R или C), напр. 10W, или „-“ за липсваща.`);
      const f = +m[1];
      if (f > 63) throw new Error("Номерът на рамка трябва да е до 63.");
      return { present: true, frame: f, perm: (m[2] || "W").toUpperCase() };
    });
  }
  function parseAccesses(str) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error("Въведи поне един адрес.");
    if (parts.length > 24) throw new Error("Най-много 24 достъпа.");
    return parts.map((p) => {
      const m = /^(w)?(0x[0-9a-f]+|\d+)$/i.exec(p);
      if (!m) throw new Error(`„${p}“ не е адрес. Пример: 12345 (четене) или w8200 (запис).`);
      const v = Number(m[2]);
      if (v > 0xffffff) throw new Error("Адресите трябва да са до 16 777 215.");
      return { va: v, write: !!m[1] };
    });
  }

  const algos = {
    /* Огледало на translate() от c/06_pamet.c */
    mmu({ psize, tlb, table, acc }) {
      const ps = S.int(psize, 16, 65536, "Размерът на страницата");
      if (ps & (ps - 1)) throw new Error("Размерът на страницата трябва да е степен на 2.");
      const shift = Math.log2(ps);
      const tcap = S.int(tlb, 1, 8, "Записите в TLB");
      const pt = parseTable(table), A = parseAccesses(acc);
      let nextFree = Math.max(-1, ...pt.filter((e) => e.present).map((e) => e.frame)) + 1;
      const T = { page: [], frame: [], next: 0 };
      let hits = 0, misses = 0, faults = 0, invalid = 0;
      const F = [], phys = [];
      const snap = (o) => ({ pt: pt.map((e) => ({ ...e })), tlb: { page: T.page.slice(), frame: T.frame.slice() }, shift, ps, stats: { "TLB попадения": hits, "TLB пропуски": misses, "page faults": faults, невалидни: invalid }, ...o });
      const tlbFind = (p) => T.page.indexOf(p);
      const tlbIns = (p, f) => { let i = tlbFind(p); if (i < 0) { if (T.page.length < tcap) i = T.page.length; else { i = T.next; T.next = (T.next + 1) % tcap; } } T.page[i] = p; T.frame[i] = f; return i; };
      F.push(snap({ vars: { "размер на страница": ps, "битове за отместване": shift, "свободна рамка": nextFree }, msg: `Страница ${ps} байта → отместването е ${shift} бита. Номерът на страница = адрес &gt;&gt; ${shift}; отместване = адрес &amp; ${ps - 1}.` }));
      A.forEach(({ va, write }, k) => {
        const page = Math.floor(va / ps), off = va % ps;
        const rw = write ? "запис" : "четене";
        F.push(snap({ at: "split", k, va, page, off, write, vars: { адрес: va, страница: page, отместване: off }, msg: `Достъп №${k + 1} (${rw}): ${va} = ${page}·${ps} + ${off} → страница <b>${page}</b>, отместване <b>${off}</b>.` }));
        const ti = tlbFind(page);
        if (ti >= 0 && !(write && pt[page].perm !== "W")) {
          hits++;
          const pa = T.frame[ti] * ps + off;
          phys.push(pa);
          F.push(snap({ at: ["hit", "tlb"], k, va, page, off, write, tlbHi: ti, vars: { рамка: T.frame[ti], физически: pa }, msg: `<dfn data-g="tlb">TLB</dfn> съдържа страница ${page} → рамка ${T.frame[ti]}. Таблицата не се чете.` }));
          F.push(snap({ at: "phys", k, va, page, off, write, tlbHi: ti, pa, kind: 0, vars: { физически: pa }, msg: `Физически адрес = ${T.frame[ti]}·${ps} + ${off} = <b>${pa}</b>. Отместването е запазено.`, log: `${write ? "w" : ""}${va} → ${pa} (TLB)` }));
          return;
        }
        misses++;
        F.push(snap({ at: ["miss", "tlb"], k, va, page, off, write, vars: { страница: page }, msg: ti >= 0 ? `Страница ${page} е в TLB, но правата (${PERM[pt[page].perm]}) не позволяват запис направо — нужна е таблицата.` : `TLB пропуск: страница ${page} я няма в TLB. Четем таблицата на страниците — <b>това още не е page fault</b>.` }));
        if (page >= pt.length) {
          invalid++; phys.push(-1);
          F.push(snap({ at: ["invalid", "walk"], k, va, page, off, write, kind: 4, vars: {}, msg: `Страница ${page} е извън таблицата (има ${pt.length}). <b>Невалиден достъп</b> — ОС прекратява или сигнализира процеса.`, log: `${write ? "w" : ""}${va} → невалиден` }));
          return;
        }
        const e = pt[page];
        let kind = 1;
        F.push(snap({ at: "walk", k, va, page, off, write, ptHi: page, vars: { присъства: e.present, права: PERM[e.perm] }, msg: `Запис ${page} в таблицата: ${e.present ? `рамка ${e.frame}, ${PERM[e.perm]}` : "<b>липсва в паметта</b>"}.` }));
        if (!e.present) {
          faults++; e.present = true; e.frame = nextFree++; kind = 2;
          F.push(snap({ at: ["load", "absent"], k, va, page, off, write, ptHi: page, fault: true, vars: { рамка: e.frame }, msg: `<dfn data-g="page fault">Page fault</dfn>: страницата липсва. ОС я зарежда от носител в свободна рамка ${e.frame} и обновява таблицата.`, log: `page fault: стр. ${page} → рамка ${e.frame}` }));
        }
        if (write && e.perm === "R") {
          invalid++; phys.push(-1);
          F.push(snap({ at: ["invalid", "rights"], k, va, page, off, write, ptHi: page, kind: 4, vars: {}, msg: `Запис в страница само за четене: <b>нарушение на правата</b> — невалиден достъп.`, log: `w${va} → нарушение на правата` }));
          return;
        }
        if (write && e.perm === "C") {
          faults++; const old = e.frame; e.frame = nextFree++; e.perm = "W"; kind = 3;
          F.push(snap({ at: "cow", k, va, page, off, write, ptHi: page, fault: true, vars: { "стара рамка": old, "нова рамка": e.frame }, msg: `Запис в страница с <dfn data-g="copy-on-write">copy-on-write</dfn>: page fault, ОС копира рамка ${old} в нова рамка ${e.frame} и дава право за запис. Другият участник остава със старата.`, log: `COW: стр. ${page} ${old} → ${e.frame}` }));
        }
        const ti2 = tlbIns(page, e.frame);
        const pa = e.frame * ps + off;
        phys.push(pa);
        F.push(snap({ at: ["fill", "phys"], k, va, page, off, write, ptHi: page, tlbHi: ti2, pa, kind, vars: { рамка: e.frame, физически: pa }, msg: `Преобразуването се записва в TLB. Физически адрес = ${e.frame}·${ps} + ${off} = <b>${pa}</b>.`, log: `${write ? "w" : ""}${va} → ${pa}` }));
      });
      F.push(snap({ done: true, vars: {}, msg: `Край: ${hits} TLB попадения, ${misses} пропуска, от тях page faults: ${faults}, невалидни: ${invalid}. TLB пропуск ≠ page fault.` }));
      return { frames: F, phys: phys.join(","), hits, misses, faults, invalid };
    },
  };

  function drawMMU(st, f) {
    st.innerHTML = "";
    if (f.va != null) {
      const bits = Math.max(f.shift + 4, Math.ceil(Math.log2(f.va + 1)));
      const bin = f.va.toString(2).padStart(bits, "0");
      const pg = bin.slice(0, bits - f.shift), of = bin.slice(bits - f.shift);
      st.append(h("div", { class: "card", style: { marginBottom: "10px" } },
        h("span", { class: "eyebrow", text: `виртуален адрес ${f.va}${f.write ? " · запис" : " · четене"}` }),
        h("p", { class: "mono", style: { overflowWrap: "anywhere" } }, h("span", { class: "pill s-act", text: pg }), " ", h("span", { class: "pill s-cmp", text: of })),
        h("p", { class: "mono", text: `страница = ${f.page}   отместване = ${f.off}` + (f.pa != null ? `   →   физически = ${f.pa}` : "") })));
    }
    const tlb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "TLB" }), h("th", { text: "стр." }), h("th", { text: "рамка" })));
    if (!f.tlb.page.length) tlb.append(h("tr", null, h("td", { colspan: 3, class: "muted", text: "празен" })));
    f.tlb.page.forEach((p, i) => tlb.append(h("tr", null, h("th", { text: i }), h("td", { class: f.tlbHi === i ? "s-done" : "", text: p }), h("td", { class: f.tlbHi === i ? "s-done" : "", text: f.tlb.frame[i] }))));
    const pt = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "стр." }), h("th", { text: "рамка" }), h("th", { text: "права" })));
    f.pt.forEach((e, i) => {
      const c = f.ptHi === i ? (f.fault ? "s-swap" : "s-act") : "";
      pt.append(h("tr", null, h("th", { text: i }), h("td", { class: c, text: e.present ? e.frame : "—" }), h("td", { class: c, text: e.perm })));
    });
    st.append(h("div", { class: "split" }, h("div", { class: "tbl-wrap" }, h("p", { class: "eyebrow", text: "TLB (кеш)" }), tlb), h("div", { class: "tbl-wrap" }, h("p", { class: "eyebrow", text: "таблица на страниците" }), pt)));
    if (f.kind != null) st.append(h("p", { class: "pill " + ["s-done", "s-cmp", "s-swap", "s-piv", "s-swap"][f.kind], style: { marginTop: "8px" }, text: KIND[f.kind] }));
  }

  const PF = [
    { t: "Страницата липсва", d: "Валиден адрес, но страницата не е в паметта → зареждане от носител.", disk: true },
    { t: "Нулева страница", d: "Нова памет (напр. стек, куп), която още няма съдържание → ОС създава нулирана страница. Без диск.", disk: false },
    { t: "Copy-on-write", d: "Запис в споделена за четене страница → ОС създава отделно копие. Без диск.", disk: false },
    { t: "Невалиден достъп", d: "Адрес извън пространството или нарушение на правата → прекратяване / сигнал.", disk: false },
  ];

  const html = `
<div class="prose">
  <p>ОС разпределя памет и изолира адресните пространства. <dfn data-g="виртуален адрес">Виртуалният адрес</dfn> се преобразува във физически чрез хардуер (<dfn data-g="mmu">MMU</dfn>) и таблици, управлявани от ядрото. Виртуалната памет не означава само използване на диска като разширение на RAM; тя включва <b>абстракцията, преобразуването и защитата</b> на адресите.</p>
  <p>При странициране виртуалното пространство се разделя на <dfn data-g="страница">страници</dfn>, а физическата памет на <dfn data-g="рамка">рамки</dfn>. Адресът съдържа номер на страница и отместване. Таблицата на страниците определя рамката и правата. <dfn data-g="tlb">TLB</dfn> кешира преобразувания.</p>
</div>

<div class="block">
  <h3>Схеми 14–16 · Преобразуване, TLB и page fault</h3>
  <p class="muted">Таблица: за страница 0, 1, 2… рамка и права (<b>W</b> — четене и запис, <b>R</b> — само четене, <b>C</b> — споделена с copy-on-write) или „-“ за липсваща. Достъпи: адрес за четене или <code>w</code>адрес за запис. Нови рамки се дават поред след най-големия зает номер на рамка. Моделът е еднониво учебно преобразуване с байтово адресиране.</p>
  <div id="v-mmu"></div>
  <div class="key">
    <p class="formula">страница = адрес div размер &nbsp;&nbsp; отместване = адрес mod размер</p>
    <p class="formula">физически = рамка × размер + отместване</p>
    <p>Пример от ръководството: 4096 B (12 бита) · 12345 → страница 3, отместване 57 · рамка 10 → 10×4096+57 = <b>41017</b>.</p>
  </div>
  <details class="hint"><summary>Хинт: защо делението е просто изместване</summary><div>
    <p>Размерът на страницата е степен на 2, затова номерът на страницата са старшите битове на адреса, а отместването — младшите. Преобразува се само номерът; отместването се копира без промяна. Синьото и оранжевото в двоичния запис по-горе са точно тези две полета.</p>
  </div></details>
  <details class="trap"><summary>Капан: TLB miss = page fault = четене от диск</summary><div>
    <p>Три различни събития. TLB miss може да се разреши чрез налична таблица, без да има липсваща страница (пробвай 100 в примера „Смесен“). Page fault изисква участие на ОС по конкретна причина. И не всеки page fault е дисково четене — виж картите по-долу.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 15 · Какво може да стои зад page fault</h3>
  <p class="muted">„Изключение“ тук не означава непременно фатална програмна грешка: част от изключенията са нормална част от управлението на паметта.</p>
  <div class="cards" id="pf-cards"></div>
</div>

<div class="block">
  <h3>Изолация и споделяне</h3>
  <p class="prose">Два процеса могат да имат еднакъв виртуален адрес, който води до различна физическа памет. Възможно е и различни виртуални адреси да сочат споделена физическа страница. Изолацията и контролираното споделяне са основни цели <b>дори в система без swap</b>.</p>
  <div class="tbl-wrap" id="iso-svg"></div>
  <details class="trap"><summary>Изяснен въпрос: ОС с повече свободна RAM винаги ли е по-добра?</summary><div>
    <p>Не. Свободна памет може да се използва като освобождаем файлов кеш. За натиска върху паметта са важни активните данни и възможността да се освободят кеширани страници, а не само една стойност „free“.</p>
  </div></details>
</div>

<div class="key"><b>За запомняне.</b> Виртуална памет = абстракция + преобразуване + защита. Страница ↔ рамка; преобразува се номерът, отместването остава. TLB е кеш; TLB miss ≠ page fault; page fault ≠ непременно диск.</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-mmu"), {
      id: "mmu", title: "MMU: виртуален → физически адрес", sub: "Синьо — номер на страница, оранжево — отместване.",
      code: "s06_translate",
      inputs: [{ id: "psize", label: "Размер на страница", type: "select", value: "4096", options: ["256", "1024", "4096"] },
        { id: "tlb", label: "Записи в TLB", type: "number", value: 2, width: "5em" },
        { id: "table", label: "Таблица (стр. 0, 1, …)", value: "5W 2R - 10C", width: "14em" },
        { id: "acc", label: "Достъпи (w = запис)", value: "12345 12400 100 8200 w8200 4100 w4100 70000", width: "22em" }],
      presets: [{ label: "Пример от ръководството", values: { psize: "4096", tlb: 4, table: "5W 2W 7W 10W", acc: "12345" } },
        { label: "Смесен", values: { psize: "4096", tlb: 2, table: "5W 2R - 10C", acc: "12345 12400 100 8200 w8200 4100 w4100 70000" } },
        { label: "Copy-on-write", values: { psize: "256", tlb: 2, table: "3W 1C 4W 9W", acc: "0 w256 512 0 768 256 1024" } }],
      legend: [["s-done", "TLB попадение"], ["s-act", "запис в таблицата"], ["s-swap", "page fault / невалиден"]],
      build: algos.mmu, draw: drawMMU,
    });

    const pc = root.querySelector("#pf-cards");
    PF.forEach((P) => pc.append(h("div", { class: "card " + (P.disk ? "s-cmp" : "s-done"), style: { borderColor: "var(--c)" } }, h("h4", { text: P.t }), h("p", { text: P.d }), h("span", { class: "pill " + (P.disk ? "s-cmp" : "s-done"), text: P.disk ? "дисков достъп" : "без диск" }))));

    // изолация
    const ib = root.querySelector("#iso-svg");
    const W = 600, H = 220;
    const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W, role: "img", "aria-label": "Два процеса и физическа памет" });
    const col = (x, title, rows) => { svg.append(S.svg("text", { x: x + 60, y: 18, "text-anchor": "middle", class: "wt", text: title })); rows.forEach((r, i) => svg.append(S.svg("g", { class: "node " + r[1] }, S.svg("rect", { x, y: 28 + i * 38, width: 120, height: 30, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }), S.svg("text", { x: x + 60, y: 48 + i * 38, "text-anchor": "middle", style: "font-size:12px", text: r[0] })))); };
    col(10, "процес A (вирт.)", [["стр. 0", "s-act"], ["стр. 1 (код)", "s-piv"], ["стр. 2", "s-act"]]);
    col(470, "процес B (вирт.)", [["стр. 0", "s-cmp"], ["стр. 1 (код)", "s-piv"], ["стр. 2", "s-cmp"]]);
    col(240, "физически рамки", [["рамка 4", "s-act"], ["рамка 7 (общ)", "s-piv"], ["рамка 9", "s-cmp"], ["рамка 12", "s-act"], ["рамка 15", "s-cmp"]]);
    const ln = (x1, y1, x2, y2, c) => svg.append(S.svg("line", { x1, y1, x2, y2, class: "edge " + c }));
    ln(130, 43, 240, 43, "s-act"); ln(130, 81, 240, 81, "s-piv"); ln(130, 119, 240, 157, "s-act");
    ln(470, 43, 360, 119, "s-cmp"); ln(470, 81, 360, 81, "s-piv"); ln(470, 119, 360, 195, "s-cmp");
    ib.append(svg, h("p", { class: "muted", style: { fontSize: ".85rem" }, text: "Еднакъв виртуален адрес (стр. 0) в A и B води до различни рамки (4 и 9); кодът (стр. 1) е споделен в рамка 7. Учебна схема." }));
  }

  S.chapter({ id: "pamet", order: 6, num: "6", group: "Памет", title: "Управление на оперативната памет", lead: "Виртуален и физически адрес, страници и рамки, превод на адрес, TLB, page fault и copy-on-write, изолация.", html, mount, algos });
})();
