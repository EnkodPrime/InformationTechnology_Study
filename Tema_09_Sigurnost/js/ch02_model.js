/* Раздел 2 — модел на заплахите, пасивни/активни атаки, защита в дълбочина. */
(function () {
  const S = window.Study, h = S.h;

  /* Слоеве на защитата: кой етап на атаката спира/открива/ограничава и от какво зависи */
  const LAYERS = [
    { id: "edge", t: "Филтриране на входа", role: "предотвратяване", stops: "recon", dep: "мрежа", d: "Намалява повърхността за атака: затворени ненужни услуги." },
    { id: "mfa", t: "Многофакторен вход", role: "предотвратяване", stops: "access", dep: "акаунт", d: "Откраднатата парола сама не стига." },
    { id: "least", t: "Минимални привилегии", role: "ограничаване", stops: "escalate", dep: "права", d: "Компрометиран обикновен акаунт няма права върху всичко." },
    { id: "seg", t: "Сегментиране", role: "ограничаване", stops: "lateral", dep: "мрежа", d: "Пробив в един сегмент не отваря другите." },
    { id: "ids", t: "Наблюдение (IDS, дневници)", role: "откриване", stops: "detect", dep: "наблюдение", d: "Открива подозрителни действия — не ги спира сам." },
    { id: "backup", t: "Резервни копия и история", role: "възстановяване", stops: "recover", dep: "отделно хранилище", d: "Връща данните; не отменя изтичане." },
  ];
  const STAGES = [
    { k: "recon", t: "Разузнаване", d: "установява налични системи и услуги" },
    { k: "access", t: "Първоначален достъп", d: "използва уязвимост или откраднат акаунт" },
    { k: "escalate", t: "Повишаване на привилегии", d: "търси повече права" },
    { k: "lateral", t: "Придвижване към други ресурси", d: "движи се към базата с оценки" },
    { k: "impact", t: "Въздействие", d: "променя или изтегля данни" },
  ];

  const algos = {
    /* Път на атаката през слоевете. shared = всички слоеве разчитат на един и същ (вече компрометиран) администраторски акаунт */
    depth({ edge, mfa, least, seg, ids, backup, shared }) {
      const on = (x) => x === true || x === "true" || x === 1 || x === "1";
      const act = { edge: on(edge), mfa: on(mfa), least: on(least), seg: on(seg), ids: on(ids), backup: on(backup) };
      const common = on(shared);
      const F = [];
      let detected = false, stopped = null, bypass = [];
      const fr = (o) => ({ act, common, detected, stopped, bypass: bypass.slice(), stats: { активни: Object.values(act).filter(Boolean).length, заобиколени: bypass.length }, ...o });
      F.push(fr({ stage: -1, at: [], msg: "Нападател отвън се цели в базата с оценки. Всеки етап е общ модел, не задължителен ред за всяка атака." + (common ? " <b>Обща причина:</b> слоевете се управляват от един администраторски акаунт и той е компрометиран." : "") }));
      for (let s = 0; s < STAGES.length; s++) {
        const st = STAGES[s];
        F.push(fr({ stage: s, at: [], msg: `<b>${st.t}</b>: нападателят ${st.d}.` }));
        if (st.k === "impact") break;
        const L = LAYERS.find((l) => l.stops === st.k);
        if (L && act[L.id]) {
          if (common && L.id !== "edge") {
            bypass.push(L.id);
            F.push(fr({ stage: s, layer: L.id, res: "bypass", msg: `„${L.t}“ е <b>заобиколен</b>: нападателят с администраторския акаунт сам променя настройката. Слоят не е независим.`, log: `${st.t}: ${L.t} заобиколен` }));
            continue;
          }
          stopped = s;
          F.push(fr({ stage: s, layer: L.id, res: "stop", msg: `„${L.t}“ (${L.role}) спира атаката на този етап.`, log: `${st.t}: спряно от ${L.t}` }));
          break;
        }
        F.push(fr({ stage: s, layer: L ? L.id : null, res: "pass", msg: L ? `„${L.t}“ липсва — етапът минава.` : "Няма слой за този етап — минава.", log: `${st.t}: минава` }));
        if (act.ids && !detected && s >= 1 && !(common)) {
          detected = true;
          F.push(fr({ stage: s, layer: "ids", res: "detect", msg: "Наблюдението <b>открива</b> подозрително действие и сигнализира. Откриването не спира атаката — нужна е процедура за реакция.", log: "сигнал от наблюдението" }));
        }
      }
      let outcome;
      if (stopped != null) outcome = `Атаката е спряна на етап „${STAGES[stopped].t}“.`;
      else {
        outcome = "Атаката достига въздействие.";
        if (act.backup && !(common)) outcome += " Резервните копия позволяват <b>възстановяване</b> на подменените данни, но <b>не отменят</b> изтичане на прочетените.";
        else if (act.backup && common) { bypass.push("backup"); outcome += " Копията са изтрити със същия акаунт — общата причина обезсмисля и този слой."; }
        if (detected) outcome += " Наблюдението е дало сигнал — реакцията ограничава последиците.";
      }
      F.push(fr({ stage: STAGES.length, at: [], done: true, msg: outcome }));
      return { frames: F, stopped, detected, bypassed: bypass.length };
    },
  };

  const PA = [
    { s: "Подслушване на нешифрован трафик в обща Wi-Fi мрежа", t: "P", why: "Само наблюдава — нищо не се променя. Шифроването скрива съдържанието, но адреси, размери и моменти остават видими." },
    { s: "Анализ на моментите и размерите на шифровани пакети", t: "P", why: "Пасивно: метаданните остават информативни и при шифроване." },
    { s: "Вмъкване на фалшив отговор в комуникацията", t: "A", why: "Активно: инжектира съдържание." },
    { s: "Повторно изпращане на старо валидно съобщение (replay)", t: "A", why: "Активно, макар че нито един бит не е променен — проблемът е във времето и контекста." },
    { s: "Претоварване на услуга (DoS)", t: "A", why: "Активно: блокира — нарушава наличността." },
    { s: "Фишинг, след който откраднатият акаунт подменя данни", t: "PA", why: "Групите описват аспекти, които могат да се съчетават. Контролите се избират според механизма, не само според името на атаката." },
  ];

  const html = `
<div class="prose">
  <p><dfn data-g="модел на заплахите">Моделът на заплахите</dfn> определя какво се защитава, от кого, през кои граници и с какви предпоставки. <dfn data-g="повърхност за атака">Повърхността за атака</dfn> включва достъпните интерфейси, услуги, акаунти и процедури. <dfn data-g="граница на доверие">Границата на доверие</dfn> е мястото, където информацията или контролът преминава между различно доверени области.</p>
</div>

<div class="block">
  <h3>Граници на доверие и повърхност за атака</h3>
  <p class="muted">Щракни върху зона или граница. Зелено — по-доверена зона; червено — недоверена.</p>
  <div id="tb-svg"></div>
  <div class="key" id="tb-detail"></div>
  <details class="trap"><summary>Капан: „заявката идва от вътрешната мрежа, значи е доверена“</summary><div>
    <p>Произходът на заявката сам по себе си не доказва доверие; вътрешната мрежа също може да съдържа компрометирано устройство. Външен и вътрешен нападател просто започват с различни начални права.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 5. Пасивно наблюдение и активна намеса</h3>
  <p class="prose"><dfn data-g="пасивна атака">Пасивните атаки</dfn> наблюдават, например подслушване на незащитен трафик. <dfn data-g="активна атака">Активните</dfn> променят, инжектират, блокират или имитират. Щракни сценарий — вижда се къде попада и защо.</p>
  <div class="split"><div id="pa-list" style="display:grid;gap:6px"></div><div id="pa-svg"></div></div>
  <div class="key" id="pa-detail"></div>
</div>

<div class="block">
  <h3>Модел на нападателя определя валидността на защитата</h3>
  <p class="prose">Нападател с достъп до изпълняващия процес е различен от пасивен наблюдател на мрежата. <dfn data-g="tls">TLS</dfn> може да защити преноса срещу определен мрежов противник, но не може да скрие данните от вече компрометираното приложение, което ги използва. Изводът за защита е валиден само при предпоставките на модела.</p>
  <div class="row" id="adv-btn"></div>
  <div id="adv-svg"></div>
  <div class="key" id="adv-detail"></div>
</div>

<div class="block">
  <h3>Схема 16. Защита в дълбочина</h3>
  <p class="prose"><dfn data-g="защита в дълбочина">Защитата в дълбочина</dfn> използва независими и допълващи се мерки: предотвратяването намалява възможността за успешна атака, откриването установява подозрителни събития, а реагирането и възстановяването ограничават последиците. <dfn data-g="минимални привилегии">Минималните привилегии</dfn> ограничават правата, а <dfn data-g="сегментиране">сегментирането</dfn> — разпространението. Включвай и изключвай слоеве и проследи атаката.</p>
  <div id="v-depth"></div>
  <details class="trap"><summary>Капан: „имаме шест продукта, значи шест слоя“</summary><div>
    <p>Включи „обща причина“. Три продукта, които всички разчитат на един и същ компрометиран акаунт, не са непременно три независими слоя. Общата причина за отказ може да обезсмисли привидното разнообразие. Наблюдението също се нуждае от защитени източници и надеждно време.</p>
  </div></details>
  <details class="hint"><summary>Хинт: актуализации и копия — какво НЕ правят</summary><div>
    <p>Актуализирането отстранява известни дефекти, но не компенсира грешни права. Резервните копия подпомагат възстановяване, но не спират изтичане на вече прочетени данни.</p>
  </div></details>
</div>`;

  const ZONES = [
    { id: "net", t: "Интернет", x: 10, w: 150, cls: "s-swap", d: "Недоверена зона: всеки може да изпраща заявки. Оттук идва външният нападател." },
    { id: "dmz", t: "Уеб портал", x: 200, w: 160, cls: "s-cmp", d: "Изложена услуга — част от повърхността за атака: интерфейси, формуляри, вход." },
    { id: "app", t: "Приложение", x: 400, w: 150, cls: "s-act", d: "Обработва заявките и решава правата. Тук се проверява оторизацията." },
    { id: "db", t: "База с оценки", x: 590, w: 120, cls: "s-done", d: "Активът. Достъпна само от приложението — не директно от интернет." },
  ];
  const BOUNDS = [
    { x: 180, t: "Граница 1: интернет → портал", d: "Тук данните преминават от недоверена в доверена област. Всеки вход се третира като недоверен; филтрира се трафикът." },
    { x: 380, t: "Граница 2: портал → приложение", d: "Сесията и правата се проверяват на сървъра, не в интерфейса." },
    { x: 570, t: "Граница 3: приложение → база", d: "Заявките към базата се изграждат с параметри (виж раздел 5); акаунтът на приложението има минимални права." },
  ];
  const ADV = [
    { k: "Пасивен наблюдател в мрежата", pos: "net", tls: true, d: "TLS защитава съдържанието на канала срещу него (при правилна проверка на сертификата). Метаданните — адреси, моменти, размери — остават видими." },
    { k: "Активен посредник в мрежата", pos: "net", tls: true, d: "Удостовереното TLS свързване затруднява подмяната на отсрещната страна. Без проверка на сертификата защитата пада." },
    { k: "Код в компрометираното приложение", pos: "app", tls: false, d: "TLS не помага: данните се дешифрират в приложението, а нападателят е там. Нужни са други мерки — права, сегментиране, наблюдение." },
  ];

  function mount(root) {
    // граници на доверие
    const tbs = root.querySelector("#tb-svg"), tbd = root.querySelector("#tb-detail");
    function drawTB(sel) {
      tbs.innerHTML = "";
      const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 720 120", width: 720 });
      ZONES.forEach((z) => {
        svg.append(S.svg("g", { class: "node " + z.cls + (sel === z.id ? "" : ""), style: "cursor:pointer", onclick: () => pickTB(z.id) },
          S.svg("rect", { x: z.x, y: 30, width: z.w, height: 60, rx: 6, fill: "var(--cb)", stroke: "var(--c)", "stroke-width": sel === z.id ? 4 : 2 }),
          S.svg("text", { x: z.x + z.w / 2, y: 65, "text-anchor": "middle", text: z.t })));
      });
      BOUNDS.forEach((b, i) => {
        svg.append(S.svg("g", { style: "cursor:pointer", onclick: () => pickTB("b" + i) },
          S.svg("line", { x1: b.x, y1: 10, x2: b.x, y2: 110, stroke: sel === "b" + i ? "var(--st-swap)" : "var(--ink-2)", "stroke-width": sel === "b" + i ? 4 : 2, "stroke-dasharray": "6 4" }),
          S.svg("rect", { x: b.x - 10, y: 5, width: 20, height: 110, fill: "transparent" }),
          S.svg("text", { x: b.x, y: 20, "text-anchor": "middle", class: "wt", text: "⟂" + (i + 1) })));
      });
      tbs.append(h("div", { class: "tbl-wrap" }, svg));
    }
    function pickTB(id) {
      drawTB(id);
      if (id[0] === "b") { const b = BOUNDS[+id.slice(1)]; tbd.innerHTML = `<p><b>${b.t}</b></p><p>${b.d}</p>`; }
      else { const z = ZONES.find((x) => x.id === id); tbd.innerHTML = `<p><b>${z.t}</b></p><p>${z.d}</p>`; }
    }
    pickTB("dmz");

    // пасивни/активни
    const pl = root.querySelector("#pa-list"), ps = root.querySelector("#pa-svg"), pd = root.querySelector("#pa-detail");
    const pb = PA.map((p, i) => h("button", { class: "card", "aria-pressed": "false", style: { padding: "8px 12px" }, onclick: () => pickPA(i), text: p.s }));
    pl.append(...pb);
    function pickPA(i) {
      pb.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const p = PA[i];
      ps.innerHTML = "";
      const svg = S.svg("svg", { class: "g", viewBox: "0 0 320 200", width: 320 });
      svg.append(S.svg("g", { class: "node " + (p.t.includes("P") ? "s-act" : "s-dim") }, S.svg("circle", { cx: 120, cy: 100, r: 80, "fill-opacity": .6 })));
      svg.append(S.svg("g", { class: "node " + (p.t.includes("A") ? "s-swap" : "s-dim") }, S.svg("circle", { cx: 200, cy: 100, r: 80, "fill-opacity": .6 })));
      svg.append(S.svg("text", { x: 85, y: 105, "text-anchor": "middle", text: "пасивни" }), S.svg("text", { x: 238, y: 105, "text-anchor": "middle", text: "активни" }));
      if (p.t === "PA") svg.append(S.svg("text", { x: 160, y: 105, "text-anchor": "middle", text: "●" }));
      ps.append(svg);
      pd.innerHTML = `<p><b>${p.t === "P" ? "Пасивна" : p.t === "A" ? "Активна" : "И двете аспекта"}.</b> ${p.why}</p>`;
    }
    pickPA(0);

    // модел на нападателя
    const ab = root.querySelector("#adv-btn"), asv = root.querySelector("#adv-svg"), ad = root.querySelector("#adv-detail");
    const abs = ADV.map((a, i) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => pickAdv(i), text: a.k }));
    ab.append(...abs);
    function pickAdv(i) {
      abs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const a = ADV[i];
      asv.innerHTML = "";
      const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 640 120", width: 640 });
      const N = [["Клиент", 70], ["Мрежа", 320], ["Приложение", 570]];
      svg.append(S.svg("rect", { x: 120, y: 48, width: 400, height: 24, rx: 12, fill: "var(--st-done-bg)", stroke: "var(--st-done)" }));
      svg.append(S.svg("text", { x: 320, y: 40, "text-anchor": "middle", class: "wt", text: "TLS тунел (шифрован канал)" }));
      N.forEach(([t, x]) => svg.append(S.svg("g", { class: "node" }, S.svg("circle", { cx: x, cy: 60, r: 26 })), S.svg("text", { x, y: 105, "text-anchor": "middle", text: t })));
      const ex = a.pos === "net" ? 320 : 570;
      svg.append(S.svg("g", { class: "node s-swap" }, S.svg("circle", { cx: ex, cy: 60, r: 13 })), S.svg("text", { x: ex, y: 65, "text-anchor": "middle", text: "!" }));
      asv.append(h("div", { class: "tbl-wrap" }, svg));
      ad.innerHTML = `<p><b>${a.k}:</b> TLS ${a.tls ? "<span class='pill s-done'>помага</span>" : "<span class='pill s-swap'>не помага</span>"}</p><p>${a.d}</p>`;
    }
    pickAdv(0);

    // защита в дълбочина
    S.viz(root.querySelector("#v-depth"), {
      id: "depth", title: "Атаката през слоевете на защитата", sub: "Модел: един етап — един слой, който му противодейства.",
      code: false,
      inputs: [
        ...LAYERS.map((l) => ({ id: l.id, label: l.t, type: "checkbox", value: ["ids", "backup"].includes(l.id) })),
        { id: "shared", label: "<b>обща причина</b>: един админ акаунт за всичко", type: "checkbox", value: false },
      ],
      presets: [
        { label: "Без слоеве", values: { edge: false, mfa: false, least: false, seg: false, ids: false, backup: false, shared: false } },
        { label: "Само MFA", values: { edge: false, mfa: true, least: false, seg: false, ids: false, backup: false, shared: false } },
        { label: "Всички", values: { edge: false, mfa: true, least: true, seg: true, ids: true, backup: true, shared: false } },
        { label: "Всички + обща причина", values: { edge: false, mfa: true, least: true, seg: true, ids: true, backup: true, shared: true } },
      ],
      legend: [["s-act", "текущ етап"], ["s-done", "спряно"], ["s-swap", "минава / заобиколено"], ["s-piv", "активен слой"], ["s-cmp", "открито"]],
      build: algos.depth,
      draw(st, f) {
        st.innerHTML = "";
        const W = 720, rowH = 46, H = STAGES.length * rowH + 20;
        const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: `0 0 ${W} ${H}`, width: W });
        STAGES.forEach((s, i) => {
          const y = 10 + i * rowH;
          let cls = i < f.stage ? "s-swap" : i === f.stage ? "s-act" : "s-dim";
          if (f.stopped != null && i === f.stopped) cls = "s-done";
          if (f.stopped != null && i > f.stopped) cls = "s-dim";
          svg.append(S.svg("g", { class: "node " + cls }, S.svg("rect", { x: 10, y, width: 300, height: rowH - 8, rx: 6, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--line))", "stroke-width": 2 })));
          svg.append(S.svg("text", { x: 22, y: y + 24, text: `${i + 1}. ${s.t}` }));
          const L = LAYERS.find((l) => l.stops === s.k);
          if (L) {
            const active = f.act[L.id], byp = f.bypass.includes(L.id);
            const lc = !active ? "s-dim" : byp ? "s-swap" : "s-piv";
            svg.append(S.svg("line", { class: "edge", x1: 310, y1: y + 19, x2: 380, y2: y + 19 }));
            svg.append(S.svg("g", { class: "node " + lc }, S.svg("rect", { x: 380, y, width: 330, height: rowH - 8, rx: 6, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--line))", "stroke-width": 2, "stroke-dasharray": active ? "" : "5 4" })));
            svg.append(S.svg("text", { x: 392, y: y + 24, text: `${L.t}${byp ? " ✗" : ""}` }));
          }
        });
        st.append(h("div", { class: "tbl-wrap" }, svg));
        const ids = LAYERS.find((l) => l.id === "ids"), bk = LAYERS.find((l) => l.id === "backup");
        st.append(h("div", { class: "row", style: { marginTop: "6px" } },
          h("span", { class: "pill " + (!f.act.ids ? "s-dim" : f.detected ? "s-cmp" : "s-piv"), text: ids.t + (f.detected ? ": сигнал" : "") }),
          h("span", { class: "pill " + (!f.act.backup ? "s-dim" : f.bypass.includes("backup") ? "s-swap" : "s-piv"), text: bk.t })));
      },
    });
  }

  S.chapter({ id: "model", order: 2, num: "2", group: "Основа", title: "Модел на заплахите и защита в дълбочина", lead: "Какво се защитава, от кого и през кои граници; пасивни и активни атаки; независими слоеве на защитата.", html, mount, algos });
})();
