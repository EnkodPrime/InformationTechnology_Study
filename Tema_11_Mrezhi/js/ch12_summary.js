/* Раздел 12 — Систематизация: сравнителни таблици, равнища в едно изречение, изяснени въпроси, опорен план. */
(function () {
  const S = window.Study, h = S.h;

  const UNITS = [
    ["Приложен", "съобщение", "URL, име на хост", "HTTP, DNS, SMTP, SSH, NTP, DHCP", "uslugi"],
    ["Транспортен", "TCP сегмент / UDP дейтаграма", "порт", "TCP, UDP, QUIC", "transport"],
    ["Интернет (мрежов)", "IP пакет", "IP адрес, префикс", "IPv4, IPv6, ICMP, BGP", "ip"],
    ["Мрежов достъп (канален + физически)", "кадър / битове", "MAC адрес", "Ethernet, Wi-Fi, ARP", "lan"],
  ];

  const LABELS = [["phy", "физическо"], ["link", "канално"], ["net", "мрежово"], ["tr", "транспортно"], ["app", "приложно"]];
  const SENT = [
    { parts: [["Медиаконверторът", "phy"], [" сменя мед със светлина; "], ["комутаторът", "link"], [" препраща по MAC; "], ["маршрутизаторът", "net"], [" избира следващ хоп по най-дълъг префикс."]],
      why: "Три устройства, три равнища: смяна на сигнала (кадърът е същият), смяна на изходен порт по MAC, нов кадър и TTL−1 по IP." },
    { parts: [["Браузърът", "app"], [" пита "], ["DNS", "app"], [" за името, отваря "], ["TCP връзка към порт 443", "tr"], [" на "], ["адреса 198.51.100.20", "net"], [", а първият "], ["кадър отива до MAC на шлюза", "link"], ["."]],
      why: "DNS е приложен протокол; портът е транспортен; IP адресът е крайната цел; MAC адресът е само за локалния участък." },
    { parts: [["ping минава", "net"], [", но "], ["TCP към 443 получава RST", "tr"], [" — значи "], ["уеб сървърът", "app"], [" не слуша, а не че мрежата е повредена."]],
      why: "Всяко наблюдение доказва изправност до своето равнище. ICMP отговор не проверява услугите над IP." },
    { parts: [["RS-485", "phy"], [" носи "], ["Modbus RTU кадри с CRC", "link"], [", а "], ["function 03 върху регистър 0", "app"], [" е смисълът на заявката."]],
      why: "RS-485 е електрически интерфейс; RTU рамкирането и CRC са канални функции; Modbus PDU е приложната операция (разширение)." },
  ];
  const LCLS = { phy: "s-dim", link: "s-piv", net: "s-act", tr: "s-done", app: "s-cmp" };

  const FAQ = [
    { q: "MAC адресът крайната интернет самоличност ли е?", a: "Не. Той има роля в определена локална доставка и може да бъде сменян или подменян. IP адресирането и удостоверяването на участник решават други задачи.", sec: "lan" },
    { q: "Ако ping работи, значи ли, че сайтът работи?", a: "Не. Това дава ограничено свидетелство за IP достижимост и ICMP обработка. DNS, транспорт, TLS и HTTP приложението могат да имат отделни проблеми.", sec: "internet" },
    { q: "TCP изпраща ли цели файлове като единични съобщения?", a: "Не. То пренася байтов поток. Файловият или друг приложен протокол определя начало, дължина, край и смисъл на данните.", sec: "transport" },
    { q: "DNS и DNSSEC шифроват ли заявките?", a: "DNS сам по себе си не обещава конфиденциалност. DNSSEC добавя удостоверяване на определени DNS данни, не общо шифроване. Шифрованият транспорт за DNS е отделен механизъм.", sec: "uslugi" },
    { q: "Седем слоя означава ли седем задължителни заглавия?", a: "Не. OSI е референтно разделяне на функции. Конкретната технология може да обединява функции; не добавяме несъществуващи обвивки само за да станат седем.", sec: "osi" },
    { q: "Всеки стандарт за слой означава ли отделен протокол?", a: "Не. Различаваме функция, стандарт за услуги или данни и отделен протокол с управляващи съобщения. X.225 е протокол за L5; ISO 14229-2 определя сесийни услуги; JSON кодира данни, но не доказва отделен X.226 слой.", sec: "osi" },
    { q: "Ethernet означава ли задължително TCP/IP?", a: "Не. Ethernet кадърът може да носи протокол директно над L2 — например EtherCAT. IP е само един от възможните видове полезно съдържание.", sec: "lan", extra: true },
    { q: "LPC54628 може ли да обменя кадри без lwIP?", a: "Да, чрез Ethernet MAC/PHY и ENET драйвера. Отсрещната страна трябва да поддържа същия протокол. При компютър raw Ethernet достъпът се различава от обичайния TCP/UDP socket интерфейс.", sec: "lan", extra: true },
    { q: "RS-485 и Modbus една и съща мрежа ли са?", a: "Не. RS-485 задава електрически интерфейс; Modbus задава приложни операции. Modbus RTU може да използва RS-485, а Modbus TCP — TCP/IP. RS-485 може да носи и друг протокол.", sec: "industrialni", extra: true },
    { q: "CAN идентификаторът адрес на ECU ли е?", a: "Не като общо правило на базовия CAN. Той участва в арбитража и филтрирането. По-висок протокол може да зададе адресни роли, но това е допълнителен договор.", sec: "industrialni", extra: true },
    { q: "CAN ACK означава ли, че командата е изпълнена?", a: "Не. Това е канално потвърждение. За приложен или физически резултат е нужен приложен отговор или наблюдение.", sec: "industrialni", extra: true },
    { q: "LIN и FlexRay просто по-бавен и по-бърз CAN ли са?", a: "Не. LIN използва header и график, FlexRay — синхронизиран цикъл и статични слотове, CAN — побитов арбитраж. Скоростта е отделна характеристика.", sec: "industrialni", extra: true },
    { q: "CAN към LIN може ли само чрез физически преобразувател?", a: "Не за общия случай. Различават се и кадрите, и организацията на обмена. Нужна е логика за съпоставяне и пренасяне.", sec: "industrialni", extra: true },
    { q: "Bluetooth означава ли интернет връзка?", a: "Не. Bluetooth осигурява свой обмен. В разгледания сценарий шлюз с отделна Ethernet или Wi-Fi връзка публикува измерването към IP сървър.", sec: "bluetooth", extra: true },
    { q: "Central и GATT client едно и също ли са?", a: "Не. Central е роля във връзката, GATT client — при атрибутния достъп. Типичният телефон съчетава двете, но това не е универсално.", sec: "bluetooth", extra: true },
    { q: "Запазеното сдвояване означава ли текуща връзка?", a: "Не. Bonding запазва ключове за бъдещи връзки; връзката може в момента да е прекъсната.", sec: "bluetooth", extra: true },
    { q: "Няколко Bluetooth датчика към телефон Mesh ли са?", a: "Не автоматично. Това могат да са няколко отделни LE връзки. Mesh има собствено въвеждане на възли, адресиране, модели и пренасяне.", sec: "bluetooth", extra: true },
  ];

  const PLAN = [
    { t: "Определение и класификация", sec: "klasifikacia", pts: ["Определям мрежа, протокол, интерфейс, услуга.", "Класифицирам по обхват (PAN/LAN/MAN/WAN), топология (физическа/логическа) и роли (клиент–сървър/равноправни)."], ex: "TCP е протокол, надеждният поток е услуга, socket API е интерфейс. Една машина е клиент на DNS и сървър за уеб." },
    { t: "Слоести модели и капсулиране", sec: "osi", pts: ["Изреждам OSI: физически, канален, мрежов, транспортен, сесиен, представителен, приложен.", "Съпоставям с TCP/IP модела: L5–L7 → приложен; L1–L2 → мрежов достъп.", "Проследявам капсулиране и смяна на кадъра при маршрутизатор."], ex: "HTTP → TCP сегмент → IP пакет → Ethernet кадър; при всеки маршрутизатор нов кадър, TTL−1, IP адресите същите (без NAT).", sec2: "kapsulirane" },
    { t: "Локални мрежи и устройства", sec: "lan", pts: ["Различавам адаптер, суич, рутер и точка за достъп.", "Обяснявам ARP при далечна цел — MAC на шлюза.", "Определям VLAN."], ex: "Комутаторът учи MAC от изпращача и наводнява непознат получател. VLAN разделя канални домейни; между тях — маршрутизиране." },
    { t: "IP адресиране и маршрутизация", sec: "ip", pts: ["Пресмятам /24 и /26.", "Обяснявам най-дълъг префикс, gateway, NAT и TTL."], ex: "192.168.10.70/26: маска 255.255.255.192, мрежа .64, broadcast .127, хостове .65–.126. Default /0 е последният избор." },
    { t: "Транспортни протоколи", sec: "transport", pts: ["Сравнявам поток (TCP) и дейтаграма (UDP).", "Обяснявам handshake: SYN(x), SYN+ACK(y, x+1), ACK(y+1).", "Различавам контрол на поток (получател) и задръстване (мрежа)."], ex: "send(„AB“), send(„CD“) → recv може да върне „ABCD“. HTTP/3 върви по QUIC върху UDP." },
    { t: "Основни услуги и протоколи", sec: "uslugi", pts: ["Свързвам DNS, DHCP, HTTP, SMTP, IMAP, SSH, NTP с функции.", "Разграничавам сокет, протокол и API."], ex: "DNS: resolver → корен → TLD → авторитетен, кеш по TTL. DHCP: DORA. BIND, Postfix, OpenSSH, chrony, Nginx са програми, не протоколи." },
    { t: "Интернет и отваряне на страница", sec: "internet", pts: ["Различавам Интернет и Web.", "Разказвам отварянето на страница: DNS/кеш → маршрут → ARP → TCP → TLS → HTTP → допълнителни заявки.", "Отделям DNS проблем от транспортен и приложен."], ex: "По IP работи, по име — не: DNS. TCP RST: няма слушащ процес. 404: приложен отговор." },
    { t: "Допълнение за оценки", sec: "ocenki", pts: ["Пресмятам L/R.", "Различавам предаване, разпространение и RTT."], ex: "1500 B при 100 Mbit/s: 12000 / 10⁸ = 120 μs. 3000 km: ≈ 15 ms разпространение в едната посока." },
  ];

  const REAL = [
    ["Реални услуги", "BIND 9 и Unbound обслужват DNS; OpenSSH реализира SSH; Postfix е пощенски сървър за SMTP; chrony синхронизира време чрез NTP; Nginx и Apache HTTP Server обслужват HTTP."],
    ["Реално наблюдение", "Wireshark показва Ethernet кадри, IP пакети, TCP сегменти и DNS съобщения — всяко на различно равнище."],
  ];

  const SOURCES = [
    ["IETF RFC 9293 — Transmission Control Protocol", "https://www.rfc-editor.org/rfc/rfc9293.html"],
    ["IETF RFC 768 — User Datagram Protocol", "https://www.rfc-editor.org/rfc/rfc768.html"],
    ["IETF RFC 1122 — Requirements for Internet Hosts", "https://www.rfc-editor.org/rfc/rfc1122.html"],
    ["IETF RFC 8200 — Internet Protocol Version 6", "https://www.rfc-editor.org/rfc/rfc8200.html"],
    ["IETF RFC 9110 — HTTP Semantics", "https://www.rfc-editor.org/rfc/rfc9110.html"],
    ["IETF RFC 9000 — QUIC; RFC 9114 — HTTP/3", "https://www.rfc-editor.org/rfc/rfc9114.html"],
    ["IETF RFC 8446 — TLS 1.3", "https://www.rfc-editor.org/rfc/rfc8446.html"],
    ["ITU-T X.200 / ISO/IEC 7498-1 — OSI Basic Reference Model", "https://www.itu.int/rec/T-REC-X.200/en"],
    ["Modbus Application Protocol Specification V1.1b3", "https://www.modbus.org/file/secure/modbusprotocolspecification.pdf"],
    ["Bluetooth SIG — Technology Overview", "https://www.bluetooth.com/learn-about-bluetooth/tech-overview/"],
    ["Wireshark Documentation", "https://www.wireshark.org/docs/"],
    ["Цонев И., Станев С. Компютърни мрежи и комуникации. 2005.", null],
    ["Станев С., Смит П., Захариев Ф. Компютърни системи и мрежи. 2002.", null],
  ];

  const html = `
<div class="block">
  <h3>a) Слоеве, единици и адреси</h3>
  <div class="tbl-wrap"><table class="t" id="units"></table></div>
  <div class="key">Кадър ≠ пакет ≠ сегмент ≠ съобщение. MAC ≠ IP ≠ порт ≠ URL. Всяко отговаря на различен въпрос и живее на различно равнище.</div>
</div>

<div class="block">
  <h3>b) Едно изречение — няколко равнища</h3>
  <p class="muted">Всяка оцветена част е на различно равнище. Етикетът след нея казва на кое.</p>
  <div id="levels-ex" style="display:grid;gap:10px"></div>
</div>

<div class="block">
  <h3>c) Протоколи и транспорт</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Протокол</th><th>Задача</th><th>Равнище и типичен транспорт</th></tr>
    <tr><td>HTTP / HTTPS</td><td>Уеб ресурси и API</td><td>L7; HTTP/1.1 и HTTP/2 върху TCP; HTTP/3 върху QUIC/UDP</td></tr>
    <tr><td>DNS</td><td>Ресурсни записи</td><td>L7; UDP или TCP</td></tr>
    <tr><td>DHCPv4</td><td>IPv4 конфигурация</td><td>L7 върху UDP</td></tr>
    <tr><td>SMTP / IMAP / POP3</td><td>Поща</td><td>L7 върху TCP</td></tr>
    <tr><td>SSH / NTP</td><td>Защитен достъп / време</td><td>L7; SSH върху TCP, NTP обичайно UDP</td></tr>
    <tr><td>TCP / UDP / QUIC</td><td>Транспорт</td><td>L4 (QUIC върху UDP)</td></tr>
    <tr><td>IPv4 / IPv6 / ICMP</td><td>Мрежова доставка / контрол</td><td>L3; ICMP през IP</td></tr>
  </table></div>
</div>

<div class="block">
  <h3>d) Изяснени въпроси</h3>
  <div class="row"><input type="search" id="faq-q" placeholder="Търси във въпросите…" aria-label="Търси във въпросите" style="flex:1 1 240px">
    <select id="faq-f" aria-label="Филтър"><option value="">всички</option><option value="c">основно</option><option value="e">разширение</option></select></div>
  <div id="faq" style="display:grid;gap:8px"></div>
</div>

<div class="block">
  <h3>e) Опорен план</h3>
  <p class="prose">При обяснение назовавам входа и резултата, проследявам стрелките или промените стъпка по стъпка и посочвам условието, при което примерът е валиден.</p>
  <div id="plan" style="display:grid;gap:12px"></div>
  <div id="real" style="display:grid;gap:8px"></div>
  <div class="key"><b>Допълнение.</b> QUIC е име на стандартизиран транспорт, а не акроним с нормативно разгъване; историческото „Quick UDP Internet Connections“ не е официално разшифроване. Wi-Fi също не се разгъва като „Wireless Fidelity“. <span class="extra-tag">разширение</span></div>
</div>

<div class="block">
  <h3>f) Източници</h3>
  <ol class="prose" id="src" style="padding-left:1.3em"></ol>
</div>`;

  function mount(root) {
    const u = root.querySelector("#units");
    u.append(h("tr", null, ...["Слой (интернет стек)", "Единица", "Идентификатор", "Протоколи", "Раздел"].map((x) => h("th", { text: x }))));
    UNITS.forEach(([a, b, c, d, s]) => u.append(h("tr", null, h("td", { text: a }), h("td", { text: b }), h("td", { text: c }), h("td", { text: d }), h("td", null, h("a", { href: "#" + s, text: "#" + s })))));

    const lx = root.querySelector("#levels-ex");
    SENT.forEach((Sx) => {
      const p = h("p", { style: { lineHeight: "2.1" } });
      Sx.parts.forEach(([txt, lab]) => { if (!lab) { p.append(txt); return; } p.append(h("b", { text: txt }), " ", h("span", { class: "pill " + LCLS[lab], style: { opacity: 1 }, text: LABELS.find((l) => l[0] === lab)[1] }), " "); });
      lx.append(h("div", { class: "card" }, p, h("p", { text: Sx.why })));
    });

    const fq = root.querySelector("#faq"), qi = root.querySelector("#faq-q"), qf = root.querySelector("#faq-f");
    function renderFaq() {
      const s = qi.value.toLowerCase().trim(), f = qf.value;
      fq.innerHTML = "";
      FAQ.filter((F) => (!f || (f === "e") === !!F.extra) && (!s || (F.q + F.a).toLowerCase().includes(s))).forEach((F) =>
        fq.append(h("details", { class: "hint" }, h("summary", null, F.q, F.extra ? h("span", { class: "extra-tag", text: "извън" }) : null), h("div", null, h("p", { text: F.a }), h("p", null, h("a", { href: "#" + F.sec, text: "→ към раздела" }))))));
      if (!fq.children.length) fq.append(h("p", { class: "muted", text: "Няма съвпадения." }));
    }
    qi.addEventListener("input", renderFaq); qf.addEventListener("change", renderFaq); renderFaq();

    const pl = root.querySelector("#plan");
    PLAN.forEach((P, i) => pl.append(h("div", { class: "card" },
      h("h4", null, `${i + 1}. `, h("a", { href: "#" + P.sec, text: P.t })),
      h("ul", { style: { margin: 0, paddingLeft: "1.2em" } }, ...P.pts.map((x) => h("li", { text: x }))),
      h("p", null, h("b", { text: "Пример: " }), P.ex),
      P.sec2 ? h("p", null, h("a", { href: "#" + P.sec2, text: "→ и капсулирането" })) : null)));
    const re = root.querySelector("#real");
    REAL.forEach(([k, v]) => re.append(h("p", { class: "prose" }, h("b", { text: k + ": " }), v)));

    const src = root.querySelector("#src");
    SOURCES.forEach(([t, u2]) => src.append(h("li", null, u2 ? h("a", { href: u2, target: "_blank", rel: "noopener", text: t }) : t)));
  }

  S.chapter({ id: "sistematizacia", order: 12, num: "12", group: "Обобщение", title: "Систематизация и опорен план", lead: "Сравнителни таблици, равнищата в едно изречение, изяснените въпроси и опорният план.", html, mount, algos: {} });
})();
