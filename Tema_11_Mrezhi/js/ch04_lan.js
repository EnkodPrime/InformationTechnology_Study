/* Раздел 4 — Локални мрежи и устройства: комутатор (обучение на MAC таблица), ARP решение, CRC-32 (FCS). */
(function () {
  const S = window.Study, h = S.h;
  const hx8 = (v) => (v >>> 0).toString(16).toUpperCase().padStart(8, "0");

  function parseIPv4(s, name) {
    const m = String(s).trim().match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!m) throw new Error(`${name}: очаква се IPv4 адрес, напр. 192.168.10.34.`);
    const o = m.slice(1).map(Number); if (o.some((x) => x > 255)) throw new Error(`${name}: октетите са 0…255.`);
    return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
  }
  const ipS = (v) => [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join(".");
  const bin32 = (v) => (v >>> 0).toString(2).padStart(32, "0");

  const algos = {
    /* Като switch_frame() в C, за поредица кадри "A>B@0" */
    sw({ seq, ports }) {
      ports = S.int(ports, 2, 8, "Броят портове");
      const items = String(seq).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      if (!items.length) throw new Error("Въведи поне един кадър във вида A>B@0.");
      if (items.length > 20) throw new Error("Най-много 20 кадъра.");
      const fr = items.map((it) => {
        const m = it.match(/^([A-Za-z])\s*>\s*([A-Za-z]|FF)\s*@\s*(\d+)$/i);
        if (!m) throw new Error(`„${it}“: формат „изпращач>получател@порт“, напр. A>B@0; broadcast е FF.`);
        const src = m[1].toUpperCase(), dst = m[2].toUpperCase(), inp = +m[3];
        if (src === "F" && m[1].length === 2) throw new Error("FF не може да е изпращач.");
        if (inp >= ports) throw new Error(`Порт ${inp} не съществува (има ${ports}).`);
        return { src, dst, inp };
      });
      const tab = [], F = [], outs = [];
      const snap = (o) => F.push(Object.assign({ tab: tab.map((e) => ({ ...e })), ports }, o));
      snap({ msg: "Таблицата е празна. Комутаторът не знае нищо за мрежата.", vars: { записи: 0 } });
      fr.forEach((x, i) => {
        const base = { k: i, fr: x };
        let e = tab.find((t) => t.mac === x.src);
        snap(Object.assign({ at: "lookup_src", hl: x.src, msg: `Кадър ${i + 1}: <b>${x.src} → ${x.dst === "FF" ? "broadcast" : x.dst}</b> пристига на порт ${x.inp}. Първо — <b>обучение</b> от адреса на изпращача.`, vars: { src: x.src, dst: x.dst, in: x.inp } }, base));
        if (!e) { tab.push({ mac: x.src, port: x.inp }); snap(Object.assign({ at: "learn", hl: x.src, newe: x.src, msg: `${x.src} не е в таблицата → записваме <b>${x.src} ↦ порт ${x.inp}</b>.`, vars: { src: x.src, in: x.inp }, log: `научи ${x.src}:${x.inp}` }, base)); }
        else if (e.port !== x.inp) { const old = e.port; e.port = x.inp; snap(Object.assign({ at: "move", hl: x.src, newe: x.src, msg: `${x.src} беше на порт ${old}, сега идва от ${x.inp} — записът се обновява (устройството е преместено).`, vars: { src: x.src, in: x.inp }, log: `${x.src}: ${old}→${x.inp}` }, base)); }
        let out = [];
        const d = x.dst !== "FF" ? tab.find((t) => t.mac === x.dst) : null;
        if (d) {
          snap(Object.assign({ at: "lookup_dst", hl: x.dst, msg: `Търсим получателя ${x.dst}: намерен на порт ${d.port}.`, vars: { dst: x.dst } }, base));
          if (d.port === x.inp) { snap(Object.assign({ at: "filter", out: [], msg: `Получателят е на същия порт, от който дойде кадърът — <b>филтриране</b>, кадърът не се препраща.`, log: `кадър ${i + 1}: филтриран`, vars: { dst: x.dst } }, base)); outs.push([]); return; }
          out = [d.port];
          snap(Object.assign({ at: "forward", out, msg: `Препращане <b>само</b> към порт ${d.port}.`, log: `кадър ${i + 1}: → ${d.port}`, vars: { dst: x.dst, out: d.port } }, base));
        } else {
          for (let p = 0; p < ports; p++) if (p !== x.inp) out.push(p);
          snap(Object.assign({ at: "flood", out, msg: x.dst === "FF" ? `Broadcast → <b>наводняване</b> към всички портове освен входния: ${out.join(", ")}.` : `${x.dst} е <b>непознат</b> → наводняване към ${out.join(", ")}. Комутаторът ще научи ${x.dst}, когато той изпрати нещо.`, log: `кадър ${i + 1}: наводнен → ${out.join(",")}`, vars: { dst: x.dst } }, base));
        }
        outs.push(out);
      });
      snap({ done: true, msg: `Край. Таблицата има ${tab.length} записа. Наводнени кадри: ${outs.filter((o) => o.length > 1).length}, препратени към един порт: ${outs.filter((o) => o.length === 1).length}, филтрирани: ${outs.filter((o) => !o.length).length}.`, vars: { записи: tab.length } });
      return { frames: F, outs, tab };
    },

    /* Като next_hop() в C */
    arp({ me, prefix, dst, gw }) {
      const a = parseIPv4(me, "Собствен адрес"), p = S.int(prefix, 0, 32, "Префиксът"), d = parseIPv4(dst, "Цел"), g = parseIPv4(gw, "Шлюз");
      const mask = p ? (0xffffffff << (32 - p)) >>> 0 : 0;
      const F = [], na = (a & mask) >>> 0, nd = (d & mask) >>> 0, local = na === nd;
      const base = { a, d, g, p, mask };
      F.push(Object.assign({ at: "mask", step: 0, msg: `Маска за /${p}: ${p} единици отляво = <code>${ipS(mask)}</code>.`, vars: { mask: ipS(mask) } }, base));
      F.push(Object.assign({ at: "cmp", step: 1, msg: `Мрежова част на собствения адрес: ${ipS(na)}; на целта: ${ipS(nd)} → ${local ? "<b>съвпадат</b>" : "<b>различни</b>"}.`, vars: { "me & mask": ipS(na), "dst & mask": ipS(nd) } }, base));
      const nh = local ? d : g;
      F.push(Object.assign({ at: local ? "local" : "remote", step: 2, local, msg: local ? `Целта е в локалния префикс → ARP заявка „Кой има ${ipS(d)}?“ — кадърът отива директно до нея.` : `Целта е извън префикса → ARP за <b>шлюза</b> ${ipS(g)}. Кадърът е до MAC на шлюза, IP пакетът остава адресиран до ${ipS(d)}.`, vars: { return: ipS(nh) }, log: `ARP за ${ipS(nh)}` }, base));
      return { frames: F, result: ipS(nh) };
    },

    /* Като crc32_bitwise() в C */
    crc({ text }) {
      const s = String(text);
      if (s.length > 12) throw new Error("Най-много 12 символа (иначе стъпките стават твърде много).");
      const b = [...s].map((c) => { const x = c.charCodeAt(0); if (x > 255) throw new Error("Само символи с код 0…255."); return x; });
      const F = [];
      let c = 0xffffffff;
      F.push({ at: "init", b, c, msg: "Начална стойност на регистъра: FFFFFFFF (за да се откриват и водещи нулеви байтове).", vars: { c: hx8(c) } });
      b.forEach((byte, i) => {
        c = (c ^ byte) >>> 0;
        F.push({ at: "xor", b, i, c, msg: `Байт ${i} = 0x${byte.toString(16).toUpperCase().padStart(2, "0")} („${S.esc(s[i])}“) се XOR-ва в младшите 8 бита на регистъра.`, vars: { i, "b[i]": "0x" + byte.toString(16).toUpperCase().padStart(2, "0"), c: hx8(c) }, log: `[${i}] ^ ${byte.toString(16).toUpperCase().padStart(2, "0")} → ${hx8(c)}` });
        for (let k = 0; k < 8; k++) {
          const lsb = c & 1;
          c = lsb ? ((c >>> 1) ^ 0xedb88320) >>> 0 : c >>> 1;
          F.push({ at: ["bit", lsb ? "poly" : "shift"], b, i, k, lsb, c, msg: `Бит ${k}: младшият бит е ${lsb} → ${lsb ? "изместване надясно и XOR с полинома EDB88320" : "само изместване надясно"}.`, vars: { i, k, c: hx8(c) } });
        }
      });
      const r = (~c) >>> 0;
      F.push({ at: "final", b, c: r, done: true, msg: `Инвертиране: FCS = <b>${hx8(r)}</b>. В кадъра се записва младшият байт първо.`, vars: { return: hx8(r) }, log: `CRC = ${hx8(r)}` });
      return { frames: F, result: hx8(r) };
    },
  };

  const DEV = [
    { k: "Мрежов адаптер", lay: "L1–L2", d: "Изпраща и приема кадри; превръща ги в сигнали по средата.", n: "Има MAC адрес за съответната канална технология." },
    { k: "Комутатор", g: "комутатор", lay: "L2", d: "Препраща кадри според канални адреси и научени съответствия към портове.", n: "Не е „по-малък рутер“. Комутатор с IP управление пак препраща основно по L2." },
    { k: "Маршрутизатор", g: "маршрутизатор", lay: "L3", d: "Препраща IP пакети между мрежи според таблица за маршрутизация.", n: "За всеки следващ участък оформя нов кадър." },
    { k: "Точка за достъп", g: "точка за достъп", lay: "L2 (безжично)", d: "Свързва безжични станции с разпределителната мрежа.", n: "Не е непременно самостоятелният маршрутизатор." },
    { k: "Домашен апарат", lay: "смесено", d: "Често съчетава комутатор, маршрутизатор, точка за достъп, DHCP сървър и NAT в една кутия.", n: "Физическата кутия не е определение на никоя от тези функции." },
  ];

  const html = `
<div class="prose">
  <p>Ethernet и Wi-Fi осигуряват локална комуникация с различни механизми за достъп до средата. Мрежовият адаптер изпраща и приема кадри. <dfn data-g="комутатор">Комутаторът</dfn> препраща кадри според канални адреси и научени съответствия към портове. <dfn data-g="маршрутизатор">Маршрутизаторът</dfn> препраща IP пакети между мрежи според таблица за маршрутизация.</p>
  <p><dfn data-g="mac адрес">MAC адресът</dfn> участва в локалната доставка и не е универсален надежден идентификатор на човек или устройство — може да бъде променян или рандомизиран. IP адресът определя позиция и логически интерфейс в мрежовата организация.</p>
</div>

<div class="block">
  <h3>Комутатор, маршрутизатор и точка за достъп (Схема 15)</h3>
  <div class="cards" id="devs"></div>
  <div class="key" id="dev-detail"></div>
</div>

<div class="block">
  <h3>Как комутаторът научава MAC адресите</h3>
  <p class="prose">Учебен модел без <dfn data-g="vlan">VLAN</dfn> и без изтичане на записите: таблицата се попълва от адреса на <b>изпращача</b>, а решението за препращане се взема по адреса на <b>получателя</b>. Непознат получател или <dfn data-g="broadcast">broadcast</dfn> се наводнява към всички портове освен входния. Формат: <code>изпращач&gt;получател@входен_порт</code>, FF е broadcast.</p>
  <div id="v-sw"></div>
  <details class="hint"><summary>Хинт: защо се учи от изпращача, а не от получателя</summary><div>
    <p>Кадърът казва със сигурност само откъде идва изпращачът — входният порт. За получателя комутаторът не знае нищо, докато той сам не изпрати кадър. Затова първият кадър към ново устройство се наводнява, а отговорът му вече се препраща точно.</p>
  </div></details>
  <details class="trap"><summary>Капан: VLAN = IP подмрежа</summary><div>
    <p>VLAN логически разделя канални домейни; IP подмрежата е понятие от мрежовия слой. В много конфигурации двете съвпадат, но са от различни равнища. Между VLAN обикновено е нужно маршрутизиране.</p>
  </div></details>
</div>

<div class="block">
  <h3>ARP: до кого отива първият кадър (Схеми 16 и 18)</h3>
  <p class="prose"><dfn data-g="arp">ARP</dfn> свързва IPv4 адрес с канален адрес в локалния сегмент. Когато целта е извън локалния префикс, хостът намира каналния адрес на следващия маршрутизатор (<dfn data-g="gateway">шлюза</dfn>), а не на далечния сървър. При IPv6 сходни задачи се изпълняват чрез Neighbor Discovery върху <dfn data-g="icmp">ICMPv6</dfn>.</p>
  <div id="v-arp"></div>
  <div class="key">Решението е <code>(me &amp; mask) == (dst &amp; mask)</code>: локален → ARP за целта; отдалечен → ARP за шлюза.</div>
  <details class="trap"><summary>Капан: „ARP намира MAC адреса на сървъра в Интернет“</summary><div>
    <p>MAC адресът има смисъл само в локалния канал. ARP не е универсален протокол за всички видове мрежи и всички адресни семейства. IPv6 не използва broadcast като IPv4.</p>
  </div></details>
</div>

<div class="block">
  <h3>Каналният слой при Ethernet, Wi-Fi и CAN</h3>
  <p class="prose">Каналният слой организира обмена върху конкретната технология: граници на кадрите, достъп до споделена среда, локално адресиране и откриване на грешки. Не всеки канал използва MAC адреси и не всеки осигурява потвърждения или повторения. <span class="extra-tag">разширение</span> (сравнението с CAN)</p>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Връзка</th><th>Адресиране и достъп</th><th>Проверка и потвърждение</th></tr>
    <tr><td>Ethernet</td><td>MAC адреси и кадри; комутация по MAC/VLAN. При full-duplex Ethernet няма CSMA/CD арбитраж.</td><td><dfn data-g="fcs">FCS</dfn>/CRC открива грешки. Обичайният Ethernet MAC не дава ACK и повторение като Wi-Fi.</td></tr>
    <tr><td>Wi-Fi</td><td>MAC кадри; достъп обичайно чрез CSMA/CA, с допълнителни механизми според варианта.</td><td>FCS; ACK и повторения за много видове unicast обмен. Не всички кадри се потвърждават.</td></tr>
    <tr><td><dfn data-g="can">CAN</dfn></td><td>Идентификатор за арбитраж и филтриране; недеструктивен побитов арбитраж.</td><td>CRC, ACK, error frames и повторно предаване според състоянието. ACK не е приложен отговор.</td></tr>
  </table></div>
</div>

<div class="block">
  <h3>FCS: CRC-32 бит по бит</h3>
  <p class="prose">При Ethernet FCS, Frame Check Sequence, съдържа контролна стойност за откриване на грешки; тя не удостоверява самоличност като криптографски подпис. Ethernet използва CRC-32 (IEEE 802.3). Тук — побитовата форма с отразения полином <code>EDB88320</code>; контролната стойност за „123456789“ е <code>CBF43926</code>. <span class="extra-tag">разширение</span> (алгоритъмът)</p>
  <div id="v-crc"></div>
  <details class="hint"><summary>Хинт: защо CRC, а не проста сума</summary><div>
    <p>CRC е остатък при деление на полиноми над GF(2). CRC-32 на Ethernet открива всички пакетни (burst) грешки с дължина до 32 бита, а при дължините на Ethernet кадрите — и всички грешки в 1, 2 или 3 бита (разстояние на Хеминг ≥ 4) — свойства, които простата сума няма. Полиномът му има нечетен брой членове (не се дели на x+1), затова, за разлика от някои други CRC, <b>не</b> гарантира откриване на всяка грешка с нечетен брой битове. Но всеки, който промени данните, може да преизчисли CRC: той защитава от смущения, не от нападател.</p>
  </div></details>
</div>

<div class="block">
  <h3>Ethernet без IP <span class="extra-tag">разширение</span></h3>
  <div class="prose">
    <p>Ethernet не изисква IP, TCP или UDP. Собствен протокол може да бъде пренесен директно в Ethernet кадри с MAC адреси и съответен <dfn data-g="ethertype">EtherType</dfn>. Такъв обмен минава през Ethernet комутатори в същата L2 мрежа, но не се маршрутизира през обикновен IP маршрутизатор без допълнителен механизъм.</p>
    <p>При LPC54628 Ethernet MAC, външен PHY и ENET драйверът позволяват изпращане и приемане на кадри без <dfn data-g="lwip">lwIP</dfn>. Firmware-ът обработва собствените заглавия и данни, а DMA/MAC и драйверът обслужват буферите. Точната икономия на flash/RAM от премахването на lwIP се установява по конкретната конфигурация и linker map. <dfn data-g="ethercat">EtherCAT</dfn> е реален пример за директно пренасяне в Ethernet с EtherType 0x88A4.</p>
  </div>
</div>`;

  function mount(root) {
    // устройства
    const box = root.querySelector("#devs"), det = root.querySelector("#dev-detail");
    const btns = DEV.map((d, i) => h("button", { class: "card", "aria-pressed": i ? "false" : "true", onclick: () => pick(i) },
      h("span", { class: "eyebrow", text: d.lay }), h("h4", null, d.g ? h("dfn", { "data-g": d.g, text: d.k }) : d.k)));
    box.append(...btns);
    function pick(i) { btns.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false")); det.innerHTML = `<p><b>${DEV[i].k}</b> (${DEV[i].lay}) — ${DEV[i].d}</p><p class="muted">${DEV[i].n}</p>`; }
    pick(0);

    // комутатор
    S.viz(root.querySelector("#v-sw"), {
      id: "sw", title: "Обучение на MAC таблицата", sub: "A е на порт 0, B на 1, C на 2, D на 3. Последният кадър: B се е преместил на порт 3.",
      code: "ch04_switch",
      inputs: [{ id: "seq", label: "Кадри", value: "A>B@0, B>A@1, C>FF@2, A>C@0, D>A@3, A>E@0, B>A@3", width: "min(30em, calc(100vw - 90px))" }, { id: "ports", label: "Портове", type: "number", value: 4, width: "5em" }],
      presets: [{ label: "Филтриране", values: { seq: "A>B@0, B>A@0, A>B@0", ports: 4 }, title: "A и B зад един и същ порт (напр. зад друг комутатор)" }, { label: "Само broadcast", values: { seq: "A>FF@0, B>FF@1, C>FF@2", ports: 4 } }],
      legend: [["s-act", "входен порт / текущ запис"], ["s-done", "изходен порт"], ["s-cmp", "нов / обновен запис"]],
      build: algos.sw,
      draw(st, f) {
        st.innerHTML = "";
        const W = 560, H = 210, P = f.ports, sx = (p) => 60 + (p * (W - 120)) / Math.max(1, P - 1);
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} ${H}`, width: W });
        svg.append(S.svg("rect", { x: 30, y: 20, width: W - 60, height: 50, rx: 8, fill: "var(--panel-2)", stroke: "var(--line)" }), S.svg("text", { x: W / 2, y: 50, "text-anchor": "middle", text: "комутатор" }));
        const owner = {}; f.tab.forEach((e) => (owner[e.port] = (owner[e.port] || []).concat(e.mac)));
        for (let p = 0; p < P; p++) {
          const isIn = f.fr && f.fr.inp === p, isOut = f.out && f.out.includes(p);
          svg.append(S.svg("line", { x1: sx(p), y1: 70, x2: sx(p), y2: 140, class: "edge " + (isIn ? "s-act" : isOut ? "s-done" : "") }));
          svg.append(S.svg("text", { x: sx(p) + 6, y: 88, class: "wt", text: "p" + p }));
          svg.append(S.svg("g", { class: "node " + (isIn ? "s-act" : isOut ? "s-done" : "") }, S.svg("circle", { cx: sx(p), cy: 160, r: 18 }), S.svg("text", { x: sx(p), y: 165, "text-anchor": "middle", text: isIn ? f.fr.src : "·" })));
          svg.append(S.svg("text", { x: sx(p), y: 198, "text-anchor": "middle", class: "wt", text: owner[p] ? "зад: " + owner[p].join(",") : "" }));
        }
        st.append(svg);
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "MAC" }), h("th", { text: "порт" })));
        f.tab.forEach((e) => tb.append(h("tr", null, h("td", { class: e.mac === f.newe ? "s-cmp" : e.mac === f.hl ? "s-act" : "", text: e.mac }), h("td", { class: e.mac === f.newe ? "s-cmp" : "", text: e.port }))));
        if (!f.tab.length) tb.append(h("tr", null, h("td", { colspan: 2, class: "muted", text: "празна" })));
        st.append(h("div", { class: "row", style: { alignItems: "start" } }, h("div", null, h("span", { class: "eyebrow", text: "MAC таблица" }), tb),
          f.fr ? h("p", { class: "mono", text: `кадър: ${f.fr.src} → ${f.fr.dst}  (вход p${f.fr.inp})` }) : null));
      },
    });

    // ARP
    S.viz(root.querySelector("#v-arp"), {
      id: "arp", title: "Локална или отдалечена цел?", sub: "Битовете вляво от чертата са мрежовата част.",
      code: "ch04_arp",
      inputs: [{ id: "me", label: "Моят IP", value: "192.168.10.34", width: "9em" }, { id: "prefix", label: "/префикс", type: "number", value: 24, width: "4.5em" }, { id: "dst", label: "Цел", value: "198.51.100.20", width: "9em" }, { id: "gw", label: "Шлюз", value: "192.168.10.1", width: "9em" }],
      presets: [{ label: "Локална цел", values: { me: "192.168.10.34", prefix: 24, dst: "192.168.10.77", gw: "192.168.10.1" } }, { label: "/26: .70 → .130", values: { me: "192.168.10.70", prefix: 26, dst: "192.168.10.130", gw: "192.168.10.65" } }, { label: "/26: .70 → .100", values: { me: "192.168.10.70", prefix: 26, dst: "192.168.10.100", gw: "192.168.10.65" } }],
      legend: [["s-piv", "мрежова част"], ["s-done", "съвпада"], ["s-swap", "различава се"]],
      build: algos.arp,
      draw(st, f) {
        st.innerHTML = "";
        const row = (lab, v, cmpTo) => {
          const b = bin32(v), c = cmpTo != null ? bin32(cmpTo) : null;
          const r = h("div", { class: "mono", style: { display: "flex", gap: "2px", alignItems: "center", fontSize: "12px", flexWrap: "nowrap" } }, h("span", { style: { width: "6.5em", flex: "none" }, text: lab }));
          for (let i = 0; i < 32; i++) {
            const net = i < f.p; let cls = net ? "s-piv" : "s-dim";
            if (c && net && f.step >= 1) cls = b[i] === c[i] ? "s-done" : "s-swap";
            r.append(h("span", { class: cls, style: { width: "1.25em", textAlign: "center", background: "var(--cb)", border: "1px solid var(--c, var(--line))", borderRadius: "2px", marginRight: i % 8 === 7 && i < 31 ? "6px" : 0 }, text: b[i] }));
          }
          r.append(h("span", { style: { marginLeft: "8px" }, text: ipS(v) }));
          return r;
        };
        st.append(h("div", { style: { display: "grid", gap: "4px", overflowX: "auto" } }, row("маска", f.mask), row("моят", f.a), row("цел", f.d, f.a)));
        if (f.step === 2) st.append(h("p", { class: f.local ? "" : "", style: { marginTop: "10px" }, html: f.local ? `ARP: „Кой има <b>${ipS(f.d)}</b>?“ → кадър директно до целта.` : `ARP: „Кой има <b>${ipS(f.g)}</b>?“ → кадър до шлюза; IP получател остава ${ipS(f.d)}.` }));
      },
    });

    // CRC
    S.viz(root.querySelector("#v-crc"), {
      id: "crc", title: "CRC-32 побитово", sub: "Регистърът е 32 бита; вдясно е младшият бит.",
      code: "ch04_crc",
      inputs: [{ id: "text", label: "Данни (ASCII)", value: "abc", width: "12em" }],
      presets: [{ label: "123456789 (проверка)", values: { text: "123456789" } }, { label: "abd (1 бит разлика)", values: { text: "abd" } }],
      speed: 3,
      build: algos.crc,
      draw(st, f) {
        st.innerHTML = "";
        const cls = {}; if (f.i != null) cls[f.i] = "s-act";
        if (f.b.length) S.drawArray(st, f.b.map((x) => x.toString(16).toUpperCase().padStart(2, "0")), { cls, append: true });
        const b = bin32(f.c), r = h("div", { class: "mono", style: { display: "flex", gap: "2px", fontSize: "12px", overflowX: "auto" } });
        for (let i = 0; i < 32; i++) r.append(h("span", { class: i === 31 && f.lsb != null ? (f.lsb ? "s-swap" : "s-done") : i >= 24 && f.at === "xor" ? "s-cmp" : "", style: { width: "1.2em", textAlign: "center", background: "var(--cb)", border: "1px solid var(--c, var(--line))", borderRadius: "2px", marginRight: i % 8 === 7 && i < 31 ? "6px" : 0 }, text: b[i] }));
        st.append(h("span", { class: "eyebrow", text: f.done ? "FCS (след инвертиране)" : "регистър c" }), r, h("p", { class: "mono", text: "0x" + hx8(f.c) }));
      },
    });
  }

  S.chapter({ id: "lan", order: 4, num: "4", group: "Адресиране", title: "Локални мрежи и устройства", lead: "Комутатор срещу маршрутизатор; как комутаторът научава MAC адресите; ARP за локална и отдалечена цел; CRC-32 в края на всеки Ethernet кадър.", html, mount, algos });
})();
