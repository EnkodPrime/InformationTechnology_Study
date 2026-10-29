/* Раздел 3 — подслушване, подмяна (spoofing), посредник; модел на ARP кеш. */
(function () {
  const S = window.Study, h = S.h;

  const NAME = { 1: "шлюз", 20: "жертва", 66: "нападател" };
  const MACN = { 1: "шлюза", 32: "жертвата", 102: "нападателя" };   // 0x01, 0x20, 0x66
  const BIND = { 1: 0x01, 20: 0x20, 66: 0x66 };
  const MODES = ["без защита", "статичен запис", "DAI"];

  /* "r 1 66" — ARP отговор „IP 1 е на MAC 0x66“; "s 1" — жертвата изпраща към IP 1 */
  function parseEvents(str) {
    const parts = String(str).split(/[;,\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!parts.length) throw new Error("Въведи поне едно събитие, напр. „r 1 01, s 1“.");
    if (parts.length > 16) throw new Error("Най-много 16 събития.");
    return parts.map((p) => {
      let m = /^r\s+(1|20|66)\s+(01|20|66)$/i.exec(p);
      if (m) return { type: "r", ip: +m[1], mac: parseInt(m[2], 16) };
      m = /^s\s+(1|20|66)$/i.exec(p);
      if (m) return { type: "s", ip: +m[1] };
      throw new Error(`„${p}“ не е събитие. Формат: „r IP MAC“ (IP: 1, 20, 66; MAC: 01, 20, 66) или „s IP“.`);
    });
  }
  const hex = (m) => "0x" + m.toString(16).padStart(2, "0");

  const algos = {
    arp({ events, mode }) {
      const ev = parseEvents(events);
      const md = S.int(mode, 0, 2, "Режимът");
      const cache = [];   // {ip, mac, st}
      const F = [], delivered = [];
      let dropped = 0, kept = 0;
      const snap = (o) => ({ cache: cache.map((c) => ({ ...c })), md, delivered: delivered.slice(), stats: { отхвърлени_DAI: dropped, запазени_статични: kept }, ...o });
      if (md === 1) cache.push({ ip: 1, mac: 0x01, st: 1 });
      F.push(snap({ at: "init", msg: `Режим: <b>${MODES[md]}</b>. ${md === 1 ? "Шлюзът е въведен ръчно като статичен запис." : md === 2 ? "Комутаторът пази доверена таблица IP–MAC (напр. от раздаването на адреси) и проверява всеки ARP отговор." : "Кешът приема всеки ARP отговор — протоколът не удостоверява подателя."}` }));
      ev.forEach((e, k) => {
        if (e.type === "r") {
          const who = e.mac === 0x66 && e.ip !== 66 ? " <b>— подправен (spoofing)</b>" : "";
          if (md === 2) {
            const ok = BIND[e.ip] === e.mac;
            F.push(snap({ at: "dai", ev: k, pkt: e, msg: `ARP отговор „${e.ip} (${NAME[e.ip]}) е на ${hex(e.mac)}“${who}. DAI сверява с доверената таблица: ${ok ? "съвпада" : "<b>не съвпада</b>"}.` }));
            if (!ok) { dropped++; F.push(snap({ at: "dai", ev: k, pkt: e, drop: true, msg: "Комутаторът <b>не препраща</b> отговора. Кешът на жертвата не се променя.", log: `#${k} r ${e.ip}→${hex(e.mac)}: отхвърлен (DAI)` })); return; }
          }
          F.push(snap({ at: "find", ev: k, pkt: e, msg: `Търсим IP ${e.ip} в кеша.` }));
          const c = cache.find((x) => x.ip === e.ip);
          if (c) {
            if (c.st) { kept++; F.push(snap({ at: "static", ev: k, pkt: e, hit: e.ip, msg: `Записът за ${e.ip} е <b>статичен</b> — отговорът се игнорира.`, log: `#${k} r ${e.ip}→${hex(e.mac)}: статичен запис остава` })); return; }
            if (c.mac === e.mac) { F.push(snap({ at: "find", ev: k, pkt: e, hit: e.ip, msg: "Същият MAC — без промяна.", log: `#${k} r ${e.ip}→${hex(e.mac)}: без промяна` })); return; }
            const old = c.mac; c.mac = e.mac;
            F.push(snap({ at: "overwrite", ev: k, pkt: e, hit: e.ip, chg: true, msg: `<b>Презаписване</b>: ${e.ip} беше на ${hex(old)}, сега е на ${hex(e.mac)}. Последният отговор печели — без проверка кой го е изпратил.${who}`, log: `#${k} r ${e.ip}→${hex(e.mac)}: презаписан` }));
          } else if (cache.length < 4) {
            cache.push({ ip: e.ip, mac: e.mac, st: 0 });
            F.push(snap({ at: "insert", ev: k, pkt: e, hit: e.ip, chg: true, msg: `Нов запис: ${e.ip} → ${hex(e.mac)}.${who}`, log: `#${k} r ${e.ip}→${hex(e.mac)}: нов запис` }));
          }
        } else {
          const c = cache.find((x) => x.ip === e.ip);
          F.push(snap({ at: "resolve", ev: k, pkt: e, hit: c ? e.ip : null, msg: `Жертвата изпраща кадър към IP ${e.ip} (${NAME[e.ip]}). Търси MAC в кеша.` }));
          if (!c) { delivered.push(-1); F.push(snap({ at: "miss", ev: k, pkt: e, msg: "Няма запис — кадърът не се изпраща (в модела; реално би последвала ARP заявка).", log: `#${k} s ${e.ip}: няма запис` })); return; }
          delivered.push(c.mac);
          const mitm = c.mac === 0x66 && e.ip !== 66;
          F.push(snap({ at: "resolve", ev: k, pkt: e, hit: e.ip, deliv: c.mac, mitm, msg: mitm ? `Кадърът за ${NAME[e.ip]} отива при <b>нападателя</b> (${hex(c.mac)}). Той вече е <b>посредник</b>: може да чете, променя или препраща.` : `Кадърът отива при ${MACN[c.mac]} (${hex(c.mac)}) — правилно.`, log: `#${k} s ${e.ip} → ${hex(c.mac)}${mitm ? " (MITM)" : ""}` }));
        }
      });
      const gw = cache.find((x) => x.ip === 1);
      F.push(snap({ at: [], done: true, msg: `Край. Доставки: ${delivered.map((d) => (d < 0 ? "—" : hex(d))).join(", ") || "няма"}.` }));
      return { frames: F, delivered: delivered.join(","), dropped, kept, gw: gw ? gw.mac : -1 };
    },
  };

  const html = `
<div class="prose">
  <p><dfn data-g="подслушване">Подслушването</dfn> събира информация от комуникацията. При нешифрован трафик съдържанието може да се разкрие, а при шифрован остава част от метаинформацията — адреси, размери, моменти. Шифроването защитава определени свойства на канала, а не автоматично всички крайни устройства. Активният нападател променя, вмъква, повтаря или прекъсва; <dfn data-g="replay">replay</dfn> може да бъде проблем дори без промяна на нито един бит.</p>
  <p><dfn data-g="spoofing">Spoofing</dfn> е подправяне на източник или идентичност: адрес, домейн или представяне за друго лице. IP адрес, адрес на подател и DNS име имат различни механизми за проверка.</p>
</div>

<div class="block">
  <h3>Какво вижда наблюдателят</h3>
  <p class="muted">Превключи шифроването. Шифроването скрива съдържанието, но не и метаданните.</p>
  <div class="row"><button class="btn" id="enc-btn" aria-pressed="false">TLS: изключено</button></div>
  <div class="tbl-wrap"><table class="t" id="enc-tbl"></table></div>
</div>

<div class="block">
  <h3>Подменен IP адрес: кой получава отговора</h3>
  <p class="prose">Само изпращането на пакет с чужд <dfn data-g="ip">IP</dfn> не означава, че нападателят получава обратния трафик или може да установи произволна <dfn data-g="tcp">TCP</dfn> сесия. За реалния ефект имат значение маршрутът, протоколът и състоянието на участниците.</p>
  <div id="sp-svg"></div>
  <details class="hint"><summary>Хинт: защо отговорът отива при истинския собственик на адреса</summary><div>
    <p>Маршрутизацията доставя отговора по адреса <i>получател</i> — тоест по подменения адрес на подателя. Нападателят, който не е по пътя, не вижда отговора. Затова подменените адреси се използват при атаки, които не се нуждаят от отговор — например отражение (раздел 4) или SYN flood с подменени източници.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 7. Посредникът променя комуникационния път</h3>
  <p class="prose">При атака <dfn data-g="човек по средата">„човек по средата“</dfn> (<dfn data-g="mitm">MITM</dfn>) нападателят се поставя в комуникационния път или логически посредничи между участниците. <dfn data-g="arp">ARP</dfn> подмяна в локална мрежа и манипулиране на <dfn data-g="dns">DNS</dfn> отговори са възможни механизми при съответните условия. Удостовереното <dfn data-g="tls">TLS</dfn> свързване с правилна проверка на сертификата защитава срещу определени форми на подмяна на канала.</p>
  <div class="row" id="mitm-btn"></div>
  <div id="mitm-svg"></div>
  <div class="key" id="mitm-detail"></div>
</div>

<div class="block">
  <h3>ARP подмяна: модел на кеша</h3>
  <p class="prose">ARP разрешава IPv4 адрес към канален (MAC) адрес в локален сегмент. В модела кешът приема всеки отговор и последният печели — затова подправен отговор „шлюзът е на моя MAC“ пренасочва трафика на жертвата към нападателя. Две защити <span class="extra-tag">разширение</span>: <b>статичен запис</b> за шлюза и <dfn data-g="dai">динамична проверка на ARP (DAI)</dfn> в комутатора. Адресите са кодирани като малки числа: IP 1 = шлюз, 20 = жертва, 66 = нападател; MAC 0x01, 0x20, 0x66.</p>
  <div id="v-arp"></div>
  <details class="trap"><summary>Капан: статичният запис пази само това, което е статично</summary><div>
    <p>Пусни „Подмяна и на жертвата“ в режим „статичен запис“: шлюзът е защитен, но записът за друг адрес (тук IP 20) все още може да бъде подменен. Статичните записи не мащабират за всички адреси; затова е нужна проверка в мрежата (DAI) или защитен канал над нея (TLS).</p>
  </div></details>
  <details class="hint"><summary>Хинт: защо при DAI в сценарий 2 кадрите не тръгват</summary><div>
    <p>В модела комутаторът проверява и отхвърля само подправените отговори; законните минават. В сценарий 2 жертвата не получава законен отговор за шлюза преди да изпраща — кешът е празен и кадърът не тръгва. Моделът не симулира ARP заявката, която реално би последвала.</p>
  </div></details>
</div>

<div class="block">
  <h3>Схема 8. Канал към правилен и към подменен домейн</h3>
  <p class="prose"><dfn data-g="https">HTTPS</dfn> не доказва добросъвестност на сайта: злонамерен домейн също може да има валиден сертификат. Валиден сертификат за измамнически домейн само доказва отношение към точно този домейн според сертификационния модел. Не доказва, че сайтът е организацията, която човекът е възнамерявал да посети. Домейните тук са измислени.</p>
  <div class="row" id="dom-btn"></div>
  <div class="tbl-wrap"><table class="t" id="dom-tbl"></table></div>
  <div class="key" id="dom-detail"></div>
  <details class="trap"><summary>Капан: DNSSEC и шифрованият DNS решават различни проблеми</summary><div>
    <p><dfn data-g="dnssec">DNSSEC</dfn> удостоверява DNS данни, но не шифрова самите заявки. Шифрованото DNS пренасяне скрива заявките от наблюдател по пътя, но само по себе си не удостоверява произхода на данните.</p>
  </div></details>
</div>`;

  const MITM = [
    { k: "Пряк канал", d: "Клиентът и сървърът комуникират директно. Наблюдател по пътя вижда метаданни; без TLS — и съдържанието.", path: "direct" },
    { k: "Посредник, без TLS", d: "Нападателят е по пътя (напр. чрез ARP подмяна). Чете и може да променя всичко, после препраща — двете страни не забелязват.", path: "mitm" },
    { k: "Посредник, TLS + проверка", d: "Посредникът не може да представи валиден сертификат за истинския домейн; клиентът прекъсва. Може само да блокира — нарушава наличността, не конфиденциалността.", path: "tls" },
    { k: "Посредник, TLS без проверка", d: "Клиентът приема всеки сертификат — посредникът установява два отделни TLS канала и вижда всичко. Защитата зависи от проверката на идентичността.", path: "noverify" },
  ];
  const DOM = [
    { k: "Правилен домейн", dom: "portal.uni-example.bg", cert: true, ok: true, d: "Каналът е защитен към домейна, който потребителят е искал." },
    { k: "Сходен домейн", dom: "portal-uni-example.bg", cert: true, ok: false, d: "Валиден сертификат — но за <b>чуждия</b> домейн. Защитеният пренос към грешно избран получател не възстановява първоначалното намерение на човека." },
    { k: "Без TLS", dom: "portal.uni-example.bg", cert: false, ok: false, d: "Правилното име, но без защитен канал — подслушване и подмяна по пътя са възможни." },
  ];

  function mount(root) {
    // подслушване
    const eb = root.querySelector("#enc-btn"), et = root.querySelector("#enc-tbl");
    let enc = false;
    function renderEnc() {
      eb.setAttribute("aria-pressed", enc ? "true" : "false"); eb.textContent = "TLS: " + (enc ? "включено" : "изключено");
      et.innerHTML = "";
      et.append(h("tr", null, h("th", { text: "поле" }), h("th", { text: "видимо за наблюдателя" })));
      [["адрес на клиента", "10.0.0.20", true], ["адрес на сървъра", "192.0.2.10", true], ["момент и размер", "12:03:07 · 1460 байта", true], ["потребител и парола", "ivan / ********", false], ["съдържание на страницата", "оценки: …", false]]
        .forEach(([k, v, meta]) => {
          const vis = meta || !enc;
          et.append(h("tr", null, h("td", { text: k }), h("td", { class: "mono", style: { color: vis ? (meta ? "var(--st-cmp)" : "var(--st-swap)") : "var(--st-done)" }, text: vis ? v : "▒▒▒▒▒▒ (шифровано)" })));
        });
    }
    eb.onclick = () => { enc = !enc; renderEnc(); };
    renderEnc();

    // подменен IP
    const sp = root.querySelector("#sp-svg");
    const svg = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 640 150", width: 640 });
    const ND = [["Нападател", 80, 40, "s-swap"], ["Сървър", 560, 75, ""], ["Истински 10.0.0.20", 80, 115, "s-done"]];
    ND.forEach(([t, x, y, c]) => svg.append(S.svg("g", { class: "node " + c }, S.svg("circle", { cx: x, cy: y, r: 16 })), S.svg("text", { x: x + (x < 300 ? 24 : -24), y: y + 5, "text-anchor": x < 300 ? "start" : "end", text: t })));
    svg.append(S.svg("line", { class: "edge s-swap", x1: 100, y1: 45, x2: 540, y2: 72 }), S.svg("text", { x: 320, y: 45, "text-anchor": "middle", class: "wt", text: "заявка, подател = 10.0.0.20 (подправен)" }));
    svg.append(S.svg("line", { class: "edge s-done", x1: 540, y1: 80, x2: 100, y2: 112 }), S.svg("text", { x: 320, y: 125, "text-anchor": "middle", class: "wt", text: "отговор → 10.0.0.20 (истинският)" }));
    sp.append(h("div", { class: "tbl-wrap" }, svg));

    // MITM схема
    const mb = root.querySelector("#mitm-btn"), ms = root.querySelector("#mitm-svg"), md = root.querySelector("#mitm-detail");
    const mbs = MITM.map((m, i) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => pickM(i), text: m.k }));
    mb.append(...mbs);
    function pickM(i) {
      mbs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const m = MITM[i];
      ms.innerHTML = "";
      const g = S.svg("svg", { class: "g", style: "min-width:540px", viewBox: "0 0 640 170", width: 640 });
      const C = [70, 120], V = [570, 120], A = [320, 40];
      const node = (p, t, c) => g.append(S.svg("g", { class: "node " + c }, S.svg("circle", { cx: p[0], cy: p[1], r: 22 })), S.svg("text", { x: p[0], y: p[1] + 42, "text-anchor": "middle", text: t }));
      if (m.path === "direct") {
        g.append(S.svg("line", { class: "edge s-done", x1: C[0] + 22, y1: C[1], x2: V[0] - 22, y2: V[1] }));
      } else {
        g.append(S.svg("line", { class: "edge s-dim", x1: C[0] + 22, y1: C[1], x2: V[0] - 22, y2: V[1], "stroke-dasharray": "5 5" }));
        const blocked = m.path === "tls";
        g.append(S.svg("line", { class: "edge " + (blocked ? "s-done" : "s-swap"), x1: C[0] + 18, y1: C[1] - 12, x2: A[0] - 20, y2: A[1] + 8 }));
        g.append(S.svg("line", { class: "edge " + (blocked ? "s-dim" : "s-swap"), x1: A[0] + 20, y1: A[1] + 8, x2: V[0] - 18, y2: V[1] - 12 }));
        if (blocked) g.append(S.svg("text", { x: 190, y: 70, "text-anchor": "middle", text: "✗ сертификатът не съвпада" }));
        if (m.path === "noverify") g.append(S.svg("text", { x: 320, y: 105, "text-anchor": "middle", class: "wt", text: "TLS₁ ↔ посредник ↔ TLS₂" }));
        node(A, "посредник", "s-swap");
      }
      node(C, "клиент", "s-act"); node(V, "сървър", "s-done");
      ms.append(h("div", { class: "tbl-wrap" }, g));
      md.innerHTML = `<p><b>${m.k}.</b> ${m.d}</p>`;
    }
    pickM(1);

    // ARP
    S.viz(root.querySelector("#v-arp"), {
      id: "arp", title: "ARP кеш на жертвата", sub: "Събития: „r IP MAC“ — пристига ARP отговор; „s IP“ — жертвата изпраща кадър.",
      code: "ch03_arp",
      inputs: [
        { id: "events", label: "събития", value: "r 1 01, s 1, r 1 66, s 1, r 1 01, s 1", width: "22em" },
        { id: "mode", label: "защита", type: "select", value: "0", options: [["0", "без защита"], ["1", "статичен запис за шлюза"], ["2", "DAI в комутатора"]] },
      ],
      presets: [
        { label: "1: подмяна на шлюза", values: { events: "r 1 01, s 1, r 1 66, s 1, r 1 01, s 1" } },
        { label: "2: подмяна и на жертвата", values: { events: "s 1, r 1 66, r 20 66, s 1, s 20" } },
        { label: "3: законен нападател + подмяна", values: { events: "r 1 01, r 66 66, r 1 66, s 1, s 66" } },
      ],
      legend: [["s-act", "проверява се"], ["s-done", "правилен MAC"], ["s-swap", "MAC на нападателя"], ["s-piv", "статичен"], ["s-dim", "отхвърлено"]],
      build: algos.arp,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "IP" }), h("th", { text: "кой" }), h("th", { text: "MAC" }), h("th", { text: "вид" })));
        if (!f.cache.length) tb.append(h("tr", null, h("td", { colspan: 4, class: "muted", text: "празен кеш" })));
        f.cache.forEach((c) => {
          const bad = c.mac === 0x66 && c.ip !== 66;
          const cls = f.hit === c.ip ? (f.chg ? (bad ? "s-swap" : "s-done") : "s-act") : c.st ? "s-piv" : bad ? "s-swap" : "";
          tb.append(h("tr", null, h("td", { class: cls, text: c.ip }), h("td", { class: cls, text: NAME[c.ip] }), h("td", { class: cls, text: hex(c.mac) }), h("td", { class: cls, text: c.st ? "статичен" : "динамичен" })));
        });
        const evs = h("div", { class: "row" });
        f.pkt && evs.append(h("span", { class: "pill " + (f.drop ? "s-dim" : f.pkt.type === "r" ? (f.pkt.mac === 0x66 && f.pkt.ip !== 66 ? "s-swap" : "s-act") : f.mitm ? "s-swap" : "s-done"),
          text: f.pkt.type === "r" ? `ARP: ${f.pkt.ip} е на ${hex(f.pkt.mac)}${f.drop ? " — отхвърлен" : ""}` : `кадър към ${f.pkt.ip}${f.deliv != null ? " → " + hex(f.deliv) : ""}` }));
        const dl = h("p", { class: "mono", text: "доставки: " + (f.delivered.map((d) => (d < 0 ? "—" : hex(d) + (d === 0x66 ? "!" : ""))).join("  ") || "—") });
        st.append(h("div", { class: "split" }, h("div", { class: "tbl-wrap" }, tb), h("div", { style: { display: "grid", gap: "8px", alignContent: "start" } }, h("span", { class: "eyebrow", text: MODES[f.md] }), evs, dl)));
      },
    });

    // домейни
    const db = root.querySelector("#dom-btn"), dt = root.querySelector("#dom-tbl"), dd = root.querySelector("#dom-detail");
    const dbs = DOM.map((d, i) => h("button", { class: "btn", "aria-pressed": "false", onclick: () => pickD(i), text: d.k }));
    db.append(...dbs);
    function pickD(i) {
      dbs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const d = DOM[i];
      dt.innerHTML = "";
      dt.append(h("tr", null, h("th", { text: "въпрос" }), h("th", { text: "отговор" })));
      [["домейн в адресната лента", d.dom, null], ["защитен канал (TLS)", d.cert ? "да" : "не", d.cert], ["сертификатът е за този домейн", d.cert ? "да" : "—", d.cert], ["това е организацията, която искам", d.ok ? "да" : "НЕ", d.ok]]
        .forEach(([q, a, ok]) => dt.append(h("tr", null, h("td", { text: q }), h("td", { class: "mono", style: { color: ok == null ? "inherit" : ok ? "var(--st-done)" : "var(--st-swap)" }, text: a }))));
      dd.innerHTML = `<p>${d.d}</p>`;
    }
    pickD(1);
  }

  S.chapter({ id: "posrednik", order: 3, num: "3", group: "Мрежови атаки", title: "Подслушване, подмяна и посредник", lead: "Какво вижда наблюдателят, защо подменен адрес не дава сесия, как посредникът влиза в пътя (ARP модел) и какво доказва сертификатът.", html, mount, algos });
})();
