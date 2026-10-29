/* Раздел 8 — допълнение и важни разграничения: цел–механизъм–условия–защита, zero trust, уязвимост/exploit/инцидент. */
(function () {
  const S = window.Study, h = S.h;

  const NOTS = [
    ["Шифроването", "оторизацията", "Шифрованият канал не решава кой какво може да прави."],
    ["Резервното копие", "предотвратяването на изтичане", "Копието връща данни; не връща тайната обратно."],
    ["Обучението", "работещите процедури", "Без процедура за независима проверка обучението не отстранява всички възможности за измама."],
    ["HTTPS", "добросъвестността на сайта", "Каналът е защитен към установения домейн; намерението на сайта е отделен въпрос."],
    ["Поправката (patch)", "премахване на вече установен нападател", "Слабостта е затворена, но чуждото присъствие може да остане."],
    ["Многото продукти", "независимите слоеве", "Обща причина (един акаунт) може да обезсмисли разнообразието."],
  ];

  const ATT = [
    { k: "Подслушване", goal: "C", mech: "наблюдение на трафика", cond: "достъп до пътя; липса на шифроване (за съдържанието)", def: "TLS; метаданните остават", sec: "posrednik" },
    { k: "ARP подмяна → посредник", goal: "C, I", mech: "подправени ARP отговори пренасочват трафика", cond: "същият локален сегмент; кеш без проверка", def: "DAI, статични записи, TLS с проверка", sec: "posrednik" },
    { k: "DoS / DDoS", goal: "A", mech: "изчерпване на ресурс или дефект", cond: "кой ресурс е ограничен и къде", def: "мярка на мястото на ограничението или преди него", sec: "dos" },
    { k: "SQL инжекция", goal: "C, I, A", mech: "входът става синтаксис", cond: "конкатенация на недоверен вход", def: "параметризирани заявки; контрол на динамичната структура", sec: "prilozhenia" },
    { k: "XSS", goal: "C, I", mech: "недоверено съдържание се изпълнява като код", cond: "изход без контекстно кодиране", def: "контекстно кодиране, безопасни DOM операции", sec: "prilozhenia" },
    { k: "CSRF", goal: "I", mech: "нежелана заявка с наличната сесия", cond: "автоматично изпращани удостоверителни данни", def: "CSRF токени, правила за cookies", sec: "prilozhenia" },
    { k: "Фишинг", goal: "C (после всичко)", mech: "подвеждане към фалшиво място", cond: "доверие, спешност; липса на процедура", def: "проверка на домейна, MFA, процедура, сигнализиране", sec: "socialno" },
  ];

  const html = `
<div class="prose">
  <p>Сигурността е свойство на <b>цялата система</b>, включително хора и процедури. При анализ всяка атака се описва чрез <b>цел, механизъм, условия и съответстваща защита</b>.</p>
</div>

<div class="block">
  <h3>„X не заменя Y“</h3>
  <p class="muted">Щракни карта.</p>
  <div class="cards" id="nots"></div>
</div>

<div class="block">
  <h3>Цел → механизъм → условия → защита</h3>
  <p class="muted">Избери атака — редът се попълва по четирите колони.</p>
  <div class="row" id="att-btn"></div>
  <div class="tbl-wrap"><table class="t" id="att-tbl"></table></div>
</div>

<div class="block">
  <h3>Уязвимост, exploit, инцидент</h3>
  <p class="prose"><dfn data-g="уязвимост">Уязвимост</dfn>, <dfn data-g="exploit">exploit</dfn> и <dfn data-g="инцидент">инцидент</dfn> са свързани, но различни. Exploit е начин за използване на конкретна слабост; инцидентът е действително събитие с определен ефект или нарушение според организацията.</p>
  <div id="vei-svg"></div>
  <details class="trap"><summary>Капан: поправката и откритият дефект</summary><div>
    <p><dfn data-g="patch">Patch</dfn> може да премахне слабостта, без да премахне вече установено чуждо присъствие. Обратно, открит дефект не доказва, че конкретна система е била използвана.</p>
  </div></details>
</div>

<div class="block">
  <h3>Zero trust <span class="extra-tag">разширение</span></h3>
  <p class="prose"><dfn data-g="zero trust">Zero trust</dfn> е архитектурна идея: не се предоставя неявно доверие само заради мрежово местоположение. За всяко действие са нужни идентичност, контекст и политика. Не означава „всички са доказани нападатели“, нито един продукт, който прави всичко; крайните устройства и удостоверяващите компоненти остават част от модела за доверие. Keycloak е пример за реализация за управление на идентичност и достъп.</p>
  <div class="row" id="zt-btn"></div>
  <div id="zt-svg"></div>
  <div class="key" id="zt-detail"></div>
</div>`;

  function mount(root) {
    const nc = root.querySelector("#nots");
    NOTS.forEach(([a, b, why]) => {
      const p = h("p", { hidden: true, text: why });
      nc.append(h("button", { class: "card", onclick: () => { p.hidden = !p.hidden; } }, h("h4", { text: `${a} не заменя ${b}` }), p));
    });

    const ab = root.querySelector("#att-btn"), at = root.querySelector("#att-tbl");
    const abs = ATT.map((a, i) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => pa(i), text: a.k }));
    ab.append(...abs);
    function pa(i) {
      abs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const a = ATT[i];
      at.innerHTML = "";
      at.append(h("tr", null, ...["Цел (свойство)", "Механизъм", "Условия", "Защита", "Раздел"].map((x) => h("th", { text: x }))));
      at.append(h("tr", null, h("td", { text: a.goal }), h("td", { text: a.mech }), h("td", { text: a.cond }), h("td", { text: a.def }), h("td", null, h("a", { href: "#" + a.sec, text: "#" + a.sec }))));
    }
    pa(0);

    const vs = root.querySelector("#vei-svg");
    const g = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 660 100", width: 660 });
    [["уязвимост", "слабост", 10, "s-cmp"], ["exploit", "начин за използване", 240, "s-swap"], ["инцидент", "действително събитие", 470, "s-swap"]].forEach(([t, s, x, c], k) => {
      g.append(S.svg("g", { class: "node " + c }, S.svg("rect", { x, y: 20, width: 180, height: 50, rx: 6, fill: "var(--cb)", stroke: "var(--c)", "stroke-width": 2 })));
      g.append(S.svg("text", { x: x + 90, y: 42, "text-anchor": "middle", text: t }), S.svg("text", { x: x + 90, y: 60, "text-anchor": "middle", class: "wt", text: s }));
      if (k) g.append(S.svg("line", { class: "edge", x1: x - 50, y1: 45, x2: x, y2: 45, "stroke-dasharray": "5 4" }));
    });
    g.append(S.svg("text", { x: 330, y: 92, "text-anchor": "middle", class: "wt", text: "пунктир: възможно, не задължително" }));
    vs.append(h("div", { class: "tbl-wrap" }, g));

    const zb = root.querySelector("#zt-btn"), zs = root.querySelector("#zt-svg"), zd = root.querySelector("#zt-detail");
    const Z = [
      ["Доверие по местоположение", "Заявката от вътрешната мрежа се приема без проверка. Компрометирано устройство отвътре получава всичко."],
      ["Zero trust", "Всяка заявка се проверява: идентичност, контекст (устройство, време) и политика — независимо откъде идва."],
    ];
    const zbs = Z.map((z, i) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => pz(i), text: z[0] }));
    zb.append(...zbs);
    function pz(i) {
      zbs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      zs.innerHTML = "";
      const s = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 640 140", width: 640 });
      s.append(S.svg("rect", { x: 10, y: 10, width: 330, height: 120, rx: 8, fill: "none", stroke: "var(--line)", "stroke-dasharray": "6 4" }), S.svg("text", { x: 20, y: 30, class: "wt", text: "вътрешна мрежа" }));
      [["служител", 80, 75, "s-done"], ["заразено у-во", 250, 75, "s-swap"]].forEach(([t, x, y, c]) => s.append(S.svg("g", { class: "node " + c }, S.svg("circle", { cx: x, cy: y, r: 18 })), S.svg("text", { x, y: y + 36, "text-anchor": "middle", class: "wt", text: t })));
      s.append(S.svg("g", { class: "node s-act" }, S.svg("rect", { x: 520, y: 50, width: 110, height: 50, rx: 6, fill: "var(--cb)", stroke: "var(--c)", "stroke-width": 2 })), S.svg("text", { x: 575, y: 80, "text-anchor": "middle", text: "ресурс" }));
      if (i === 1) s.append(S.svg("g", { class: "node s-piv" }, S.svg("rect", { x: 400, y: 50, width: 80, height: 50, rx: 6, fill: "var(--cb)", stroke: "var(--c)", "stroke-width": 2 })), S.svg("text", { x: 440, y: 80, "text-anchor": "middle", text: "политика" }));
      const end = i === 1 ? 400 : 520;
      s.append(S.svg("line", { class: "edge s-done", x1: 98, y1: 70, x2: end, y2: 70 }));
      s.append(S.svg("line", { class: "edge " + (i === 1 ? "s-swap" : "s-swap"), x1: 268, y1: 80, x2: end, y2: 85 }));
      if (i === 1) { s.append(S.svg("line", { class: "edge s-done", x1: 480, y1: 70, x2: 520, y2: 70 })); s.append(S.svg("text", { x: 440, y: 120, "text-anchor": "middle", text: "✗ отказ за заразеното" })); }
      zs.append(h("div", { class: "tbl-wrap" }, s));
      zd.innerHTML = `<p>${Z[i][1]}</p>`;
    }
    pz(0);
  }

  S.chapter({ id: "dopalnenie", order: 8, num: "8", group: "Защита", title: "Допълнение и важни разграничения", lead: "„X не заменя Y“, схемата цел–механизъм–условия–защита, уязвимост срещу exploit срещу инцидент и идеята zero trust.", html, mount, algos: {} });
})();
