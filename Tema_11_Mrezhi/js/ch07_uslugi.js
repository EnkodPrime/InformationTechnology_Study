/* Раздел 7 — Основни услуги и протоколи: DNS (кодиране на име, разрешаване с кеш), DHCP DORA,
   HTTP заявка/отговор и REST, протокол срещу програма. */
(function () {
  const S = window.Study, h = S.h;
  const hx = (b) => b.toString(16).toUpperCase().padStart(2, "0");

  /* същата учебна йерархия като в c/07_dns.c */
  const Z = [
    { zone: "", parent: -1, server: "198.51.100.1 (корен)" },
    { zone: "org", parent: 0, server: "198.51.100.2 (org)" },
    { zone: "com", parent: 0, server: "198.51.100.3 (com)" },
    { zone: "example.org", parent: 1, server: "203.0.113.53 (example.org)" },
    { zone: "example.com", parent: 2, server: "203.0.113.54 (example.com)" },
  ];
  const NS_TTL = [0, 3600, 3600, 1800, 1800];
  const R = [
    { name: "example.org", a: "203.0.113.80", ttl: 300 },
    { name: "www.example.org", a: "203.0.113.80", ttl: 300 },
    { name: "api.example.org", a: "203.0.113.81", ttl: 60 },
    { name: "www.example.com", a: "203.0.113.90", ttl: 120 },
  ];
  const inZone = (n, z) => !z || n === z || n.endsWith("." + z);

  const algos = {
    /* Като encode_qname() в C */
    qname({ name }) {
      name = String(name).trim().toLowerCase().replace(/\.$/, "");
      if (!name) throw new Error("Въведи домейнно име.");
      if (name.length > 100) throw new Error("Най-много 100 символа.");
      const labels = name.split(".");
      labels.forEach((l) => { if (!l) throw new Error("Празен етикет (две точки подред)."); if (l.length > 63) throw new Error(`Етикетът „${l}“ е над 63 символа.`); if (!/^[a-z0-9-]+$/.test(l)) throw new Error(`„${l}“: учебният пример приема само a–z, 0–9 и „-“.`); });
      const out = [], F = [];
      F.push({ out: [], labels, li: -1, msg: `Името се разделя на ${labels.length} етикета по точките. В DNS съобщението точки няма — всеки етикет е предшестван от байт с дължината си.` });
      labels.forEach((l, i) => {
        F.push({ at: "label", out: out.slice(), labels, li: i, msg: `Етикет „<b>${l}</b>“ — ${l.length} символа.`, vars: { label: l, len: l.length } });
        out.push(l.length);
        F.push({ at: "lenbyte", out: out.slice(), labels, li: i, cur: out.length - 1, msg: `Байт за дължина: <code>${hx(l.length)}</code>.`, vars: { len: l.length } });
        for (const c of l) out.push(c.charCodeAt(0));
        F.push({ at: ["copy", "next"], out: out.slice(), labels, li: i, curR: [out.length - l.length, out.length - 1], msg: `Самите символи: <code>${[...l].map((c) => hx(c.charCodeAt(0))).join(" ")}</code>.`, log: `${hx(l.length)} ${l}` });
      });
      out.push(0);
      F.push({ at: ["root", "ret"], out: out.slice(), labels, li: labels.length, cur: out.length - 1, done: true, msg: `Накрая байт 00 — етикетът на корена с дължина 0. Общо ${out.length} байта.`, log: "00 (корен)" });
      return { frames: F, bytes: out.map(hx).join(" ") };
    },

    /* Като resolve() в C — последователност от заявки с кеш */
    dns({ queries }) {
      const items = String(queries).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      if (!items.length) throw new Error("Въведи поне една заявка във вида име@секунда.");
      if (items.length > 12) throw new Error("Най-много 12 заявки.");
      let lastT = -1;
      const Q = items.map((it) => {
        const m = it.match(/^([a-z0-9.-]+)\s*@\s*(\d+)$/i);
        if (!m) throw new Error(`„${it}“: формат име@секунда, напр. www.example.org@0.`);
        const t = S.int(m[2], 0, 100000, "Времето");
        if (t < lastT) throw new Error("Времената трябва да не намаляват.");
        lastT = t;
        return { name: m[1].toLowerCase().replace(/\.$/, ""), t };
      });
      const C = new Map(), F = [], res = [];
      const cget = (k, now) => { const c = C.get(k); return c && c.exp > now ? c : null; };
      const snapC = (now) => [...C.entries()].map(([k, v]) => ({ k, a: v.a, left: v.exp - now }));
      Q.forEach(({ name, t }, qi) => {
        let q = 0;
        const base = (o) => F.push(Object.assign({ qi, name, t, cache: snapC(t), q }, o));
        base({ at: "cache", msg: `t = ${t} s: клиентът пита resolver-а за <b>${name}</b> (A запис). Първо — кешът.`, vars: { name, t } });
        const c = cget("A " + name, t);
        if (c) { base({ at: "hit", hitK: "A " + name, ans: c.a, msg: `Кеширан отговор, валиден още ${c.exp - t} s → <b>${c.a}</b> без нито една заявка навън.`, log: `t=${t} ${name}: от кеша`, stats: { заявки: 0 } }); res.push(`${c.a} q=0`); return; }
        let z = 0;
        for (let i = Z.length - 1; i > 0; i--) if (inZone(name, Z[i].zone) && cget("NS " + Z[i].zone, t)) { z = i; break; }
        base({ at: "closest", z, msg: z ? `В кеша има насочване към зона <b>${Z[z].zone}</b> — започваме направо оттам, коренът се прескача.` : "Няма полезно кеширано насочване — започваме от корена.", vars: { зона: Z[z].zone || "." } });
        for (;;) {
          q++;
          base({ at: "ask", z, q, msg: `Заявка №${q} към ${Z[z].server}: „A ${name}?“`, vars: { сървър: Z[z].server }, log: `t=${t} ${name}: питам ${Z[z].zone || "."}` });
          const rec = Z[z].parent > 0 ? R.find((r) => r.name === name && inZone(name, Z[z].zone)) : null;
          if (rec) {
            C.set("A " + name, { a: rec.a, exp: t + rec.ttl });
            F.push({ at: "answer", qi, name, t, z, q, cache: snapC(t), ans: rec.a, newK: "A " + name, msg: `Авторитетният сървър на ${Z[z].zone} отговаря: <b>${rec.a}</b>, TTL ${rec.ttl} s. Resolver-ът кешира и връща на клиента.`, stats: { заявки: q }, log: `→ ${rec.a} (TTL ${rec.ttl})` });
            res.push(`${rec.a} q=${q}`); return;
          }
          let child = -1;
          for (let i = 1; i < Z.length; i++) if (Z[i].parent === z && inZone(name, Z[i].zone)) child = i;
          if (child < 0) { F.push({ at: "nx", qi, name, t, z, q, cache: snapC(t), nx: true, msg: `Сървърът на ${Z[z].zone || "."} е авторитетен и такова име няма → <b>NXDOMAIN</b>.`, stats: { заявки: q }, log: "→ NXDOMAIN" }); res.push(`NXDOMAIN q=${q}`); return; }
          C.set("NS " + Z[child].zone, { a: null, exp: t + NS_TTL[child] });
          F.push({ at: ["child", "referral"], qi, name, t, z, q, cache: snapC(t), newK: "NS " + Z[child].zone, ref: child, msg: `Отговорът е <b>насочване</b>: „не знам, питай сървъра на ${Z[child].zone}“ (${Z[child].server}). Насочването също се кешира за ${NS_TTL[child]} s.`, log: `→ насочване към ${Z[child].zone}` });
          z = child;
        }
      });
      return { frames: F, res };
    },

    /* DHCP DORA — учебна последователност без C (протоколен обмен, не алгоритъм) */
    dora({ lease, t }) {
      lease = S.int(lease, 60, 86400, "Наемът"); t = S.int(t, 0, 3 * lease, "Моментът");
      const F = [], M = [];
      const add = (o) => { if (o.m) M.push(o.m); F.push(Object.assign({ M: M.slice() }, o)); };
      add({ who: "C", msg: "Клиентът току-що е включен: няма IPv4 адрес, не знае шлюза, нито DNS сървъра." });
      add({ who: "C", m: { d: "C>*", n: "DISCOVER", src: "0.0.0.0:68", dst: "255.255.255.255:67", body: "„Има ли DHCP сървър?“" }, msg: "<b>D</b>iscover: broadcast от 0.0.0.0, защото клиентът още няма адрес. UDP, порт 68 → 67.", log: "DISCOVER (broadcast)" });
      add({ who: "S", m: { d: "S>C", n: "OFFER", src: "192.168.10.1:67", dst: "→ клиента", body: "адрес 192.168.10.34/24, шлюз 192.168.10.1, DNS 192.168.10.1, наем " + lease + " s" }, msg: "<b>O</b>ffer: сървърът предлага конфигурация — адрес, префикс, шлюз, DNS сведения и срок на наема.", log: "OFFER 192.168.10.34" });
      add({ who: "C", m: { d: "C>*", n: "REQUEST", src: "0.0.0.0:68", dst: "255.255.255.255:67", body: "„Искам 192.168.10.34 от сървър 192.168.10.1“" }, msg: "<b>R</b>equest: клиентът заявява избраното предложение. Пак broadcast — така и другите сървъри (ако има) научават, че тяхното не е избрано.", log: "REQUEST" });
      add({ who: "S", m: { d: "S>C", n: "ACK", src: "192.168.10.1:67", dst: "→ клиента", body: "потвърждава 192.168.10.34, наем " + lease + " s" }, msg: "<b>A</b>cknowledgment: сървърът потвърждава. Клиентът конфигурира интерфейса.", log: "ACK" });
      const half = Math.floor(lease / 2);
      const t2 = Math.floor(lease * 7 / 8);   /* T2 = 0,875 · наема (RFC 2131 §4.4.5) */
      if (t >= t2 && t < lease) add({ who: "C", m: { d: "C>*", n: "REQUEST", src: "192.168.10.34:68", dst: "255.255.255.255:67", body: "повторно обвързване (rebinding)" }, renew: true, msg: `t = ${t} s ≥ T2 = ${t2} s (7/8 от наема): ако подновяването до сървъра не е успяло, клиентът изпраща REQUEST като <b>broadcast</b> към всеки DHCP сървър (REBINDING).`, log: "rebinding (broadcast)" });
      else if (t >= half && t < lease) add({ who: "C", m: { d: "C>S", n: "REQUEST", src: "192.168.10.34:68", dst: "192.168.10.1:67", body: "подновяване на наема" }, renew: true, msg: `t = ${t} s ≥ T1 = половината от наема (${half} s): клиентът подновява директно към сървъра — <b>не</b> повтаря целия DORA.`, log: "подновяване (unicast)" });
      else if (t >= lease) add({ who: "C", expired: true, msg: `t = ${t} s ≥ наема: без подновяване адресът изтича и клиентът започва отначало.`, log: "наемът изтече" });
      add({ done: true, msg: "Учебният DORA показва типичен начален обмен, не всеки възможен DHCP случай. При IPv6 има и други механизми като SLAAC." });
      return { frames: F };
    },

    /* HTTP заявка/отговор — сглобяване на текста (без C) */
    http({ method, path, host, body }) {
      method = String(method); path = String(path || "/"); host = String(host || "");
      if (!["GET", "POST", "HEAD", "DELETE"].includes(method)) throw new Error("Непознат метод.");
      if (!/^\/[\x21-\x7e]*$/.test(path)) throw new Error("Пътят започва с / и е без интервали.");
      if (!host) throw new Error("Host е задължителен в HTTP/1.1.");
      body = method === "POST" ? String(body || "") : "";
      const enc = new TextEncoder(), blen = enc.encode(body).length;
      const lines = [`${method} ${path} HTTP/1.1`, `Host: ${host}`];
      if (method === "POST") lines.push("Content-Type: application/json", `Content-Length: ${blen}`);
      const req = lines.join("\r\n") + "\r\n\r\n" + body;
      let status, rbody = "", allow = "";
      const ALLOW = { "/status": "GET, HEAD", "/measurements": "GET, HEAD, POST" };
      if (!(path in ALLOW)) status = "404 Not Found";
      else if (!ALLOW[path].split(", ").includes(method)) { status = "405 Method Not Allowed"; allow = ALLOW[path]; }
      else if (path === "/status") { status = "200 OK"; rbody = '{"state":"ok"}'; }
      else if (method === "POST") {
        try { const j = JSON.parse(body); status = typeof j.temperature === "number" ? "201 Created" : "400 Bad Request"; } catch (e) { status = "400 Bad Request"; }
      } else { status = "200 OK"; rbody = '[{"temperature":23.5}]'; }
      /* HEAD: същите заглавни полета като при GET (вкл. Content-Length), но без тяло — RFC 9110 §9.3.2, §8.6 */
      const clen = enc.encode(rbody).length, ctype = rbody ? "Content-Type: application/json\r\n" : "";
      if (method === "HEAD") rbody = "";
      const resp = `HTTP/1.1 ${status}\r\n` + (allow ? `Allow: ${allow}\r\n` : "") + ctype + `Content-Length: ${clen}\r\n` + "\r\n" + rbody;
      const F = [
        { part: "start", req, resp, status, msg: `Стартов ред: метод <b>${method}</b>, път <b>${S.esc(path)}</b>, версия HTTP/1.1.` },
        { part: "headers", req, resp, status, msg: "Заглавни полета: Host казва кой сайт (един IP адрес може да обслужва много имена)." + (method === "POST" ? " Content-Length казва къде свършва тялото — нужно е, защото TCP е поток." : "") },
        { part: "body", req, resp, status, msg: method === "POST" ? `Тяло: ${blen} байта JSON. JSON/UTF-8 определят <b>представянето</b>; какво означава „temperature“ и в какви единици — договорът на API.` : "Празен ред завършва заглавието; тази заявка няма тяло." },
        { part: "resp", req, resp, status, msg: `Отговор: <b>${status}</b>. ${status.startsWith("2") ? "Успешен приложен отговор." : status.startsWith("404") ? "404 е <b>получен приложен отговор</b> — връзката, маршрутът и транспортът работят; ресурсът не е намерен." : "Приложен отговор с грешка — пак е доказателство, че по-ниските слоеве работят."}` },
      ];
      return { frames: F, status };
    },
  };

  const PROT = [
    ["HTTP / HTTPS", "http", "Уеб ресурси и API", "L7; HTTP/1.1 и HTTP/2 обичайно върху TCP; HTTP/3 върху QUIC/UDP", "Nginx, Apache HTTP Server"],
    ["DNS", "dns", "Ресурсни записи за домейнни имена", "L7; обикновен DNS върху UDP или TCP", "BIND 9, Unbound"],
    ["DHCPv4", "dhcp", "Автоматична IPv4 конфигурация", "L7 върху UDP; DHCPv6 също използва UDP, но е различен протокол", "—"],
    ["SMTP / IMAP / POP3", "smtp", "Пренасяне на поща / достъп до поща", "L7 върху TCP; защитата зависи от използвания вариант", "Postfix (SMTP)"],
    ["SSH / SFTP", "ssh", "Защитен достъп / файлов обмен", "L7; SFTP работи през SSH и е различен от FTP", "OpenSSH"],
    ["NTP / MQTT", "ntp", "Време / съобщения чрез брокер", "L7; NTP обичайно UDP, MQTT обичайно TCP", "chrony (NTP)"],
    ["TCP / UDP", "tcp", "Транспортни услуги", "L4", "ядрото на ОС"],
    ["IPv4 / IPv6 / ICMP", "icmp", "Мрежова доставка / контролни съобщения", "L3; ICMP е пренесен чрез IP, не чрез TCP/UDP", "ping (ICMP)"],
  ];

  const html = `
<div class="prose">
  <p><dfn data-g="dns">DNS</dfn> съпоставя домейнни имена с ресурсни записи, включително адреси. Не всяко име има един адрес, а не всеки адрес е статичен. Кеширането се управлява чрез срокове. <dfn data-g="dhcp">DHCP</dfn> предоставя конфигурация като адрес, префикс и маршрутизатор при съответната версия и организация; IPv6 поддържа и други механизми като <dfn data-g="slaac">SLAAC</dfn>.</p>
  <p><dfn data-g="http">HTTP</dfn> е приложен протокол за заявки и отговори. <dfn data-g="https">HTTPS</dfn> използва защитен канал и проверка на самоличността според сертификатния модел. <dfn data-g="smtp">SMTP</dfn> се използва за пренасяне на поща, а <dfn data-g="imap">IMAP</dfn> и <dfn data-g="pop3">POP3</dfn> — за достъп до пощенски кутии с различен модел. <dfn data-g="ssh">SSH</dfn> предоставя защитен отдалечен достъп. <dfn data-g="ntp">NTP</dfn> синхронизира часовници. <dfn data-g="icmp">ICMP</dfn> пренася контролни съобщения и грешки; ping използва определени ICMP съобщения и не проверява всички услуги на хоста.</p>
</div>

<div class="block">
  <h3>Как се записва име в DNS заявка</h3>
  <p class="prose">В DNS съобщението името не съдържа точки: всеки етикет е предшестван от байт с дължината си, а краят е байт 00 (коренът). Това е форматът от RFC 1035. <span class="extra-tag">извън конспекта</span></p>
  <div id="v-qname"></div>
</div>

<div class="block">
  <h3>Разрешаване на домейнно име с кеш (Схеми 23 и 26)</h3>
  <p class="prose">Авторитетният сървър отговаря за зона; <dfn data-g="resolver">рекурсивният resolver</dfn> извършва търсенето за клиента — използва кеш и при нужда пита други сървъри. Отговорите дават насочвания и накрая исканите записи. Въведи поредица заявки <code>име@секунда</code> и проследи кога кешът спестява заявки и кога TTL изтича. Йерархията и адресите са учебни (от документационните диапазони).</p>
  <div id="v-dns"></div>
  <div class="key">Без кеш: корен → TLD → авторитетен (3 заявки). С кеширано насочване: направо към зоната. С кеширан отговор: 0 заявки — докато TTL не изтече.</div>
  <details class="trap"><summary>Капан: „DNS разрешава URL“ и „едно име = един адрес“</summary><div>
    <p>DNS разрешава <b>името на хоста</b>, не целия URL. A и AAAA дават адреси; други записи имат други роли. Едно име може да има много адреси и различни видове записи.</p>
  </div></details>
  <details class="trap"><summary>Капан: „DNSSEC шифрова заявките“</summary><div>
    <p>DNS сам по себе си не обещава конфиденциалност. <dfn data-g="dnssec">DNSSEC</dfn> добавя удостоверяване на определени DNS данни, не общо шифроване на заявките. Шифрованият транспорт за DNS е отделен механизъм.</p>
  </div></details>
</div>

<div class="block">
  <h3>DHCP за първоначална IPv4 конфигурация (Схема 24)</h3>
  <p class="prose"><dfn data-g="dora">DORA</dfn> е учебното име Discover–Offer–Request–Acknowledgment. То показва типичен начален обмен, не всеки възможен DHCP случай. Подновяването на наема може да използва друга последователност. Статичният адрес е друга организация, а не „DHCP със скрит сървър“.</p>
  <div id="v-dora"></div>
</div>

<div class="block">
  <h3>HTTP заявка и отговор, REST</h3>
  <p class="prose">HTTP е приложен протокол (L7). HTTPS означава HTTP, защитен чрез <dfn data-g="tls">TLS</dfn>; TLS е отделен протокол за защита, а не нов HTTP метод. Проследен пример от ръководството: устройство изпраща <code>POST /measurements</code> с JSON тяло <code>{"temperature":23.5}</code>. Учебният сървър тук знае ресурсите <code>/status</code> и <code>/measurements</code>.</p>
  <div id="v-http"></div>
  <p class="prose"><dfn data-g="rest">REST</dfn> е архитектурен стил, не транспортен протокол. Stateless означава, че всяка заявка носи необходимия контекст и не разчита на съхранен разговорен контекст от предходни заявки. Това не забранява сървърът да пази ресурси или няколко заявки да използват една транспортна връзка. API token за достъп не е OSI сесиен токен.</p>
</div>

<div class="block">
  <h3>Протокол, услуга и конкретна програма (Схеми 13 и 25)</h3>
  <p class="prose">Протоколът задава правила за комуникация, а програмата ги реализира. Услугата е предоставяната функция. <dfn data-g="сокет">Сокетът</dfn> е програмен интерфейс към крайна точка, а не протокол или кабел. Името на програмата не е име на протокола. Портът е конвенция или конфигурация и сам по себе си не доказва какъв протокол реално протича.</p>
  <div class="tbl-wrap"><table class="t" id="prot"></table></div>
  <details class="trap"><summary>Капан: „Nginx е протокол“, „порт 80 значи HTTP“</summary><div>
    <p>BIND 9 и Unbound реализират DNS функции, Postfix — SMTP, OpenSSH — SSH, chrony — NTP, Nginx и Apache — HTTP. API договорът трябва да определя семантиката на заявките, а не само порт и формат.</p>
  </div></details>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-qname"), {
      id: "qname", title: "QNAME: етикети с дължина", sub: "",
      code: "ch07_qname",
      inputs: [{ id: "name", label: "Име", value: "www.example.org", width: "min(14em, calc(100vw - 90px))" }],
      presets: [{ label: "a.b.example.com", values: { name: "a.b.example.com" } }, { label: "example.org", values: { name: "example.org" } }],
      legend: [["s-piv", "байт за дължина"], ["s-act", "текущ"], ["s-done", "корен 00"]],
      build: algos.qname,
      draw(st, f) {
        st.innerHTML = "";
        st.append(h("p", { class: "mono" }, ...f.labels.map((l, i) => h("span", { class: "pill " + (i === f.li ? "s-act" : i < f.li ? "s-done" : ""), style: { marginRight: "4px" }, text: l }))));
        if (!f.out.length) return;
        const lenIdx = new Set(); for (let i = 0; i < f.out.length; i += f.out[i] + 1) lenIdx.add(i);
        const cls = {}; f.out.forEach((_, i) => { cls[i] = lenIdx.has(i) ? (f.out[i] === 0 ? "s-done" : "s-piv") : ""; });
        if (f.cur != null) cls[f.cur] = "s-act";
        if (f.curR) for (let i = f.curR[0]; i <= f.curR[1]; i++) cls[i] = "s-act";
        S.drawArray(st, f.out.map((b, i) => (lenIdx.has(i) ? hx(b) : String.fromCharCode(b))), { cls, append: true });
      },
    });

    S.viz(root.querySelector("#v-dns"), {
      id: "dns", title: "Рекурсивен resolver с кеш", sub: "Стрелките са заявките на resolver-а; отговорите се връщат към него.",
      code: "ch07_resolve",
      inputs: [{ id: "queries", label: "Заявки име@секунда", value: "www.example.org@0, www.example.org@10, api.example.org@20, www.example.com@30, nope.example.org@40, api.example.org@100, www.example.org@290, www.example.org@400", width: "min(40em, calc(100vw - 90px))" }],
      presets: [{ label: "Една заявка", values: { queries: "www.example.org@0" } }, { label: "TTL на api (60 s)", values: { queries: "api.example.org@0, api.example.org@59, api.example.org@60" } }],
      legend: [["s-act", "текуща заявка"], ["s-cmp", "насочване"], ["s-done", "отговор / попадение в кеша"], ["s-swap", "NXDOMAIN"]],
      build: algos.dns,
      draw(st, f) {
        st.innerHTML = "";
        const W = 600, H = 250, svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        const P = { cl: [50, 120], rs: [190, 120], 0: [430, 30], 1: [380, 110], 2: [540, 110], 3: [380, 200], 4: [540, 200] };
        const lab = { cl: "клиент", rs: "resolver", 0: ". корен", 1: "org", 2: "com", 3: "example.org", 4: "example.com" };
        [[0, 1], [0, 2], [1, 3], [2, 4]].forEach(([a, b]) => svg.append(S.svg("line", { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: "var(--line)", "stroke-dasharray": "3 4" })));
        svg.append(S.svg("line", { x1: P.cl[0], y1: P.cl[1], x2: P.rs[0], y2: P.rs[1], class: "edge " + (f.at === "hit" || f.at === "answer" ? "s-done" : f.at === "nx" ? "s-swap" : "s-act") }));
        if (f.z != null && ["ask", "answer", "child", "nx"].some((a) => [].concat(f.at).includes(a))) svg.append(S.svg("line", { x1: P.rs[0], y1: P.rs[1], x2: P[f.z][0], y2: P[f.z][1], class: "edge " + (f.at === "ask" ? "s-act" : f.at === "nx" ? "s-swap" : f.ans ? "s-done" : "s-cmp") }));
        Object.keys(lab).forEach((k) => {
          const on = String(f.z) === k && f.at !== "cache" && f.at !== "hit", cls = k === "rs" ? (f.at === "hit" ? "s-done" : "s-act") : k === "cl" ? "" : on ? (f.ans ? "s-done" : f.nx ? "s-swap" : f.ref ? "s-cmp" : "s-act") : "";
          svg.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: P[k][0], cy: P[k][1], r: 16 })), S.svg("text", { x: P[k][0], y: P[k][1] + 32, "text-anchor": "middle", class: "wt", text: lab[k] }));
        });
        st.append(svg);
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "кеш на resolver-а" }), h("th", { text: "стойност" }), h("th", { text: "остава (s)" })));
        f.cache.forEach((c) => tb.append(h("tr", null, h("td", { class: c.k === f.newK ? "s-cmp" : c.k === f.hitK ? "s-done" : c.left <= 0 ? "s-dim" : "", style: { textAlign: "left" }, text: c.k }), h("td", { text: c.a || "насочване" }), h("td", { class: c.left <= 0 ? "s-swap" : "", text: c.left <= 0 ? "изтекъл" : c.left }))));
        if (!f.cache.length) tb.append(h("tr", null, h("td", { colspan: 3, class: "muted", text: "празен" })));
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });

    S.viz(root.querySelector("#v-dora"), {
      id: "dora", title: "DORA и подновяване на наема", sub: "Изберете момент t след първоначалния обмен.",
      code: false,
      inputs: [{ id: "lease", label: "Наем (s)", type: "number", value: 3600, width: "6em" }, { id: "t", label: "Момент t (s)", type: "number", value: 0, width: "6em" }],
      presets: [{ label: "t = половината", values: { lease: 3600, t: 1800 } }, { label: "t > наема", values: { lease: 3600, t: 4000 } }],
      build: algos.dora,
      draw(st, f) {
        st.innerHTML = "";
        const W = 600, H = 60 + Math.max(1, f.M.length) * 48, xl = 110, xr = 490, svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        svg.append(S.svg("text", { x: xl, y: 16, "text-anchor": "middle", text: "клиент" }), S.svg("text", { x: xr, y: 16, "text-anchor": "middle", text: "DHCP сървър" }));
        svg.append(S.svg("line", { x1: xl, y1: 24, x2: xl, y2: H - 8, class: "edge" }), S.svg("line", { x1: xr, y1: 24, x2: xr, y2: H - 8, class: "edge" }));
        f.M.forEach((m, i) => {
          const y = 44 + i * 48, l2r = m.d !== "S>C", cur = i === f.M.length - 1 && !f.done;
          svg.append(S.svg("line", { x1: l2r ? xl : xr, y1: y, x2: l2r ? xr - 4 : xl + 4, y2: y + 14, class: "edge " + (cur ? "s-act" : "s-done"), "stroke-dasharray": m.d === "C>*" ? "7 4" : null }));
          svg.append(S.svg("text", { x: (xl + xr) / 2, y: y - 2, "text-anchor": "middle", style: "font-weight:700", text: m.n + (m.d === "C>*" ? " (broadcast)" : "") }));
          svg.append(S.svg("text", { x: (xl + xr) / 2, y: y + 30, "text-anchor": "middle", class: "wt", text: `${m.src} → ${m.dst}` }));
        });
        st.append(svg);
        const last = f.M[f.M.length - 1];
        if (last) st.append(h("p", { class: "mono", text: "съдържание: " + last.body }));
      },
    });

    S.viz(root.querySelector("#v-http"), {
      id: "http", title: "HTTP/1.1 заявка и отговор", sub: "\\r\\n е показан като ↵.",
      code: false,
      inputs: [{ id: "method", label: "Метод", type: "select", value: "POST", options: ["GET", "POST", "HEAD", "DELETE"] }, { id: "path", label: "Път", value: "/measurements", width: "10em" }, { id: "host", label: "Host", value: "api.example.org", width: "10em" }, { id: "body", label: "Тяло (за POST)", value: '{"temperature":23.5}', width: "min(14em, calc(100vw - 90px))" }],
      presets: [{ label: "GET /status", values: { method: "GET", path: "/status" } }, { label: "404", values: { method: "GET", path: "/nope" } }, { label: "Невалиден JSON", values: { method: "POST", path: "/measurements", body: "{temperature:" } }],
      build: algos.http,
      draw(st, f) {
        st.innerHTML = "";
        const show = (txt, hl) => {
          const [head, body] = txt.split("\r\n\r\n"), hl2 = head.split("\r\n");
          const pre = h("pre", { class: "mono", style: { margin: 0, padding: "8px", background: "var(--code-bg)", border: "1px solid var(--line)", borderRadius: "6px", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "12.5px" } });
          hl2.forEach((l, i) => pre.append(h("span", { class: (hl === "start" && i === 0) || (hl === "headers" && i > 0) ? "s-act" : "", style: { background: "var(--cb)", display: "block" }, text: l + " ↵" })));
          pre.append(h("span", { style: { display: "block" }, class: "muted", text: "↵" }));
          if (body) pre.append(h("span", { class: hl === "body" ? "s-act" : "", style: { background: "var(--cb)", display: "block" }, text: body }));
          return pre;
        };
        st.append(h("div", { class: "split" }, h("div", null, h("span", { class: "eyebrow", text: "заявка (клиент → сървър)" }), show(f.req, f.part)),
          f.part === "resp" ? h("div", null, h("span", { class: "eyebrow", text: "отговор (сървър → клиент)" }), show(f.resp, "start")) : h("div")));
        st.append(h("p", { class: "muted", text: "Под HTTP: TCP доставя байтовете, IP избира мрежовия път, Ethernet или Wi-Fi обслужва локалния канал." }));
      },
    });

    const t = root.querySelector("#prot");
    t.append(h("tr", null, ...["Протокол", "Основна задача", "Равнище и типично пренасяне", "Реални реализации"].map((x) => h("th", { text: x }))));
    PROT.forEach(([p, g, a, b, c]) => t.append(h("tr", null, h("td", null, h("dfn", { "data-g": g, text: p })), h("td", { text: a }), h("td", { text: b }), h("td", { text: c }))));
  }

  S.chapter({ id: "uslugi", order: 7, num: "7", group: "Транспорт и услуги", title: "Основни услуги и протоколи", lead: "DNS стъпка по стъпка с кеш и TTL, DHCP DORA, HTTP заявка и отговор, REST; протокол срещу програма срещу сокет.", html, mount, algos });
})();
