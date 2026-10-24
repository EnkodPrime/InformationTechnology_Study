/* Раздел 10 — Автомобилни и индустриални комуникации (извън конспекта):
   CAN арбитраж, LIN график, FlexRay слотове, RS-485, Modbus RTU/TCP, шлюзове. */
(function () {
  const S = window.Study, h = S.h;
  const hx = (b) => b.toString(16).toUpperCase().padStart(2, "0");
  const b11 = (v) => v.toString(2).padStart(11, "0");

  function crc16(b, F) {
    let c = 0xffff;
    F && F.push({ at: "init", c, msg: "Начало: регистър FFFF." });
    b.forEach((x, i) => {
      c ^= x;
      F && F.push({ at: "xor", i, c, msg: `Байт ${i} = ${hx(x)} се XOR-ва в младшия байт.`, log: `[${i}] ^${hx(x)} → ${c.toString(16).toUpperCase().padStart(4, "0")}` });
      for (let k = 0; k < 8; k++) { const l = c & 1; c = l ? (c >>> 1) ^ 0xa001 : c >>> 1; F && F.push({ at: ["bit", l ? "poly" : "shift"], i, k, lsb: l, c, msg: `Бит ${k}: младшият е ${l} → ${l ? "изместване и XOR с A001" : "само изместване"}.` }); }
    });
    return c;
  }
  function parseHexBytes(s, max) {
    const p = String(s).trim().split(/[\s,]+/).filter(Boolean);
    if (!p.length) throw new Error("Въведи поне един байт.");
    if (p.length > max) throw new Error(`Най-много ${max} байта.`);
    return p.map((x) => { if (!/^[0-9a-fA-F]{1,2}$/.test(x)) throw new Error(`„${x}“ не е байт в hex.`); return parseInt(x, 16); });
  }

  const algos = {
    /* Като can_arbitrate() в C */
    can({ ids }) {
      const p = String(ids).trim().split(/[\s,]+/).filter(Boolean);
      if (p.length < 2) throw new Error("Нужни са поне два възела.");
      if (p.length > 6) throw new Error("Най-много 6 възела.");
      const I = p.map((x) => { const v = /^0x/i.test(x) ? parseInt(x, 16) : NaN; if (!Number.isInteger(v) || v < 0 || v > 0x7ff) throw new Error(`„${x}“: 11-битов идентификатор в hex, 0x000…0x7FF.`); return v; });
      if (new Set(I).size !== I.length) throw new Error("Идентификаторите трябва да са различни (иначе арбитражът не разрешава конфликта).");
      const act = I.map(() => true), lost = I.map(() => -1), F = [], bus = [];
      F.push({ I, act: act.slice(), lost: lost.slice(), bus: [], pos: -1, msg: `${I.length} възела започват кадър едновременно. Всеки изпраща идентификатора си бит по бит (старшият първи) и <b>чете шината</b>.` });
      for (let b = 10; b >= 0; b--) {
        const pos = 10 - b;
        let v = 1; I.forEach((id, i) => { if (act[i] && !((id >> b) & 1)) v = 0; });
        bus.push(v);
        F.push({ at: "bus", I, act: act.slice(), lost: lost.slice(), bus: bus.slice(), pos, msg: `Бит ${pos}: ${v ? "всички активни изпращат рецесивна 1 → шината е 1" : "поне един изпраща доминантна 0 → шината е <b>0</b>"}.`, vars: { бит: pos, шина: v } });
        const out = [];
        I.forEach((id, i) => { if (act[i] && ((id >> b) & 1) && v === 0) { act[i] = false; lost[i] = pos; out.push(i); } });
        if (out.length) F.push({ at: "lose", I, act: act.slice(), lost: lost.slice(), bus: bus.slice(), pos, out, msg: `Възел ${out.map((i) => "0x" + I[i].toString(16).toUpperCase()).join(", ")} изпраща 1, а чете 0 → <b>спира да предава</b> и остава приемник. Кадърът на другите не е повреден.`, log: `бит ${pos}: отпада ${out.map((i) => "0x" + I[i].toString(16).toUpperCase()).join(", ")}` });
      }
      const w = act.indexOf(true);
      F.push({ at: "win", I, act: act.slice(), lost: lost.slice(), bus: bus.slice(), pos: 11, win: w, done: true, msg: `Печели <b>0x${I[w].toString(16).toUpperCase()}</b> — най-малкият идентификатор = най-висок приоритет. Шината носи точно неговия идентификатор.`, log: `победител 0x${I[w].toString(16).toUpperCase()}` });
      return { frames: F, win: w, lost };
    },

    /* Като modbus_crc() в C */
    crc16({ bytes }) {
      const b = parseHexBytes(bytes, 16), F = [];
      const c = crc16(b, F);
      F.forEach((f) => { f.b = b; f.vars = { crc: f.c.toString(16).toUpperCase().padStart(4, "0") }; });
      F.push({ at: "ret", b, c, done: true, msg: `CRC = ${c.toString(16).toUpperCase().padStart(4, "0")} → в кадъра: <b>${hx(c & 255)} ${hx(c >> 8)}</b> (младшият байт първо).`, vars: { crc: c.toString(16).toUpperCase().padStart(4, "0") } });
      return { frames: F, result: `${hx(c & 255)} ${hx(c >> 8)}` };
    },

    /* Като rtu_read()/tcp_read() в C */
    modbus({ unit, addr, count, tid }) {
      unit = S.int(unit, 0, 247, "Адресът на устройството"); addr = S.int(addr, 0, 65535, "Началният адрес"); count = S.int(count, 1, 125, "Броят регистри"); tid = S.int(tid, 0, 65535, "Transaction id");
      const pdu = [3, addr >> 8, addr & 255, count >> 8, count & 255], F = [];
      F.push({ at: "pdu", pdu, rtu: [], tcp: [], msg: `Приложен PDU: function 03 (read holding registers), начален адрес ${addr}, брой ${count} → <code>${pdu.map(hx).join(" ")}</code>. Той е <b>същият</b> и в двата варианта.` });
      const rtu = [unit, ...pdu];
      F.push({ at: "addr", pdu, rtu: rtu.slice(), tcp: [], msg: `RTU: отпред — адрес на устройството ${unit}${unit === 0 ? " (0 има broadcast роля, без отговор)" : ""}.` });
      const c = crc16(rtu); rtu.push(c & 255, c >> 8);
      F.push({ at: "crc", pdu, rtu: rtu.slice(), tcp: [], msg: `RTU: CRC-16 върху адреса и PDU → <code>${hx(c & 255)} ${hx(c >> 8)}</code>, младшият байт първо. Границите на кадъра се определят и от паузите по линията.`, log: "RTU: " + rtu.map(hx).join(" ") });
      const tcp = [tid >> 8, tid & 255, 0, 0, 0, 6, unit];
      F.push({ at: "mbap", pdu, rtu, tcp: tcp.slice(), msg: `TCP: MBAP заглавие — transaction ${tid}, protocol 0000, length 0006 (unit + 5 байта PDU), unit ${unit}. Length е нужен, защото TCP е <b>поток</b>.` });
      tcp.push(...pdu);
      F.push({ at: ["pdu", "nocrc"], pdu, rtu, tcp: tcp.slice(), done: true, msg: `TCP: същият PDU след MBAP. <b>Няма</b> RTU CRC — целостта по пътя се пази от TCP контролната сума и Ethernet FCS. Стандартният TCP порт е 502.`, log: "TCP: " + tcp.map(hx).join(" ") });
      return { frames: F, rtu: rtu.map(hx).join(" "), tcp: tcp.map(hx).join(" ") };
    },
  };

  const LEV = [
    { k: "RS-485", g: "rs-485", lay: "L1", d: "Електрически характеристики на балансирана линия. Не определя адрес, регистър, function code или формат на команда." },
    { k: "CAN", g: "can", lay: "L1–L2", d: "Кадри, побитов арбитраж по идентификатор, CRC, ACK, error frames. Идентификаторът не е адрес на ECU." },
    { k: "LIN", g: "lin", lay: "L1–L2", d: "Commander задава графика и header; определен publisher дава response. До 20 kbit/s, до 8 байта." },
    { k: "FlexRay", g: "flexray", lay: "L1–L2", d: "Синхронизиран цикъл, статични TDMA слотове и динамичен сегмент с minislots. До 10 Mbit/s на канал, до 254 байта." },
    { k: "Modbus", g: "modbus", lay: "L7", d: "Приложни операции с function codes върху coils, discrete inputs, input и holding registers. Пренася се като RTU (сериен) или TCP." },
  ];

  const html = `
<p class="prose"><span class="extra-tag">извън конспекта</span> Целият раздел е допълнителен материал от учебното ръководство (глава 9).</p>
<div class="prose">
  <p><dfn data-g="can">CAN</dfn>, <dfn data-g="lin">LIN</dfn> и <dfn data-g="flexray">FlexRay</dfn> описват комуникационни технологии за обмен между контролери. <dfn data-g="rs-485">RS-485</dfn> задава електрически характеристики, а <dfn data-g="modbus">Modbus</dfn> — приложен модел и операции с различни правила за пренасяне. Затова въпросът „Кое е по-добро, RS-485 или Modbus?“ е неправилно поставен: те могат да участват заедно.</p>
  <p>Първо се отделят четири въпроса: какъв е физическият сигнал; как се определят границите на съобщенията; кой получава право за предаване; какво означават данните. Еднакви проводници или еднаква скорост не осигуряват еднакъв протокол.</p>
</div>

<div class="block">
  <h3>Различни равнища (Схема 29)</h3>
  <div class="cards" id="lev"></div>
  <div class="key" id="lev-d"></div>
</div>

<div class="block">
  <h3>CAN: недеструктивен побитов арбитраж (Схема 30)</h3>
  <p class="prose">При едновременно начало участниците наблюдават шината. Доминантният бит 0 надделява над рецесивния 1. Ако възел предава рецесивен бит, но прочете доминантен в арбитражното поле, той прекратява участието си и остава приемник. При 0x100 и 0x180 първата различаваща позиция е 0 срещу 1 — 0x100 печели. <b>Условие:</b> стандартни 11-битови кадри за данни; пълните правила за всички формати не са моделирани.</p>
  <div id="v-can"></div>
  <details class="trap"><summary>Капан: „CAN идентификаторът е адрес на ECU“, „CAN ACK = командата е изпълнена“</summary><div>
    <p>Идентификаторът участва в арбитража и филтрирането; по-висок протокол може да зададе адресни роли, но това е допълнителен договор. CAN ACK показва, че поне един участник е приел кадъра без протоколна грешка — не че приложението е изпълнило командата. CRC и ACK не са удостоверяване или шифроване.</p>
  </div></details>
  <p class="prose">Classical CAN има до 8 байта данни в кадър, <dfn data-g="can fd">CAN FD</dfn> — до 64, с възможна по-висока скорост в частта за данни; арбитражът не се превръща автоматично в тази скорост. Контролерът оформя и проверява кадрите, трансивърът преобразува TX/RX към диференциалната шина CAN_H/CAN_L. <dfn data-g="canopen">CANopen</dfn> и SAE J1939 добавят по-високи договори; Linux SocketCAN е реална софтуерна реализация, която не превръща суров кадър автоматично в CANopen или J1939 съобщение.</p>
</div>

<div class="block">
  <h3>Стандартите над CAN по OSI слоеве</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>OSI слой</th><th>Диагностика върху CAN</th><th>Други примери</th></tr>
    <tr><td>1 Физически</td><td>ISO 11898-2; физическо кодиране в ISO 11898-1</td><td>Физически профили според CANopen или J1939</td></tr>
    <tr><td>2 Канален</td><td>ISO 11898-1</td><td>J1939-21 определя използването на CAN кадрите</td></tr>
    <tr><td>3 Мрежов</td><td>Мрежови услуги в ISO 15765-2</td><td>J1939-31</td></tr>
    <tr><td>4 Транспортен</td><td><dfn data-g="iso-tp">ISO-TP</dfn> / ISO 15765-2</td><td>J1939 TP в J1939-21</td></tr>
    <tr><td>5 Сесиен</td><td>ISO 14229-2 сесийни услуги</td><td>Не е отделен задължителен слой при CANopen</td></tr>
    <tr><td>6 Представителен</td><td>ISO 27145-2 при WWH-OBD</td><td>При CANopen — типове и кодиране в CiA 301</td></tr>
    <tr><td>7 Приложен</td><td>ISO 14229-1 <dfn data-g="uds">UDS</dfn>; ISO 14229-3</td><td>CiA 301 CANopen; J1939-71/73</td></tr>
  </table></div>
  <p class="prose">ISO 15765-2 включва транспортен протокол и мрежови услуги — свеждането му само до L4 е непълно. Той сегментира дълги диагностични съобщения в CAN кадри. J1939 TP е друга спецификация. Няма общ CAN протокол за всеки от седемте слоя.</p>
</div>

<div class="block">
  <h3>LIN: график вместо арбитраж; FlexRay: времеви слотове (Схеми 31 и 32)</h3>
  <p class="muted">Плъзни времето. Горе — LIN: <dfn data-g="commander">commander</dfn> изпраща header за всеки слот, определеният publisher дава response. Долу — FlexRay цикъл: статични слотове за A, B, C, динамичен сегмент, <dfn data-g="nit">NIT</dfn>. Широчините са условни.</p>
  <input type="range" id="sch-t" min="0" max="99" value="0" aria-label="Време" style="width:100%">
  <div id="sch-svg"></div>
  <p class="prose" id="sch-msg"></p>
  <details class="trap"><summary>Капан: „LIN и FlexRay са просто по-бавен и по-бърз CAN“</summary><div>
    <p>Механизмите за достъп са различни: LIN — организиран header и график; FlexRay — синхронизиран цикъл и статични слотове (<dfn data-g="tdma">TDMA</dfn>); CAN — побитов арбитраж. Скоростта е отделна характеристика. Предвидимият слот не доказва изпълнение на всички крайни срокове в цялото приложение.</p>
  </div></details>
</div>

<div class="block">
  <h3>RS-485: електрически интерфейс, не приложен протокол (Схема 33)</h3>
  <div class="prose">
    <p>RS-485 (TIA/EIA-485) задава електрически характеристики на драйвери и приемници за балансирана комуникация. При двупроводна <dfn data-g="half-duplex">half-duplex</dfn> връзка една диференциална двойка се използва за двете посоки по различно време. <dfn data-g="uart">UART</dfn> генерира символите от логическата страна, трансивърът реализира електрическото свързване; управлението на разрешението за предаване е отделна задача.</p>
    <p>Обичайната топология е основна линия с къси отклонения. Когато е нужно <dfn data-g="терминиране">терминиране</dfn>, резисторите са при <b>двата физически края</b>, не при всеки възел; често 120 Ω, но стойността следва кабела и проектирането. Означенията A/B не гарантират еднаква полярност при различни продукти; диференциален сигнал не е синоним на галванична изолация.</p>
  </div>
  <details class="hint"><summary>Хинт: два уреда на една двойка, едната скорост, различни протоколи</summary><div>
    <p>Единият използва Modbus RTU, другият — собствен формат. Физически обменят символи, но не разбират едни и същи команди. Електрическата съвместимост е различна от протоколната.</p>
  </div></details>
</div>

<div class="block">
  <h3>Modbus: една операция, два стека (Схеми 34 и 35)</h3>
  <p class="prose">Учебно устройство 1 има holding register с протоколен адрес 0 и стойност 250; документацията му (допускане на примера) задава мащаб 0,1 °C → 25,0 °C. Function 03 чете holding registers. RTU заявката е <code>01 03 00 00 00 01 84 0A</code>; TCP заявката е <code>00 01 00 00 00 06 01 03 00 00 00 01</code> — без <code>84 0A</code>.</p>
  <div id="v-mb"></div>
  <div id="v-crc16"></div>
  <details class="trap"><summary>Капан: „40001“ се изпраща като адрес</summary><div>
    <p>40001 в много документации е референтен номер за първи holding register, а не число в PDU. В примера изпратеният адрес е точно 0. Редът на няколко регистъра за 32-битови числа и float трябва да се провери в картата на устройството. „Поддържа Modbus“ не определя автоматично този договор.</p>
  </div></details>
  <p class="prose">libmodbus е реална библиотека с RTU и TCP backends: <code>modbus_new_rtu</code> и <code>modbus_new_tcp</code> избират пренасянето, а <code>modbus_read_registers</code> изразява приложната операция.</p>
</div>

<div class="block">
  <h3>Шлюзове: кое се запазва</h3>
  <div class="prose">
    <p>Шлюзът между CAN и Modbus не е просто преходник между два конектора: трябва да знае кое CAN поле отговаря на кой регистър, какъв е мащабът, коя стойност е актуална и как се отразява липса на данни. Суров CAN кадър, сериализиран в UDP/TCP, е тунелиране — не прозрачен L2 мост. Шлюз, който декодира J1939 обороти и ги публикува чрез MQTT или HTTP/JSON, преобразува приложни протоколи и данни. Практическият въпрос е какво се запазва: целият кадър, диагностичното съобщение или само извлечени сигнали.</p>
  </div>
  <div class="key">Смяна на физически интерфейс ≠ преобразуване на протокол ≠ преобразуване на смисъл.</div>
</div>`;

  function mount(root) {
    const lb = root.querySelector("#lev"), ld = root.querySelector("#lev-d");
    const bs = LEV.map((L, i) => h("button", { class: "card", "aria-pressed": i ? "false" : "true", onclick: () => pk(i) }, h("span", { class: "eyebrow", text: L.lay }), h("h4", null, h("dfn", { "data-g": L.g, text: L.k }))));
    lb.append(...bs);
    function pk(i) { bs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false")); ld.innerHTML = `<p><b>${LEV[i].k}</b> (${LEV[i].lay}) — ${LEV[i].d}</p>`; }
    pk(0);

    S.viz(root.querySelector("#v-can"), {
      id: "can", title: "Арбитраж на CAN шината", sub: "Редовете са възлите; долният ред е нивото на шината.",
      code: "ch10_can",
      inputs: [{ id: "ids", label: "Идентификатори (hex)", value: "0x100 0x180", width: "min(16em, calc(100vw - 90px))" }],
      presets: [{ label: "4 възела", values: { ids: "0x7F0 0x123 0x124 0x0FF" } }, { label: "Разлика в последния бит", values: { ids: "0x555 0x554 0x55C" } }],
      random: () => ({ ids: Array.from({ length: 3 }, () => "0x" + S.randInt(0, 0x7ff).toString(16).toUpperCase()).filter((v, i, a) => a.indexOf(v) === i).join(" ") }),
      legend: [["s-act", "текущ бит"], ["s-swap", "отпаднал"], ["s-done", "победител"]],
      build: algos.can,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "възел" }), ...Array.from({ length: 11 }, (_, k) => h("th", { text: 10 - k }))));
        f.I.forEach((id, i) => {
          const bits = b11(id), tr = h("tr", null, h("th", { class: f.win === i ? "s-done" : !f.act[i] ? "s-swap" : "", style: { background: "var(--cb)" }, text: "0x" + id.toString(16).toUpperCase().padStart(3, "0") }));
          for (let k = 0; k < 11; k++) {
            const gone = f.lost[i] >= 0 && k > f.lost[i];
            const cls = k === f.lost[i] ? "s-swap" : k > f.pos || gone ? "s-dim" : k === f.pos ? "s-act" : f.win === i ? "s-done" : "";
            tr.append(h("td", { class: cls, text: gone ? "·" : bits[k] }));
          }
          tb.append(tr);
        });
        const br = h("tr", null, h("th", { text: "шина" }));
        for (let k = 0; k < 11; k++) br.append(h("td", { class: k === f.pos ? "s-act" : k < f.bus.length ? "s-piv" : "", text: k < f.bus.length ? f.bus[k] : "" }));
        tb.append(br);
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });

    // LIN + FlexRay
    const tIn = root.querySelector("#sch-t"), sv = root.querySelector("#sch-svg"), sm = root.querySelector("#sch-msg");
    const LIN = [{ s: 0, e: 33, hdr: "ID 0x10 (PID 0x50): позиция на огледалото (заявка)", pub: "commander", resp: "commander" }, { s: 33, e: 66, hdr: "ID 0x11 (PID 0x11): отчетено положение", pub: "огледало", resp: "responder" }, { s: 66, e: 100, hdr: "ID 0x3C (PID 0x3C): диагностика", pub: "commander", resp: "commander" }];
    const FR = [{ s: 0, e: 15, k: "слот 1: A" }, { s: 15, e: 30, k: "слот 2: B" }, { s: 30, e: 45, k: "слот 3: C" }, { s: 45, e: 85, k: "динамичен сегмент (minislots)" }, { s: 85, e: 100, k: "NIT" }];
    function drawSch() {
      const t = +tIn.value, W = 600, sx = (v) => 10 + (v * (W - 20)) / 100, svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} 140`, width: W });
      svg.append(S.svg("text", { x: 10, y: 14, class: "wt", text: "LIN график" }), S.svg("text", { x: 10, y: 84, class: "wt", text: "FlexRay цикъл" }));
      LIN.forEach((L) => {
        const on = t >= L.s && t < L.e, mid = L.s + (L.e - L.s) * 0.35;
        svg.append(S.svg("g", { class: on && t < mid ? "s-act" : "s-piv" }, S.svg("rect", { x: sx(L.s), y: 20, width: sx(mid) - sx(L.s) - 2, height: 24, fill: "var(--cb)", stroke: "var(--c)" })));
        svg.append(S.svg("g", { class: on && t >= mid ? "s-act" : L.resp === "responder" ? "s-done" : "s-cmp" }, S.svg("rect", { x: sx(mid), y: 20, width: sx(L.e) - sx(mid) - 4, height: 24, fill: "var(--cb)", stroke: "var(--c)" })));
        svg.append(S.svg("text", { x: sx(L.s) + 4, y: 37, class: "wt", text: "header" }), S.svg("text", { x: sx(mid) + 4, y: 37, class: "wt", text: "response" }));
      });
      FR.forEach((R, i) => { const on = t >= R.s && t < R.e; svg.append(S.svg("g", { class: on ? "s-act" : i < 3 ? "s-done" : i === 3 ? "s-cmp" : "s-dim" }, S.svg("rect", { x: sx(R.s), y: 90, width: sx(R.e) - sx(R.s) - 2, height: 24, fill: "var(--cb)", stroke: "var(--c)" }))); svg.append(S.svg("text", { x: sx(R.s) + 4, y: 107, class: "wt", text: i < 3 ? R.k.split(": ")[1] : i === 3 ? "динамичен" : "NIT" })); });
      svg.append(S.svg("line", { x1: sx(t), y1: 16, x2: sx(t), y2: 122, stroke: "var(--st-swap)", "stroke-width": 2 }));
      sv.innerHTML = ""; sv.append(svg);
      const L = LIN.find((x) => t >= x.s && t < x.e), mid = L.s + (L.e - L.s) * 0.35, R = FR.find((x) => t >= x.s && t < x.e);
      sm.innerHTML = `<b>LIN:</b> ${t < mid ? `commander изпраща header (break, sync, <dfn data-g="pid">PID</dfn>) — „${L.hdr}“.` : `response публикува <b>${L.pub}</b> (${L.resp === "responder" ? "responder" : "самият commander"}) с данни и checksum.`} <b>FlexRay:</b> ${R.k}${R.k.startsWith("слот") ? " — правото е предварително определено по време." : R.k === "NIT" ? " — Network Idle Time, за времеви функции." : " — по-гъвкав обмен, не е CAN арбитраж в друга шина."}`;
      sm.querySelectorAll("dfn[data-g]").forEach((d) => d.setAttribute("tabindex", "0"));
    }
    tIn.addEventListener("input", drawSch); drawSch();

    S.viz(root.querySelector("#v-mb"), {
      id: "mb", title: "Modbus RTU срещу Modbus TCP", sub: "Еднаквият PDU е оцветен еднакво.",
      code: "ch10_modbus",
      inputs: [{ id: "unit", label: "unit", type: "number", value: 1, width: "5em" }, { id: "addr", label: "начален адрес", type: "number", value: 0, width: "6em" }, { id: "count", label: "брой", type: "number", value: 1, width: "5em" }, { id: "tid", label: "transaction id", type: "number", value: 1, width: "6em" }],
      presets: [{ label: "Пример от спецификацията", values: { unit: 17, addr: 107, count: 3, tid: 1 } }],
      legend: [["s-piv", "адрес / MBAP"], ["s-act", "PDU"], ["s-cmp", "CRC"]],
      build: algos.modbus,
      draw(st, f) {
        st.innerHTML = "";
        st.append(h("span", { class: "eyebrow", text: "Modbus RTU (сериен, напр. върху RS-485)" }));
        if (f.rtu.length) S.drawArray(st, f.rtu.map(hx), { cls: Object.fromEntries(f.rtu.map((_, i) => [i, i === 0 ? "s-piv" : i >= 6 ? "s-cmp" : "s-act"])), append: true });
        else S.drawArray(st, f.pdu.map(hx), { cls: Object.fromEntries(f.pdu.map((_, i) => [i, "s-act"])), append: true });
        st.append(h("span", { class: "eyebrow", text: "Modbus TCP ADU (MBAP + PDU)" }));
        if (f.tcp.length) S.drawArray(st, f.tcp.map(hx), { cls: Object.fromEntries(f.tcp.map((_, i) => [i, i < 7 ? "s-piv" : "s-act"])), append: true });
        else st.append(h("p", { class: "muted", text: "…" }));
      },
    });

    S.viz(root.querySelector("#v-crc16"), {
      id: "crc16", title: "Modbus CRC-16 стъпково", sub: "Отразен полином A001, начало FFFF.",
      code: "ch10_crc16",
      inputs: [{ id: "bytes", label: "Байтове (hex)", value: "01 03 00 00 00 01", width: "min(16em, calc(100vw - 90px))" }],
      presets: [{ label: "Отговор 01 03 02 00 FA", values: { bytes: "01 03 02 00 FA" } }],
      speed: 3,
      build: algos.crc16,
      draw(st, f) {
        st.innerHTML = "";
        const cls = {}; if (f.i != null) cls[f.i] = "s-act";
        S.drawArray(st, f.b.map(hx), { cls, append: true });
        const bits = f.c.toString(2).padStart(16, "0"), r = h("div", { class: "mono", style: { display: "flex", gap: "2px", fontSize: "12px" } });
        for (let i = 0; i < 16; i++) r.append(h("span", { class: i === 15 && f.lsb != null ? (f.lsb ? "s-swap" : "s-done") : "", style: { width: "1.3em", textAlign: "center", background: "var(--cb)", border: "1px solid var(--c, var(--line))", borderRadius: "2px", marginRight: i === 7 ? "6px" : 0 }, text: bits[i] }));
        st.append(h("span", { class: "eyebrow", text: "регистър" }), r, h("p", { class: "mono", text: "0x" + f.c.toString(16).toUpperCase().padStart(4, "0") }));
      },
    });
  }

  S.chapter({ id: "industrialni", order: 10, num: "10", group: "Разширение (извън конспекта)", title: "Автомобилни и индустриални комуникации", lead: "CAN арбитраж бит по бит, LIN график и FlexRay слотове, RS-485 като електрически интерфейс, Modbus RTU и TCP с истинските байтове.", html, mount, algos });
})();
