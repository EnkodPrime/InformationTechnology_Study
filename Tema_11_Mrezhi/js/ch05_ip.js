/* Раздел 5 — IP адресиране и маршрутизация: калкулатор на подмрежи, най-дълъг префикс, NAT, TTL. */
(function () {
  const S = window.Study, h = S.h;

  function parseIPv4(s, name) {
    const m = String(s).trim().match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!m) throw new Error(`${name}: очаква се IPv4 адрес, напр. 192.168.10.70.`);
    const o = m.slice(1).map(Number); if (o.some((x) => x > 255)) throw new Error(`${name}: октетите са 0…255.`);
    return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
  }
  const ipS = (v) => [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join(".");
  const maskOf = (p) => (p ? (0xffffffff << (32 - p)) >>> 0 : 0);
  const bin32 = (v) => (v >>> 0).toString(2).padStart(32, "0");

  function parseRoutes(txt) {
    const lines = String(txt).split(/\n|;/).map((x) => x.trim()).filter(Boolean);
    if (!lines.length) throw new Error("Таблицата е празна.");
    if (lines.length > 12) throw new Error("Най-много 12 маршрута.");
    return lines.map((l) => {
      const m = l.match(/^(\d+\.\d+\.\d+\.\d+)\s*\/\s*(\d+)\s*(?:->|→)?\s*(.*)$/);
      if (!m) throw new Error(`„${l}“: формат „префикс/дължина -> следващ хоп“.`);
      const a = parseIPv4(m[1], "Префикс"), len = S.int(m[2], 0, 32, "Дължината на префикса");
      if (((a & maskOf(len)) >>> 0) !== a) throw new Error(`${m[1]}/${len}: има единици в хостовата част — мрежовият адрес е ${ipS((a & maskOf(len)) >>> 0)}.`);
      return { pfx: a, len, via: m[3].trim() || "—", txt: `${m[1]}/${len}` };
    });
  }

  const algos = {
    /* Като subnet() в C */
    subnet({ ip, prefix }) {
      const a = parseIPv4(ip, "Адрес"), p = S.int(prefix, 0, 32, "Префиксът");
      const F = [], mask = maskOf(p), net = (a & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0, size = 2 ** (32 - p);
      const base = { a, p, mask, net, bc };
      F.push(Object.assign({ step: 0, msg: `Адрес ${ipS(a)} в двоичен вид. /${p} означава: първите ${p} бита са мрежова част, останалите ${32 - p} — хостова.`, vars: { addr: ipS(a), prefix: p } }, base));
      F.push(Object.assign({ step: 1, at: "mask", msg: `Маска = ${p} единици, после нули: <b>${ipS(mask)}</b>.`, vars: { mask: ipS(mask) }, log: `mask ${ipS(mask)}` }, base));
      F.push(Object.assign({ step: 2, at: "net", msg: `Мрежов адрес = addr AND mask → хостовите битове стават 0: <b>${ipS(net)}</b>.`, vars: { net: ipS(net) }, log: `net ${ipS(net)}` }, base));
      F.push(Object.assign({ step: 3, at: "bcast", msg: `Broadcast = net OR ~mask → хостовите битове стават 1: <b>${ipS(bc)}</b>.`, vars: { bcast: ipS(bc) }, log: `bcast ${ipS(bc)}` }, base));
      F.push(Object.assign({ step: 4, at: "size", msg: `Размер на блока = 2^${32 - p} = <b>${size.toLocaleString("bg")}</b> адреса.`, vars: { size } }, base));
      let first, last, hosts;
      if (p >= 31) {
        first = net; last = bc; hosts = p === 31 ? 2 : 1;
        F.push(Object.assign({ step: 5, at: "special", first, last, hosts, msg: p === 31 ? `<b>Специален случай /31</b>: двата адреса се използват за връзка точка–точка — няма отделни адрес на мрежата и broadcast.` : `<b>/32</b>: един адрес — маршрут до конкретен хост.`, vars: { hosts }, log: `хостове ${hosts}` }, base));
      } else {
        first = net + 1; last = bc - 1; hosts = size - 2;
        F.push(Object.assign({ step: 5, at: "hosts", first, last, hosts, msg: `Обичайни хостове: от <b>${ipS(first)}</b> до <b>${ipS(last)}</b> — ${hosts.toLocaleString("bg")} адреса (без мрежовия и broadcast).`, vars: { first: ipS(first), last: ipS(last), hosts }, log: `хостове ${hosts}` }, base));
      }
      F.push(Object.assign({ step: 6, at: "ret", first, last, hosts, done: true, msg: `${ipS(a)}/${p} е в мрежа ${ipS(net)}/${p}.`, vars: {} }, base));
      return { frames: F, result: [ipS(mask), ipS(net), ipS(bc), ipS(first), ipS(last), hosts].join(" ") };
    },

    /* Като lookup() в C */
    lpm({ routes, dst }) {
      const rt = parseRoutes(routes), d = parseIPv4(dst, "Цел");
      const F = [];
      let best = -1;
      F.push({ rt, d, best, msg: `Пакет към <b>${ipS(d)}</b>. Проверяваме <b>всеки</b> ред — редът в таблицата не е важен, важна е дължината на съвпадението.`, vars: { dst: ipS(d) } });
      rt.forEach((r, i) => {
        const m = maskOf(r.len), ok = ((d & m) >>> 0) === r.pfx;
        F.push({ at: ["mask", "cmp"], rt, d, best, i, ok, msg: `${r.txt}: ${ipS(d)} AND ${ipS(m)} = ${ipS((d & m) >>> 0)} ${ok ? "= префикса → <b>съвпада</b>" : "≠ " + ipS(r.pfx)}.`, vars: { i, "dst&mask": ipS((d & m) >>> 0), best }, log: `${r.txt}: ${ok ? "да" : "не"}` });
        if (ok) {
          const prev = best, better = best < 0 || r.len > rt[best].len;
          if (better) best = i;
          F.push({ at: better ? ["match", "best"] : "match", rt, d, best, i, ok, msg: better ? (prev < 0 ? `Първо съвпадение → best = ${i} (/${r.len}).` : `/${r.len} е по-дълъг от /${rt[prev].len} → по-специфичен, best = ${i}.`) : `Съвпада, но /${r.len} не е по-дълъг от /${rt[best].len} — пропускаме.`, vars: { i, best } });
        }
      });
      F.push({ at: "ret", rt, d, best, done: true, msg: best < 0 ? "Няма съвпадение и няма default маршрут → пакетът се отхвърля." : `Избран е <b>${rt[best].txt}</b> → ${S.esc(rt[best].via)}.${rt[best].len === 0 ? " Това е default маршрутът — по-специфично съвпадение няма." : ""}`, vars: { return: best }, stats: { "редове": rt.length } });
      return { frames: F, result: best };
    },

    /* Като nat_out()/nat_in() в C */
    nat({ events, pub }) {
      const P = parseIPv4(pub, "Публичен адрес");
      const ev = String(events).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      if (!ev.length) throw new Error("Въведи поне едно събитие.");
      if (ev.length > 16) throw new Error("Най-много 16 събития.");
      const tab = [], F = [], res = [];
      let next = 40000;
      F.push({ tab: [], pub: P, msg: `NAT устройство с публичен адрес ${ipS(P)}. Таблицата е празна.`, vars: { next } });
      ev.forEach((e) => {
        let m = e.match(/^out\s+(\d+\.\d+\.\d+\.\d+):(\d+)$/i);
        if (m) {
          const ip = parseIPv4(m[1], "Вътрешен адрес"), port = S.int(m[2], 1, 65535, "Портът");
          let k = tab.findIndex((t) => t.ip === ip && t.port === port);
          F.push({ at: "find", tab: tab.map((t) => ({ ...t })), pub: P, cur: k, ev: e, msg: `Изходящ пакет от ${ipS(ip)}:${port}. Има ли вече запис?`, vars: { src: `${ipS(ip)}:${port}` } });
          if (k >= 0) { res.push(tab[k].out); F.push({ at: "hit", tab: tab.map((t) => ({ ...t })), pub: P, cur: k, ev: e, msg: `Да — използваме същия публичен порт ${tab[k].out}. Пакетът излиза като <b>${ipS(P)}:${tab[k].out}</b>.`, vars: { out: tab[k].out }, log: `${ipS(ip)}:${port} → ${ipS(P)}:${tab[k].out}` }); }
          else { tab.push({ ip, port, out: next++ }); k = tab.length - 1; res.push(tab[k].out); F.push({ at: "new", tab: tab.map((t) => ({ ...t })), pub: P, cur: k, isNew: true, ev: e, msg: `Не — нов запис: ${ipS(ip)}:${port} ↔ ${ipS(P)}:${tab[k].out}. Адресът <b>и портът</b> на изпращача се подменят.`, vars: { out: tab[k].out, next }, log: `нов: ${ipS(ip)}:${port} → ${tab[k].out}` }); }
          return;
        }
        m = e.match(/^in\s+(\d+)$/i);
        if (m) {
          const dport = S.int(m[1], 1, 65535, "Портът");
          const k = tab.findIndex((t) => t.out === dport);
          F.push({ at: "rfind", tab: tab.map((t) => ({ ...t })), pub: P, cur: k, ev: e, msg: `Входящ пакет към ${ipS(P)}:${dport}. Търсим запис с този публичен порт.`, vars: { dport } });
          if (k >= 0) { res.push(`${ipS(tab[k].ip)}:${tab[k].port}`); F.push({ at: "rhit", tab: tab.map((t) => ({ ...t })), pub: P, cur: k, ev: e, msg: `Намерен → превежда се към <b>${ipS(tab[k].ip)}:${tab[k].port}</b>.`, vars: {}, log: `in ${dport} → ${ipS(tab[k].ip)}:${tab[k].port}` }); }
          else { res.push(0); F.push({ at: "rmiss", tab: tab.map((t) => ({ ...t })), pub: P, cur: -1, miss: true, ev: e, msg: `Няма запис → няма към кого да се преведе; пакетът не стига до вътрешна машина. Това е <b>страничен ефект</b> на преобразуването, не политика за защита.`, vars: {}, log: `in ${dport} → няма запис` }); }
          return;
        }
        throw new Error(`„${e}“: очаква се „out IP:порт“ или „in порт“.`);
      });
      return { frames: F, res };
    },
  };

  const DEF_RT = "0.0.0.0/0 -> default 203.0.113.1; 10.0.0.0/8 -> R2; 10.1.0.0/16 -> R3; 10.1.2.0/24 -> eth1 (директно); 192.168.10.0/24 -> eth0 (директно)";

  function bitRow(lab, v, p, extra = {}) {
    const b = bin32(v), r = h("div", { class: "mono", style: { display: "flex", gap: "2px", alignItems: "center", fontSize: "12px", flexWrap: "nowrap" } }, h("span", { style: { width: "6em", flex: "none" }, text: lab }));
    for (let i = 0; i < 32; i++) {
      let cls = i < p ? "s-piv" : extra.hostCls || "s-dim";
      if (extra.cls) cls = extra.cls(i) || cls;
      r.append(h("span", { class: cls, style: { width: "1.25em", textAlign: "center", background: "var(--cb)", border: "1px solid var(--c, var(--line))", borderRadius: "2px", marginRight: i % 8 === 7 && i < 31 ? "6px" : 0 }, text: b[i] }));
    }
    r.append(h("span", { style: { marginLeft: "8px" }, text: ipS(v) }));
    return r;
  }

  const html = `
<div class="prose">
  <p>IPv4 използва 32-битови адреси, а IPv6 — 128-битови. <dfn data-g="префикс">Префиксът</dfn> указва мрежовата част. При IPv4 адрес 192.168.10.34/24 мрежовият адрес е 192.168.10.0, маската е 255.255.255.0, а обичайният broadcast адрес е 192.168.10.255. Конкретните правила за използваеми адреси имат специални случаи, например /31 връзки.</p>
</div>

<div class="block">
  <h3>Калкулатор на подмрежи (Схема 17)</h3>
  <p class="prose">За /26 маската е 255.255.255.192 и блокът съдържа 64 адреса. Адрес 192.168.10.70/26 принадлежи на блока 64–127: мрежа 192.168.10.64 и broadcast 192.168.10.127; обичайният диапазон за хостове е 65–126. Първите два бита от последния октет са мрежови, а останалите шест — хостови. <b>Условие:</b> стандартна IPv4 подмрежа с broadcast семантика.</p>
  <div id="v-sub"></div>
  <div class="key"><span class="formula">net = addr &amp; mask · bcast = net | ~mask · размер = 2^(32−p) · хостове = размер − 2</span> (за p ≤ 30)</div>
  <details class="hint"><summary>Хинт: пресмятане наум за /26</summary><div>
    <p>Хостовите битове са 6 → блок 64. Блоковете в последния октет започват на 0, 64, 128, 192. 70 е в блока 64–127. Мрежата е първото число на блока (.64), broadcast — последното (.127). Това е опорният план: „Пресмятам /24 и /26“.</p>
  </div></details>
  <details class="trap"><summary>Капан: „броят хостове е винаги 2ⁿ − 2“</summary><div>
    <p>Правилото приема стандартна подмрежа с broadcast. При /31 двата адреса се използват за връзка точка–точка; /32 е един конкретен адрес.</p>
  </div></details>
</div>

<div class="block">
  <h3>Най-дългият съвпадащ префикс (Схема 19)</h3>
  <p class="prose"><dfn data-g="маршрутизатор">Маршрутизаторът</dfn> избира <dfn data-g="longest prefix match">най-дългия съответстващ префикс</dfn>. <dfn data-g="маршрут">Маршрутът</dfn> указва следващ хоп или директен интерфейс. <dfn data-g="default маршрут">Default маршрутът</dfn> /0 се използва, когато няма по-специфично съответствие. Редактирай таблицата (маршрутите се разделят с „;“) и целта.</p>
  <div id="v-lpm"></div>
  <details class="trap"><summary>Капан: „първият подходящ ред печели“</summary><div>
    <p>Longest prefix match избира най-специфичния съвпадащ префикс, а не първия визуално сходен ред. Административни предпочитания и метрики действат при построяване на таблицата и при избор между маршрути <b>към същия префикс</b>.</p>
  </div></details>
  <details class="hint"><summary>Хинт: построяване на таблицата срещу препращане</summary><div>
    <p>Разпределената маршрутизация обменя информация за достижимост — например <dfn data-g="bgp">BGP</dfn> между автономни системи. Локалното препращане на всеки пакет използва вече изградената таблица. Това са два отделни механизма: маршрутният протокол разпространява пътища, препращането ги прилага.</p>
  </div></details>
</div>

<div class="block">
  <h3>NAT: преобразуване на адреси и портове</h3>
  <p class="prose"><dfn data-g="nat">NAT</dfn> преобразува адреси, а често и портове. Той позволява споделяне на публичен IPv4 адрес, но не е равнозначен на защитна стена и не е същото като маршрутизация, макар да се извършва в същото устройство. Частният адрес не е глобално уникална интернет идентичност. Учебен модел с преобразуване на портове: <code>out IP:порт</code> — изходящ пакет, <code>in порт</code> — входящ пакет към публичния адрес.</p>
  <div id="v-nat"></div>
  <details class="trap"><summary>Капан: „NAT е защитна стена“</summary><div>
    <p>Това, че входящ пакет без запис не се превежда, е следствие от преобразуването, не политика за сигурност. Защитната стена е отделен механизъм с изрични правила.</p>
  </div></details>
</div>

<div class="block">
  <h3>IP услугата и TTL</h3>
  <div class="prose">
    <p><dfn data-g="ip">IP</dfn> предоставя доставка без обща гаранция за пристигане, ред или уникалност. <dfn data-g="ttl">TTL</dfn> при IPv4 и Hop Limit при IPv6 ограничават броя преминавания при обикаляне — не измерват оставащи секунди живот. Как се променя TTL на всеки маршрутизатор — виж лабораторията в <a href="#kapsulirane">раздел 3</a>.</p>
    <p>MTU, Maximum Transmission Unit, ограничава преносимия пакет за интерфейс или път. При IPv6 маршрутизаторите не фрагментират транзитни пакети по начина на класическия IPv4 модел.</p>
  </div>
  <div class="key">Префикс → маска → мрежа/broadcast; най-дълъг префикс избира маршрута; NAT сменя адрес и порт; TTL пази от безкрайно обикаляне.</div>
</div>`;

  function mount(root) {
    S.viz(root.querySelector("#v-sub"), {
      id: "sub", title: "IPv4 подмрежа", sub: "Лилаво = мрежови битове, сиво = хостови.",
      code: "ch05_subnet",
      inputs: [{ id: "ip", label: "Адрес", value: "192.168.10.70", width: "10em" }, { id: "prefix", label: "/префикс", type: "number", value: 26, width: "5em" }],
      presets: [{ label: "/24 от ръководството", values: { ip: "192.168.10.34", prefix: 24 } }, { label: "/20", values: { ip: "172.16.5.200", prefix: 20 } }, { label: "/31", values: { ip: "192.0.2.7", prefix: 31 } }, { label: "/32", values: { ip: "192.0.2.7", prefix: 32 } }],
      random: () => ({ ip: [10 + S.randInt(0, 200), S.randInt(0, 255), S.randInt(0, 255), S.randInt(0, 255)].join("."), prefix: S.randInt(8, 30) }),
      legend: [["s-piv", "мрежова част"], ["s-done", "хостови битове = 0 (мрежа)"], ["s-swap", "хостови битове = 1 (broadcast)"]],
      build: algos.subnet,
      draw(st, f) {
        st.innerHTML = "";
        const g = h("div", { style: { display: "grid", gap: "4px", overflowX: "auto" } });
        g.append(bitRow("адрес", f.a, f.p));
        if (f.step >= 1) g.append(bitRow("маска", f.mask, f.p));
        if (f.step >= 2) g.append(bitRow("мрежа", f.net, f.p, { hostCls: "s-done" }));
        if (f.step >= 3) g.append(bitRow("broadcast", f.bc, f.p, { hostCls: "s-swap" }));
        st.append(g);
        // числова ос на блока в последния октет (за p ≥ 24)
        if (f.p >= 24 && f.step >= 4) {
          const W = 560, sx = (v) => 20 + (v * (W - 40)) / 256, blk = 2 ** (32 - f.p), svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} 60`, width: W });
          for (let b = 0; b < 256; b += blk) svg.append(S.svg("rect", { x: sx(b), y: 10, width: Math.max(1, sx(b + blk) - sx(b) - 1), height: 22, fill: b === (f.net & 255) ? "var(--st-act-bg)" : "var(--panel-2)", stroke: b === (f.net & 255) ? "var(--st-act)" : "var(--line)" }));
          [0, 64, 128, 192, 255].forEach((v) => svg.append(S.svg("text", { x: sx(v), y: 50, "text-anchor": "middle", class: "wt", text: v })));
          svg.append(S.svg("line", { x1: sx(f.a & 255), y1: 4, x2: sx(f.a & 255), y2: 36, stroke: "var(--st-swap)", "stroke-width": 2 }));
          st.append(h("span", { class: "eyebrow", text: "блокове в последния октет" }), svg);
        }
        if (f.first != null) st.append(h("p", { class: "mono", text: `хостове: ${ipS(f.first)} … ${ipS(f.last)}  (${f.hosts.toLocaleString("bg")})` }));
      },
    });

    S.viz(root.querySelector("#v-lpm"), {
      id: "lpm", title: "Избор на маршрут", sub: "Всеки ред се проверява; печели най-дългият съвпадащ.",
      code: "ch05_lpm",
      inputs: [{ id: "routes", label: "Таблица: префикс/дълж. -> хоп; …", value: DEF_RT, width: "min(40em, calc(100vw - 90px))" }, { id: "dst", label: "Цел", value: "10.1.2.3", width: "10em" }],
      presets: [{ label: "10.1.9.9", values: { dst: "10.1.9.9" } }, { label: "10.200.0.1", values: { dst: "10.200.0.1" } }, { label: "8.8.8.8 (default)", values: { dst: "8.8.8.8" } }, { label: "Без default", values: { routes: "10.0.0.0/8 -> R2; 10.1.0.0/16 -> R3", dst: "8.8.8.8" } }],
      legend: [["s-cmp", "проверява се"], ["s-done", "съвпада"], ["s-act", "най-добър засега"], ["s-dim", "не съвпада"]],
      build: algos.lpm,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t" }, h("tr", null, h("th", { text: "#" }), h("th", { text: "Префикс" }), h("th", { text: "Дълж." }), h("th", { text: "Следващ хоп" }), h("th", { text: "Съвпада?" })));
        const seen = {}; // кои са проверени до момента
        f.rt.forEach((r, i) => {
          const checked = f.done || (f.i != null && i <= f.i);
          const ok = ((f.d & maskOf(r.len)) >>> 0) === r.pfx;
          let cls = !checked ? "" : i === f.best ? "s-act" : ok ? "s-done" : "s-dim";
          if (i === f.i && !f.done) cls = "s-cmp";
          if (f.done && i === f.best) cls = "s-done";
          seen[i] = cls;
          tb.append(h("tr", { class: cls }, ...[i, r.txt, "/" + r.len, r.via, checked ? (ok ? "да" : "не") : ""].map((x) => h("td", { class: "mono", style: { background: "var(--cb)" }, text: x }))));
        });
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.i != null && !f.done) { const r = f.rt[f.i]; st.append(h("div", { style: { display: "grid", gap: "4px", marginTop: "8px", overflowX: "auto" } }, bitRow("цел", f.d, r.len), bitRow(r.txt, r.pfx, r.len, { cls: (k) => (k < r.len ? (bin32(f.d)[k] === bin32(r.pfx)[k] ? "s-done" : "s-swap") : null) }))); }
      },
    });

    S.viz(root.querySelector("#v-nat"), {
      id: "nat", title: "NAT таблица", sub: "Публичните портове се раздават от 40000 нагоре.",
      code: "ch05_nat",
      inputs: [{ id: "events", label: "Събития", value: "out 192.168.10.34:51000, out 192.168.10.35:51000, out 192.168.10.34:51000, out 192.168.10.34:51001, in 40001, in 45000", width: "min(34em, calc(100vw - 90px))" }, { id: "pub", label: "Публичен IP", value: "203.0.113.5", width: "9em" }],
      presets: [{ label: "Само входящ", values: { events: "in 40000" } }],
      legend: [["s-act", "текущ запис"], ["s-cmp", "нов запис"], ["s-swap", "няма запис"]],
      build: algos.nat,
      draw(st, f) {
        st.innerHTML = "";
        const tb = h("table", { class: "t grid" }, h("tr", null, h("th", { text: "вътрешен адрес:порт" }), h("th", { text: "" }), h("th", { text: "публичен адрес:порт" })));
        f.tab.forEach((t, k) => { const c = k === f.cur ? (f.isNew ? "s-cmp" : "s-act") : ""; tb.append(h("tr", null, h("td", { class: c, text: `${ipS(t.ip)}:${t.port}` }), h("td", { text: "↔" }), h("td", { class: c, text: `${ipS(f.pub)}:${t.out}` }))); });
        if (!f.tab.length) tb.append(h("tr", null, h("td", { colspan: 3, class: "muted", text: "празна" })));
        st.append(h("div", { class: "tbl-wrap" }, tb));
        if (f.ev) st.append(h("p", { class: "mono " + (f.miss ? "warn" : ""), text: "събитие: " + f.ev }));
      },
    });
  }

  S.chapter({ id: "ip", order: 5, num: "5", group: "Адресиране", title: "IP адресиране и маршрутизация", lead: "Префикс, маска, мрежа и broadcast бит по бит; как маршрутизаторът избира най-дългия съвпадащ префикс; NAT с портове; TTL.", html, mount, algos });
})();
