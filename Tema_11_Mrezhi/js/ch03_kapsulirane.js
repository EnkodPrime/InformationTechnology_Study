/* Раздел 3 — Капсулиране: реални байтове HTTP → TCP → IPv4 → Ethernet, интернет контролна сума,
   смяна на кадъра при маршрутизатор. Огледало на c/03_encap.c. */
(function () {
  const S = window.Study, h = S.h;
  const hx = (b) => b.toString(16).toUpperCase().padStart(2, "0");
  const hx4 = (v) => v.toString(16).toUpperCase().padStart(4, "0");

  /* ---------- чисти помощници (същите като в C) ---------- */
  function csum(b, n, sum = 0, F) {
    for (let i = 0; i + 1 < n; i += 2) {
      const w = (b[i] << 8) | b[i + 1];
      sum += w;
      if (F) F.push({ at: "add", i, w, sum, msg: `Дума [${i}..${i + 1}] = <code>${hx4(w)}</code>; сума = <code>${sum.toString(16).toUpperCase()}</code>.` });
      const pre = sum; sum = (sum & 0xffff) + (sum >>> 16);
      if (F && pre !== sum) F.push({ at: "fold", i, w, sum, carry: true, msg: `Пренос над 16 бита: <code>${pre.toString(16).toUpperCase()}</code> → ${hx4(pre & 0xffff)} + ${pre >>> 16} = <code>${hx4(sum)}</code> (end-around carry).` });
    }
    if (n & 1) {
      const w = b[n - 1] << 8; sum += w;
      if (F) F.push({ at: "add", i: n - 1, w, sum, msg: `Нечетен брой байтове: последният се допълва с 00 → <code>${hx4(w)}</code>.` });
      const pre = sum; sum = (sum & 0xffff) + (sum >>> 16);
      if (F && pre !== sum) F.push({ at: "fold", i: n - 1, w, sum, carry: true, msg: `Пренос: → <code>${hx4(sum)}</code>.` });
    }
    return (~sum) & 0xffff;
  }
  const CRCT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b, n) { let c = 0xffffffff; for (let i = 0; i < n; i++) c = CRCT[(c ^ b[i]) & 255] ^ (c >>> 8); return (~c) >>> 0; }
  const put16 = (a, o, v) => { a[o] = (v >>> 8) & 255; a[o + 1] = v & 255; };
  const put32 = (a, o, v) => { put16(a, o, (v >>> 16) & 0xffff); put16(a, o + 2, v & 0xffff); };
  const g16 = (a, o) => (a[o] << 8) | a[o + 1];

  function parseIP(s, name) {
    const m = String(s).trim().match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!m) throw new Error(`${name}: очаква се IPv4 адрес с четири октета, напр. 192.0.2.10.`);
    const o = m.slice(1).map(Number);
    if (o.some((x) => x > 255)) throw new Error(`${name}: всеки октет е 0…255.`);
    return o;
  }
  const ipStr = (a) => a.join(".");
  const macStr = (a) => a.map(hx).join(":");

  const DEF = { cmac: [2, 0, 0, 0, 0, 10], gmac: [2, 0, 0, 0, 0, 1], seq: 1000, ack: 5000, ipid: 0x1c46 };

  /* Поле на заглавие: [слой, от, до (вкл.), име, стойност] — за таблица и оцветяване */
  function fields(f, tlen) {
    const ip = 14, tcp = 34;
    return [
      ["eth", 0, 5, "MAC получател", macStr(f.slice(0, 6))], ["eth", 6, 11, "MAC изпращач", macStr(f.slice(6, 12))], ["eth", 12, 13, "EtherType", "0x" + hx4(g16(f, 12)) + " (IPv4)"],
      ["ip", ip, ip, "Версия / IHL", `${f[ip] >> 4} / ${f[ip] & 15} (×4 = ${(f[ip] & 15) * 4} B)`], ["ip", ip + 1, ip + 1, "DSCP/ECN", f[ip + 1]], ["ip", ip + 2, ip + 3, "Обща дължина", g16(f, ip + 2)],
      ["ip", ip + 4, ip + 5, "Идентификация", "0x" + hx4(g16(f, ip + 4))], ["ip", ip + 6, ip + 7, "Флагове / отместване", "0x" + hx4(g16(f, ip + 6)) + " (DF)"], ["ip", ip + 8, ip + 8, "TTL", f[ip + 8]],
      ["ip", ip + 9, ip + 9, "Протокол", f[ip + 9] + " (TCP)"], ["ip", ip + 10, ip + 11, "Контролна сума на заглавието", "0x" + hx4(g16(f, ip + 10))],
      ["ip", ip + 12, ip + 15, "IP изпращач", ipStr(f.slice(ip + 12, ip + 16))], ["ip", ip + 16, ip + 19, "IP получател", ipStr(f.slice(ip + 16, ip + 20))],
      ["tcp", tcp, tcp + 1, "Порт изпращач", g16(f, tcp)], ["tcp", tcp + 2, tcp + 3, "Порт получател", g16(f, tcp + 2)],
      ["tcp", tcp + 4, tcp + 7, "Номер на последователност", (g16(f, tcp + 4) * 65536 + g16(f, tcp + 6))], ["tcp", tcp + 8, tcp + 11, "Номер на потвърждение", (g16(f, tcp + 8) * 65536 + g16(f, tcp + 10))],
      ["tcp", tcp + 12, tcp + 12, "Data offset", (f[tcp + 12] >> 4) + " думи = 20 B"], ["tcp", tcp + 13, tcp + 13, "Флагове", "0x" + hx(f[tcp + 13]) + " (PSH, ACK)"], ["tcp", tcp + 14, tcp + 15, "Прозорец", g16(f, tcp + 14)],
      ["tcp", tcp + 16, tcp + 17, "Контролна сума", "0x" + hx4(g16(f, tcp + 16))], ["tcp", tcp + 18, tcp + 19, "Urgent pointer", g16(f, tcp + 18)],
      ["app", 54, 54 + tlen - 21, "HTTP байтове", (tlen - 20) + " B"],
    ];
  }

  const algos = {
    csum: csum,
    crc32: crc32,

    /* Като encapsulate() в C — с кадри по слоеве */
    encap({ path, host, sip, dip, sport, dport, ttl }) {
      path = String(path || "/"); host = String(host || "");
      if (!/^\/[\x21-\x7e]*$/.test(path)) throw new Error("Пътят започва с / и съдържа само видими ASCII символи без интервал.");
      if (!/^[\x21-\x7e]*$/.test(host)) throw new Error("Host съдържа само видими ASCII символи.");
      const P = { sip: parseIP(sip, "IP на клиента"), dip: parseIP(dip, "IP на сървъра"), sport: S.int(sport, 1, 65535, "Порт на клиента"), dport: S.int(dport, 1, 65535, "Порт на сървъра"), ttl: S.int(ttl, 1, 255, "TTL") };
      const http = `GET ${path} HTTP/1.1\r\n` + (host ? `Host: ${host}\r\n` : "") + "\r\n";
      if (http.length > 400) throw new Error("Заявката е твърде дълга за учебния пример.");
      return Object.assign(build(P, http, true), { http });
    },

    /* Като forward() в C — през N маршрутизатора */
    path({ ttl, hops, corrupt }) {
      ttl = S.int(ttl, 1, 255, "TTL"); hops = S.int(hops, 1, 4, "Броят маршрутизатори");
      const P = { sip: [192, 0, 2, 10], dip: [198, 51, 100, 20], sport: 51000, dport: 80, ttl };
      const http = "GET /status HTTP/1.1\r\nHost: example.org\r\n\r\n";
      let { f } = build(P, http, false);
      const F = [], segs = [{ src: "C", dst: "R1", smac: DEF.cmac, dmac: DEF.gmac }];
      for (let r = 1; r <= hops; r++) segs.push({ src: "R" + r, dst: r === hops ? "S" : "R" + (r + 1), smac: [2, 0, 0, 0, r, 1], dmac: r === hops ? [2, 0, 0, 0, 0, 0x14] : [2, 0, 0, 0, r, 2] });
      const snap = (o) => F.push(Object.assign({ hops, f: f.slice(), segs }, o));
      snap({ seg: 0, node: "C", msg: `Клиентът C изпраща кадър до MAC адреса на шлюза R1 (${macStr(DEF.gmac)}). IP получателят е сървърът ${ipStr(P.dip)}.`, vars: { TTL: f[22], "IP csum": hx4(g16(f, 24)) }, log: `сегмент 1: ${macStr(f.slice(6, 12))} → ${macStr(f.slice(0, 6))}, TTL ${f[22]}` });
      if (corrupt) { f[60] ^= 0x01; snap({ seg: 0, node: "C", bad: 60, msg: "Смущение в средата обръща един бит в байт 60 (в HTTP данните).", vars: {} }); }
      let len = f.length, dropped = false;
      for (let r = 1; r <= hops; r++) {
        const node = "R" + r, sg = segs[r];
        const fcs = (f[len - 4] | (f[len - 3] << 8) | (f[len - 2] << 16) | (f[len - 1] << 24)) >>> 0;
        const okF = crc32(f, len - 4) === fcs;
        snap({ seg: r - 1, node, at: "chkfcs", msg: `${node} приема кадъра и проверява FCS (CRC-32): ${okF ? "съвпада" : "<b>не съвпада</b> — кадърът се изхвърля"}.`, inv: { text: "FCS открива грешки, не удостоверява", ok: okF }, vars: { FCS: okF ? "OK" : "грешка" } });
        if (!okF) { dropped = "fcs"; snap({ seg: r - 1, node, drop: true, at: "chkfcs", msg: `Кадърът е изхвърлен на каналния слой. IP, TCP и HTTP изобщо не го виждат; надеждността (ако има) идва от TCP повторение.`, log: `${node}: грешен FCS → изхвърлен` }); break; }
        const okI = csum(f.slice(14, 34), 20) === 0;
        snap({ seg: r - 1, node, at: "chkip", msg: `Проверка на IPv4 контролната сума на заглавието: сумата на 10-те думи, включително полето, дава FFFF → OK.`, vars: { "IP csum": okI ? "OK" : "грешка" } });
        if (f[22] <= 1) { dropped = "ttl"; snap({ seg: r - 1, node, at: "ttl", drop: true, msg: `TTL = ${f[22]}: пакетът не може да бъде препратен — маршрутизаторът го отхвърля (и обичайно връща ICMP съобщение). TTL ограничава броя преминавания, не секунди.`, vars: { TTL: f[22] }, log: `${node}: TTL изтече → отхвърлен` }); break; }
        f[22]--;
        snap({ seg: r - 1, node, at: "dec", chg: [22], msg: `${node} намалява TTL: ${f[22] + 1} → <b>${f[22]}</b>. IP адресите не се пипат.`, vars: { TTL: f[22] } });
        put16(f, 24, 0); put16(f, 24, csum(f.slice(14, 34), 20));
        snap({ seg: r - 1, node, at: "recsum", chg: [24, 25], msg: `Понеже заглавието се промени, IPv4 контролната сума се преизчислява: <code>${hx4(g16(f, 24))}</code>.`, vars: { "IP csum": hx4(g16(f, 24)) } });
        f.splice(0, 12, ...sg.dmac, ...sg.smac);
        snap({ seg: r, node, at: "mac", chg: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], msg: `<b>Нов Ethernet кадър</b> за следващия участък: ${macStr(sg.smac)} → ${macStr(sg.dmac)} (${sg.dst}).`, vars: {} });
        len -= 4; f.length = len;
        const c = crc32(f, len); for (let k = 0; k < 4; k++) f.push((c >>> (8 * k)) & 255); len += 4;
        snap({ seg: r, node, at: ["fcs", "ret"], chg: [len - 4, len - 3, len - 2, len - 1], msg: `Нов FCS върху новия кадър: <code>${f.slice(len - 4).map(hx).join(" ")}</code>.`, vars: {}, log: `сегмент ${r + 1}: ${macStr(sg.smac)} → ${macStr(sg.dmac)}, TTL ${f[22]}` });
      }
      if (!dropped) snap({ seg: hops, node: "S", done: true, msg: `Сървърът S получава кадъра. IP изпращач/получател са същите като при клиента; сменени са MAC адресите (${hops + 1} пъти различен кадър), TTL (${ttl} → ${f[22]}) и IP контролната сума.`, stats: { "кадри по пътя": hops + 1, "TTL при S": f[22] } });
      return { frames: F, f, ttl: f[22], dropped };
    },
  };

  /* Строене на кадъра (encapsulate) */
  function build(P, http, withFrames) {
    const F = [], app = [...http].map((c) => c.charCodeAt(0)), alen = app.length, tlen = 20 + alen;
    const f = Array(14 + 20 + tlen).fill(null);
    let layer = "app";
    const snap = (o) => { if (withFrames) F.push(Object.assign({ f: f.slice(), layer, tlen }, o)); };
    for (let i = 0; i < alen; i++) f[54 + i] = app[i];
    snap({ at: "app", layer: "app", msg: `Приложението подава ${alen} байта HTTP: <code>${S.esc(http.split("\r\n")[0])}</code>… Това е съобщение на L7; по-ниските слоеве не го тълкуват.`, log: `HTTP: ${alen} B` });
    layer = "tcp";
    const t = 34;
    put16(f, t, P.sport); put16(f, t + 2, P.dport); put32(f, t + 4, DEF.seq); put32(f, t + 8, DEF.ack);
    f[t + 12] = 0x50; f[t + 13] = 0x18; put16(f, t + 14, 64240); put16(f, t + 16, 0); put16(f, t + 18, 0);
    snap({ at: "tcp", msg: `TCP добавя 20 байта заглавие: портове ${P.sport} → ${P.dport}, номера на последователност и потвърждение (примерни: канал вече е установен), флагове PSH+ACK. Полето за контролна сума засега е 0000.`, log: `+ TCP 20 B` });
    const ps = ((P.sip[0] << 8) | P.sip[1]) + ((P.sip[2] << 8) | P.sip[3]) + ((P.dip[0] << 8) | P.dip[1]) + ((P.dip[2] << 8) | P.dip[3]) + 6 + tlen;
    put16(f, t + 16, csum(f.slice(t, t + tlen), tlen, ps));
    snap({ at: "tcsum", msg: `TCP контролна сума върху <b>псевдо-заглавие</b> (IP адресите, протокол 6, дължина ${tlen}) + целия сегмент = <code>${hx4(g16(f, t + 16))}</code>. Затова TCP „знае“ IP адресите, макар да е друг слой.`, log: `TCP csum ${hx4(g16(f, t + 16))}` });
    layer = "ip";
    const ip = 14;
    f[ip] = 0x45; f[ip + 1] = 0; put16(f, ip + 2, 20 + tlen); put16(f, ip + 4, DEF.ipid); put16(f, ip + 6, 0x4000); f[ip + 8] = P.ttl; f[ip + 9] = 6; put16(f, ip + 10, 0);
    for (let k = 0; k < 4; k++) { f[ip + 12 + k] = P.sip[k]; f[ip + 16 + k] = P.dip[k]; }
    snap({ at: "ip", msg: `IPv4 добавя 20 байта: версия 4, обща дължина ${20 + tlen}, TTL ${P.ttl}, протокол 6 (TCP), адреси ${ipStr(P.sip)} → ${ipStr(P.dip)}. Целият TCP сегмент е <dfn data-g="payload">полезен товар</dfn> за IP.`, log: `+ IPv4 20 B` });
    put16(f, ip + 10, csum(f.slice(ip, ip + 20), 20));
    snap({ at: "icsum", msg: `IPv4 контролната сума покрива <b>само заглавието</b>: <code>${hx4(g16(f, ip + 10))}</code>. (Стъпково — в лабораторията по-долу.)`, log: `IP csum ${hx4(g16(f, ip + 10))}` });
    layer = "eth";
    for (let k = 0; k < 6; k++) { f[k] = DEF.gmac[k]; f[6 + k] = DEF.cmac[k]; }
    put16(f, 12, 0x0800);
    snap({ at: "eth", msg: `Ethernet II добавя 14 байта: получател е <b>MAC на шлюза</b> ${macStr(DEF.gmac)}, а не на сървъра — сървърът е извън локалната подмрежа. EtherType 0800 = IPv4.`, log: "+ Ethernet 14 B" });
    let len = f.length;
    if (len < 60) { while (len < 60) { f.push(0); len++; } snap({ at: "pad", msg: `Кадърът е под минималните 60 байта (без FCS) — допълва се с нули до 60.` }); }
    const c = crc32(f, len); for (let k = 0; k < 4; k++) f.push((c >>> (8 * k)) & 255);
    layer = "fcs";
    snap({ at: ["fcs", "ret"], msg: `FCS (CRC-32) върху целия кадър: <code>${f.slice(-4).map(hx).join(" ")}</code>. Кадърът е ${f.length} байта; адаптерът го превръща в сигнали.`, log: `+ FCS 4 B → ${f.length} B`, stats: { "HTTP": alen, "TCP": 20, "IPv4": 20, "Ethernet": 18, "общо": f.length } });
    return { frames: F, f, len: f.length, fieldsOf: (ff) => fields(ff, tlen) };
  }

  const LCLS = { eth: "s-piv", ip: "s-act", tcp: "s-cmp", app: "s-done", fcs: "s-piv", pad: "s-dim" };
  const LNAME = { eth: "Ethernet заглавие", ip: "IPv4 заглавие", tcp: "TCP заглавие", app: "HTTP данни", fcs: "FCS", pad: "допълване" };
  function layerOf(i, n, tlen) { if (i >= n - 4) return "fcs"; if (i < 14) return "eth"; if (i < 34) return "ip"; if (i < 54) return "tcp"; if (i < 34 + tlen) return "app"; return "pad"; }

  function hexDump(el, f, opt = {}) {
    const n = f.length, wrap = h("div", { class: "mono", style: { fontSize: "12px", lineHeight: "1.9", display: "grid", gap: "0" } });
    for (let r = 0; r < n; r += 16) {
      const row = h("div", { style: { whiteSpace: "nowrap" } }, h("span", { class: "muted", text: r.toString(16).padStart(4, "0") + "  " }));
      for (let i = r; i < Math.min(n, r + 16); i++) {
        const v = f[i], L = opt.layerOf ? opt.layerOf(i) : "", cur = opt.hi && opt.hi.includes(i), chg = opt.chg && opt.chg.includes(i);
        row.append(h("span", { class: chg ? "s-swap" : cur ? "s-act" : v == null ? "" : LCLS[L] || "", style: { display: "inline-block", width: "2.4ch", textAlign: "center", marginRight: "2px", borderRadius: "3px", background: v == null ? "transparent" : "var(--cb)", color: v == null ? "var(--line)" : "var(--ink)", outline: cur || chg ? "1.5px solid var(--c)" : "none" }, text: v == null ? "··" : hx(v) }));
      }
      wrap.append(row);
    }
    el.append(h("div", { style: { overflowX: "auto" } }, wrap));
  }

  const html = `
<div class="prose">
  <p>При <dfn data-g="капсулиране">капсулиране</dfn> приложните данни получават транспортна, IP и канална служебна информация. <dfn data-g="кадър">Кадърът</dfn> е единица на каналния слой, <dfn data-g="ip пакет">IP пакетът</dfn> — на интернет слоя, а <dfn data-g="сегмент">TCP сегментът</dfn> и <dfn data-g="дейтаграма">UDP дейтаграмата</dfn> — на транспортния. Получателят извършва обратното разкапсулиране.</p>
</div>

<div class="block">
  <h3>Проследен пример от клиент до сървър (Схеми 5 и 9)</h3>
  <p class="prose">Клиент 192.0.2.10 изпраща учебна HTTP/1.1 заявка към сървър 198.51.100.20 през шлюз. Адресите са от диапазоните за документационни примери. <b>Условия:</b> Ethernet и IPv4, един вече установен TCP канал, без NAT и тунели, некриптиран HTTP — само за да се вижда вложената структура; HTTPS добавя TLS обработка. Байтовете по-долу са истински — същите изчислява и C кодът.</p>
  <div id="v-encap"></div>
  <details class="hint"><summary>Хинт: защо получателят на кадъра е шлюзът</summary><div>
    <p>„Получател на кадъра“ и „получател на IP пакета“ решават различни задачи. Каналният слой доставя само до следващия участник по локалния канал; IP адресът казва крайната цел. Когато сървърът е извън локалния префикс, следващият участник е шлюзът — затова хостът търси неговия MAC адрес (ARP, <a href="#lan">раздел 4</a>).</p>
  </div></details>
  <details class="trap"><summary>Капан: „едно send() = един пакет“</summary><div>
    <p>Границите не са непременно едно към едно: едно приложно съобщение може да се раздели на много сегменти, а няколко малки — да се обединят. Примерът показва учебния случай „една заявка = един сегмент“.</p>
  </div></details>
  <details class="trap"><summary>Капан: „пакет“ за всичко и „порт“ за всичко</summary><div>
    <p>„Packet“ е обща дума в разговорния език, но при точен анализ казваме кадър, IP пакет, TCP сегмент, UDP дейтаграма. TCP <dfn data-g="порт">порт</dfn> 443 е номер в транспортния протокол; physical port е букса на комутатор. Уеб сървърът не „слуша на Ethernet букса“ само защото използва TCP порт 443.</p>
  </div></details>
</div>

<div class="block">
  <h3>Интернет контролна сума стъпково</h3>
  <p class="prose">IPv4 заглавието и TCP сегментът се пазят от 16-битова контролна сума: сумират се думите в допълнение до единица (преносът над 16 бита се връща отдолу), а резултатът се инвертира. При проверка сумата на всички думи <b>заедно с полето</b> дава FFFF, т.е. функцията връща 0000. Това открива определени грешки — не е <dfn data-g="crc">CRC</dfn> и не удостоверява изпращача. <span class="extra-tag">разширение</span></p>
  <div id="v-csum"></div>
</div>

<div class="block">
  <h3>Каналните получатели се сменят, крайните IP адреси се запазват (Схеми 10 и 12)</h3>
  <p class="prose">При маршрутизиране между различни локални мрежи каналните адреси и кадри се променят за всеки участък. IP адресите обикновено остават същите от източник до получател, освен при преобразувания като <dfn data-g="nat">NAT</dfn>. Но „IP адресите остават“ не означава „всички байтове на IP пакета остават“: <dfn data-g="ttl">TTL</dfn> намалява, а контролната сума на заглавието се преизчислява. <dfn data-g="маршрутизатор">Маршрутизаторът</dfn> не трябва да чете HTTP заявката, за да извърши обикновеното IP препращане.</p>
  <div id="v-path"></div>
  <div class="key"><b>Две различни действия.</b> Мед → светлина е физическо преобразуване (медиаконвертор, SFP — кадърът е същият). Избор на друга IP мрежа и следващ хоп е мрежова функция (маршрутизатор — нов кадър, TTL−1). TCP и приложението продължават върху същите крайни адреси и портове.</div>
  <details class="hint"><summary>Хинт: мед към оптика в същата LAN (Схема 11)</summary><div>
    <p>C 192.0.2.10/24 и S 192.0.2.20/24 са в една подмрежа; между сградите има оптика и два медиаконвертора. C намира MAC адреса на S директно и изпраща кадър C → S. Конверторите сменят само физическото представяне: IP адресите и крайните MAC адреси се запазват, TTL <b>не</b> намалява, защото няма IP маршрутизиране. Реален пример за такъв клас устройства е TP-Link MC220L с подходящ <dfn data-g="sfp">SFP</dfn> модул.</p>
  </div></details>
  <details class="trap"><summary>Капан: „от LAN към оптика“ означава друга мрежа</summary><div>
    <p>LAN описва обхват и организация, „оптика“ — физическа среда. Една LAN може да има медни и оптични Ethernet връзки. Домашният <dfn data-g="gpon">GPON</dfn> е отделен случай: абонатният <dfn data-g="ont">ONT</dfn> участва в PON протокола, операторският <dfn data-g="olt">OLT</dfn> е на другия край; оптичен Ethernet SFP и GPON ONT не са взаимозаменяеми само защото и двата използват влакно.</p>
  </div></details>
  <details class="trap"><summary>Капан: CAN към Ethernet „като медиаконвертор“</summary><div>
    <p>Меден към оптичен Ethernet може да запази Ethernet услугата. CAN към Ethernet или Modbus RTU към Modbus TCP обикновено изисква протоколен шлюз с различна обработка. Преобразуването на средата, на протокола и на приложния смисъл се назовават отделно (<a href="#industrialni">раздел 10</a>).</p>
  </div></details>
</div>

<div class="block">
  <h3>Кои близки понятия трябва да разграничаваме</h3>
  <div class="tbl-wrap"><table class="t">
    <tr><th>Идентификатор</th><th>Равнище</th><th>Какво решава</th></tr>
    <tr><td><dfn data-g="mac адрес">MAC адрес</dfn></td><td>канален</td><td>доставка в локалния канал; сменя се на всеки участък</td></tr>
    <tr><td><dfn data-g="ip адрес">IP адрес</dfn></td><td>мрежов</td><td>крайна адресация и маршрутизация</td></tr>
    <tr><td><dfn data-g="порт">Порт</dfn></td><td>транспортен</td><td>крайна транспортна точка в хоста</td></tr>
    <tr><td><dfn data-g="url">URL</dfn></td><td>приложен</td><td>ресурс в приложен контекст</td></tr>
  </table></div>
  <p class="prose">Те не са четири конкурентни начина за изписване на един адрес. Един компютър може да има няколко интерфейса, IP адреси, транспортни връзки и ресурси едновременно. По същия начин TCP connection, TLS connection и application session описват различни състояния.</p>
</div>`;

  function mount(root) {
    // капсулиране
    S.viz(root.querySelector("#v-encap"), {
      id: "encap", title: "HTTP → TCP → IPv4 → Ethernet", sub: "Байтовете се попълват отвътре навън. Цвят = слой.",
      code: "ch03_encap",
      inputs: [
        { id: "path", label: "Път", value: "/status", width: "9em" }, { id: "host", label: "Host", value: "example.org", width: "10em" },
        { id: "sip", label: "IP клиент", value: "192.0.2.10", width: "9em" }, { id: "dip", label: "IP сървър", value: "198.51.100.20", width: "10em" },
        { id: "sport", label: "порт клиент", type: "number", value: 51000, width: "6em" }, { id: "dport", label: "порт сървър", type: "number", value: 80, width: "5em" },
        { id: "ttl", label: "TTL", type: "number", value: 64, width: "4.5em" },
      ],
      presets: [{ label: "Пример от ръководството", values: { path: "/status", host: "example.org", sip: "192.0.2.10", dip: "198.51.100.20", sport: 51000, dport: 80, ttl: 64 } }, { label: "Кратка заявка (допълване)", values: { path: "/", host: "" } }],
      legend: [["s-piv", "Ethernet / FCS"], ["s-act", "IPv4"], ["s-cmp", "TCP"], ["s-done", "HTTP"], ["s-dim", "допълване"]],
      build: algos.encap,
      draw(st, f) {
        st.innerHTML = "";
        const n = f.f.length;
        // вложени кутии
        const order = ["eth", "ip", "tcp", "app"], have = { app: 1, tcp: f.layer !== "app", ip: ["ip", "eth", "fcs"].includes(f.layer), eth: ["eth", "fcs"].includes(f.layer) || f.at === "pad" };
        const box = h("div", { style: { display: "flex", gap: "0", flexWrap: "wrap", alignItems: "stretch", marginBottom: "10px", font: "600 12px var(--f-mono)" } });
        const seg = (cls, t) => h("div", { class: cls, style: { border: "1.5px solid var(--c)", background: "var(--cb)", padding: "6px 8px", borderRadius: "4px", margin: "0 2px 2px 0" }, text: t });
        order.forEach((L) => { if (have[L]) box.append(seg(LCLS[L] + (f.layer === L ? "" : ""), { eth: "Eth 14", ip: "IPv4 20", tcp: "TCP 20", app: `HTTP ${f.tlen - 20}` }[L])); });
        if (n > 0 && f.f[n - 1] != null && f.layer === "fcs") box.append(seg("s-piv", "FCS 4"));
        st.append(h("span", { class: "eyebrow", text: f.layer === "app" ? "съобщение" : f.layer === "tcp" ? "сегмент = TCP + данни" : f.layer === "ip" ? "пакет = IP + сегмент" : "кадър = Eth + пакет + FCS" }), box);
        hexDump(st, f.f, { layerOf: (i) => layerOf(i, f.layer === "fcs" ? n : n + 4, f.tlen) });
        // таблица на полетата на текущия слой
        const L = f.layer === "fcs" ? "eth" : f.layer;
        if (L !== "app") {
          const tb = h("table", { class: "t", style: { marginTop: "10px" } }, h("tr", null, h("th", { text: "Поле (" + LNAME[L] + ")" }), h("th", { text: "Байтове" }), h("th", { text: "Стойност" })));
          fields(f.f.map((x) => x || 0), f.tlen).filter((r) => r[0] === L).forEach((r) => tb.append(h("tr", null, h("td", { text: r[3] }), h("td", { class: "mono", text: `${r[1]}–${r[2]}` }), h("td", { class: "mono", text: String(r[4]) }))));
          st.append(h("div", { class: "tbl-wrap" }, tb));
        }
      },
    });

    // контролна сума
    const ex = build({ sip: [192, 0, 2, 10], dip: [198, 51, 100, 20], sport: 51000, dport: 80, ttl: 64 }, "GET /status HTTP/1.1\r\nHost: example.org\r\n\r\n", false).f;
    const ipz = ex.slice(14, 34); ipz[10] = ipz[11] = 0;
    S.viz(root.querySelector("#v-csum"), {
      id: "csum", title: "inet_checksum: сума в допълнение до единица", sub: "Въведи байтове в шестнадесетичен запис.",
      code: "ch03_csum",
      inputs: [{ id: "bytes", label: "Байтове (hex)", value: ipz.map(hx).join(" "), width: "min(34em, calc(100vw - 90px))" }],
      presets: [{ label: "IPv4 заглавие с поле 0000", values: { bytes: ipz.map(hx).join(" ") } }, { label: "Проверка: заглавие с полето", values: { bytes: ex.slice(14, 34).map(hx).join(" ") } }, { label: "Нечетна дължина", values: { bytes: "AB CD EF" } }, { label: "Пренос", values: { bytes: "FF FF 00 01" } }],
      build({ bytes }) {
        const parts = String(bytes).trim().split(/[\s,]+/).filter(Boolean);
        if (!parts.length) throw new Error("Въведи поне един байт.");
        if (parts.length > 64) throw new Error("Най-много 64 байта.");
        const b = parts.map((p) => { if (!/^[0-9a-fA-F]{1,2}$/.test(p)) throw new Error(`„${p}“ не е байт в hex.`); return parseInt(p, 16); });
        const F = [];
        F.push({ msg: `${b.length} байта = ${Math.ceil(b.length / 2)} думи по 16 бита.`, sum: 0, vars: { sum: "0000" } });
        const r = csum(b, b.length, 0, F);
        F.forEach((x) => { x.b = b; if (x.at) { x.vars = { i: x.i, word: hx4(x.w), sum: x.sum.toString(16).toUpperCase() }; x.log = x.at === "add" ? `+${hx4(x.w)} = ${x.sum.toString(16).toUpperCase()}` : `сгъване → ${hx4(x.sum)}`; } });
        const last = F[F.length - 1].sum;
        F.push({ at: "not", b, msg: `Резултат = ~${hx4(last)} = <b><code>${hx4(r)}</code></b>.${r === 0 ? " Нула — данните заедно с контролната сума са непокътнати (при проверка)." : ""}`, vars: { sum: hx4(last), return: hx4(r) }, res: r, log: `~ → ${hx4(r)}` });
        return { frames: F, result: r };
      },
      draw(st, f) {
        st.innerHTML = "";
        const cls = {}; if (f.i != null) { cls[f.i] = f.carry ? "s-swap" : "s-act"; if (f.i + 1 < f.b.length) cls[f.i + 1] = cls[f.i]; }
        S.drawArray(st, f.b.map(hx), { cls, append: true });
        st.append(h("p", { class: "mono", html: `сума = <b>${(f.res != null ? (~f.res & 0xffff) : f.sum || 0).toString(16).toUpperCase().padStart(4, "0")}</b>${f.res != null ? ` → резултат <b>${hx4(f.res)}</b>` : ""}` }));
      },
    });

    // път през маршрутизатори
    S.viz(root.querySelector("#v-path"), {
      id: "path", title: "Път през маршрутизатори", sub: "Проследи кои полета се сменят на всеки участък.",
      code: "ch03_hop",
      inputs: [{ id: "ttl", label: "Начален TTL", type: "number", value: 64, width: "5em" }, { id: "hops", label: "Маршрутизатори", type: "number", value: 2, width: "5em" }, { id: "corrupt", label: "Смущение по първия участък", type: "checkbox", value: false }],
      presets: [{ label: "TTL = 2 (изтича)", values: { ttl: 2, hops: 2, corrupt: false } }, { label: "Грешен бит", values: { ttl: 64, hops: 2, corrupt: true } }, { label: "4 маршрутизатора", values: { ttl: 64, hops: 4, corrupt: false } }],
      legend: [["s-act", "текущ възел"], ["s-swap", "сменено поле"], ["s-done", "доставено"]],
      build: algos.path,
      draw(st, fr) {
        st.innerHTML = "";
        const nodes = ["C", ...Array.from({ length: fr.hops }, (_, k) => "R" + (k + 1)), "S"];
        const W = 600, step = (W - 80) / (nodes.length - 1);
        const svg = S.svg("svg", { class: "g", viewBox: `0 0 ${W} 90`, width: W });
        for (let k = 0; k + 1 < nodes.length; k++) svg.append(S.svg("line", { x1: 40 + k * step, y1: 40, x2: 40 + (k + 1) * step, y2: 40, class: "edge " + (k === fr.seg ? (fr.drop ? "s-swap" : "s-act") : k < fr.seg ? "s-done" : "") }),
          S.svg("text", { x: 40 + (k + .5) * step, y: 78, "text-anchor": "middle", class: "wt", text: k === 1 && fr.hops >= 2 ? "участък " + (k + 1) + " (напр. оптика)" : "участък " + (k + 1) }));
        nodes.forEach((n, k) => svg.append(S.svg("g", { class: "node " + (fr.node === n ? (fr.drop ? "s-swap" : fr.done ? "s-done" : "s-act") : "") }, S.svg("circle", { cx: 40 + k * step, cy: 40, r: 18 }), S.svg("text", { x: 40 + k * step, y: 45, "text-anchor": "middle", text: n }))));
        st.append(svg);
        const f = fr.f, tb = h("table", { class: "t" });
        const row = (k, v, idx) => tb.append(h("tr", null, h("td", { text: k }), h("td", { class: "mono " + (fr.chg && idx.some((i) => fr.chg.includes(i)) ? "s-swap" : ""), style: { background: "var(--cb)" }, text: v })));
        row("MAC получател", macStr(f.slice(0, 6)), [0]); row("MAC изпращач", macStr(f.slice(6, 12)), [6]);
        row("IP изпращач", ipStr(f.slice(26, 30)), [26]); row("IP получател", ipStr(f.slice(30, 34)), [30]);
        row("TTL", String(f[22]), [22]); row("IP контролна сума", hx4(g16(f, 24)), [24]);
        row("FCS", f.slice(f.length - 4).map(hx).join(" "), [f.length - 1]);
        row("TCP портове / HTTP", `${g16(f, 34)} → ${g16(f, 36)} / непроменени`, [-1]);
        st.append(h("div", { class: "tbl-wrap" }, tb));
      },
    });
  }

  S.chapter({ id: "kapsulirane", order: 3, num: "3", group: "Слоеве", title: "Капсулиране и път на пакета", lead: "Как HTTP заявката става TCP сегмент, IP пакет и Ethernet кадър — с истинските байтове; кое се сменя при всеки маршрутизатор и кое остава.", html, mount, algos });
})();
