/* Раздел 3 — Класификация според функция и организация (ръководство, глава 3; схема 5). */
(function () {
  const S = window.Study, h = S.h, DG = window.DG;

  /* ---------- чисти функции ---------- */
  const algos = {
    /** Интеграция между две системи: синтактична проверка минава, смисловата — зависи от съгласуваните значения.
        Учебен модел: CRM изпраща поръчка към ERP. */
    integrate({ client, unit, status }) {
      const F = [];
      const msg = { client_id: 4711, amount: 1200, status: "closed" };
      const mismatch = [];
      F.push({ st: "send", msg: "CRM изпраща JSON съобщение към ERP: <code>{\"client_id\": 4711, \"amount\": 1200, \"status\": \"closed\"}</code>.", log: "CRM → ERP", m: msg });
      F.push({ st: "syntax", ok: true, msg: "<b>Синтактична проверка:</b> валиден JSON, полетата съществуват, типовете съвпадат. Транспортът е успешен.", log: "синтаксис ✓", m: msg });
      const cl = client === "same";
      F.push({ st: "client", ok: cl, msg: cl ? "<b>client_id:</b> и в двете системи означава фирма — съвпада." : "<b>client_id:</b> в CRM означава <b>лице за контакт</b>, в ERP — <b>фирма</b>. Еднаквото име на полето не решава разликата.", log: cl ? "клиент ✓" : "клиент ✗", m: msg });
      if (!cl) mismatch.push("идентичност на клиента");
      const un = unit === "same";
      F.push({ st: "unit", ok: un, msg: un ? "<b>amount:</b> и двете системи използват една и съща валута и единица." : "<b>amount:</b> CRM изпраща в стотинки, ERP чете в левове — сумата е 100 пъти различна.", log: un ? "единици ✓" : "единици ✗", m: msg });
      if (!un) mismatch.push("мерни единици");
      const stt = status === "same";
      F.push({ st: "status", ok: stt, msg: stt ? "<b>status:</b> „closed“ означава едно и също (спечелена сделка)." : "<b>status:</b> в CRM „closed“ = сделката е приключена (може и загубена); в ERP „closed“ = платена поръчка.", log: stt ? "статус ✓" : "статус ✗", m: msg });
      if (!stt) mismatch.push("статуси");
      const ok = mismatch.length === 0;
      F.push({ st: "end", ok, msg: ok ? "<b>Семантично съвместими:</b> съгласувани са идентичност, единици и статуси." : `<b>Синтактично валидно, семантично грешно.</b> Несъгласувани: ${mismatch.join(", ")}. Технически успешният обмен не доказва семантична съвместимост.`, log: ok ? "смисъл ✓" : "смисъл ✗", m: msg });
      return { frames: F, ok, mismatch: mismatch.length };
    },
  };

  /* ---------- данни ---------- */
  const CAT = {
    erp: { t: "ERP", g: "erp", d: "Интегрира дейности и общи данни между области като финанси, снабдяване и производство.", ex: "SAP S/4HANA, Microsoft Dynamics 365 Business Central, Odoo" },
    crm: { t: "CRM", g: "crm", d: "Управлява взаимодействията с клиенти.", ex: "Salesforce, Zoho CRM" },
    scm: { t: "SCM", g: "scm", d: "Процеси по веригата на доставки.", ex: "" },
    dms: { t: "Управление на документи", g: null, d: "Поддържа версии, права и движение на документи.", ex: "" },
  };
  const PKG = [
    { t: "Само ERP модули", has: ["erp"] },
    { t: "ERP пакет с CRM модул", has: ["erp", "crm"] },
    { t: "ERP + CRM + SCM функции", has: ["erp", "crm", "scm"] },
    { t: "Самостоятелна CRM", has: ["crm"] },
  ];
  const AXES = [
    { t: "Обхват", o: ["лична", "групова", "организационна", "междуорганизационна"] },
    { t: "Организация на обработката", o: ["централизирана", "разпределена"] },
    { t: "Режим", o: ["пакетна", "интерактивна", "с времеви ограничения"] },
  ];

  const html = `
<div class="prose">
  <p><dfn data-g="erp">ERP</dfn> интегрира дейности и общи данни между области като финанси, снабдяване и производство. <dfn data-g="crm">CRM</dfn> управлява взаимодействията с клиенти, а <dfn data-g="scm">SCM</dfn> — процеси по веригата на доставки. Системите за управление на документи поддържат версии, права и движение на документи. Названието на категорията не гарантира, че конкретен продукт покрива всички възможни функции.</p>
</div>

<div class="block">
  <h3>Схема 5. ERP, CRM и SCM според обслужваните дейности</h3>
  <p class="muted">Избери пакет — виж кои категории покрива. Щракни категория за описание.</p>
  <div class="chips" id="pkg"></div>
  <div id="s5"></div>
  <div class="detail" id="s5-det"></div>
  <div class="key">ERP и CRM <b>не са взаимно изключващи се</b> категории. Интегриран пакет може да включва и двете; класификацията се отнася до функции и организация, а не само до търговско име.</div>
  <details class="trap"><summary>Капан: продуктовото име като определение</summary><div>
    <p>SAP S/4HANA, Microsoft Dynamics 365 Business Central и Odoo са реални примери за бизнес платформи с ERP функции; Salesforce и Zoho CRM — за CRM продукти. Продуктовото име <b>не е определение на категорията</b>. Различни издания, модули и конфигурации покриват различни части от процеса — не приписваме автоматично всички функции на всяка инсталация.</p>
  </div></details>
</div>

<div class="block">
  <h3>Други оси: обхват, организация, режим</h3>
  <p class="prose">По обхват системите могат да са лични, групови, организационни и междуорганизационни. По организация на обработката — централизирани или разпределени. По режим — пакетни, интерактивни и такива с времеви ограничения. Щракни по една стойност на всяка ос: всяка комбинация е допустима.</p>
  <div id="axes"></div>
  <p class="mini" id="axes-out"></p>
</div>

<div class="block">
  <h3>OLTP и OLAP</h3>
  <div class="split">
    <div class="card"><h4><dfn data-g="oltp">OLTP</dfn></h4><p>Много кратки оперативни промени с изисквания за коректност и конкурентност.</p></div>
    <div class="card"><h4><dfn data-g="olap">OLAP</dfn></h4><p>Ориентирано към обобщения и аналитични разрези върху данни. Отчетът може да идва от аналитично хранилище, обновявано със закъснение, а не директно от оперативната база.</p></div>
  </div>
  <details class="trap"><summary>Капан: „Online“ = има интернет</summary><div><p>„Online“ в OLTP/OLAP не означава просто „има интернет“.</p></div></details>
</div>

<div class="block">
  <h3>Интеграцията изисква съгласуван смисъл</h3>
  <p class="prose">Интеграцията може да използва обща база, приложни интерфейси, съобщения или обмен на файлове. Освен пренос на байтове тя изисква <dfn data-g="семантична съвместимост">съгласуван смисъл</dfn>: един и същ идентификатор на клиент, мерни единици, статуси и правила за грешки.</p>
  <div id="v-int"></div>
  <details class="hint"><summary>Хинт: „client_id“ в двете системи</summary><div>
    <p>Ако една система използва „клиент“ за фирма, а друга за лице за контакт, еднакво поле <code>client_id</code> не решава разликата. Нужно е съответствие на идентичности, единици, състояния и отговорности за промени. <dfn data-g="json">JSON</dfn> съобщение може да е синтактично валидно и семантично грешно.</p>
  </div></details>
</div>`;

  function mount(root) {
    /* --- схема 5 --- */
    const pk = root.querySelector("#pkg"), host = root.querySelector("#s5"), det = root.querySelector("#s5-det");
    let p = 1, sel = "erp";
    function draw5() {
      pk.innerHTML = "";
      PKG.forEach((x, k) => pk.append(h("button", { class: "chip", "aria-pressed": k === p ? "true" : "false", text: x.t, onclick: () => { p = k; draw5(); } })));
      host.innerHTML = "";
      const svg = DG.root(640, 280);
      const has = PKG[p].has;
      svg.append(S.svg("rect", { x: 20, y: 20, width: 600, height: 240, rx: 12, class: "boundary" }));
      DG.text(svg, 36, 40, "организационна ИС: хора, процедури и правила + софтуер", "sub", "start");
      const C = { erp: [230, 150, 150, 90], crm: [400, 115, 110, 60], scm: [400, 200, 110, 55], dms: [540, 150, 70, 55] };
      for (const k of ["erp", "crm", "scm", "dms"]) {
        const [x, y, rx, ry] = C[k];
        const on = has.includes(k);
        const g = S.svg("g", { class: "nd click " + (on ? (k === sel ? "s-act sel" : "s-done") : "s-dim") + (k === sel ? " sel" : ""), tabindex: 0, role: "button", "aria-label": CAT[k].t });
        g.append(S.svg("ellipse", { cx: x, cy: y, rx, ry, style: "fill-opacity:.55" }));
        g.append(S.svg("text", { x: k === "erp" ? x - 50 : x + (k === "dms" ? 0 : 20), y: y + 5, "text-anchor": "middle", class: "ttl", text: k === "dms" ? "Документи" : CAT[k].t }));
        const go = () => { sel = k; draw5(); };
        g.addEventListener("click", go); g.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
        svg.append(g);
      }
      DG.wrap(host, svg);
      const c = CAT[sel];
      det.innerHTML = `<h4>${c.g ? `<dfn data-g="${c.g}" tabindex="0">${c.t}</dfn>` : c.t}</h4><p>${c.d}</p>${c.ex ? `<p class="muted">Реални примери от материала: ${c.ex}.</p>` : ""}<p class="mini">Пакет „${PKG[p].t}“: ${has.includes(sel) ? "покрива тази категория." : "<b>не</b> покрива тази категория."}</p>`;
    }
    draw5();

    /* --- оси --- */
    const ax = root.querySelector("#axes"), out = root.querySelector("#axes-out");
    const pick = [2, 1, 1];
    function drawAx() {
      ax.innerHTML = "";
      AXES.forEach((A, i) => {
        const r = h("div", { class: "chips" });
        A.o.forEach((o, j) => r.append(h("button", { class: "chip", "aria-pressed": pick[i] === j ? "true" : "false", text: o, onclick: () => { pick[i] = j; drawAx(); } })));
        ax.append(h("div", { class: "axis" }, h("b", { text: A.t }), r));
      });
      out.innerHTML = `Системата е едновременно <b>${AXES.map((A, i) => A.o[pick[i]]).join(", ")}</b>. Една ос не определя друга.`;
    }
    drawAx();

    /* --- интеграция --- */
    const ST = [["send", "изпращане"], ["syntax", "синтаксис"], ["client", "клиент"], ["unit", "единици"], ["status", "статус"], ["end", "смисъл"]];
    const sel3 = (id, l) => ({ id, label: l, type: "select", value: "same", options: [["same", "съгласувано"], ["diff", "различно значение"]] });
    S.viz(root.querySelector("#v-int"), {
      id: "integ", title: "CRM → ERP: синтактично валидно ли е достатъчно?", sub: "Учебен модел на едно съобщение.", code: false,
      inputs: [sel3("client", "client_id"), sel3("unit", "amount (единица)"), sel3("status", "status")],
      presets: [{ label: "Всичко различно", values: { client: "diff", unit: "diff", status: "diff" } }, { label: "Само клиентът", values: { client: "diff", unit: "same", status: "same" } }],
      build: algos.integrate,
      draw(st, f, { frames, i }) {
        st.innerHTML = "";
        const row = h("div", { class: "phase-row" });
        const k0 = ST.findIndex((x) => x[0] === f.st);
        ST.forEach(([k, t], j) => {
          const fr = frames.find((x) => x.st === k);
          const cls = j > k0 ? "s-dim" : fr.ok === false ? "s-swap" : j === k0 ? "s-act" : "s-done";
          row.append(h("span", { class: "ph " + cls, text: t }));
        });
        st.append(row);
        st.append(h("div", { class: "split", style: { marginTop: "12px" } },
          h("div", null, h("div", { class: "mini", text: "CRM изпраща" }), h("pre", { class: "json", text: JSON.stringify(f.m, null, 1) })),
          h("div", null, h("div", { class: "mini", text: "ERP разбира" }), h("pre", { class: "json", text: (() => {
            const fr = (k) => frames.find((x) => x.st === k);
            const show = (k, a, b) => (ST.findIndex((x) => x[0] === k) <= k0 ? (fr(k).ok ? a : b) : "?");
            return `фирма: ${show("client", "№4711", "№4711 ← но това е лице!")}\nсума: ${show("unit", "1200 лв.", "1200 лв. ← а са 12.00 лв.")}\nстатус: ${show("status", "платена", "платена ← а е загубена сделка")}`;
          })() }))));
        void i;
      },
    });
  }

  S.chapter({ id: "funkcia", order: 3, num: "3", group: "Класификация", title: "Класификация според функция и организация", lead: "ERP, CRM, SCM и документи; обхват, организация, режим; OLTP/OLAP; семантична интеграция.", html, mount, algos });
})();
