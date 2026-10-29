/* Раздел 1 — Определение и класификация: протокол/услуга/интерфейс, обхват, топологии, роли, канали. */
(function () {
  const S = window.Study, h = S.h;

  const TYPES = ["star", "bus", "ring", "tree", "mesh"];
  const TNAME = { star: "звезда", bus: "шина", ring: "пръстен", tree: "дърво", mesh: "мрежеста" };

  /* Ребрата — същите като build() в c/01_topology.c */
  function edges(type, n) {
    const E = [], add = (u, v) => { if (!E.some(([a, b]) => (a === u && b === v) || (a === v && b === u))) E.push([u, v]); };
    for (let i = 1; i < n; i++) {
      if (type === "star") add(0, i);
      if (type === "bus") add(i - 1, i);
      if (type === "tree") add((i - 1) >> 1, i);
    }
    if (type === "ring" || type === "mesh") for (let i = 0; i < n; i++) add(i, (i + 1) % n);
    if (type === "mesh") for (let i = 0; i < (n >> 1); i++) add(i, i + (n >> 1));
    return E;
  }

  const algos = {
    /* BFS на свързаните компоненти — като components() в C */
    topo({ type, n, cut, down }) {
      if (!TYPES.includes(type)) throw new Error("Непозната топология.");
      n = S.int(n, 3, 10, "Броят възли");
      const E = edges(type, n);
      let cu = -1, cv = -1, dn = -1;
      const cs = String(cut || "").trim();
      if (cs) {
        const m = cs.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!m) throw new Error("Прекъснатата връзка се задава като „u-v“, напр. 2-3.");
        cu = +m[1]; cv = +m[2];
        if (!E.some(([a, b]) => (a === cu && b === cv) || (a === cv && b === cu))) throw new Error(`Няма връзка ${cu}-${cv} в тази топология.`);
      }
      const ds = String(down ?? "").trim();
      if (ds !== "" && ds !== "-1") dn = S.int(ds, 0, n - 1, "Повреденият възел");
      const adj = Array.from({ length: n }, () => Array(n).fill(0));
      for (const [a, b] of E) adj[a][b] = adj[b][a] = 1;
      if (cu >= 0) adj[cu][cv] = adj[cv][cu] = 0;
      const comp = Array(n).fill(-1), F = [];
      let ncomp = 0;
      const snap = (o) => F.push(Object.assign({ E, n, type, cut: cu >= 0 ? [cu, cv] : null, dn, comp: comp.slice() }, o));
      snap({ msg: `Топология <b>${TNAME[type]}</b>, ${n} възела, ${E.length} връзки.${cu >= 0 ? ` Връзката ${cu}–${cv} е прекъсната.` : ""}${dn >= 0 ? ` Възел ${dn} е повреден.` : ""} BFS ще намери кои участници още са свързани.`, vars: { n, ncomp } });
      for (let s = 0; s < n; s++) {
        if (comp[s] !== -1 || dn === s) continue;
        const q = [s]; let head = 0;
        comp[s] = ncomp;
        snap({ at: "newcomp", cur: s, q: q.slice(head), vars: { s, ncomp }, msg: `Възел ${s} още не е обходен — започва компонента <b>${ncomp}</b>.`, log: `компонента ${ncomp} от възел ${s}` });
        while (head < q.length) {
          const u = q[head++];
          snap({ at: "pop", cur: u, q: q.slice(head), vars: { u, ncomp }, msg: `Вадим възел ${u} от опашката и гледаме съседите му.` });
          for (let v = 0; v < n; v++) {
            if (!adj[u][v]) continue;
            if (dn === v || comp[v] !== -1) {
              snap({ at: ["edge", "skip"], cur: u, nb: v, q: q.slice(head), vars: { u, v, ncomp }, msg: dn === v ? `Съсед ${v} е повреден — през него не минава нищо.` : `Съсед ${v} вече е в компонента ${comp[v]}.` });
              continue;
            }
            comp[v] = ncomp; q.push(v);
            snap({ at: "visit", cur: u, nb: v, q: q.slice(head), vars: { u, v, ncomp }, msg: `Връзка ${u}–${v} е изправна → ${v} влиза в компонента ${ncomp}.`, log: `${u} → ${v}` });
          }
        }
        ncomp++;
        snap({ at: "done", q: [], vars: { ncomp }, msg: `Опашката е празна: компонента ${ncomp - 1} е затворена.` });
      }
      const alive = n - (dn >= 0 ? 1 : 0);
      snap({ final: true, vars: { ncomp }, stats: { компоненти: ncomp }, msg: ncomp === 1 ? `Всички ${alive} работещи възела са в <b>една</b> компонента — мрежата преживява повредата${cu < 0 && dn < 0 ? " (няма повреда)" : ""}.` : `Мрежата се разпада на <b>${ncomp}</b> компоненти: участници от различни компоненти не могат да обменят данни.` });
      return { frames: F, result: ncomp, comp };
    },
  };

  /* координати на възлите */
  function pos(type, n, W, H) {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 34;
    if (type === "star") return Array.from({ length: n }, (_, i) => i === 0 ? [cx, cy] : [cx + R * Math.cos((2 * Math.PI * (i - 1)) / (n - 1) - Math.PI / 2), cy + R * Math.sin((2 * Math.PI * (i - 1)) / (n - 1) - Math.PI / 2)]);
    if (type === "bus") return Array.from({ length: n }, (_, i) => [40 + (i * (W - 80)) / (n - 1), i % 2 ? cy + 60 : cy - 60]);
    if (type === "tree") return Array.from({ length: n }, (_, i) => { const d = Math.floor(Math.log2(i + 1)), k = i + 1 - (1 << d), cnt = 1 << d; return [((k + 0.5) * W) / cnt, 34 + d * 70]; });
    return Array.from({ length: n }, (_, i) => [cx + R * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), cy + R * Math.sin((2 * Math.PI * i) / n - Math.PI / 2)]);
  }

  const ROLES = [
    { k: "Протокол", g: "протокол", q: "Как говорят двете страни?", ex: "TCP: SYN, номера на последователност, потвърждения — договорът между TCP на клиента и TCP на сървъра.", n: "Хоризонтален договор между логически равнопоставени участници." },
    { k: "Услуга", g: "услуга", q: "Какво получава горният слой?", ex: "Надежден подреден поток от байтове — това получава приложението, без да знае за SYN и повторенията.", n: "Вертикално: поведението, предоставено нагоре." },
    { k: "Интерфейс", g: "интерфейс", q: "През каква граница се ползва?", ex: "Socket API: <code>socket()</code>, <code>connect()</code>, <code>send()</code>, <code>recv()</code>.", n: "„Мрежов интерфейс“ на устройство е друга употреба на думата." },
  ];
  const SCOPE = [
    { k: "PAN", g: "pan", ex: "Около човек или устройство: телефон към слушалки, мишка към компютър (Bluetooth).", n: "PAN описва обхвата; Bluetooth е начинът на комуникация." },
    { k: "LAN", g: "lan", ex: "Дом, офис, сграда — Ethernet и Wi-Fi под една организация.", n: "WLAN е безжична LAN, не по-голямо ниво. Една LAN може да има медни и оптични участъци." },
    { k: "MAN", g: "man", ex: "Градска мрежа, свързваща обекти в рамките на град.", n: "Границите не са строги километрови прагове." },
    { k: "WAN", g: "wan", ex: "Свързване на отдалечени области или мрежи — напр. офиси в различни градове.", n: "Важни са организацията и предназначението, не само метрите." },
    { k: "Интернет", g: "www", ex: "Глобална система от автономно управлявани, взаимосвързани мрежи с общи протоколи.", n: "Не е „една LAN с голяма площ“. Web е услуга върху Интернет, не синоним." },
  ];

  const html = `
<div class="prose">
  <p>Компютърната мрежа свързва устройства, които обменят данни чрез комуникационни канали и <dfn data-g="протокол">протоколи</dfn>. Протоколът определя формат, значение и правила на обмена. <dfn data-g="интерфейс">Интерфейсът</dfn> определя граница за взаимодействие, а <dfn data-g="услуга">услугата</dfn> — предоставяната възможност. Един протокол може да реализира услуга чрез по-ниско разположени услуги.</p>
</div>

<div class="block">
  <h3>Мрежата е система от договори: протокол, услуга, интерфейс</h3>
  <p class="muted">Щракни върху всяко понятие. Трите се отнасят към една и съща комуникация, но отговарят на различни въпроси (Схема 6 в ръководството).</p>
  <div class="cards" id="roles"></div>
  <div class="key" id="role-detail"></div>
  <details class="trap"><summary>Капан: „TCP е услуга“ или „сокетът е протокол“</summary><div>
    <p>TCP е <b>протокол</b>; надеждният подреден поток е <b>услуга</b>; socket API е <b>интерфейс</b>. Сокетът не е кабел и не е самостоятелен протокол.</p>
  </div></details>
</div>

<div class="block">
  <h3>Класификация по обхват (Схема 1)</h3>
  <p class="prose">По обхват се разглеждат <dfn data-g="pan">PAN</dfn>, <dfn data-g="lan">LAN</dfn>, <dfn data-g="man">MAN</dfn> и <dfn data-g="wan">WAN</dfn>. Границите не са строго определени само с метри; важни са организацията и предназначението. <dfn data-g="wlan">WLAN</dfn> е безжична локална мрежа. Интернет е глобална система от взаимосвързани мрежи, а не една локална мрежа с голяма площ.</p>
  <div class="cards" id="scope"></div>
  <div class="key" id="scope-detail"></div>
  <details class="trap"><summary>Капан: класификация в километри и „WLAN е следващото ниво“</summary><div>
    <p>PAN, LAN, MAN и WAN класифицират обхват и организация — не са точни интервали в метри, валидни за всяка технология. „Безжична“ е друга характеристика (среда), не размер: WLAN е безжична <b>LAN</b>.</p>
  </div></details>
</div>

<div class="block">
  <h3>Топологии и какво става при прекъсване (Схема 2)</h3>
  <p class="prose"><dfn data-g="топология">Топологията</dfn> може да е звезда, шина, пръстен, дърво или мрежа с множество връзки. Звездата свързва участниците през център; шината използва обща среда; пръстенът свързва съседите в цикъл; мрежестата структура има повече алтернативни връзки. Физическата топология описва връзките, а логическата — начина на комуникация.</p>
  <p class="muted">Щракни върху връзка, за да я прекъснеш, или върху възел, за да го „повредиш“. Обхождането в ширина намира кои участници още са свързани — оцветяването показва компонентите.</p>
  <div id="v-topo"></div>
  <div class="key"><b>Извод.</b> Звезда: повреда в центъра разпада всичко, повреда на лъч изолира само един възел. Пръстен: едно прекъсване се понася, две — разделят. Мрежестата топология има алтернативни пътища — цената е повече връзки.</div>
  <details class="hint"><summary>Хинт: защо моделът е граф, а не електрическа схема</summary><div>
    <p>Тук питаме само „има ли път между двата участника“. Реалното поведение на шина при прекъснат кабел зависи и от физическия слой (например нужда от правилно терминиране на линията) — това моделът не показва. Затова изводът е за свързаността, не за качеството на сигнала.</p>
  </div></details>
  <details class="trap"><summary>Капан: физическа = логическа топология</summary><div>
    <p>Физическата и логическата топология може да се различават: кабелите може да образуват звезда около комутатор, а обменът да се описва като обща среда или като отделни двойки участници. Назови <b>коя</b> от двете описваш.</p>
  </div></details>
</div>

<div class="block">
  <h3>Роли: клиент–сървър и равноправни участници (Схема 3)</h3>
  <p class="prose">По роли се различават <dfn data-g="клиент–сървър">клиент–сървър</dfn> и <dfn data-g="peer-to-peer">равноправен модел</dfn>. Една система може да използва едновременно различни модели за различни услуги. Продукт, наричан „сървър“, може да е машина, процес или роля; значението се уточнява според въпроса.</p>
  <p class="muted">Избери услуга — виж каква роля има всяка машина за нея.</p>
  <div class="row" id="svc-pick"></div>
  <div id="svc-svg"></div>
  <details class="trap"><summary>Капан: „сървърът е мощен компютър“</summary><div>
    <p>Това са роли на взаимодействие, не видове хардуер. Един компютър може едновременно да е клиент на DNS и сървър за уеб ресурс. Равноправният модел също може да има помощни централни услуги.</p>
  </div></details>
</div>

<div class="block">
  <h3>Канали и качество</h3>
  <div class="prose">
    <p>Каналите са медни, оптични или безжични. Пропускателният капацитет и действително получената скорост не са тъждествени. Латентността включва разпространение, предаване, обработка и изчакване. Надеждност, загуби, вариация на закъснението и размер на полезния товар влияят върху качеството. Числено — в <a href="#ocenki">раздел 9</a>.</p>
  </div>
  <div class="key"><b>Схема.</b> Определение → класификация по <b>обхват</b> (PAN/LAN/MAN/WAN), по <b>топология</b> (физическа/логическа), по <b>роли</b> (клиент–сървър / равноправен), по <b>среда</b> (мед, оптика, радио).</div>
</div>`;

  function mount(root) {
    // роли
    const pickCards = (boxSel, detSel, arr, render) => {
      const box = root.querySelector(boxSel), det = root.querySelector(detSel);
      const btns = arr.map((x, i) => h("button", { class: "card", "aria-pressed": i ? "false" : "true", onclick: () => pick(i) },
        h("h4", null, h("dfn", { "data-g": x.g, text: x.k })), x.q ? h("p", { text: x.q }) : null));
      box.append(...btns);
      function pick(i) { btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false")); det.innerHTML = render(arr[i]); }
      pick(0);
    };
    pickCards("#roles", "#role-detail", ROLES, (r) => `<p><b>${r.k}</b> — ${r.q}</p><p>Пример: ${r.ex}</p><p class="muted">${r.n}</p>`);
    pickCards("#scope", "#scope-detail", SCOPE, (r) => `<p><b>${r.k}</b>: ${r.ex}</p><p class="muted">${r.n}</p>`);

    // топология
    let api;
    api = S.viz(root.querySelector("#v-topo"), {
      id: "topo", title: "Свързаност при повреда", sub: "Цветът на възела = номер на компонентата. Прекъснатата връзка е пунктир.",
      code: "ch01_bfs",
      inputs: [
        { id: "type", label: "Топология", type: "select", value: "star", options: TYPES.map((t) => [t, TNAME[t]]) },
        { id: "n", label: "Възли", type: "number", value: 6, width: "5em" },
        { id: "cut", label: "Прекъсната връзка u-v", value: "0-2", width: "7em" },
        { id: "down", label: "Повреден възел", value: "", width: "5em" },
      ],
      presets: [
        { label: "Звезда: пада центърът", values: { type: "star", n: 6, cut: "", down: "0" } },
        { label: "Шина: срязан кабел", values: { type: "bus", n: 6, cut: "2-3", down: "" } },
        { label: "Пръстен: 1 прекъсване", values: { type: "ring", n: 6, cut: "2-3", down: "" } },
        { label: "Дърво: клон", values: { type: "tree", n: 7, cut: "0-1", down: "" } },
        { label: "Мрежеста", values: { type: "mesh", n: 8, cut: "", down: "3" } },
      ],
      legend: [["s-act", "обработва се"], ["s-cmp", "проверява се съсед"], ["s-swap", "повреда"], ["s-done", "компонента 0"], ["s-piv", "компонента 1"]],
      build: algos.topo,
      draw(st, f, { inputs }) {
        st.innerHTML = "";
        const W = 560, H = f.type === "tree" ? 260 : 300;
        const P = pos(f.type, f.n, W, H);
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        if (f.type === "bus") svg.append(S.svg("line", { x1: 20, y1: H / 2, x2: W - 20, y2: H / 2, stroke: "var(--line)", "stroke-width": 1, "stroke-dasharray": "2 4" }));
        const CC = ["s-done", "s-piv", "s-cmp", "s-act", "s-swap"];
        f.E.forEach(([a, b]) => {
          const isCut = f.cut && ((f.cut[0] === a && f.cut[1] === b) || (f.cut[0] === b && f.cut[1] === a));
          const hot = f.cur != null && f.nb != null && ((f.cur === a && f.nb === b) || (f.cur === b && f.nb === a));
          const ln = S.svg("line", { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], class: "edge " + (isCut ? "s-swap" : hot ? "s-cmp" : ""), "stroke-dasharray": isCut ? "6 6" : null, style: "cursor:pointer" });
          ln.append(S.svg("title", { text: isCut ? "Възстанови връзката" : `Прекъсни ${a}-${b}` }));
          ln.addEventListener("click", () => { api.setValues({ cut: isCut ? "" : `${a}-${b}` }); api.apply(); });
          // по-широка невидима зона за щракване
          const hit = S.svg("line", { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: "transparent", "stroke-width": 14, style: "cursor:pointer" });
          hit.addEventListener("click", () => { api.setValues({ cut: isCut ? "" : `${a}-${b}` }); api.apply(); });
          svg.append(ln, hit);
        });
        for (let v = 0; v < f.n; v++) {
          let cls = f.comp[v] >= 0 ? CC[f.comp[v] % CC.length] : "";
          if (f.dn === v) cls = "s-swap";
          if (f.cur === v) cls = "s-act";
          const g = S.svg("g", { class: "node " + cls, style: "cursor:pointer" }, S.svg("circle", { cx: P[v][0], cy: P[v][1], r: 17 }),
            S.svg("text", { x: P[v][0], y: P[v][1] + 5, "text-anchor": "middle", text: f.dn === v ? "✕" : v }));
          g.append(S.svg("title", { text: f.dn === v ? "Поправи възела" : `Повреди възел ${v}` }));
          g.addEventListener("click", () => { api.setValues({ down: f.dn === v ? "" : String(v) }); api.apply(); });
          svg.append(g);
        }
        st.append(svg);
        if (f.q) st.append(h("p", { class: "mono muted", style: { fontSize: ".82rem" }, text: "опашка: [" + f.q.join(", ") + "]" }));
        void inputs;
      },
    });
    root.querySelector('#viz-topo select').addEventListener("change", () => { api.setValues({ cut: "", down: "" }); api.apply(); });

    // роли по услуги
    const M = [["A", 90, 40], ["B", 470, 40], ["C", 280, 120]];
    const SVC = {
      "DNS": { roles: { A: "клиент", B: "клиент", C: "сървър" }, links: [["A", "C"], ["B", "C"]], note: "A и B питат C за имена — клиент–сървър." },
      "Уеб": { roles: { A: "клиент", B: "сървър", C: "клиент" }, links: [["A", "B"], ["C", "B"]], note: "Машина B е уеб сървър, но за DNS беше клиент. Ролята зависи от услугата." },
      "Обмен на файлове P2P": { roles: { A: "равноправен", B: "равноправен", C: "равноправен" }, links: [["A", "B"], ["B", "C"], ["A", "C"]], note: "Всеки участник и иска, и предоставя части. Може да има помощен централен списък на участниците." },
    };
    const pk = root.querySelector("#svc-pick"), sv = root.querySelector("#svc-svg");
    const bs = Object.keys(SVC).map((k, i) => h("button", { class: "btn", "aria-pressed": i ? "false" : "true", text: k, onclick: () => show(k) }));
    pk.append(...bs);
    function show(k) {
      bs.forEach((b) => b.setAttribute("aria-pressed", b.textContent === k ? "true" : "false"));
      const s = SVC[k], svg = S.svg("svg", { class: "g", viewBox: "0 0 560 190", width: 560 });
      const P = Object.fromEntries(M.map(([n, x, y]) => [n, [x, y]]));
      s.links.forEach(([a, b]) => svg.append(S.svg("line", { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], class: "edge s-act" })));
      M.forEach(([n, x, y]) => {
        const r = s.roles[n];
        svg.append(S.svg("g", { class: "node " + (r === "сървър" ? "s-piv" : r === "клиент" ? "s-act" : "s-done") }, S.svg("circle", { cx: x, cy: y, r: 24 }), S.svg("text", { x, y: y + 5, "text-anchor": "middle", text: n })),
          S.svg("text", { x, y: y + 52, "text-anchor": "middle", text: r }));
      });
      sv.innerHTML = ""; sv.append(svg, h("p", { class: "muted", text: s.note }));
    }
    show("DNS");
  }

  S.chapter({ id: "klasifikacia", order: 1, num: "1", group: "Основа", title: "Определение и класификация", lead: "Протокол, услуга и интерфейс; класификация по обхват, топология, роли и среда.", html, mount, algos });
})();
