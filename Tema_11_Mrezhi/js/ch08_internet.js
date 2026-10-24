/* Раздел 8 — Интернет и пример за отваряне на страница: структура, разбор на URL,
   зависимости при HTTPS (с кеш, повторно използвана връзка, HTTP/3), диагностика по равнища. */
(function () {
  const S = window.Study, h = S.h;

  const algos = {
    /* Като parse_url() в C */
    url({ u }) {
      u = String(u).trim();
      if (u.length > 200) throw new Error("Най-много 200 символа.");
      const F = [], r = { scheme: "", host: "", port: 0, path: "", query: "", frag: "" };
      const fail = (m) => { F.push({ r: { ...r }, u, err: true, msg: m }); return { frames: F, result: "ERR" }; };
      const k = u.indexOf("://");
      F.push({ u, r: { ...r }, msg: `URL: <code>${S.esc(u)}</code>. Разделяме го на части — всяка отива към различно равнище.` });
      if (k < 0) return fail("Няма „://“ — учебният разбор очаква абсолютен URL.");
      r.scheme = u.slice(0, k);
      F.push({ at: "scheme", u, r: { ...r }, part: "scheme", msg: `Схема <b>${S.esc(r.scheme)}</b>: казва на клиента кой приложен протокол и дали има TLS.`, vars: { scheme: r.scheme } });
      if (r.scheme !== "http" && r.scheme !== "https") return fail(`Схемата „${S.esc(r.scheme)}“ не се поддържа в учебния пример (само http/https).`);
      let p = k + 3;
      const rest = u.slice(p), hl = rest.search(/[:/?#]/) < 0 ? rest.length : rest.search(/[:/?#]/);
      if (hl === 0) return fail("Липсва име на хост.");
      r.host = rest.slice(0, hl); p += hl;
      F.push({ at: "host", u, r: { ...r }, part: "host", msg: `Хост <b>${S.esc(r.host)}</b>: само това се подава на <dfn data-g="dns">DNS</dfn> — не целият URL.`, vars: { host: r.host } });
      r.port = r.scheme === "https" ? 443 : 80;
      F.push({ at: "defport", u, r: { ...r }, part: "port", msg: `Порт по подразбиране за ${r.scheme}: <b>${r.port}</b> — отива към транспорта (TCP или QUIC).`, vars: { port: r.port } });
      if (u[p] === ":") {
        const m = u.slice(p + 1).match(/^\d{0,6}/)[0];
        const v = m ? +m : 0;
        if (!m || v < 1 || v > 65535 || /^\d/.test(u.slice(p + 1 + m.length))) return fail("Невалиден порт (1…65535).");
        r.port = v; p += 1 + m.length;
        F.push({ at: "port", u, r: { ...r }, part: "port", msg: `Изрично зададен порт <b>${v}</b>.`, vars: { port: v } });
      }
      const pr = u.slice(p), pl = pr.search(/[?#]/) < 0 ? pr.length : pr.search(/[?#]/);
      r.path = pl ? pr.slice(0, pl) : "/"; p += pl;
      F.push({ at: "path", u, r: { ...r }, part: "path", msg: `Път <b>${S.esc(r.path)}</b>: отива в HTTP заявката (стартовия ред).`, vars: { path: r.path } });
      if (u[p] === "?") { const q = u.slice(p + 1), ql = q.indexOf("#") < 0 ? q.length : q.indexOf("#"); r.query = q.slice(0, ql); p += 1 + ql; F.push({ at: "query", u, r: { ...r }, part: "query", msg: `Query <b>${S.esc(r.query)}</b>: също част от HTTP заявката.`, vars: { query: r.query } }); }
      if (u[p] === "#") { r.frag = u.slice(p + 1); F.push({ at: "frag", u, r: { ...r }, part: "frag", msg: `Фрагмент <b>${S.esc(r.frag)}</b>: остава в браузъра — <b>не се изпраща</b> към сървъра.`, vars: { frag: r.frag } }); }
      F.push({ at: "ret", u, r: { ...r }, done: true, msg: "Разборът е готов. Таблицата вдясно показва кой слой получава коя част." });
      return { frames: F, result: [r.scheme, r.host, r.port, r.path, r.query, r.frag].join("|") };
    },

    /* Последователност при отваряне на HTTPS страница (Схема 27) — без C (протоколен обмен) */
    open({ ver, dnsCache, reuse, sameNet, rtt }) {
      rtt = S.int(rtt, 1, 1000, "RTT");
      const h3 = ver === "h3", F = [];
      let t = 0, rtts = 0;
      const step = (lay, title, cost, msg, skip) => { if (!skip) { t += cost * rtt; rtts += cost; } F.push({ lay, title, cost: skip ? 0 : cost, skip: !!skip, t, rtts, msg: (skip ? "<b>Пропуска се:</b> " : "") + msg, stats: { "RTT общо": rtts, "време (ms)": t } }); };
      F.push({ lay: "app", title: "Въведен адрес", cost: 0, t, rtts, msg: "Браузърът разбира URL: схема https, хост, път. Нищо още не е изпратено.", stats: { "RTT общо": 0, "време (ms)": 0 } });
      step("dns", "DNS: име → адрес", 1, dnsCache ? "Адресът е в кеша (на ОС или браузъра) — няма DNS обмен." : "Заявка към рекурсивния resolver (UDP или TCP). При празен кеш на resolver-а той прави още заявки — тук ги броим като 1 RTT от гледна точка на клиента [опростено].", dnsCache);
      step("net", "Маршрут и следващ хоп", 0, sameNet ? "Сървърът е в локалната подмрежа: следващият хоп е самият сървър." : "Сървърът е извън префикса: следващ хоп е шлюзът (най-дълъг префикс → default маршрут).");
      step("link", "ARP за следващия хоп", 0, "При нужда — ARP за MAC адреса на следващия хоп (обикновено вече е в ARP кеша; локален обмен, пренебрежимо спрямо RTT до сървъра).");
      if (h3) {
        step("tr", "QUIC: транспорт + криптографски обмен", 1, reuse ? "Съществуваща QUIC връзка се използва повторно." : "QUIC върху UDP съчетава установяването на транспорта с TLS 1.3 обмена — обичайно 1 RTT преди първата заявка.", reuse);
      } else {
        step("tr", "TCP ръкостискане", 1, reuse ? "Съществуваща TCP връзка се използва повторно (keep-alive)." : "SYN → SYN+ACK → ACK: 1 RTT преди да може да тръгнат данни.", reuse);
        step("tls", "TLS ръкостискане", 1, reuse ? "TLS сесията е вече установена върху използваната връзка." : "TLS договаря защита и удостоверява сървъра според сертификата (TLS 1.3: обичайно 1 RTT).", reuse);
      }
      step("app", `HTTP заявка и отговор (${h3 ? "HTTP/3" : "HTTP/1.1 или HTTP/2"})`, 1, "GET на документа; отговорът носи HTML.");
      step("app", "Допълнителни заявки", 1, "Документът предизвиква заявки за стилове, изображения, скриптове — по същата или по нови връзки.");
      F.push({ lay: "app", title: "Край", cost: 0, t, rtts, done: true, msg: `Общо ≈ <b>${rtts} RTT</b> ≈ ${t} ms (без времето за предаване, обработка и рисуване). ${h3 ? "HTTP/3 спестява отделния TCP обмен." : ""} Кеширане, прокси и повторно използване на връзки пропускат части от учебната последователност.`, stats: { "RTT общо": rtts, "време (ms)": t } });
      return { frames: F, rtts };
    },
  };

  const LAYS = { link: ["Локална връзка", "s-piv"], net: ["Адрес и маршрут", "s-act"], dns: ["DNS", "s-cmp"], tr: ["Транспорт", "s-done"], tls: ["TLS", "s-done"], app: ["Приложение", "s-swap"] };

  /* Диагностика: повреда → какво виждаме при всяка проверка */
  const FAULTS = [
    { k: "none", t: "Няма повреда" },
    { k: "cable", t: "Изваден кабел / няма Wi-Fi", fail: 0 },
    { k: "gw", t: "Грешен шлюз / липсва маршрут", fail: 2 },
    { k: "dns", t: "DNS сървърът не отговаря", fail: 3, onlyName: true },
    { k: "port", t: "Уеб сървърът не слуша на 443", fail: 4 },
    { k: "cert", t: "Сертификатът не съвпада с името", fail: 5 },
    { k: "404", t: "Ресурсът липсва (404)", fail: 6 },
  ];
  const CHECKS = [
    ["Индикатор за връзка / асоцииран с точката за достъп", "link"],
    ["Имам IP адрес, маска и шлюз", "net"],
    ["ping до IP адреса на сървъра", "net"],
    ["Името се разрешава (DNS)", "dns"],
    ["TCP връзка към порт 443", "tr"],
    ["TLS проверка на сертификата", "tls"],
    ["HTTP отговор 200", "app"],
  ];

  const html = `
<div class="prose">
  <p>Интернет е мрежа от <dfn data-g="автономна система">автономно управлявани мрежи</dfn>, които използват общи протоколи и договори за свързване. <dfn data-g="bgp">BGP</dfn> обменя маршрути между автономни системи; вътрешните мрежи могат да използват други протоколи. <dfn data-g="www">World Wide Web</dfn> е услуга върху Интернет, а не синоним на цялата инфраструктура.</p>
</div>

<div class="block">
  <h3>Интернет като мрежа от мрежи</h3>
  <p class="muted">Щракни върху автономна система. Вътре всяка решава сама как да маршрутизира; между тях договорите и BGP определят кои префикси се обявяват.</p>
  <div class="split"><div id="as-svg"></div><div class="key" id="as-detail"></div></div>
  <details class="trap"><summary>Капан: „Интернет = Web“</summary><div>
    <p>Web е система от ресурси, достъпвани с HTTP върху Интернет. Пощата (SMTP), DNS, SSH, NTP също работят върху Интернет, без да са „уеб“.</p>
  </div></details>
</div>

<div class="block">
  <h3>Един уеб адрес свързва няколко равнища</h3>
  <p class="prose">При <code>https://example.org/course?id=5</code> фрагментите са схема, хост, път и query. DNS разрешава името на хоста, а не целия URL. След избор на маршрут се установява подходящ транспорт и защита. HTTP заявката иска конкретен ресурс.</p>
  <div id="v-url"></div>
</div>

<div class="block">
  <h3>Зависимости при отваряне на HTTPS страница (Схема 27)</h3>
  <p class="prose">При отваряне на HTTPS адрес клиентът определя името и получава адрес чрез DNS или кеш. Избира маршрут и следващ хоп; при нужда намира локалния канален адрес. После установява транспортна и защитена комуникация според избраната HTTP версия и изпраща заявката. При HTTPS върху TCP първо се установява TCP връзка, след което TLS договаря защита и удостоверява сървъра. При HTTP/3 QUIC съчетава транспорт и криптографски обмен. Броят RTT е учебна оценка [опростено: DNS като 1 RTT, TLS 1.3].</p>
  <div id="v-open"></div>
  <details class="trap"><summary>Капан: „всяко отваряне = нов DNS + нов TCP + един отговор“</summary><div>
    <p>Не е правилно всяко отваряне на страница да се представя като нов DNS обмен, нов TCP handshake и един-единствен HTTP отговор. Кеширане, прокси и повторно използване на връзки пропускат части; документът предизвиква допълнителни заявки. Включи „DNS в кеша“ и „повторно използвана връзка“ и виж разликата.</p>
  </div></details>
</div>

<div class="block">
  <h3>Диагностика по равнища</h3>
  <p class="prose">Диагностиката разделя равнищата: локална връзка, адрес, маршрут, DNS, транспорт и приложение. Достижимост по IP не доказва работещ DNS, а отговор на ping не доказва работещ уеб сървър. Избери повреда и виж кои проверки минават и коя е първата, която пада.</p>
  <div class="row" id="flt"></div>
  <div class="tbl-wrap"><table class="t" id="chk"></table></div>
  <div class="key" id="chk-k"></div>
  <details class="hint"><summary>Хинт: как да отделиш DNS проблем от транспортен и приложен</summary><div>
    <p>Ако по IP адрес всичко работи, а по име — не, проблемът е в DNS. Ако името се разрешава, но TCP към порта не се установява — транспортен (няма слушащ процес, филтриране). Ако TCP и TLS минават, а отговорът е 404 или 500 — приложен. Това е точката от опорния план „отделям DNS проблем от транспортен и приложен“.</p>
  </div></details>
</div>`;

  function mount(root) {
    // AS
    const AS = [
      { k: "AS A", x: 80, y: 60, d: "Доставчик за домашни абонати. Вътрешно може да ползва свой протокол за маршрутизация; навън обявява префиксите на абонатите си чрез BGP." },
      { k: "AS B", x: 300, y: 40, d: "Транзитен доставчик: пренася трафик между други автономни системи според договорите за свързване." },
      { k: "AS C", x: 520, y: 70, d: "Мрежа на доставчик на съдържание; обявява префиксите, в които са сървърите му." },
      { k: "AS D", x: 200, y: 170, d: "Университетска мрежа — също автономно управлявана, със собствена вътрешна политика." },
      { k: "AS E", x: 430, y: 180, d: "Друг доставчик. Пътят от A до C може да мине през B или през D и E — изборът зависи от политиките и обявените маршрути." },
    ];
    const L = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 2], [1, 4]];
    const asBox = root.querySelector("#as-svg"), asD = root.querySelector("#as-detail");
    let sel = 0;
    function drawAS() {
      const svg = S.svg("svg", { class: "g", viewBox: "0 0 600 230", width: 600 });
      L.forEach(([a, b]) => svg.append(S.svg("line", { x1: AS[a].x, y1: AS[a].y, x2: AS[b].x, y2: AS[b].y, class: "edge " + (a === sel || b === sel ? "s-act" : "") })));
      AS.forEach((A, i) => {
        const g = S.svg("g", { class: "node " + (i === sel ? "s-act" : ""), style: "cursor:pointer", tabindex: "0" }, S.svg("ellipse", { cx: A.x, cy: A.y, rx: 46, ry: 24, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--ink-2))", "stroke-width": 2 }), S.svg("text", { x: A.x, y: A.y + 5, "text-anchor": "middle", text: A.k }));
        g.addEventListener("click", () => { sel = i; drawAS(); });
        g.addEventListener("keydown", (e) => { if (e.key === "Enter") { sel = i; drawAS(); } });
        svg.append(g);
      });
      svg.append(S.svg("text", { x: 300, y: 222, "text-anchor": "middle", class: "wt", text: "линии = BGP съседства между автономни системи (учебна схема)" }));
      asBox.innerHTML = ""; asBox.append(svg);
      asD.innerHTML = `<p><b>${AS[sel].k}</b></p><p>${AS[sel].d}</p><p class="muted">Вътре в AS — вътрешни протоколи за маршрутизация; между AS — BGP. Препращането на всеки пакет използва вече построената таблица (<a href="#ip">раздел 5</a>).</p>`;
    }
    drawAS();

    // URL
    const PART = { scheme: ["приложение (HTTP/HTTPS)", "s-swap"], host: ["DNS", "s-cmp"], port: ["транспорт (TCP/QUIC)", "s-done"], path: ["HTTP заявка", "s-act"], query: ["HTTP заявка", "s-act"], frag: ["само браузърът", "s-dim"] };
    S.viz(root.querySelector("#v-url"), {
      id: "url", title: "Разбор на URL", sub: "",
      code: "ch08_url",
      inputs: [{ id: "u", label: "URL", value: "https://example.org/course?id=5", width: "min(24em, calc(100vw - 90px))" }],
      presets: [{ label: "С порт и фрагмент", values: { u: "http://example.org:8080/a/b#top" } }, { label: "Без път", values: { u: "https://api.example.org" } }, { label: "ftp://", values: { u: "ftp://example.org/x" } }],
      build: algos.url,
      draw(st, f) {
        st.innerHTML = "";
        if (f.err) { st.append(h("p", { class: "warn", text: "Грешка в разбора." })); return; }
        const tb = h("table", { class: "t" }, h("tr", null, h("th", { text: "Част" }), h("th", { text: "Стойност" }), h("th", { text: "Отива към" })));
        Object.keys(PART).forEach((k) => {
          const v = f.r[k]; if (v === "" || v === 0) return;
          tb.append(h("tr", null, h("td", { text: k }), h("td", { class: "mono " + (k === f.part ? "s-act" : ""), style: { background: k === f.part ? "var(--cb)" : "" }, text: String(v) }), h("td", null, h("span", { class: "pill " + PART[k][1], text: PART[k][0] }))));
        });
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });

    // отваряне на страница
    S.viz(root.querySelector("#v-open"), {
      id: "open", title: "Отваряне на HTTPS страница", sub: "Всяка лента е стъпка; дължината = брой RTT.",
      code: false,
      inputs: [
        { id: "ver", label: "HTTP версия", type: "select", value: "h1", options: [["h1", "HTTP/1.1 или /2 (TCP + TLS)"], ["h3", "HTTP/3 (QUIC върху UDP)"]] },
        { id: "rtt", label: "RTT до сървъра (ms)", type: "number", value: 40, width: "6em" },
        { id: "dnsCache", label: "DNS в кеша", type: "checkbox", value: false },
        { id: "reuse", label: "повторно използвана връзка", type: "checkbox", value: false },
        { id: "sameNet", label: "сървърът е в локалната мрежа", type: "checkbox", value: false },
      ],
      presets: [{ label: "Студен старт", values: { ver: "h1", dnsCache: false, reuse: false } }, { label: "Втора страница от сайта", values: { dnsCache: true, reuse: true } }],
      build: algos.open,
      draw(st, f, { frames, i }) {
        st.innerHTML = "";
        const W = 600, rowH = 30, n = frames.length, svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${n * rowH + 10}`, width: W });
        const maxR = Math.max(1, frames[n - 1].rtts), sx = (r) => 230 + (r * (W - 250)) / maxR;
        frames.forEach((g, k) => {
          const y = 5 + k * rowH, [ln, cls] = LAYS[g.lay], prev = k ? frames[k - 1].rtts : 0, on = k <= i;
          svg.append(S.svg("text", { x: 4, y: y + 18, class: k === i ? "" : "wt", style: k === i ? "font-weight:700" : "", text: g.title.length > 30 ? g.title.slice(0, 29) + "…" : g.title }));
          if (g.cost && on) svg.append(S.svg("g", { class: cls }, S.svg("rect", { x: sx(prev), y: y + 4, width: Math.max(4, sx(g.rtts) - sx(prev)), height: rowH - 10, rx: 3, fill: "var(--cb)", stroke: "var(--c)" })));
          if (g.skip && on) svg.append(S.svg("text", { x: sx(prev) + 4, y: y + 18, class: "wt", text: "пропуснато" }));
          if (!g.cost && !g.skip && on && k && k < n - 1) svg.append(S.svg("text", { x: sx(prev) + 4, y: y + 18, class: "wt", text: "локално, ≈ 0 RTT" }));
        });
        for (let r = 0; r <= maxR; r++) svg.append(S.svg("line", { x1: sx(r), y1: 0, x2: sx(r), y2: n * rowH + 6, stroke: "var(--line-2)", "stroke-dasharray": "2 3" }));
        st.append(svg);
        st.append(h("p", { class: "legend" }, ...Object.values(LAYS).filter((v, k, a) => a.findIndex((x) => x[0] === v[0]) === k).map(([t, c]) => h("span", { class: c }, h("i"), t))));
      },
    });

    // диагностика
    const fb = root.querySelector("#flt"), tb = root.querySelector("#chk"), kk = root.querySelector("#chk-k");
    const btns = FAULTS.map((F, i) => h("button", { class: "btn", "aria-pressed": i ? "false" : "true", text: F.t, onclick: () => show(i) }));
    fb.append(...btns);
    function show(i) {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const F = FAULTS[i];
      tb.innerHTML = "";
      tb.append(h("tr", null, h("th", { text: "Проверка" }), h("th", { text: "Равнище" }), h("th", { text: "Резултат" })));
      let first = null;
      CHECKS.forEach(([c, lay], k) => {
        let ok = F.fail == null || k < F.fail;
        if (F.onlyName && k === 2) ok = true;            // ping по IP минава при DNS проблем
        if (F.onlyName && k > 3) ok = false;
        const res = ok ? "минава" : k === F.fail ? "ПАДА" : "не може да се провери";
        if (!ok && first == null) first = k;
        tb.append(h("tr", null, h("td", { text: c }), h("td", null, h("span", { class: "pill " + LAYS[lay][1], text: LAYS[lay][0] })), h("td", { class: ok ? "s-done" : k === F.fail ? "s-swap" : "s-dim", style: { background: "var(--cb)" }, text: res })));
      });
      kk.innerHTML = F.fail == null ? "Всички проверки минават. Но и валиден HTTP отговор не доказва, че потребителят има право да прочете обекта." :
        `Първата неуспешна проверка е „${CHECKS[first][0]}“ → търсим причината на равнище <b>${LAYS[CHECKS[first][1]][0]}</b>. Проверките над нея не дават информация — по-ниското равнище е предпоставка.${F.onlyName ? " Обърни внимание: ping по IP минава, а по име — не. IP достижимостта не доказва работещ DNS." : ""}${F.k === "port" ? " ping минава, но уеб сървърът не работи — ping не проверява всички услуги." : ""}${F.k === "404" ? " 404 е получен приложен отговор: всичко под HTTP работи." : ""}`;
    }
    show(0);
  }

  S.chapter({ id: "internet", order: 8, num: "8", group: "Транспорт и услуги", title: "Интернет и отваряне на страница", lead: "Интернет като мрежа от автономни мрежи; кое парче от URL на кое равнище отива; зависимостите и RTT при HTTPS и HTTP/3; диагностика слой по слой.", html, mount, algos });
})();
