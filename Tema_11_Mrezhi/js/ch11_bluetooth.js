/* Раздел 11 — Bluetooth мрежи (разширение): Classic и LE, роли, откриване и връзка,
   GAP/GATT, декодиране на стойност, шлюз към IP, Mesh с управлявано наводняване. */
(function () {
  const S = window.Study, h = S.h;
  const hx = (b) => b.toString(16).toUpperCase().padStart(2, "0");

  function bytes(s, n) {
    const p = String(s).trim().split(/[\s,]+/).filter(Boolean);
    if (p.length !== n) throw new Error(`Очакват се точно ${n} байт${n === 1 ? "" : "а"} в hex.`);
    return p.map((x) => { if (!/^[0-9a-fA-F]{1,2}$/.test(x)) throw new Error(`„${x}“ не е байт в hex.`); return parseInt(x, 16); });
  }

  const algos = {
    /* Като battery_level()/temp_decitenths()/to_json() в C */
    gatt({ kind, val }) {
      const F = [];
      if (kind === "battery") {
        const v = bytes(val, 1);
        F.push({ kind, v, at: "blen", msg: "Battery Service (UUID 0x180F) → характеристика Battery Level (UUID 0x2A19). Спецификацията ѝ: един байт.", vars: { n: 1 } });
        if (v[0] > 100) { F.push({ kind, v, at: "brange", bad: true, msg: `0x${hx(v[0])} = ${v[0]} е извън 0…100 → не е валиден процент по спецификацията.`, vars: { стойност: v[0] } }); return { frames: F, result: -1 }; }
        F.push({ kind, v, at: ["brange", "bret"], done: true, res: v[0], msg: `0x${hx(v[0])} = <b>${v[0]} %</b>. Значението следва спецификацията на характеристиката — не е общо правило за всеки Bluetooth байт.`, vars: { процент: v[0] } });
        return { frames: F, result: v[0] };
      }
      const v = bytes(val, 2);
      F.push({ kind, v, at: "tlen", msg: "Собствена характеристика на учебния датчик. <b>Договор на примера:</b> 2 байта без знак, little-endian, стъпка 0,1 °C.", vars: { n: 2 } });
      const d = v[0] | (v[1] << 8);
      F.push({ kind, v, at: "tle", d, msg: `Little-endian: ${hx(v[0])} е младшият байт → 0x${hx(v[1])}${hx(v[0])} = ${d} десети от градуса.`, vars: { deci: d } });
      const js = `{"temperature_c":${Math.floor(d / 10)}.${d % 10}}`;
      F.push({ kind, v, at: "json", d, js, done: true, msg: `Шлюзът създава <b>нов приложен запис</b> ${S.esc(js)} и го изпраща с HTTP през Ethernet или Wi-Fi. Датчикът няма нужда от IP адрес.`, vars: { json: js } });
      return { frames: F, result: d, js };
    },

    /* Bluetooth Mesh: управлявано наводняване с TTL и кеш на видени съобщения (без C — модел) */
    mesh({ ttl, relays }) {
      ttl = S.int(ttl, 0, 8, "TTL");
      const R = new Set(String(relays).split(/[\s,]+/).filter(Boolean).map((x) => { if (!/^[A-G]$/i.test(x)) throw new Error(`„${x}“: възлите са A…G.`); return x.toUpperCase(); }));
      const N = { K: [40, 90], A: [140, 40], B: [140, 140], C: [260, 30], D: [260, 150], E: [380, 60], F: [380, 160], G: [500, 100] };
      const E = [["K", "A"], ["K", "B"], ["A", "C"], ["A", "B"], ["B", "D"], ["C", "E"], ["D", "F"], ["C", "D"], ["E", "G"], ["F", "G"], ["E", "F"]];
      const nb = (n) => E.filter((e) => e.includes(n)).map((e) => (e[0] === n ? e[1] : e[0]));
      const seen = new Set(["K"]), F = [];
      let wave = [["K", ttl]], tx = 0, dup = 0;
      F.push({ N, E, R, seen: [...seen], wave: ["K"], msg: `Ключът K публикува команда към груповия адрес „лампи“ с TTL ${ttl}. Ретранслатори: ${[...R].join(", ") || "няма"}.`, stats: { предавания: 0, дубликати: 0 } });
      while (wave.length) {
        const next = [], hops = [];
        for (const [n, t] of wave) {
          if (n !== "K" && !R.has(n)) continue;
          if (t < 1 && n !== "K") continue;
          if (n === "K" && t < 0) continue;
          tx++;
          for (const m of nb(n)) {
            hops.push([n, m]);
            if (seen.has(m)) { dup++; continue; }
            seen.add(m); next.push([m, t - 1]);
          }
        }
        if (!hops.length) break;
        F.push({ N, E, R, seen: [...seen], hops, wave: next.map((x) => x[0]), msg: `Вълна: ${hops.map(([a, b]) => a + "→" + b).join(", ")}. Нови получатели: ${next.map((x) => `${x[0]} (TTL при препредаване ${x[1]})`).join(", ") || "няма"}. Вече видени съобщения се изхвърлят (кеш на дубликати).`, stats: { предавания: tx, дубликати: dup }, log: `вълна: +${next.map((x) => x[0]).join(",") || "—"}` });
        wave = next;
      }
      const lamps = ["C", "D", "E", "F", "G"].filter((x) => seen.has(x));
      F.push({ N, E, R, seen: [...seen], wave: [], done: true, msg: `Командата стигна до ${lamps.length} от 5 лампи (${lamps.join(", ") || "—"}). Разпространението е ограничено от TTL и от това кои възли са relay — не е „безкрайно повторение от всеки възел“.`, stats: { предавания: tx, дубликати: dup } });
      return { frames: F, reached: lamps.length, tx };
    },
  };

  const FLOW = [
    ["Advertising", "Датчикът излъчва advertising пакети на трите първични канала. Може да носи малко данни — приемник може да научи нещо и без връзка.", "advertising"],
    ["Scanning", "Телефонът наблюдава за advertising пакети. Име в списъка не доказва, че устройството приема връзки (не всяко advertising е connectable).", "scanning"],
    ["Връзка", "Central започва установяването на връзка към connectable advertiser. После обменът става в планирани connection events — възможности за обмен, не непрекъснато предаване.", "central"],
    ["Откриване на услуги", "GATT client открива услугите и характеристиките на server-а. Връзката сама по себе си не значи, че приложението ги знае или има разрешение.", "gatt"],
    ["Read / Notification", "Read иска текущата стойност. За уведомления client записва CCCD. Notification е без ATT потвърждение, indication — с потвърждение.", "cccd"],
  ];

  const html = `
<p class="prose"><span class="extra-tag">разширение</span> Целият раздел е допълнителен материал от учебното ръководство (глава 10).</p>
<div class="prose">
  <p><dfn data-g="bluetooth">Bluetooth</dfn> е семейство технологии за безжична комуникация в обхвата 2,4 GHz. Типичната му употреба е <dfn data-g="pan">PAN</dfn> — лична мрежа около човек или устройство. PAN описва обхвата, а Bluetooth — начина на комуникация. Bluetooth е собствено име, а не акроним; <dfn data-g="sig">SIG</dfn> е организацията зад спецификациите.</p>
  <p><dfn data-g="bluetooth classic">Bluetooth Classic</dfn> използва <dfn data-g="br/edr">BR/EDR</dfn> и 79 канала по 1 MHz. <dfn data-g="ble">Bluetooth LE</dfn> използва 40 канала по 2 MHz, от които три са първични advertising канали. Каналите са честотни области, а не брой устройства. LE поддържа и LE Audio — „Classic е за звук, LE е само за датчици“ е грешно като общо правило. <dfn data-g="a2dp">A2DP</dfn> е Classic профил за звук; <dfn data-g="hid">HID</dfn> се отнася до клавиатури и мишки.</p>
</div>

<div class="block">
  <h3>Piconet и роли (Схема 36)</h3>
  <p class="prose">При Classic един central координира обмена с до седем активни peripherals в една <dfn data-g="piconet">piconet</dfn>. Ограничението не означава седем запаметени сдвоявания и не е общ лимит за LE. При LE <dfn data-g="central">central</dfn> започва връзката, <dfn data-g="peripheral">peripheral</dfn> е от другата страна — роли в конкретна връзка, не класификация по размер.</p>
</div>

<div class="block">
  <h3>Откриване, връзка и достъп до данни (Схема 37)</h3>
  <div class="row" id="flow-b"></div>
  <div class="key" id="flow-d"></div>
  <p class="prose"><dfn data-g="gap">GAP</dfn> описва откриване и свързване; <dfn data-g="gatt">GATT</dfn> организира атрибутите като services и characteristics; <dfn data-g="att">ATT</dfn> е протоколът за достъп до атрибути; <dfn data-g="l2cap">L2CAP</dfn> — логически канали и адаптация; <dfn data-g="hci">HCI</dfn> — интерфейс между host и controller. Това са части от Bluetooth архитектурата, а не буквални седем OSI слоя.</p>
</div>

<div class="block">
  <h3>Две различни двойки роли (Схема 38)</h3>
  <p class="muted">Превключвай ролите. Типичната комбинация е телефон = central + GATT client, датчик = peripheral + GATT server — но тя не е задължителна.</p>
  <div class="row"><label class="field"><span>Телефонът във връзката е</span><select id="r-conn"><option value="c">central</option><option value="p">peripheral</option></select></label>
    <label class="field"><span>Телефонът за атрибутите е</span><select id="r-gatt"><option value="c">GATT client</option><option value="s">GATT server</option><option value="b">и client, и server</option></select></label></div>
  <div id="r-svg"></div>
  <details class="trap"><summary>Капан: „central = GATT client“</summary><div>
    <p>Central е роля във връзката, GATT client — роля при атрибутния достъп. Те отговарят на различни въпроси: кой как участва във връзката и кой предоставя атрибутите. Едно устройство може да изпълнява и client, и server функции.</p>
  </div></details>
</div>

<div class="block">
  <h3>От услуга и характеристика към смисъл на байт (Схеми 39 и 40)</h3>
  <p class="prose">Service групира характеристики; characteristic представя стойност с тип и операции; <dfn data-g="uuid">UUID</dfn> идентифицира типа, а handle — конкретен атрибут в server-а. UUID не е адрес на устройство, handle не е TCP порт. Battery Service е 0x180F, Battery Level — 0x2A19: 0x64 = 100 %, 0x32 = 50 %. Втората характеристика е собствена — смисълът ѝ е изрично допускане на примера.</p>
  <div id="v-gatt"></div>
  <div class="key">Медиаконверторът сменя сигнала; шлюзът тук <b>създава нов приложен запис</b> според смисъла. MAC адреси, IP адреси и UUID имат различни роли и не се преобразуват един в друг по обща формула.</div>
</div>

<div class="block">
  <h3>Сдвояване, bonding и защита</h3>
  <div class="prose">
    <p><dfn data-g="pairing">Pairing</dfn> установява ключове и параметри на защита; <dfn data-g="bonding">bonding</dfn> ги запазва за бъдещи връзки; connection е текущата връзка. Може да има връзка без bonding, а запазен bond — без текуща връзка. Just Works не осигурява защита срещу активен посредник при самото сдвояване. Открит advertising пакет не е доказателство за доверено устройство.</p>
  </div>
</div>

<div class="block">
  <h3>Bluetooth Mesh: управлявано наводняване (Схема 41)</h3>
  <p class="prose"><dfn data-g="bluetooth mesh">Bluetooth Mesh</dfn> изгражда комуникация между много възли върху LE; съобщенията достигат други възли чрез препредаване. <dfn data-g="provisioning">Provisioning</dfn> въвежда устройство в мрежата. Relay препредава, Proxy дава достъп през GATT, Friend пази съобщения за Low Power Node. Управляваното наводняване използва ограничаване на живота (TTL) и обработка на дубликати. Учебен модел: ключ K, лампи C–G; задай кои възли са relay.</p>
  <div id="v-mesh"></div>
  <details class="trap"><summary>Капан: „няколко датчика към телефон = Mesh“</summary><div>
    <p>Това могат да бъдат няколко отделни LE връзки. Mesh има собствено въвеждане на възли, адресиране, модели и механизми за пренасяне. Mesh Proxy към телефон също не е автоматично IP маршрутизатор.</p>
  </div></details>
</div>`;

  function mount(root) {
    const fb = root.querySelector("#flow-b"), fd = root.querySelector("#flow-d");
    const bs = FLOW.map(([t], i) => h("button", { class: "btn", "aria-pressed": i ? "false" : "true", text: `${i + 1}. ${t}`, onclick: () => pick(i) }));
    fb.append(...bs);
    function pick(i) { bs.forEach((b, j) => b.setAttribute("aria-pressed", i === j ? "true" : "false")); fd.innerHTML = `<p><b><dfn data-g="${FLOW[i][2]}" tabindex="0">${FLOW[i][0]}</dfn></b> — ${FLOW[i][1]}</p>`; }
    pick(0);

    const rc = root.querySelector("#r-conn"), rg = root.querySelector("#r-gatt"), rs = root.querySelector("#r-svg");
    function drawR() {
      const pc = rc.value === "c", g = rg.value;
      const svg = S.svg("svg", { class: "g", viewBox: "0 0 560 170", width: 560 });
      const box = (x, t, l1, l2, c1, c2) => {
        svg.append(S.svg("text", { x: x + 80, y: 18, "text-anchor": "middle", text: t }));
        svg.append(S.svg("g", { class: c1 }, S.svg("rect", { x, y: 28, width: 160, height: 46, rx: 6, fill: "var(--cb)", stroke: "var(--c)" })), S.svg("text", { x: x + 80, y: 56, "text-anchor": "middle", text: l1 }));
        svg.append(S.svg("g", { class: c2 }, S.svg("rect", { x, y: 92, width: 160, height: 46, rx: 6, fill: "var(--cb)", stroke: "var(--c)" })), S.svg("text", { x: x + 80, y: 120, "text-anchor": "middle", text: l2 }));
      };
      const gp = g === "c" ? "GATT client" : g === "s" ? "GATT server" : "client + server", gd = g === "c" ? "GATT server" : g === "s" ? "GATT client" : "client + server";
      box(30, "телефон", pc ? "central" : "peripheral", gp, "s-act", "s-piv");
      box(370, "датчик", pc ? "peripheral" : "central", gd, "s-act", "s-piv");
      svg.append(S.svg("line", { x1: 190, y1: 51, x2: 370, y2: 51, class: "edge s-act" }), S.svg("text", { x: 280, y: 45, "text-anchor": "middle", class: "wt", text: "връзка (GAP)" }));
      svg.append(S.svg("line", { x1: 190, y1: 115, x2: 370, y2: 115, class: "edge s-piv" }), S.svg("text", { x: 280, y: 109, "text-anchor": "middle", class: "wt", text: "атрибути (GATT/ATT)" }));
      const typ = pc && g === "c";
      svg.append(S.svg("text", { x: 280, y: 162, "text-anchor": "middle", class: "wt", text: typ ? "типичната комбинация" : "възможна комбинация — ролите са независими" }));
      rs.innerHTML = ""; rs.append(svg);
    }
    rc.addEventListener("change", drawR); rg.addEventListener("change", drawR); drawR();

    S.viz(root.querySelector("#v-gatt"), {
      id: "gatt", title: "Прочетена стойност → смисъл → JSON", sub: "",
      code: "ch11_gatt",
      inputs: [{ id: "kind", label: "Характеристика", type: "select", value: "temp", options: [["battery", "Battery Level 0x2A19"], ["temp", "Собствена: температура"]] }, { id: "val", label: "Байтове (hex)", value: "FA 00", width: "8em" }],
      presets: [{ label: "Battery 0x32", values: { kind: "battery", val: "32" } }, { label: "Battery 0xC8", values: { kind: "battery", val: "C8" } }, { label: "Обърнати байтове 00 FA", values: { kind: "temp", val: "00 FA" } }],
      legend: [["s-act", "младши байт"], ["s-piv", "старши байт"], ["s-done", "резултат"]],
      build: algos.gatt,
      draw(st, f) {
        st.innerHTML = "";
        const W = 600, svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} 90`, width: W });
        const node = (x, t, s, cls) => { svg.append(S.svg("g", { class: cls }, S.svg("rect", { x, y: 18, width: 160, height: 50, rx: 6, fill: "var(--cb)", stroke: "var(--c)" }))); svg.append(S.svg("text", { x: x + 80, y: 40, "text-anchor": "middle", text: t }), S.svg("text", { x: x + 80, y: 58, "text-anchor": "middle", class: "wt", text: s })); };
        node(10, "датчик", "GATT server", "s-act"); node(220, "шлюз", "BLE ↔ HTTP", f.at === "json" ? "s-done" : "s-piv"); node(430, "сървър", "HTTP / IP", f.js ? "s-done" : "s-dim");
        svg.append(S.svg("line", { x1: 170, y1: 43, x2: 220, y2: 43, class: "edge s-act" }), S.svg("line", { x1: 380, y1: 43, x2: 430, y2: 43, class: "edge " + (f.js ? "s-done" : "") }));
        svg.append(S.svg("text", { x: 195, y: 84, "text-anchor": "middle", class: "wt", text: "Bluetooth" }), S.svg("text", { x: 405, y: 84, "text-anchor": "middle", class: "wt", text: "Ethernet/Wi-Fi" }));
        st.append(svg);
        S.drawArray(st, f.v.map(hx), { cls: f.kind === "battery" ? { 0: f.bad ? "s-swap" : f.done ? "s-done" : "s-act" } : { 0: "s-act", 1: "s-piv" }, append: true });
        if (f.d != null) st.append(h("p", { class: "mono", text: `= ${f.d} × 0,1 °C = ${(f.d / 10).toFixed(1)} °C` }));
        if (f.js) st.append(h("p", { class: "mono", html: `POST → <b>${S.esc(f.js)}</b>` }));
        if (f.res != null) st.append(h("p", { class: "mono", text: `= ${f.res} %` }));
      },
    });

    S.viz(root.querySelector("#v-mesh"), {
      id: "mesh", title: "Mesh: препредаване с TTL и кеш на дубликати", sub: "Пунктирът е радиообхватът в модела, не постоянен IP маршрут.",
      code: false,
      inputs: [{ id: "ttl", label: "TTL", type: "number", value: 3, width: "5em" }, { id: "relays", label: "Relay възли", value: "A B C D", width: "10em" }],
      presets: [{ label: "TTL 1", values: { ttl: 1 } }, { label: "Само A е relay", values: { relays: "A", ttl: 5 } }, { label: "Всички relay", values: { relays: "A B C D E F G", ttl: 5 } }],
      legend: [["s-act", "получава сега"], ["s-done", "получил"], ["s-piv", "relay"]],
      build: algos.mesh,
      draw(st, f) {
        st.innerHTML = "";
        const svg = S.svg("svg", { class: "g", viewBox: "0 0 560 200", width: 560 });
        f.E.forEach(([a, b]) => { const hot = f.hops && f.hops.some(([x, y]) => (x === a && y === b) || (x === b && y === a)); svg.append(S.svg("line", { x1: f.N[a][0], y1: f.N[a][1], x2: f.N[b][0], y2: f.N[b][1], class: "edge " + (hot ? "s-act" : ""), "stroke-dasharray": hot ? null : "4 4" })); });
        Object.entries(f.N).forEach(([n, [x, y]]) => {
          const cls = f.wave.includes(n) ? "s-act" : f.seen.includes(n) ? "s-done" : "";
          svg.append(S.svg("g", { class: "node " + cls }, S.svg("circle", { cx: x, cy: y, r: 18, "stroke-dasharray": f.R.has(n) ? "4 2" : null })), S.svg("text", { x, y: y + 5, "text-anchor": "middle", text: n }));
          if (f.R.has(n)) svg.append(S.svg("text", { x, y: y + 34, "text-anchor": "middle", class: "wt", text: "relay" }));
        });
        svg.append(S.svg("text", { x: 40, y: 130, "text-anchor": "middle", class: "wt", text: "ключ" }));
        st.append(svg);
      },
    });
  }

  S.chapter({ id: "bluetooth", order: 11, num: "11", group: "Разширение", title: "Bluetooth мрежи", lead: "Classic и LE, central/peripheral срещу GATT client/server, какво означава прочетен байт, шлюз към IP и Mesh с ограничено наводняване.", html, mount, algos });
})();
