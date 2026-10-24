/* Раздел 2 — Слоести модели: OSI и интернет стек, седемте слоя, протокол/услуга/PDU, диагностика по слоеве. */
(function () {
  const S = window.Study, h = S.h;

  /* ---------- чисти функции ---------- */
  const FMT = { text: 0, be16: 1, le16: 2 };
  const hex2 = (b) => b.toString(16).toUpperCase().padStart(2, "0");
  const algos = {
    /* Като encode()/decode16() в c/02_layers.c */
    repr({ v, fmt, rfmt }) {
      v = S.int(v, 0, 65535, "Числото");
      if (!(fmt in FMT)) throw new Error("Непознат формат.");
      if (!(rfmt in FMT)) throw new Error("Непознат формат на получателя.");
      const F = [], buf = [];
      const push = (o) => F.push(Object.assign({ v, fmt, rfmt, buf: buf.slice() }, o));
      push({ msg: `Изпращачът иска да предаде числото <b>${v}</b> във формат <b>${fmt}</b>.`, vars: { v } });
      if (fmt === "text") {
        const s = String(v);
        push({ at: "text", vars: { v, len: s.length }, msg: `Десетичен текст „${s}“ — ${s.length} символа. В UTF-8 цифрите са по един байт.` });
        for (const ch of s) {
          buf.push(ch.charCodeAt(0));
          push({ at: "textbyte", vars: { "символ": ch, "байт": "0x" + hex2(buf[buf.length - 1]) }, msg: `Символът „${ch}“ → байт <code>${hex2(buf[buf.length - 1])}</code>.`, log: `'${ch}' → ${hex2(buf[buf.length - 1])}` });
        }
      } else if (fmt === "be16") {
        buf.push(v >> 8); push({ at: "hi", vars: { "v>>8": "0x" + hex2(v >> 8) }, msg: `Big-endian: първо старшият байт <code>${hex2(v >> 8)}</code>.`, log: `hi ${hex2(v >> 8)}` });
        buf.push(v & 255); push({ at: "lo", vars: { "v&0xFF": "0x" + hex2(v & 255) }, msg: `После младшият <code>${hex2(v & 255)}</code>.`, log: `lo ${hex2(v & 255)}` });
      } else {
        buf.push(v & 255); push({ at: "lo", vars: { "v&0xFF": "0x" + hex2(v & 255) }, msg: `Little-endian: първо младшият байт <code>${hex2(v & 255)}</code>.`, log: `lo ${hex2(v & 255)}` });
        buf.push(v >> 8); push({ at: "hi", vars: { "v>>8": "0x" + hex2(v >> 8) }, msg: `После старшият <code>${hex2(v >> 8)}</code>.`, log: `hi ${hex2(v >> 8)}` });
      }
      push({ at: "ret", vars: { n: buf.length }, msg: `На линията заминават ${buf.length} байта: <code>${buf.map(hex2).join(" ")}</code>. По-ниските слоеве ги доставят <b>без да знаят</b> какво означават.` });
      let got = null, ok;
      if (rfmt === "text") {
        const s = String.fromCharCode(...buf);
        ok = fmt === "text"; got = ok ? +s : null;
        push({ recv: true, got: s, ok, vars: { "получено": JSON.stringify(s) }, msg: ok ? `Получателят чете текст: „${s}“ → ${s}. Форматите съвпадат.` : buf.every((b) => b >= 0x30 && b <= 0x39) ? `Получателят очаква текст и чете „${s}“ — байтовете случайно са ASCII цифри, но значението е грешно (${v} ≠ ${s}): тълкуването е безсмислено.` : `Получателят очаква текст, а байтовете <code>${buf.map(hex2).join(" ")}</code> не са цифри: тълкуването е безсмислено.` , inv: { text: ok ? "договорът за формат съвпада" : "несъгласуван формат", ok } });
      } else if (buf.length !== 2) {
        ok = false;
        push({ recv: true, got: "?", ok, vars: {}, msg: `Получателят очаква 2 байта, а пристигат ${buf.length}: рамкирането на съобщението също е част от договора.`, inv: { text: "несъгласуван формат", ok: false } });
      } else {
        got = rfmt === "be16" ? (buf[0] << 8) | buf[1] : (buf[1] << 8) | buf[0];
        ok = got === v;
        push({ recv: true, got, ok, at: rfmt === "be16" ? "decbe" : "decle", vars: { "получено": got }, msg: `Получателят чете като ${rfmt}: <b>${got}</b>.${ok ? "" : ` Байтовете пристигнаха правилно, но числото е грешно (${v} ≠ ${got}).`}`, inv: { text: ok ? "договорът за формат съвпада" : "доставено ≠ разбрано", ok } });
      }
      return { frames: F, bytes: buf.map(hex2).join(" "), got };
    },
  };

  /* ---------- данни ---------- */
  const LAYERS = [
    { n: 7, k: "Приложен", en: "Application", q: "Какво означава съобщението за дадена услуга?", f: "Заявки и отговори със смисъл: ресурс, домейнен запис, пренасяне на поща, операция върху модел от данни.", ex: "HTTP, DNS, SMTP, Modbus", ip: "Приложен", unit: "съобщение", trap: "Цялата потребителска програма не е L7 — браузърът рисува и обработва документи; само част от поведението му е мрежова приложна комуникация. HTTP 404 е <b>получен приложен отговор</b>, не липса на връзка." },
    { n: 6, k: "Представителен", en: "Presentation", q: "Как е записано съдържанието?", f: "Синтаксис и представяне: кодировка на текст, сериализация, формати на числа, компресиране или шифроване, когато протоколът ги предоставя.", ex: "X.226 с ASN.1/BER в MMS стека; JSON, UTF-8 като функции", ip: "Приложен", unit: "—", trap: "JSON и UTF-8 са примери за представяне, но не доказват отделен OSI процес на L6. TLS не трябва механично да се нарича „само слой 6“." },
    { n: 5, k: "Сесиен", en: "Session", q: "Коя обща дейност продължаваме и от кой етап?", f: "Организиране на диалога, синхронизация, контролни точки за възстановяване.", ex: "X.225 (ISO/IEC 8327-1): CONNECT, ACCEPT, FINISH, DISCONNECT, ABORT", ip: "Приложен", unit: "—", trap: "„TCP връзка“, „влязъл потребител“ и „OSI сесиен слой“ не са взаимозаменяеми. Уеб сесия с cookie може да надживее отделна TCP връзка. SIP не е L5 само заради името." },
    { n: 4, k: "Транспортен", en: "Transport", q: "Как данните стигат до правилния процес?", f: "Комуникация между крайни участници; портове; при TCP — надежден подреден поток, при UDP — дейтаграми.", ex: "TCP, UDP", ip: "Транспортен", unit: "сегмент / дейтаграма", trap: "„Транспортен“ не означава непременно „надежден“. Транспортно потвърждение ≠ приложен отговор." },
    { n: 3, k: "Мрежов", en: "Network", q: "През кои мрежи минава?", f: "Доставка през последователност от мрежи; IP адреси и префикси определят следващия хоп.", ex: "IPv4, IPv6, ICMP", ip: "Интернет", unit: "пакет", trap: "IP не обещава надежден подреден поток. TTL/Hop Limit се променят по пътя — „IP адресите остават“ не значи „всички байтове остават“." },
    { n: 2, k: "Канален", en: "Data Link", q: "Как се обменя по този конкретен канал?", f: "Граници на кадрите, достъп до споделена среда, локално адресиране, откриване на грешки.", ex: "Ethernet MAC, Wi-Fi MAC, CAN", ip: "Мрежов достъп", unit: "кадър", trap: "Не всеки канал използва MAC адреси и не всеки потвърждава. FCS открива грешки, но не удостоверява." },
    { n: 1, k: "Физически", en: "Physical", q: "Как битовете стават сигнал?", f: "Електрически нива, оптика или радио, кодиране на линията, синхронизация, характеристики на интерфейса.", ex: "Ethernet PHY, Wi-Fi радио, RS-485", ip: "Мрежов достъп", unit: "битове", trap: "Напрежение по проводника не доказва правилно разпознати битове. Кабелът е среда, PHY е реализация." },
  ];

  const CHECKS = [
    { o: "Светва индикаторът за връзка на Ethernet", p: "Има физическа връзка към съседа", np: "правилно IP адресиране", lay: [1] },
    { o: "ping получава отговор", p: "IP достижимост и ICMP обработка", np: "че TCP портът е достъпен; че DNS работи; че сайтът работи", lay: [1, 2, 3] },
    { o: "TCP връзката е приета", p: "Транспортна крайна точка слуша и отговаря", np: "правилна TLS проверка", lay: [1, 2, 3, 4] },
    { o: "TLS ръкостискането е успешно", p: "Защитен канал с удостоверен сървър според сертификата", np: "че HTTP приложението дава правилния ресурс", lay: [1, 2, 3, 4], tls: true },
    { o: "Получен е валиден HTTP отговор", p: "Приложният протокол работи", np: "че потребителят има право да прочете обекта; че бизнес операцията е успешна", lay: [1, 2, 3, 4, 5, 6, 7] },
  ];

  const html = `
<div class="prose">
  <p><dfn data-g="osi">OSI</dfn> моделът има седем слоя: физически, канален, мрежов, транспортен, сесиен, представителен и приложен. Той е концептуална рамка, стандартизирана в ISO/IEC 7498-1 и ITU-T X.200. Интернет стекът обичайно се описва с приложен, транспортен, интернет и слой за мрежов достъп; при петслойно описание последният се разделя на канален и физически.</p>
  <p>„Open“ означава взаимно използване на съгласувани стандарти за обмен, не непременно отворен изходен код. Седемте слоя са референтно разделяне на функции: реалната система не е длъжна да има седем програми, седем заглавия или седем устройства.</p>
</div>

<div class="block">
  <h3>Седемте слоя и въпросите, които решават (Схеми 4 и 7)</h3>
  <p class="muted">Щракни върху слой. Вдясно е съответствието с интернет стека. Номерацията започва отдолу, от физическата среда: L1 е физическият, L7 — приложният. „По-горен“ означава по-близък до смисъла на комуникацията, не по-важен или по-бърз.</p>
  <div class="split">
    <div id="osi-svg"></div>
    <div class="key" id="osi-detail"></div>
  </div>
  <details class="hint"><summary>Хинт: защо изобщо са нужни седем слоя</summary><div>
    <p>За да изпратим измерена температура, решаваме различни задачи: какво означава числото, как се кодира, кой разговор обслужва, как стига до другия процес, през кои мрежи минава и как става сигнал. Слоевете разделят тези отговорности, така че приложението запазва смисъла на измерването, когато Ethernet бъде заменен с Wi-Fi. Това е възможност за независима промяна при запазени договори — не твърдение, че слоевете нямат зависимости.</p>
  </div></details>
  <details class="trap"><summary>Капан: „TCP/IP е забравил три слоя“</summary><div>
    <p>В TCP/IP няма отделни задължителни слоеве 5 и 6. Правилната формулировка е „функциите на OSI 5–7 са обединени в приложния слой на TCP/IP“, а не „съществува само седмият слой“. Съпоставката е концептуално приближение: TLS например има роли между приложни протоколи и транспорта.</p>
  </div></details>
</div>

<div class="block">
  <h3>Логически разговор между равнопоставени слоеве (Схема 8)</h3>
  <p class="prose"><dfn data-g="протокол">Протоколът</dfn> е договор между логически равнопоставени участници — TCP от двете страни. <dfn data-g="услуга">Услугата</dfn> е поведението, предоставено нагоре — подреден байтов поток. <dfn data-g="интерфейс">Интерфейсът</dfn> е начинът за използване на услугата в конкретна система — socket API. Хоризонталният разговор се реализира чрез по-ниските слоеве: TCP не изпраща електрически сигнал направо до другия TCP.</p>
  <p class="muted">Плъзни, за да проследиш реалния път на данните. Пунктирът е логическият (хоризонтален) разговор на избрания слой.</p>
  <div class="row"><label class="field"><span>Слой на логическия разговор</span><select id="peer-l">${LAYERS.map((L) => `<option value="${L.n}"${L.n === 4 ? " selected" : ""}>L${L.n} ${L.k}</option>`).join("")}</select></label>
    <label class="field" style="flex:1 1 240px"><span>Позиция на данните</span><input type="range" id="peer-s" min="0" max="14" value="0"></label></div>
  <div id="peer-svg"></div>
  <p class="prose"><dfn data-g="pdu">PDU</dfn> е протоколна единица на разглеждания слой; <dfn data-g="sdu">SDU</dfn> е единицата данни, предоставена на услугата. В учебен случай слоят взема SDU, добавя свое управление и образува PDU. На практика са възможни разделяне, обединяване и други преобразувания — не е вярно, че всяко извикване на функция създава точно един пакет. За TCP говорим за <dfn data-g="сегмент">сегмент</dfn>, за UDP — <dfn data-g="дейтаграма">дейтаграма</dfn>, за IP — <dfn data-g="ip пакет">пакет</dfn>, за Ethernet — <dfn data-g="кадър">кадър</dfn>. <dfn data-g="payload">Полезен товар</dfn> е относително понятие: целият TCP сегмент е полезен товар за IP.</p>
</div>

<div class="block">
  <h3>Представителна функция: едно число, различни байтове</h3>
  <p class="prose">Сензорът трябва да предаде числото 1000. Текстът „1000“ в <dfn data-g="utf-8">UTF-8</dfn> е четири байта <code>31 30 30 30</code>; 16-битово число big-endian е <code>03 E8</code>, little-endian — <code>E8 03</code>. Ако страните не са съгласували формата, байтовете могат да пристигнат правилно и въпреки това да се интерпретират грешно.</p>
  <div id="v-repr"></div>
  <div class="key"><b>Доставено ≠ разбрано.</b> По-ниските слоеве доставят байтове. Значението им е договор на по-горните равнища.</div>
</div>

<div class="block">
  <h3>Референтен модел и действителна реализация</h3>
  <div class="prose">
    <p>OSI е създаден за съвместимост между различни комуникационни системи — не специално за Ethernet, Wi-Fi или CAN. Първоначалният ISO 7498 е публикуван през 1984 г. Три твърдения се проверяват <b>отделно</b>: дадена функция съответства на OSI слой; съществува стандарт за тази функция; в конкретния продукт е реализиран отделен протокол на този слой.</p>
    <p>Конкретни стандартизирани примери за горните слоеве: X.225 (ISO/IEC 8327-1) е OSI сесиен протокол със съобщения CONNECT, ACCEPT, FINISH, DISCONNECT и ABORT; X.226 (ISO/IEC 8823-1) е представителен протокол, при който страните съгласуват абстрактен синтаксис и синтаксис за пренос. В <dfn data-g="mms">MMS</dfn> комуникацията в IEC 61850 (реализацията libIEC61850 има отделни части за COTP, session, presentation и ACSE) се използват <dfn data-g="asn.1">ASN.1</dfn> и <dfn data-g="ber">BER</dfn>. Това е пример за OSI горни слоеве над TCP/IP — не основание да обявим всеки интернет протокол за седемслоен.</p>
    <p>Сесийно поведение има и в обикновени ситуации: прехвърляне на голям документ с контролна точка след част 20 може да продължи от нея след прекъсване, <b>ако</b> приложният и сесийният договор го поддържат. Самото възстановяване на TCP връзката не създава такъв механизъм (Схема 13).</p>
  </div>
  <details class="trap"><summary>Капан: „Седем слоя означава седем задължителни заглавия“</summary><div>
    <p>Не. OSI е референтно разделяне на функции. Конкретната технология може да обединява функции и да използва различен стек; не добавяме несъществуващи протоколни обвивки само за да станат седем. JSON има представителна функция, но HTTP API с JSON не става автоматично стек с отделен L6 протокол.</p>
  </div></details>
  <details class="trap"><summary>Капан: една технология = един слой</summary><div>
    <p>Ethernet има физически и канални спецификации. VPN тунелът добавя нова обвивка, която може да пренася друг IP пакет. Комутатор с IP управление пак препраща основно по L2. За класификацията се посочват конкретната функция и конкретният стек.</p>
  </div></details>
</div>

<div class="block">
  <h3>Всяка проверка дава ограничено доказателство (Схема 14)</h3>
  <p class="muted">Избери наблюдение. Зелените слоеве са доказано изправни; надписът казва какво <b>не</b> следва само от него.</p>
  <div class="row" id="chk-pick"></div>
  <div class="split"><div id="chk-svg"></div><div class="key" id="chk-detail"></div></div>
  <details class="hint"><summary>Хинт: датчикът „се вижда“, но температурата е грешна</summary><div>
    <p>Наблюдението оставя няколко възможности: лошо разпознати битове, невалидни кадри, грешен адрес, грешен формат или валидна заявка към друг регистър. OSI дава въпроси за локализиране, а не автоматична диагноза. Изправният по-нисък слой е необходима предпоставка, но не е доказателство за работа на по-горния.</p>
  </div></details>
</div>`;

  function mount(root) {
    // OSI диаграма
    const osiBox = root.querySelector("#osi-svg"), det = root.querySelector("#osi-detail");
    let sel = 4;
    const IPG = [["Приложен", 7, 5], ["Транспортен", 4, 4], ["Интернет", 3, 3], ["Мрежов достъп", 2, 1]];
    function drawOsi() {
      const rh = 38, W = 430, svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${7 * rh + 30}`, width: W });
      svg.append(S.svg("text", { x: 10, y: 14, class: "muted", text: "OSI" }), S.svg("text", { x: 280, y: 14, class: "muted", text: "Интернет стек" }));
      LAYERS.forEach((L, i) => {
        const y = 22 + i * rh, on = L.n === sel;
        const g = S.svg("g", { class: "node " + (on ? "s-act" : ""), style: "cursor:pointer", tabindex: "0" },
          S.svg("rect", { x: 10, y, width: 240, height: rh - 6, rx: 5, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--line))", "stroke-width": on ? 2.5 : 1.5 }),
          S.svg("text", { x: 22, y: y + 21, text: `L${L.n}  ${L.k}` }));
        g.addEventListener("click", () => { sel = L.n; drawOsi(); });
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sel = L.n; drawOsi(); } });
        svg.append(g);
      });
      IPG.forEach(([nm, top, bot]) => {
        const y1 = 22 + (7 - top) * rh, y2 = 22 + (7 - bot) * rh + rh - 6, on = sel <= top && sel >= bot;
        svg.append(S.svg("g", { class: "node " + (on ? "s-piv" : "") }, S.svg("rect", { x: 270, y: y1, width: 150, height: y2 - y1, rx: 5, fill: "var(--cb, var(--panel-2))", stroke: "var(--c, var(--line))", "stroke-width": 1.5 }),
          S.svg("text", { x: 345, y: (y1 + y2) / 2 + 5, "text-anchor": "middle", text: nm })));
        svg.append(S.svg("line", { x1: 250, y1: (y1 + y2) / 2, x2: 270, y2: (y1 + y2) / 2, class: "edge" }));
      });
      osiBox.innerHTML = ""; osiBox.append(svg);
      const L = LAYERS.find((x) => x.n === sel);
      det.innerHTML = `<p><b>L${L.n} ${L.k}</b> <span class="muted">(${L.en} Layer)</span></p><p><i>${L.q}</i></p><p>${L.f}</p><p><b>Примери:</b> ${L.ex}. <b>Единица:</b> ${L.unit}. <b>В интернет стека:</b> ${L.ip}.</p><p class="muted">${L.trap}</p>`;
    }
    drawOsi();

    // логически разговор
    const pl = root.querySelector("#peer-l"), ps = root.querySelector("#peer-s"), pbox = root.querySelector("#peer-svg");
    function drawPeer() {
      const lay = +pl.value, s = +ps.value, rh = 30, W = 560, H = 7 * rh + 60;
      // траектория: изпращач L7→L1 (s=0..6), среда (s=7), получател L1→L7 (s=8..14)
      const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
      const xs = [40, 360];
      ["Изпращач", "Получател"].forEach((t, side) => {
        svg.append(S.svg("text", { x: xs[side] + 80, y: 14, "text-anchor": "middle", class: "muted", text: t }));
        LAYERS.forEach((L, i) => {
          const y = 22 + i * rh;
          const cur = side === 0 ? s === i : s === 14 - i;
          const passed = side === 0 ? s >= i : s >= 14 - i;
          const cls = cur ? "s-act" : L.n === lay ? "s-piv" : passed ? "s-done" : "";
          svg.append(S.svg("g", { class: "node " + cls }, S.svg("rect", { x: xs[side], y, width: 160, height: rh - 6, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--line))", "stroke-width": 1.5 }),
            S.svg("text", { x: xs[side] + 10, y: y + 17, text: `L${L.n} ${L.k}` })));
        });
      });
      const ly = 22 + (7 - lay) * rh + 12;
      svg.append(S.svg("line", { x1: 200, y1: ly, x2: 360, y2: ly, class: "edge s-piv", "stroke-dasharray": "6 5" }));
      svg.append(S.svg("text", { x: 280, y: ly - 6, "text-anchor": "middle", class: "wt", text: "протокол L" + lay }));
      const my = 22 + 7 * rh + 14;
      svg.append(S.svg("line", { x1: 120, y1: my, x2: 440, y2: my, class: "edge " + (s === 7 ? "s-act" : s > 7 ? "s-done" : "") }));
      svg.append(S.svg("text", { x: 280, y: my + 18, "text-anchor": "middle", class: "wt", text: "физическа среда" }));
      svg.append(S.svg("line", { x1: 120, y1: 22 + 6 * rh + rh - 6, x2: 120, y2: my, class: "edge" }), S.svg("line", { x1: 440, y1: 22 + 6 * rh + rh - 6, x2: 440, y2: my, class: "edge" }));
      pbox.innerHTML = ""; pbox.append(svg);
      const L = s < 7 ? LAYERS[s] : s > 7 ? LAYERS[14 - s] : null;
      pbox.append(h("p", { class: "muted", html: s === 7 ? "Данните са сигнали в средата — само тук има реален пренос между машините." : s < 7 ? `Изпращач, L${L.n}: ${L.n === lay ? "<b>тук се образува PDU на избрания протокол</b> и се подава надолу като SDU на услугата под него." : "използва услугата на слоя под себе си (вертикално)."}` : `Получател, L${L.n}: ${L.n === lay ? "<b>тук равнопоставеният участник разчита PDU</b> — логическият разговор е завършен." : "разкапсулира и подава нагоре."}` }));
    }
    pl.addEventListener("change", drawPeer); ps.addEventListener("input", drawPeer); drawPeer();

    // представяне
    S.viz(root.querySelector("#v-repr"), {
      id: "repr", title: "Кодиране и тълкуване на число", sub: "Изпращачът и получателят могат да изберат различен формат.",
      code: "ch02_repr",
      inputs: [
        { id: "v", label: "Число (0…65535)", type: "number", value: 1000, width: "7em" },
        { id: "fmt", label: "Формат при изпращача", type: "select", value: "be16", options: [["text", "текст UTF-8"], ["be16", "16 бита big-endian"], ["le16", "16 бита little-endian"]] },
        { id: "rfmt", label: "Формат при получателя", type: "select", value: "le16", options: [["text", "текст UTF-8"], ["be16", "16 бита big-endian"], ["le16", "16 бита little-endian"]] },
      ],
      presets: [{ label: "Съгласувани", values: { fmt: "be16", rfmt: "be16" } }, { label: "Текст „1000“", values: { v: 1000, fmt: "text", rfmt: "text" } }, { label: "250 (FA 00)", values: { v: 250, fmt: "le16", rfmt: "be16" } }],
      legend: [["s-act", "текущ байт"], ["s-done", "тълкуването съвпада"], ["s-swap", "грешно тълкуване"]],
      build: algos.repr,
      draw(st, f) {
        st.innerHTML = "";
        const cls = {}; if (f.buf.length && !f.recv) cls[f.buf.length - 1] = "s-act";
        if (f.recv) f.buf.forEach((_, k) => (cls[k] = f.ok ? "s-done" : "s-swap"));
        st.append(h("span", { class: "eyebrow", text: "байтове на линията (hex)" }));
        if (f.buf.length) S.drawArray(st, f.buf.map(hex2), { cls, append: true });
        else st.append(h("p", { class: "muted", text: "(още няма записани байтове)" }));
        if (f.recv) st.append(h("p", { class: f.ok ? "" : "warn", html: `Получателят (${f.rfmt}) вижда: <b>${S.esc(String(f.got))}</b>` }));
      },
    });

    // проверки
    const pk = root.querySelector("#chk-pick"), cb = root.querySelector("#chk-svg"), cd = root.querySelector("#chk-detail");
    const btns = CHECKS.map((c, i) => h("button", { class: "btn", "aria-pressed": i ? "false" : "true", text: c.o, onclick: () => show(i) }));
    pk.append(...btns);
    function show(i) {
      btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false"));
      const c = CHECKS[i], W = 260, rh = 30, svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${7 * rh + 4}`, width: W });
      LAYERS.forEach((L, k) => {
        const ok = c.lay.includes(L.n);
        svg.append(S.svg("g", { class: "node " + (ok ? "s-done" : "s-dim") }, S.svg("rect", { x: 4, y: 2 + k * rh, width: W - 8, height: rh - 5, rx: 4, fill: "var(--cb, var(--panel))", stroke: "var(--c, var(--line))", "stroke-width": 1.5 }),
          S.svg("text", { x: 16, y: 2 + k * rh + 17, text: `L${L.n} ${L.k}${ok ? "  ✓" : "  ?"}` })));
      });
      cb.innerHTML = ""; cb.append(svg);
      cd.innerHTML = `<p><b>Наблюдение:</b> ${c.o}.</p><p><b>Доказва:</b> ${c.p}.</p><p><b>Не следва само от него:</b> ${c.np}.</p>${c.tls ? "<p class=\"muted\">TLS стои между HTTP и TCP и не се побира еднозначно в един OSI слой — затова не оцветяваме L5–L6.</p>" : ""}<p class="muted">Липсата на отговор може да има причини на повече от един слой.</p>`;
    }
    show(0);
  }

  S.chapter({ id: "osi", order: 2, num: "2", group: "Слоеве", title: "Слоести модели: OSI и интернет стек", lead: "Седемте OSI слоя и въпросите, които решават; протокол, услуга, интерфейс и PDU; защо всяко наблюдение доказва само част от стека.", html, mount, algos });
})();
